"use client";

import { useEffect, useRef, useState } from "react";
import { MILESTONES } from "@/app/config";
import { SlideActiveContext, useSlideIsActive } from "./SlideActive";
import { useSnapTrack } from "./useSnapTrack";
import { Hint } from "./Hint";
import { TimelineIntroPanel } from "./TimelineIntroPanel";
import { MilestonePanel } from "./MilestonePanel";
import { TimelineMusic } from "./TimelineMusic";

/** The title page, then a page per month. */
const PANEL_COUNT = MILESTONES.length + 1;

function RailPanel({
  isActive,
  position,
  children,
}: {
  isActive: boolean;
  position: number;
  children: React.ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);

  // Same reasoning as the deck's slides: nothing off-screen stays tabbable.
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    (el as HTMLElement & { inert: boolean }).inert = !isActive;
  }, [isActive]);

  return (
    <div
      ref={ref}
      className="rail-panel"
      aria-roledescription="slide"
      aria-label={`${position} of ${PANEL_COUNT}`}
    >
      <SlideActiveContext.Provider value={isActive}>{children}</SlideActiveContext.Provider>
    </div>
  );
}

/**
 * Her first year, as the one sideways-moving piece of the invitation: a title
 * page followed by twelve months, each filling the screen, swiped left to
 * right inside a single deck section.
 *
 * The rail claims horizontal gestures only. A vertical swipe started anywhere
 * on it — including mid-rail on month 7 — chains straight up to the deck and
 * moves to the next section, which is why the two axes can coexist without a
 * gesture arbitrator.
 */
