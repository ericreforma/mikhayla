"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";
import { useReducedMotion } from "framer-motion";
import { POINTING_HAND } from "@/app/config";

/**
 * The hand that shows a guest what to do.
 *
 * Three places on the invitation ask for a gesture rather than a tap on
 * something that looks like a button — the gate at the door, the swipe up
 * off the first screen, and the swipe along her year — and on a phone those
 * are invisible until somebody tries them. Most guests try. Some don't, and
 * the ones who don't are the ones this invitation is most for: the great
 * aunts, the grandparents, anyone who has never been taught that a page can
 * be pushed sideways.
 *
 * So the hand shows them, and then gets out of the way. It plays its gesture
 * twice, disappears for five seconds, and comes back — which is long enough
 * that a guest who has understood is not being nagged, and short enough that
 * one who is still looking at the screen will see it again.
 *
 * Two things it must never do:
 *
 *  - **Take a tap.** It is `pointer-events-none` throughout. It sits exactly
 *    where the gesture it is advertising has to happen, so a hand that
 *    swallowed the tap would be worse than no hand at all.
 *  - **Be read out.** It is `aria-hidden`. Everything it demonstrates is
 *    already said in words somewhere a screen reader will find — the
 *    button's label, the "swipe up to begin" cue, the rail's own arrows —
 *    and a screen reader has no use for a picture of a finger.
 */

export type HintGesture = "tap" | "swipe-up" | "swipe-left";

/**
 * How long one go of each takes.
 *
 * A swipe is a longer movement than a press and wants longer to read; a tap
 * that lingers stops looking like a tap.
 */
const BEAT_MS: Record<HintGesture, number> = {
  tap: 1250,
  /*
   * The longest of the three, and the one that earns it.
   *
   * It is the first gesture a guest is asked for and the one that moves the
   * whole invitation, so it is worth reading properly: a long, slow run over
   * a long travel, with the line behind it (`.hint-trail`) given time to be
   * drawn and then fade.
   *
   * Slower than looks right in isolation, and that is the point. The guests
   * this hand exists for are the ones who have never been taught that a page
   * can be pushed — the great aunts, the grandparents. A gesture they have no
   * name for has to be legible at a glance they were not expecting to take,
   * and at 1700ms the hand had arrived before anyone had finished noticing it
   * set off.
   */
  "swipe-up": 2900,
  "swipe-left": 1700,
};

/** How many goes before it stands down. */
const CYCLES = 2;

/** And how long it stands down for. */
const REST_MS = 5000;

export function Hint({
  gesture,
  active = true,
  after = 5000,
  className = "",
}: {
  gesture: HintGesture;
  /**
   * Whether the hand has anything to teach right now — the section is on
   * screen, and the guest has not already done the thing.
   *
   * Going false resets it, so coming back to a screen starts the wait over
   * rather than resuming a half-finished cycle.
   */
  active?: boolean;
  /** How long to leave a guest to work it out on their own first. */
  after?: number;
  /** Where it sits. Positioned by the caller, since only the caller knows. */
  className?: string;
}) {
  const reduce = useReducedMotion();
  const [showing, setShowing] = useState(false);

  /*
   * Whether this is the first showing or a return.
   *
   * A ref and not state: it only ever decides how long the *next* timer
   * runs for, so nothing needs to re-render when it changes.
   */
  const returned = useRef(false);

  const beat = BEAT_MS[gesture];

  useEffect(() => {
    if (!active) {
      setShowing(false);
      returned.current = false;
      return;
    }
    const wait = showing ? CYCLES * beat : returned.current ? REST_MS : after;
    const t = window.setTimeout(() => {
      if (!showing) returned.current = true;
      setShowing((s) => !s);
    }, wait);
    return () => window.clearTimeout(t);
  }, [active, showing, after, beat]);

  if (!showing) return null;

  /*
   * Asked for less motion, the hand still appears — it is an instruction,
   * not decoration, and hiding it takes help away from exactly the guests
   * who are most likely to have turned the setting on. What goes is the
   * movement: it stands still, and the arrow beside it is left to say which
   * way. Which is also why the swipes have an arrow at all.
   */
  const run = reduce ? "" : `hint-run hint-${gesture}`;

  return (
    <div
      aria-hidden
      data-gesture={gesture}
      className={`hint pointer-events-none absolute ${className}`}
    >
      {/*
        The gap on the swipes is the length of the travel, near enough. The
        arrow is where the hand is going, so it has to be far enough off
        that the hand arrives *at* it rather than sliding straight over it;
        at a couple of pixels, which is where this started, the hand simply
        covered the arrow for the half of the gesture anyone is watching.
      */}
      <div
        className={`flex items-center justify-center ${
          gesture === "swipe-up"
            ? "flex-col gap-16"
            : gesture === "swipe-left"
              ? "flex-row gap-7"
              : ""
        }`}
        style={
          {
            "--beat": `${beat}ms`,
            "--cycles": CYCLES,
            "--tip-x": `${(TIP.x * 100).toFixed(1)}%`,
            "--tip-y": `${(TIP.y * 100).toFixed(1)}%`,
          } as CSSProperties
        }
      >
        {gesture !== "tap" && <Chevron dir={gesture === "swipe-up" ? "up" : "left"} />}

        {/*
          The thing being positioned is the fingertip, not the hand.

          This drawing points into its own top-left corner, so a hand whose
          *box* is centred is a hand whose finger sits a long way left of
          wherever it was supposed to be pointing — off the middle of the
          button it is pressing, or out from under the arrow it is swiping
          towards. Sliding it over by the difference puts the tip on the
          line everything else is lined up on, and the hand hangs off to the
          right of it where a real one would.

          Not on the sideways swipe, though, and that is not an oversight:
          there the arrow is *beside* the hand rather than above it, so the
          thing holding the two together is the gap between them. Shifting
          the hand along the same axis only prises that gap open, and a hand
          and an arrow that far apart stop reading as one gesture.

          Its own element rather than a class on the hand, because the hand
          is already carrying the gesture's transform and a second one would
          simply replace the first.
        */}
        <span
          /* `relative` so the trail below can be pinned to the fingertip's
             column. It is this element and not the one inside it, because
             this one is the hand's *resting* box — the inner one is moving. */
          className="relative block"
          style={{
            transform:
              gesture === "swipe-left"
                ? undefined
                : `translateX(${((0.5 - TIP.x) * 100).toFixed(1)}%)`,
          }}
        >
          {/* The line the finger leaves behind it. Only on the swipe up:
              see `.hint-trail` in globals.css, whose geometry is that one
              gesture's travel written out. */}
          {gesture === "swipe-up" && !reduce && <span className="hint-trail" />}

          <span className={`relative block ${run}`}>
            {/* The ring a finger leaves on the glass. Only on the press — a
                swipe already says everything by moving. */}
            {gesture === "tap" && !reduce && <span className="hint-ripple" />}
            {/* Generous, because the whole point of it is to be noticed by
                somebody who has not noticed anything else on the screen. */}
            <PointingHand className="relative block h-[4.5rem] w-auto xs:h-20 sm:h-24" />
          </span>
        </span>
      </div>
    </div>
  );
}

