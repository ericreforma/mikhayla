"use client";

import { useCallback, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  motion,
  useAnimationControls,
  useTransform,
  useSpring,
  type MotionValue,
} from "framer-motion";
import { GAME_PATH, RETURN_KEY, TAP_WINDOW_MS, TAPS_TO_OPEN } from "@/app/game/entry";

/**
 * The page's signature move, kept alive in the deck: the balloon floats up
 * the right-hand edge as the visitor swipes through the story, arriving at
 * the top for the birthday finale.
 *
 * It rides the deck's horizontal progress rather than page scroll — there is
 * no page scroll any more — and the spring smooths the step-wise jumps that
 * snapping from slide to slide would otherwise produce.
 *
 * It stops at 72% so it never drifts down behind the bottom bar, and is sized
 * down on phones so it stays decorative instead of sitting on the content it
 * floats past.
 *
 * Its travel is measured against the wrapper below rather than the window,
 * which is what keeps the arrival readable once the bar moves to the top of
 * the screen on a desktop: 3% of the window would put the balloon behind the
 * menu at the one moment it is meant to be seen. Inset by the bar's height,
 * the same 3% lands just under it.
 */
export function RisingBalloon({ progress }: { progress: MotionValue<number> }) {
  const rawTop = useTransform(progress, [0, 1], ["72%", "3%"]);
  const top = useSpring(rawTop, { stiffness: 60, damping: 20, mass: 0.6 });
  const rotate = useTransform(progress, [0, 1], [-6, 6]);

  /*
   * And it is also the door to the game.
   * ----------------------------------------------------------------------
   * Two taps on the balloon open `/game` — see `app/game/`. Nothing else on
   * the invitation leads there and nothing says it is there, which is the
   * whole of the idea: the children at this party will find it, and the great
   * aunts will never know it exists.
   *
   * Two rather than one, because a balloon this size is caught by accident,
   * and a guest who meant to bat it about would otherwise lose the invitation
   * off the screen. Two inside `TAP_WINDOW_MS` is a deliberate act and almost
   * never an accidental one. The count resets as soon as that window closes,
   * so a tap now and a tap in a minute is just two taps.
   *
   * Each tap gets a little pop, and that pop is the only hint there is. It is
   * enough — a thing that answers when you touch it is a thing people touch
   * again — and it says nothing to anyone who taps once and moves on.
   *
   * It is a tap, not a press: Motion only fires this when the pointer went
   * down and up without travelling, so dragging the balloon across the screen
   * and letting it spring back never counts as one.
   */
  const router = useRouter();
  const pop = useAnimationControls();
  const taps = useRef(0);
  const window_ = useRef(0);

  useEffect(() => () => window.clearTimeout(window_.current), []);

  const onTap = useCallback(() => {
    pop.start({
      scale: [1, 1.18, 1],
      transition: { duration: 0.34, ease: [0.22, 1, 0.36, 1] },
    });

    taps.current += 1;
    window.clearTimeout(window_.current);

    if (taps.current < TAPS_TO_OPEN) {
      /* Fetch the game's code on the first tap, so the second one opens it
         rather than starting a download. A guest who taps once and wanders
         off has cost themselves one small file. */
      router.prefetch(GAME_PATH);
      window_.current = window.setTimeout(() => {
        taps.current = 0;
      }, TAP_WINDOW_MS);
      return;
    }

    taps.current = 0;
    try {
      /* Tells the game there is an invitation behind it on the history stack,
         so its way out can be a Back rather than a second push. See
         `app/game/entry.ts`. */
      window.sessionStorage.setItem(RETURN_KEY, "1");
    } catch {
      /* Private mode. The game pushes its way back instead. */
    }
    router.push(GAME_PATH);
  }, [pop, router]);

  return (
    /* The run the balloon climbs. It is the whole deck everywhere the bar is
       at the foot of the screen, and the deck less the menu once the bar is at
       the head of it — `--nav-at-foot` in globals.css is the switch, and the
       percentages above are read against whichever this turns out to be. */
    <div
      aria-hidden
      className="pointer-events-none absolute inset-0 z-30"
      style={{ top: "calc(var(--nav-bar) * (1 - var(--nav-at-foot)))" }}
    >
    {/*
      And it can be batted about.
      ----------------------------------------------------------------------
      A balloon that only ever drifts is scenery; one that moves when a finger
      pushes it is a toy, and this page is for a one-year-old's guests. Drag it
      anywhere and let go — it springs back to the string, because where it
      hangs is not decoration: it is how far through the invitation you are,
      and a balloon left in a corner would be a broken gauge.

      `touch-none` hands the gesture to the drag rather than to the deck, so a
      finger that lands on the balloon moves the balloon instead of turning the
      page. It is a small target and deliberately so — everywhere else on the
      screen still swipes.

      The sway moves to a wrapper of its own. It is a CSS animation on
      `transform`, and dragging is Motion writing `transform` on the element it
      drags; on one element the two would overwrite each other and the balloon
      would jump between them.
    */}
    <motion.div
      aria-hidden
      className="pointer-events-auto absolute right-1 cursor-grab touch-none active:cursor-grabbing xs:right-2 sm:right-8 md:right-16"
      style={{ top }}
      drag
      dragSnapToOrigin
      dragMomentum={false}
      whileDrag={{ scale: 1.06 }}
      transition={{ type: "spring", stiffness: 300, damping: 22 }}
      animate={pop}
      onTap={onTap}
    >
      <div className="animate-balloon-sway">
      <motion.svg
        viewBox="0 0 72 128"
        style={{ rotate }}
        className="h-[62px] w-[35px] drop-shadow-md xs:h-[78px] xs:w-[44px] sm:h-[112px] sm:w-[63px] sm:drop-shadow-lg"
      >
        <defs>
          <radialGradient id="balloonSilk" cx="35%" cy="28%" r="75%">
            <stop offset="0%" stopColor="#F6D3E0" />
            <stop offset="55%" stopColor="#E8B4C8" />
            <stop offset="100%" stopColor="#D98BAB" />
          </radialGradient>
        </defs>
        {/* Gold ribbon, with a little curl at the end. */}
        <path
          d="M36 94 C36 106 30 110 33 118 C36 126 34 128 36 128"
          stroke="#D4AF37"
          strokeWidth="1.6"
          fill="none"
          strokeLinecap="round"
        />
        <ellipse cx="36" cy="48" rx="34" ry="43" fill="url(#balloonSilk)" />
        {/* Gilt rim and highlight. */}
        <ellipse
          cx="36"
          cy="48"
          rx="34"
          ry="43"
          fill="none"
          stroke="#D4AF37"
          strokeWidth="1.4"
          opacity="0.65"
        />
        <ellipse cx="24" cy="31" rx="7.5" ry="11" fill="#FFF8F0" opacity="0.45" />
        {/* Knot. */}
        <polygon points="30,90 42,90 36,100" fill="#D98BAB" />
        <circle cx="36" cy="93" r="2.4" fill="#D4AF37" opacity="0.8" />
      </motion.svg>
      </div>
    </motion.div>
    </div>
  );
}