export function TimelineSlide() {
  /*
   * The deck's notion of "this section is on screen". A month panel is only
   * really active when its own rail has landed on it AND the story section is
   * the one showing, so the two are ANDed before being handed down.
   */
  const sectionActive = useSlideIsActive();

  const { ref: railRef, index, indexRef, goTo } = useSnapTrack<HTMLDivElement>("x", PANEL_COUNT);

  /*
   * Her year always starts at the beginning. Left mid-rail, the story section
   * would otherwise still be sitting on month seven when you came back to it,
   * with no way to tell you'd missed the six pages in front of it.
   *
   * The rewind happens on the way out rather than on the way in, once the
   * section is off-screen — jumping thirteen panels while it's still visible
   * would be a blur across the whole screen. It's a direct assignment, not
   * `goTo`, for the same reason: no animation, because nobody is watching.
   *
   * Swiping straight back inside the window cancels it — you never really
   * left the section.
   */
  useEffect(() => {
    if (sectionActive) return;
    const el = railRef.current;
    if (!el || el.scrollLeft === 0) return;
    const t = window.setTimeout(() => {
      el.scrollLeft = 0;
    }, 500);
    return () => window.clearTimeout(t);
  }, [sectionActive, railRef]);

  /* Left/right keys, but only while this section holds the screen — otherwise
     they'd quietly scrub a rail the visitor can't see. */
  useEffect(() => {
    if (!sectionActive) return;
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement | null)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA") return;
      const at = indexRef.current ?? 0;
      if (e.key === "ArrowRight") goTo(at + 1);
      else if (e.key === "ArrowLeft") goTo(at - 1);
      else return;
      e.preventDefault();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [sectionActive, goTo, indexRef]);

  /*
   * A plain mouse wheel only ever produces deltaY. Without this the deck's own
   * wheel handler — listening on an ancestor — would take every tick and jump
   * straight past her whole year to the next section, leaving the rail with no
   * mouse input at all.
   *
   * So while this section holds the screen, a vertical wheel turns the rail
   * instead, and only once the rail runs out of pages does the event bubble on
   * to the deck and change section. Horizontal deltas (trackpads, tilt wheels)
   * scroll the rail natively and are simply kept away from the deck.
   */
  useEffect(() => {
    const el = railRef.current;
    if (!el || !sectionActive) return;
    let lockedUntil = 0;

    const onWheel = (e: WheelEvent) => {
      if (Math.abs(e.deltaX) > Math.abs(e.deltaY)) {
        e.stopPropagation(); // native horizontal scroll; just not the deck's
        return;
      }
      if (Math.abs(e.deltaY) < 4) return;

      const at = indexRef.current ?? 0;
      const forward = e.deltaY > 0;
      // At either end, hand the gesture back so the deck changes section.
      if (forward ? at >= PANEL_COUNT - 1 : at <= 0) return;

      e.preventDefault();
      e.stopPropagation();

      const now = performance.now();
      if (now < lockedUntil) return; // one month per flick, not one per frame
      lockedUntil = now + 450;
      goTo(at + (forward ? 1 : -1));
    };

    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, [sectionActive, goTo, railRef, indexRef]);

  /*
   * The song of the month on screen — and nothing at all for the title page,
   * which is panel zero and has no princess, or for her year being off screen
   * altogether. The player fades between the two on its own; all this has to
   * get right is which song, if any, belongs to right now.
   */
  const music = sectionActive && index > 0 ? MILESTONES[index - 1]?.music : undefined;

  /*
   * The song one page further on, so the player can buffer it while this
   * month is being read — see the priming effect in `TimelineMusic`.
   *
   * `MILESTONES[index]` rather than `index + 1`, because the rail is offset
   * by its title page: panel `index` shows month `index - 1`, so the month
   * *after* the one on screen is simply `index`. That offset also makes the
   * title page do the right thing for free — it is panel zero, so the song
   * waiting to be primed there is her first month's, which is exactly the
   * one a guest is about to swipe into.
   */
  const nextMusic = sectionActive ? MILESTONES[index]?.music : undefined;

  /*
   * Whether the hand still has anything to teach.
   *
   * Her year is the only place on the invitation that moves sideways, and
   * nothing about a full-screen photograph says so. So the title page gets
   * a hand — and only the title page, and only until the guest turns one
   * page by themselves, which is proof they have understood and the end of
   * it for the visit.
   *
   * It has to survive the rewind. Leaving the section sends the rail back
   * to the front (see above), so a flag that lived on `index` alone would
   * forget every time and start teaching again on the way back in.
   */
  const [railLearned, setRailLearned] = useState(false);
  useEffect(() => {
    if (index > 0) setRailLearned(true);
  }, [index]);

  return (
    <div className="relative h-full">
      <TimelineMusic track={music} next={nextMusic} />

      <div
        ref={railRef}
        className="rail-track"
        aria-roledescription="carousel"
        aria-label="Mikhayla's first year, month by month"
      >
        <RailPanel isActive={sectionActive && index === 0} position={1}>
          <TimelineIntroPanel />
        </RailPanel>

        {MILESTONES.map((m, i) => (
          <RailPanel key={m.month} isActive={sectionActive && index === i + 1} position={i + 2}>
            <MilestonePanel m={m} />
          </RailPanel>
        ))}
      </div>

      {/*
        In the clear band under the title card, which is the one part of
        this panel with nothing in it — over the card the hand lands on the
        closing line, and over a month it would land on her face.

        Sliding the way the months do, which is right to left: see
        `hint-swipe-left` in globals.css for why that direction is the one
        that matters.
      */}
      {/* `mouse:hidden` for the same reason as the hero's: the rail already
          carries two arrows a mouse can click, and they are the instruction
          a pointer needs. The hand is for the guests who have only a
          finger and no arrow in reach. */}
      <Hint
        gesture="swipe-left"
        active={sectionActive && index === 0 && !railLearned}
        className="left-1/2 top-[76%] -translate-x-1/2 -translate-y-1/2 mouse:hidden"
      />

      <RailArrow direction="prev" onClick={() => goTo(index - 1)} disabled={index === 0} />
      <RailArrow
        direction="next"
        onClick={() => goTo(index + 1)}
        disabled={index === PANEL_COUNT - 1}
      />
    </div>
  );
}

/**
 * Shown at every width, not just on desktop, and — with the beads gone — the
 * only control on the rail besides the swipe itself. A visitor who doesn't
 * think to swipe sideways still has an obvious way through her year, and on a
 * desktop window it's the one thing a mouse can reach.
 *
 * They sit over the photograph rather than beside it, so each carries its own
 * parchment disc to stay visible whatever is behind it.
 */
function RailArrow({
  direction,
  onClick,
  disabled,
}: {
  direction: "prev" | "next";
  onClick: () => void;
  disabled: boolean;
}) {
  const isNext = direction === "next";
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={isNext ? "Next month" : "Previous month"}
      className={`absolute top-1/2 z-20 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full border border-gold/40 bg-parchment/80 text-ink/60 shadow-sm backdrop-blur transition hover:bg-parchment hover:text-ink active:scale-95 disabled:pointer-events-none disabled:opacity-0 sm:h-11 sm:w-11 ${
        isNext ? "right-1.5 sm:right-3 md:right-5" : "left-1.5 sm:left-3 md:left-5"
      }`}
    >
      <svg viewBox="0 0 24 24" aria-hidden className="h-5 w-5" fill="none">
        <path
          d={isNext ? "M9.5 5 L16.5 12 L9.5 19" : "M14.5 5 L7.5 12 L14.5 19"}
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </button>
  );
}