/**
 * The way to go, said again in a second way.
 *
 * Belt and braces on purpose. A hand that slides is obvious once you have
 * seen a phone do it before; an arrow is obvious to everyone, and it is the
 * only thing left saying which way when a guest has asked for less motion
 * and the hand is standing still.
 */
function Chevron({ dir }: { dir: "up" | "left" }) {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden
      className={`hint-arrow h-6 w-6 drop-shadow-[0_1px_3px_rgba(61,43,79,0.3)] sm:h-7 sm:w-7 ${
        dir === "up" ? "" : "-rotate-90"
      }`}
      fill="none"
    >
      <path
        d="M5 15 L12 8 L19 15"
        stroke="#FFF9F2"
        strokeWidth="5.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M5 15 L12 8 L19 15"
        stroke="currentColor"
        strokeWidth="2.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/**
 * The hand itself: index finger out, the other three curled under, wrist
 * running down to the lower left.
 *
 * Skin rather than the ivory cartoon it replaces, and pointing along a
 * diagonal rather than straight up — which is the way a hand actually meets
 * a screen, and the way every phone tutorial has drawn one for fifteen
 * years. That familiarity is the whole asset here: a guest who has never
 * knowingly followed an on-screen hand has still seen this shape.
 *
 * Mirrored from the source artwork, which is drawn as a left hand. See TIP
 * above for what that costs and what reads the answer.
 *
 * The white keyline is the one addition. The artwork is flat peach on flat
 * peach, which is fine on the parchment of the loading screen and invisible
 * on the pink of her gown, where the hero's hand has to live. Stroking the
 * silhouette in the page's own ivory before filling it puts a hairline of
 * daylight round the whole shape, so it separates from anything without a
 * dark outline drawn over the artwork.
 */

/**
 * Where the fingertip sits inside the drawing's box, as fractions of it.
 *
 * Load-bearing twice over, which is why it is a constant and not two magic
 * numbers: the ripple on the press has to break *at* the fingertip, and the
 * press itself has to hang the fingertip on the button rather than the
 * middle of a hand that points off to one corner. This drawing points up
 * and to the left, so its tip is very nearly the top-left of the box —
 * which is also why nothing mirrors it any more: it already points the way
 * the old one had to be flipped to.
 *
 * Measured off the file by rasterising it and finding the topmost ink,
 * rather than guessed. Replace the drawing and this is the one thing that
 * has to be taken again.
 */
const TIP = { x: 0.0495, y: 0.0013 };

/**
 * A file rather than inline markup, and that is a size decision rather than
 * a stylistic one.
 *
 * The drawing is an auto-trace — better than two hundred paths of shading,
 * a hundred kilobytes of them — and inlining that would put the whole thing
 * in the JavaScript bundle, parsed on every visit, for a picture that is on
 * screen three seconds at a time. As a file it is fetched once, cached
 * (it is in the loading screen's manifest), and rasterised once.
 *
 * The cost of the change is that it can no longer be stroked, which is how
 * the hand it replaces held its edge against a photograph. `hint-hand` in
 * globals.css does that job now, with the same idea done as a filter.
 */
function PointingHand({ className = "" }: { className?: string }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={POINTING_HAND} alt="" decoding="async" className={`hint-hand ${className}`} />
  );
}
