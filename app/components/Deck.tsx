"use client";

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { BottomNav, type NavSection } from "./BottomNav";
import { RisingBalloon } from "./RisingBalloon";
import { SlideActiveContext } from "./SlideActive";
import { useSnapTrack } from "./useSnapTrack";
import { enterFullscreen, exitFullscreen, isFullscreen } from "./fullscreen";
import { PrincessPattern } from "./PrincessPattern";
import { ScrollCue } from "./ScrollCue";
import { ScrollCueSuppressContext } from "./ScrollCueSuppress";

/**
 * How long the screen waits, after the deck has been sent somewhere, before
 * it changes size.
 *
 * Taking or handing back the screen resizes the viewport, and a resize re-parks
 * the track on the section it believes is current — `realign` in
 * `useSnapTrack`. Done while the deck is still travelling, that re-park lands
 * on top of the scroll already in flight: the two fight, and the slide tears
 * or stops short of where it was going. Arriving at the finale was the worst
 * of it, because that is the one move that always changes the screen.
 *
 * So the screen is left alone until the travel is over. A shade over the half
 * second the deck takes — the cap on an interrupted flight is 1400ms, but that
 * is the pathological case and waiting for it would leave the browser's chrome
 * visibly late.
 *
 * It has to stay well under one number: a browser holds *transient activation*
 * for about five seconds after a gesture, and `enterFullscreen` spends it. The
 * swipe plus this wait is nowhere near that.
 */
const SCREEN_SETTLE_MS = 700;

