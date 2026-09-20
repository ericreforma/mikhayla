"use client";

import { useCallback, useEffect, useRef, useState, type RefObject } from "react";
import { useMotionValue, type MotionValue } from "framer-motion";

type Axis = "x" | "y";

export type SnapTrack<T extends HTMLElement> = {
  /** Attach to the scroll container. */
  ref: RefObject<T>;
  /** Index of the panel currently filling the container. */
  index: number;
  /** The same index, readable from event handlers without re-subscribing. */
  indexRef: RefObject<number>;
  /** 0 → 1 across the whole track. A motion value, so it costs no renders. */
  progress: MotionValue<number>;
  /** Animate to a panel, clamped to range. */
  goTo: (target: number) => void;
};

function prefersReducedMotion() {
  return (
    typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}

/**
 * Drives a CSS scroll-snap track: reports which panel is showing, exposes a
 * normalised progress value, and animates to a given panel.
 *
 * Shared by the two tracks on the page — the deck moving up and down, and
 * the timeline rail moving left and right inside it — which differ only in
 * which axis they read and write.
 */
export function useSnapTrack<T extends HTMLElement>(axis: Axis, count: number): SnapTrack<T> {
  const ref = useRef<T>(null);
  const [index, setIndex] = useState(0);
  const progress = useMotionValue(0);

  const indexRef = useRef(0);
  indexRef.current = index;

  /** Pending "turn snapping back on" work from a programmatic jump. */
  const settleRef = useRef<number | null>(null);
  const horizontal = axis === "x";

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    let frame = 0;
    const read = () => {
      frame = 0;
      const pos = horizontal ? el.scrollLeft : el.scrollTop;
      const size = horizontal ? el.clientWidth : el.clientHeight;
      const span = (horizontal ? el.scrollWidth : el.scrollHeight) - size;
      if (size === 0) return;
      progress.set(span > 0 ? pos / span : 0);
      const next = Math.min(Math.max(Math.round(pos / size), 0), count - 1);
      setIndex((prev) => (prev === next ? prev : next));
    };

    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(read);
    };

    el.addEventListener("scroll", onScroll, { passive: true });
    read();
    return () => {
      el.removeEventListener("scroll", onScroll);
      if (frame) cancelAnimationFrame(frame);
    };
  }, [count, horizontal, progress]);

  const goTo = useCallback(
    (target: number) => {
      const el = ref.current;
      if (!el) return;
      const size = horizontal ? el.clientWidth : el.clientHeight;
      const clamped = Math.min(Math.max(target, 0), count - 1);
      const to = clamped * size;
      const current = horizontal ? el.scrollLeft : el.scrollTop;
      if (Math.abs(current - to) < 1) return;

      if (settleRef.current !== null) {
        cancelAnimationFrame(settleRef.current);
        settleRef.current = null;
      }

      if (prefersReducedMotion()) {
        if (horizontal) el.scrollLeft = to;
        else el.scrollTop = to;
        return;
      }

      /*
       * `scroll-snap-stop: always` is what keeps a flick to one panel, but
       * some browsers apply it to programmatic scrolls too — a tap on the last
       * nav icon would then crawl one panel at a time. Snapping comes off for
       * the flight and goes back on at touchdown.
       */
      el.style.scrollSnapType = "none";
      el.scrollTo(horizontal ? { left: to, behavior: "smooth" } : { top: to, behavior: "smooth" });

      const started = performance.now();
      const settle = () => {
        const now = horizontal ? el.scrollLeft : el.scrollTop;
        // The cap covers an interrupted flight: a finger on the track mid-jump
        // means we never arrive, and snapping has to come back regardless.
        if (Math.abs(now - to) < 2 || performance.now() - started > 1400) {
          el.style.scrollSnapType = "";
          settleRef.current = null;
          return;
        }
        settleRef.current = requestAnimationFrame(settle);
      };
      settleRef.current = requestAnimationFrame(settle);
    },
    [count, horizontal]
  );

  useEffect(
    () => () => {
      if (settleRef.current !== null) cancelAnimationFrame(settleRef.current);
    },
    []
  );

  /* A rotated phone, or the mobile address bar sliding away, must not leave
     the track parked between two panels. */
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const realign = () => {
      if (horizontal) el.scrollLeft = indexRef.current * el.clientWidth;
      else el.scrollTop = indexRef.current * el.clientHeight;
    };
    window.addEventListener("resize", realign);
    window.addEventListener("orientationchange", realign);
    return () => {
      window.removeEventListener("resize", realign);
      window.removeEventListener("orientationchange", realign);
    };
  }, [horizontal]);

  return { ref, index, indexRef, progress, goTo };
}
