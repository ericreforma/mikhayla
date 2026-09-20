"use client";

import { useEffect, useMemo, useRef, type ReactNode } from "react";
import { BottomNav, type NavSection } from "./BottomNav";
import { RisingBalloon } from "./RisingBalloon";
import { SlideActiveContext } from "./SlideActive";
import { useSnapTrack } from "./useSnapTrack";

export type DeckSlide = {
  key: string;
  /** Which bottom-bar tab this slide belongs to. */
  section: string;
  /** Announced to screen readers as "section N of M: <label>". */
  label: string;
  node: ReactNode;
};

function SlideFrame({
  slide,
  isActive,
  position,
  total,
}: {
  slide: DeckSlide;
  isActive: boolean;
  position: number;
  total: number;
}) {
  const ref = useRef<HTMLElement>(null);

  /*
   * Off-screen sections are taken out of the tab order entirely. Without this,
   * a Tab press could land on the RSVP button three sections away and yank the
   * deck with no visible cause. It also covers the timeline rail: inert
   * cascades, so none of its fourteen panels are reachable either.
   */
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    // `inert` isn't in React 18's prop types yet, so it's set on the node.
    (el as HTMLElement & { inert: boolean }).inert = !isActive;
  }, [isActive]);

  /*
   * A section tall enough to scroll inside itself keeps that scroll position
   * when you swipe away, so coming back would land you halfway down the page
   * with its title off the top. Every section is rewound on the way out —
   * once it's off-screen, so the rewind is never seen.
   *
   * The delay is measured from the moment the deck hands over, which is the
   * halfway point of the transition, not the end of it. Swiping back inside
   * that window cancels the rewind: you never really left.
   */
  useEffect(() => {
    if (isActive) return;
    const el = ref.current;
    if (!el || el.scrollTop === 0) return;
    const t = window.setTimeout(() => {
      el.scrollTop = 0;
    }, 500);
    return () => window.clearTimeout(t);
  }, [isActive]);

  return (
    <section
      ref={ref}
      className="deck-slide"
      aria-roledescription="slide"
      aria-label={`${position} of ${total}: ${slide.label}`}
    >
      <SlideActiveContext.Provider value={isActive}>{slide.node}</SlideActiveContext.Provider>
    </section>
  );
}

/**
 * The invitation as a vertical deck: one full screen per section, snapping up
 * and down. The only thing that moves sideways is the timeline rail nested
 * inside the story slide — see TimelineSlide.
 */
export function Deck({ slides, sections }: { slides: DeckSlide[]; sections: NavSection[] }) {
  const count = slides.length;
  const { ref: trackRef, index, indexRef, progress, goTo } = useSnapTrack<HTMLDivElement>("y", count);

  /** First slide of each section, so the bar knows where to jump. */
  const sectionStart = useMemo(() => {
    const starts = new Map<string, number>();
    slides.forEach((s, i) => {
      if (!starts.has(s.section)) starts.set(s.section, i);
    });
    return starts;
  }, [slides]);

  const activeSection = slides[index]?.section ?? sections[0]?.id;

  /* Up/down keys drive the deck. Left/right belong to the timeline rail, so
     they're deliberately left alone here. */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement | null)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA") return;
      // A full-screen overlay (the map viewer) owns the keyboard while it is
      // up, and flags that on the body — otherwise Escape or an arrow key
      // meant for it would also swipe the invitation underneath.
      if (document.body.dataset.modal === "open") return;
      const at = indexRef.current ?? 0;
      if (e.key === "ArrowDown" || e.key === "PageDown") goTo(at + 1);
      else if (e.key === "ArrowUp" || e.key === "PageUp") goTo(at - 1);
      else if (e.key === "Home") goTo(0);
      else if (e.key === "End") goTo(count - 1);
      else return;
      e.preventDefault();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [goTo, count, indexRef]);

  /*
   * One section per wheel flick. Native mandatory snapping handles a wheel
   * well enough, but it lands with a shove; taking the gesture over gives the
   * same eased travel as a nav tap.
   *
   * Horizontal wheel and trackpad deltas are passed straight through — those
   * are meant for the timeline rail.
   */
  useEffect(() => {
    const el = trackRef.current;
    if (!el) return;
    let lockedUntil = 0;

    const onWheel = (e: WheelEvent) => {
      if (Math.abs(e.deltaY) <= Math.abs(e.deltaX)) return; // the rail's gesture
      const at = indexRef.current ?? 0;
      const slide = el.children[at] as HTMLElement | undefined;
      // A section tall enough to scroll inside itself keeps its own gesture.
      if (slide && slide.scrollHeight > slide.clientHeight + 1) return;
      if (Math.abs(e.deltaY) < 4) return;
      e.preventDefault();
      const now = performance.now();
      if (now < lockedUntil) return; // one section per flick, not one per frame
      lockedUntil = now + 500;
      goTo(at + (e.deltaY > 0 ? 1 : -1));
    };

    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, [goTo, trackRef, indexRef]);

  return (
    <div className="fixed inset-0 overflow-hidden">
      <RisingBalloon progress={progress} />

      <div
        ref={trackRef}
        className="deck-track"
        aria-roledescription="carousel"
        aria-label="Mikhayla's first birthday invitation"
      >
        {slides.map((slide, i) => (
          <SlideFrame
            key={slide.key}
            slide={slide}
            isActive={i === index}
            position={i + 1}
            total={count}
          />
        ))}
      </div>

      <BottomNav
        sections={sections}
        activeSection={activeSection}
        progress={progress}
        onSelect={(id) => goTo(sectionStart.get(id) ?? 0)}
      />
    </div>
  );
}