export type DeckSlide = {
  key: string;
  /** Which bottom-bar tab this slide belongs to. */
  section: string;
  /** Announced to screen readers as "section N of M: <label>". */
  label: string;
  /**
   * This section is read in a window rather than full screen — see the
   * effects below.
   *
   * One slide sets it: the finale, which *is* the way out. Arriving there
   * hands the screen back; every other section takes it. There is no button
   * anywhere, because the section is the button.
   */
  windowed?: boolean;
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

  /*
   * Whether the section on screen has asked for the onward arrow to wait.
   *
   * Only her year does, and only while the rail still has months to its right
   * — see `ScrollCueSuppress`. Held here because the arrow is mounted here.
   */
  const [cueSuppressed, setCueSuppressed] = useState(false);

  /*
   * The screen follows the section.
   *
   * Every section but one is the invitation and is read full screen — which is
   * what the press on "Open the gates" buys. The finale is the way out, and
   * arriving there hands the screen back by itself. There is no close button
   * anywhere on the site; swiping to the last page *is* closing it, and
   * swiping back up re-opens it.
   *
   * ---------------------------------------------------------------------
   * Why an effect is allowed to ask
   * ---------------------------------------------------------------------
   * A browser grants fullscreen on *transient activation*, which outlives the
   * handler by around five seconds. The deck's travel is half a second, so by
   * the time this runs, the swipe or tab tap that moved the deck is over and
   * still well inside that window.
   *
   * It is a window, though, and a mouse wheel does not open one — wheel is not
   * an activation trigger in any browser, by design. A guest who is out of
   * fullscreen and *scrolls* between sections will not get it back from here;
   * the listener below is what catches them.
   *
   * Both calls are no-ops when the screen is already in the state being asked
   * for, so this costs nothing on the ordinary path.
   */
  const windowed = Boolean(slides[index]?.windowed);

  const landed = useRef(false);
  useEffect(() => {
    /* The deck mounts on the hero, behind the castle's light, and the screen
       was taken by the press that opened the gates. Asking again here would be
       a request with no gesture behind it. */
    if (!landed.current) {
      landed.current = true;
      return;
    }

    /*
     * Held until the deck has stopped moving — see `SCREEN_SETTLE_MS`.
     *
     * Clearing it on the way out is not housekeeping, it is the other half of
     * the feature: a guest swiping briskly down to the finale changes `index`
     * several times in under a second, and without this each step would queue
     * its own resize to land on top of the next swipe. Re-timing on every
     * change means the screen moves once, for wherever they actually stopped.
     */
    const timer = window.setTimeout(() => {
      if (windowed) exitFullscreen();
      else enterFullscreen();
    }, SCREEN_SETTLE_MS);

    return () => window.clearTimeout(timer);
  }, [windowed, index]);

  /*
   * Getting the screen back after something else took it away.
   *
   * Fullscreen is not ours to keep. A phone that locks, a tab switched away
   * from, a laptop lid closed — every one of them drops the page out of
   * fullscreen, and the guest comes back to an invitation reading in a window
   * with nothing having navigated, so the effect above never runs. That was
   * the bug: the screen went off, and the invitation never recovered.
   *
   * A gesture is the only thing that can fix it, because a gesture is the only
   * thing a browser will grant fullscreen to — `visibilitychange` fires with
   * no activation behind it and is refused. So the next deliberate press
   * anywhere on the page puts it back.
   *
   * A click and a key, deliberately, and not a pointerdown or a swipe: going
   * fullscreen resizes the viewport, and the deck re-parks itself on a resize
   * (see `realign` in useSnapTrack). Doing that *during* a swipe would fight
   * the swipe. A completed tap cannot be mid-gesture, and a swipe that moves
   * between sections is already covered by the effect above.
   *
   * Not on the finale: that page is meant to be windowed, and a tap on it must
   * not undo the exit it just performed. And not from a tap on the tab bar
   * either — that is a navigation whose destination decides the answer, so it
   * is left to the effect above rather than guessed at here. Without that, a
   * tap on the Finale tab would flash into fullscreen and straight back out.
   *
   * Escape is excluded. It is the browser's own way out of fullscreen, and a
   * handler that re-entered on the very key that left would make it useless.
   * It would be refused anyway — Escape grants no activation — but saying so
   * here is clearer than relying on that.
   */
  useEffect(() => {
    if (windowed) return;

    const restore = (e: Event) => {
      if (e instanceof KeyboardEvent && e.key === "Escape") return;
      const target = e.target as Element | null;
      if (target?.closest?.("nav")) return;
      if (!isFullscreen()) enterFullscreen();
    };

    window.addEventListener("click", restore);
    window.addEventListener("keydown", restore);
    return () => {
      window.removeEventListener("click", restore);
      window.removeEventListener("keydown", restore);
    };
  }, [windowed]);

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
    <div className="fixed inset-0 overflow-hidden bg-parchment">
      {/*
        The backdrop, behind and either side of the invitation. It is only ever
        seen on a window wider than the stage — see `.stage` in globals.css —
        and it is the story title page's own wallpaper, so the margins belong
        to the same book.
      */}
      <PrincessPattern />

      <div className="stage">
      <RisingBalloon progress={progress} />

      <div
        ref={trackRef}
        className="deck-track"
        aria-roledescription="carousel"
        aria-label="Mikhayla's first birthday invitation"
      >
        {/* The setter is React's own and never changes identity, so handing
            it down directly costs the sections nothing in re-renders. */}
        <ScrollCueSuppressContext.Provider value={setCueSuppressed}>
          {slides.map((slide, i) => (
            <SlideFrame
              key={slide.key}
              slide={slide}
              isActive={i === index}
              position={i + 1}
              total={count}
            />
          ))}
        </ScrollCueSuppressContext.Provider>
      </div>

      {/*
        "There is another one under this, and here is how to get there."
        ---------------------------------------------------------------
        On every section that has one below it, the hero included: it is now
        a control rather than a caption, and the hero is exactly where a guest
        who does not swipe gets stuck. The words above it still teach the
        gesture; this is the way through for anyone the gesture fails.

        The finale needs no exception of its own. It is the last slide, so the
        test excludes it by construction — better than naming it, because the
        rule is then the honest one and stays right if the deck is reordered.

        `cueSuppressed` is the one section that answers back: her year holds
        the arrow until the rail reaches its last month, because until then
        the way on is sideways. See `ScrollCueSuppress`.
      */}
      {index < count - 1 && !cueSuppressed && <ScrollCue onSelect={() => goTo(index + 1)} />}

      <BottomNav
        sections={sections}
        activeSection={activeSection}
        progress={progress}
        onSelect={(id) => goTo(sectionStart.get(id) ?? 0)}
      />
      </div>
    </div>
  );
}
