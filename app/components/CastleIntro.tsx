"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { CASTLE_SCENE } from "@/app/config";
import { Sparkle } from "./Ornaments";

/**
 * The way in: a castle on a summer morning, and the gate it opens.
 *
 * It plays between the curtain and the invitation. The loading screen hands
 * over while it is still solid, so what a guest actually sees is the castle
 * emerging as the curtain thins — the same trick the curtain plays on the
 * hero, one step earlier in the chain. Five beats:
 *
 *   1. the castle stands, a moment, under a sky of sparkles
 *   2. the ground rushes toward the gate, and slows at it
 *   3. the doors swing in, and the dark behind them lights
 *   4. the light comes out past them and takes the whole window
 *   5. sparkles scatter out of the white, and her name is underneath
 *
 * Beat two slows on purpose. An unbroken rush from the horizon to inside the
 * doorway gets to the gate while the doors are still shut and then has
 * nowhere to go, and the one thing the sequence is *about* — a door opening
 * — happens somewhere off the front of it. So the approach eases off at the
 * threshold, the doors have the screen to themselves for the best part of a
 * second, and the rush picks up again through them.
 *
 * The two handoffs are what make it read as one continuous thing rather
 * than three screens in a row:
 *
 *  - `onOpen` fires while the window is at full white, so the deck — six
 *    sections, fourteen timeline panels — is built behind a cover, the way
 *    the curtain builds it. Its cost lands in a beat of pure light instead
 *    of as a stutter mid-dissolve.
 *  - `onDone` fires a second later, when the last sparkle has gone. The
 *    scene is `pointer-events-none` by then, so the hero is live underneath
 *    from the moment it mounts — the tail is decoration over a page that
 *    already works, not a wait.
 */

/* ---------------------------------------------------------------
   The gate
   ---------------------------------------------------------------
   The castle is a painting, and its doors are painted shut. So they are
   covered by a drawn pair that opens — and the whole sequence hangs off
   one measurement: where that doorway sits in the picture.

   Everything below is a fraction of the artwork, taken off the file
   itself: the middle of the opening, and how big it is. Those numbers do
   three jobs at once, which is why they are worth having in one place —
   they crop the picture so the doorway lands where we want it on screen,
   they size the drawn doors onto it, and they are the point the rush
   scales about.

   Replace the painting and these are what want re-measuring. Nothing else
   in this file knows where the door is.
   --------------------------------------------------------------- */

/** The picture's own dimensions. */
const ART = { w: 1536, h: 1024 };
const ASPECT = ART.w / ART.h;

/**
 * The doorway, read straight off the painting in its own pixels.
 *
 * Five numbers, and every proportion in this file comes out of them: the
 * two jambs, the apex of the pointed arch, the springing line where the
 * jambs stop and the curve begins, and the sill.
 *
 * These are the whole measurement. Change the painting and this is the
 * block to re-measure — nothing else here knows where the door is.
 */
const DOOR_PX = { left: 719.4, right: 806.6, apex: 720.3, spring: 772, sill: 855.3 };

const DOOR_W = DOOR_PX.right - DOOR_PX.left;
const DOOR_H = DOOR_PX.sill - DOOR_PX.apex;

/** The middle of the opening, and its size, as fractions of the picture. */
const GATE = {
  x: (DOOR_PX.left + DOOR_PX.right) / 2 / ART.w,
  y: (DOOR_PX.apex + DOOR_PX.sill) / 2 / ART.h,
  w: DOOR_W / ART.w,
  h: DOOR_H / ART.h,
};

const AT_GATE = { left: `${(GATE.x * 100).toFixed(3)}%`, top: `${(GATE.y * 100).toFixed(3)}%` };

/*
 * The doorway's size on screen, both axes as a share of the picture's
 * *width* — one number drives both, so the drawn doors can never drift out
 * of proportion with the picture behind them.
 */
const GATE_W = GATE.w;
const GATE_H = GATE.h / ASPECT;

/* ---------------------------------------------------------------
   The clock
   ---------------------------------------------------------------
   Everything the window does is a fraction of SCENE_MS and lives in the
   `times` arrays below, so moving one beat is moving one number and the
   rest hold their place against it.

   The constants below are the exceptions, and each is wall-clock because it
   is about something outside that timeline: the doors and the light behind
   them are CSS animations with a clock of their own, handed these as custom
   properties rather than left to guess; the rest are other components'
   lives — when the deck is built, and when this one dies.
   --------------------------------------------------------------- */

/** The window's timeline: the approach, the threshold, the rush, the white. */
const SCENE_MS = 5000;

/** The doors: they have the screen to themselves for this. */
const DOOR_AT_MS = 1800;
const DOOR_FOR_MS = 800;

/**
 * And the dark behind them, coming up as they go.
 *
 * Six hundred milliseconds behind the doors rather than with them, because
 * the order is the point: a doorway that is already lit as it opens was
 * never dark, and the beat being sold here is a dark one that lights.
 */
const GLOW_AT_MS = 2400;
const GLOW_FOR_MS = 800;

/** Where the window is fully white — and so where the deck is built. */
const DECK_AT_MS = 4020;

/** The burst, thrown out of that white a beat before it starts to lift. */
const BURST_AT_MS = 4000;

/**
 * When the last sparkle has finished and the scene can go.
 *
 * Past `SCENE_MS` on purpose: the burst is thrown *out of* the white and
 * carries on over the hero for a second after the flash itself has gone.
 */
const END_MS = 6300;

/* ---------------------------------------------------------------
   The scatter
   ---------------------------------------------------------------
   Seeded rather than random, for the same reason the milestone weather is:
   a re-render must not re-throw the sparkles. Module scope, so the
   arrangement is cast once for the life of the tab and costs nothing on
   mount.
   --------------------------------------------------------------- */

function scatter(seed: number) {
  let s = (seed * 2654435761) >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

const between = (rnd: () => number, lo: number, hi: number) =>
  Math.round((lo + rnd() * (hi - lo)) * 100) / 100;

/**
 * Gold and blush — the invitation's own two, at full strength.
 *
 * No ivory or candlelight in here, tempting as they are: the burst is
 * thrown while the window is still white, and a pale sparkle on white is a
 * sparkle nobody sees. These have to hold against the flash first and
 * against her photograph second.
 */
const SPARK_COLORS = ["#D4AF37", "#BE8F22", "#E8B4C8", "#D98BAB", "#F0DFA8"];

/**
 * The burst: sparkles thrown from the middle of the white in every direction.
 *
 * Measured in `vmax` so the throw is a share of the *long* side of the
 * window — a sparkle sent 70 units clears the screen on a tall phone and on
 * a wide laptop alike, where `vw` would leave the phone's ceiling untouched
 * and `vh` would leave the laptop's edges bare.
 */
const BURST = (() => {
  const rnd = scatter(1201);
  const n = 26;
  return Array.from({ length: n }, (_, key) => {
    /* An even sweep with a little wander on it, rather than pure chance:
       twenty-six random angles leave gaps you can see, and a gap in a burst
       reads as a mistake rather than as nature. */
    const angle = ((key + between(rnd, -0.35, 0.35)) / n) * Math.PI * 2;
    /*
     * Kept inside the window rather than thrown clear of it. A sparkle sent
     * eighty units is off the screen in a third of its life, and a burst
     * where most of the field has already left is three sparkles in a
     * corner — the half-diagonal of a phone is about sixty of these units,
     * so this is a throw that mostly lands on the page.
     */
    const dist = between(rnd, 18, 58);
    return {
      key,
      tx: Math.round(Math.cos(angle) * dist * 100) / 100,
      ty: Math.round(Math.sin(angle) * dist * 100) / 100,
      size: between(rnd, 14, 34),
      dur: between(rnd, 1.1, 1.7),
      /* Off the back of the flash, and strung out over half a second — they
         keep arriving while the white lifts rather than all leaving with
         it. */
      delay: between(rnd, 0, 0.55),
      spin: between(rnd, -160, 200),
      color: SPARK_COLORS[Math.floor(rnd() * SPARK_COLORS.length) % SPARK_COLORS.length],
    };
  });
})();

/**
 * The sky over the castle, before the rush.
 *
 * Kept to the top half, which is where the painting's sky is — a gold
 * sparkle over the meadow is a gold sparkle lost in the flowers.
 */
const SKY = [
  { left: "12%", top: "14%", size: "h-5 w-5 sm:h-8 sm:w-8", color: "text-gold", delay: "0s" },
  { left: "78%", top: "11%", size: "h-4 w-4 sm:h-6 sm:w-6", color: "text-parchment", delay: "0.6s" },
  { left: "26%", top: "31%", size: "h-3.5 w-3.5 sm:h-5 sm:w-5", color: "text-gold", delay: "1.2s" },
  { left: "88%", top: "29%", size: "h-4 w-4 sm:h-6 sm:w-6", color: "text-gold", delay: "0.3s" },
  { left: "58%", top: "8%", size: "h-3 w-3 sm:h-4 sm:w-4", color: "text-parchment", delay: "1.8s" },
  { left: "5%", top: "44%", size: "h-3.5 w-3.5 sm:h-5 sm:w-5", color: "text-gold", delay: "0.9s" },
] as const;

/* ---------------------------------------------------------------
   The scene
   ---------------------------------------------------------------
   framer-motion for the layers over the window — the ground, the rush, the
   bloom and the flash — because they are a script with named beats and the
   beats have to line up. All four share one `duration`, so keeping them in
   step is a matter of moving numbers around inside `times` rather than of
   keeping four separate clocks honest.

   The two moves *inside* the gate are CSS instead, and that is not a
   preference. framer-motion computes an SVG element's transform-origin
   itself, from the element's bounding box, and overwrites whatever it was
   given — which a door cannot survive, because each leaf here is a whole
   painting with a clip on it and a clip does not shrink a bounding box. It
   would hinge the door on the middle of the meadow. So the doors and the
   light behind them keep their own clock, and are handed the beats they
   belong on as custom properties below.
   --------------------------------------------------------------- */

const SCENE = { duration: SCENE_MS / 1000 } as const;

/*
 * Every keyframe transition below hands `ease` an array — one entry per
 * segment — and never a single name, which is a trap rather than a style
 * choice.
 *
 * Given one easing for a keyframe animation, framer-motion eases the
 * *whole* progress and then reads the keyframes at that eased time. With
 * `times` on the same animation the two fight, and the beats land somewhere
 * neither of them asked for: the flash here used to be written with one
 * `easeInOut` and reached full white six hundred milliseconds early, which
 * put the deck's mount — pinned to the wall clock, and so still on time —
 * in the middle of a fade rather than behind a cover.
 *
 * An array is applied per segment, so `times` mean what they say. The array
 * has to be exactly one shorter than the keyframes.
 */

export function CastleIntro({ onOpen, onDone }: { onOpen: () => void; onDone: () => void }) {
  const reduce = useReducedMotion();
  const rootRef = useRef<HTMLDivElement>(null);

  /*
   * Both handoffs are one-shot. A skip can fire them early and the timers
   * below would otherwise fire them again on their own schedule — `onOpen`
   * twice is a harmless second `setState` on a mounted deck, and `onDone`
   * twice is not, because by then this component is gone.
   */
  const opened = useRef(false);
  const finished = useRef(false);

  const open = () => {
    if (opened.current) return;
    opened.current = true;
    onOpen();
  };
  const finish = () => {
    if (finished.current) return;
    finished.current = true;
    onDone();
  };

  /** Set by the skip, to cut the scene rather than play it out. */
  const [skipped, setSkipped] = useState(false);

  /*
   * True once the deck is mounted below. The only thing it governs is the
   * skip, and it has to: the scene outlives the handoff by a second of
   * sparkles, and a full-window button over a live invitation is a second
   * of swipes going nowhere.
   */
  const [entered, setEntered] = useState(false);

  /*
   * How wide the picture actually is, once `cover` has scaled it.
   *
   * The drawn doors have to land on the painted ones to within a pixel or
   * two, and their size is a share of that width — so it has to be the real
   * one. `max(100vw, 150vh)` is the same sum in CSS and stands in until
   * this runs, but it cannot be trusted on its own: a `fixed` element on
   * iOS Safari is the *small* viewport while `100vh` is the large one, and
   * the difference is a URL bar — about a tenth of the height, which is a
   * tenth of the way across the doorway.
   */
  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const fit = () => {
      const w = root.clientWidth;
      const h = root.clientHeight;
      root.style.setProperty("--scene-w", `${Math.max(w, h * ASPECT)}px`);
    };
    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(root);
    return () => ro.disconnect();
  }, []);

  /*
   * Asked for less motion, there is no honest short version of a rush at a
   * doorway: the whole thing *is* the movement. So it doesn't play at all,
   * and the invitation opens the way it did before there was a castle.
   */
  useEffect(() => {
    if (!reduce) return;
    open();
    finish();
    /* eslint-disable-next-line react-hooks/exhaustive-deps */
  }, [reduce]);

  useEffect(() => {
    if (reduce) return;
    const deck = window.setTimeout(() => {
      open();
      setEntered(true);
    }, DECK_AT_MS);
    const end = window.setTimeout(finish, END_MS);
    return () => {
      window.clearTimeout(deck);
      window.clearTimeout(end);
    };
    /* eslint-disable-next-line react-hooks/exhaustive-deps */
  }, [reduce]);

  /* A tap anywhere takes a guest straight in. Nothing advertises it — the
     opening is five seconds and worth seeing once — but a guest coming back
     for the venue for the third time should not have to sit through it. */
  const skip = () => {
    setSkipped(true);
    open();
    finish();
  };

  if (reduce || skipped) return null;

  return (
    <div
      ref={rootRef}
      /*
       * Not `aria-hidden`, though every painted thing inside it is. The one
       * element here that is not decoration is the skip, and a hidden
       * subtree takes its button out of the accessibility tree with
       * everything else — leaving a guest on a screen reader with four
       * seconds of nothing and no way past it.
       */
      /*
       * The root paints nothing. It cannot: the flash fades to reveal what
       * is underneath, and an opaque ground on the scene itself is what
       * would be underneath — the guest would watch the white lift off an
       * empty dawn and then have the hero appear on top of it a second
       * later, when the scene finally unmounted. The ground is a layer of
       * its own below, and it goes while the flash still covers for it.
       */
      className="pointer-events-none fixed inset-0 z-[95] overflow-hidden"
      style={
        {
          "--door-at": `${DOOR_AT_MS}ms`,
          "--door-for": `${DOOR_FOR_MS}ms`,
          "--glow-at": `${GLOW_AT_MS}ms`,
          "--glow-for": `${GLOW_FOR_MS}ms`,
        } as CSSProperties
      }
    >
      {/*
        The ground under the picture — the same dawn wash the curtain
        dissolves off and the hero comes up in. The painting covers it
        whole, so this is only ever seen in the moment before the file has
        decoded; what it buys is that that moment is a warm page rather than
        a hole. It leaves on the castle's own beat, in the window where the
        flash is at full white and nothing can be seen going.
      */}
      <motion.div
        aria-hidden
        className="royal-dawn absolute inset-0"
        initial={{ opacity: 1 }}
        animate={{ opacity: [1, 1, 0, 0] }}
        transition={{
          ...SCENE,
          times: [0, 0.8, 0.86, 1],
          ease: ["linear", "easeInOut", "linear"],
        }}
      />

      {/*
        Everything that is *there* — the picture, its gate and the sparkles
        over it — rushes forward together. Scaled about the doorway's own
        place in the window, so the point on screen that stays still as the
        world blows up is the gate and not the middle of the picture.
      */}
      <motion.div
        aria-hidden
        className="absolute inset-0"
        style={{ transformOrigin: `${AT_GATE.left} ${AT_GATE.top}` }}
        initial={{ scale: 1, opacity: 1 }}
        animate={{
          scale: [1, 1.04, 2.4, 3, 10, 10],
          /* Gone before the flash begins to lift, or a ten-times castle
             would be standing behind her name as the light fades off it. */
          opacity: [1, 1, 0, 0],
        }}
        transition={{
          scale: {
            ...SCENE,
            times: [0, 0.14, 0.38, 0.54, 0.8, 1],
            /*
             * Still, gathering, and then the threshold: the third segment is
             * the near-pause at the doors — a slow drift from 2.4 to 3, over
             * three-quarters of a second, which is enough movement that the
             * scene has not stopped and little enough that the doors are what
             * a guest is watching. Then it runs.
             *
             * Three is also about as far in as the painting bears looking at.
             * It is 1536 pixels wide and already shown at most of that, so
             * every further step is invention — soft, which suits the
             * artwork, until it is mush, which does not. Past the threshold
             * it hardly matters: by then the light is taking the window.
             */
            ease: ["easeInOut", "easeInOut", "linear", "easeIn", "linear"],
          },
          opacity: {
            ...SCENE,
            times: [0, 0.8, 0.86, 1],
            ease: ["linear", "easeInOut", "linear"],
          },
        }}
      >
        {/*
          The picture fills the window at every shape of screen, and the
          crop is chosen by the doorway: `object-position` set to the gate's
          own place in the artwork puts the gate at that same place on
          screen, whether the overflow is at the sides (a phone) or at the
          top and bottom (a laptop). Which is what lets one pair of numbers
          serve as the crop, the anchor for the drawn doors, and the point
          the rush flies at.
        */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={CASTLE_SCENE}
          alt=""
          width={ART.w}
          height={ART.h}
          decoding="async"
          fetchPriority="high"
          className="absolute inset-0 h-full w-full object-cover"
          style={{ objectPosition: `${AT_GATE.left} ${AT_GATE.top}` }}
        />

        <Gate />

        {SKY.map((s) => (
          <span
            key={s.left + s.top}
            /* The twinkle rides the wrapper rather than the drawing, because
               the drawing takes a class and nothing else — and a delay is the
               only way six of them don't blink as one. */
            className={`absolute animate-twinkle ${s.color} drop-shadow-[0_1px_3px_rgba(61,43,79,0.25)]`}
            style={{ left: s.left, top: s.top, animationDelay: s.delay }}
          >
            <Sparkle className={s.size} />
          </span>
        ))}
      </motion.div>

      {/*
        The light coming out of the doorway, on the window rather than in the
        gate — it has to outgrow the castle, and a glow inside the arch is
        clipped by the opening it is shining through.

        Square and enormous, centred on the gate: a `closest-side` radial has
        a round edge, so what spreads is a circle of light rather than a box
        of it, and at full scale the circle is wider than any window.
      */}
      <motion.div
        aria-hidden
        className="castle-bloom pointer-events-none absolute h-[150vmax] w-[150vmax]"
        style={{ ...AT_GATE, marginLeft: "-75vmax", marginTop: "-75vmax" }}
        initial={{ scale: 0.04, opacity: 0 }}
        animate={{
          scale: [0.04, 0.04, 0.3, 1.1, 1.5, 1.7],
          /*
           * It leaves with the flash, and that last stop is not tidying.
           * The flash is the thing that fades to reveal the hero; a bloom
           * left at full behind it is a sheet of gold sitting over her
           * photograph as the white comes off, which is what the light
           * spends the whole sequence earning the right not to be.
           */
          opacity: [0, 0, 0.6, 1, 1, 0],
        }}
        /* Nothing until 0.62, which is where the gate has finished lighting.
           Started any earlier it is a wash over a castle that has not opened
           yet, and the doorway — the one thing worth looking at — goes pale
           along with everything else. */
        transition={{
          ...SCENE,
          times: [0, 0.62, 0.72, 0.8, 0.86, 1],
          ease: ["linear", "easeIn", "easeIn", "linear", "easeInOut"],
        }}
      />

      {/*
        The white itself — and it is not white but the hero's own background
        turned up, which is what lets the next screen come out of it rather
        than be revealed behind it. At the peak this is an opaque copy of the
        page underneath, so the fade is the dawn wash settling back to
        strength with her name already standing in it.
      */}
      <motion.div
        aria-hidden
        className="castle-flash pointer-events-none absolute inset-0"
        initial={{ opacity: 0 }}
        animate={{ opacity: [0, 0, 1, 1, 0] }}
        transition={{
          ...SCENE,
          times: [0, 0.68, 0.8, 0.86, 1],
          ease: ["linear", "easeInOut", "linear", "easeInOut"],
        }}
      />

      {/*
        And the sparkles out of it, thrown from the middle of the light.

        CSS rather than framer-motion, unlike the three above: these are
        twenty-six elements doing one throw each with no beat to share, which
        is exactly the shape the milestone fields are — declarative,
        compositor-only, and the same cost whether there is one or fifty.
        Their delays are wall-clock against the scene's start, which is what
        puts the first of them in the frame the flash is fully white.
      */}
      <div aria-hidden className="pointer-events-none absolute inset-0">
        {BURST.map((b) => (
          <span
            key={b.key}
            className="castle-spark"
            style={
              {
                left: "50%",
                top: "52%",
                color: b.color,
                "--size": `${b.size}px`,
                "--tx": `${b.tx}vmax`,
                "--ty": `${b.ty}vmax`,
                "--spin": `${b.spin}deg`,
                "--dur": `${b.dur}s`,
                "--delay": `${BURST_AT_MS / 1000 + b.delay}s`,
              } as CSSProperties
            }
          >
            <span>
              <Sparkle className="h-full w-full" />
            </span>
          </span>
        ))}
      </div>

      {/* The way past it. Invisible, the whole window, and the one thing in
          here that takes a tap — until the invitation is underneath, at
          which point there is nothing left to skip and it gets out of the
          way. */}
      {!entered && (
        <button
          type="button"
          onClick={skip}
          className="pointer-events-auto absolute inset-0 z-10 cursor-default"
        >
          <span className="sr-only">Skip the opening</span>
        </button>
      )}
    </div>
  );
}

/* ---------------------------------------------------------------
   The doors
   ---------------------------------------------------------------
   The painting's own doors, cut in half and hung on hinges.

   The leaves are not drawn. They are two clipped copies of the picture
   itself, laid back over the doorway in exactly the place they came from —
   so with the doors shut the gate is pixel for pixel the painting, and what
   swings open is the oak somebody painted rather than a flat brown
   approximation of it sitting on top of a painting. Only what is *behind*
   them is drawn, because the painting has no behind.

   The box is the doorway's own rectangle, sized off the measurement above
   and placed at its measured middle. Inside it the drawing is in a viewBox
   of the same proportions with `preserveAspectRatio="none"`, so viewBox
   units *are* the doorway: 0 is its left jamb, 100 its right, and the arch
   is the one in the painting rather than a generic one.
   --------------------------------------------------------------- */

/**
 * The pointed arch, in doorway units: the opening is 100 wide, and `RISE`
 * tall in the same units, which is the painting's own proportion so nothing
 * inside is stretched out of shape.
 *
 * The radius follows from the springing line rather than being chosen: it
 * is the circle centred *on* that line — so the jamb runs into the curve
 * with no corner — that also passes through the apex at mid-span. Two
 * mirrored arcs of it meet in a point, which is the arch in the painting.
 */
const SPAN = 100;
const RISE = (SPAN * DOOR_H) / DOOR_W;
const SPRING = (SPAN * (DOOR_PX.spring - DOOR_PX.apex)) / DOOR_W;
const R = ((SPAN / 2) ** 2 + SPRING ** 2) / SPAN;

const ARCH = `M0 ${RISE} L0 ${SPRING} A${R} ${R} 0 0 1 50 0 A${R} ${R} 0 0 1 100 ${SPRING} L100 ${RISE} Z`;

/** Each leaf is half of it, closed on the middle. */
const LEAVES = [
  { side: "l", hinge: 0, d: `M0 ${RISE} L0 ${SPRING} A${R} ${R} 0 0 1 50 0 L50 ${RISE} Z` },
  { side: "r", hinge: SPAN, d: `M100 ${RISE} L100 ${SPRING} A${R} ${R} 0 0 0 50 0 L50 ${RISE} Z` },
] as const;

/**
 * The whole picture, in doorway units.
 *
 * One scale for both axes — the doorway's width over the painting's, which
 * is also its height over the painting's, because `RISE` was derived from
 * the same measurement. Placed so the doorway's top-left corner lands on
 * the viewBox origin, which is what makes a clipped copy line up with the
 * picture behind it to the pixel.
 */
const U = SPAN / DOOR_W;
const ART_IN_GATE = {
  x: -DOOR_PX.left * U,
  y: -DOOR_PX.apex * U,
  w: ART.w * U,
  h: ART.h * U,
};

function Gate() {
  return (
    <div
      className="absolute"
      style={{
        ...AT_GATE,
        /* A share of the picture's scaled width, both of them — see
           `--scene-w` above for why that width is measured rather than
           assumed, and why the CSS sum is only the fallback. */
        width: `calc(var(--scene-w, max(100vw, ${100 * ASPECT}vh)) * ${GATE_W.toFixed(6)})`,
        height: `calc(var(--scene-w, max(100vw, ${100 * ASPECT}vh)) * ${GATE_H.toFixed(6)})`,
        transform: "translate(-50%, -50%)",
      }}
    >
      <svg
        viewBox={`0 0 ${SPAN} ${RISE}`}
        preserveAspectRatio="none"
        className="block h-full w-full"
        aria-hidden
      >
        <defs>
          {/*
            The dark inside, before it lights.
            
            Radial and not a flat fill, which is the difference between a
            hall and a hole. A doorway painted one colour is a shape cut out
            of the picture; this one has a floor catching a little light low
            in the middle and goes to almost nothing at the jambs, which
            doubles as the shadow the painted arch used to cast on the doors
            and now has nothing to cast on.

            Never actually black, either. It sits in a pastel painting, and
            black in that company reads as a hole punched through the page
            rather than as a room behind it.
          */}
          <radialGradient id="ciDark" cx="50%" cy="78%" r="86%">
            <stop offset="0%" stopColor="#6E4F5E" />
            <stop offset="55%" stopColor="#43293F" />
            <stop offset="100%" stopColor="#261730" />
          </radialGradient>

          {/*
            Candlelight, and it has to be nearly white at the core. This is
            seen at three times the painting's size by the time it matters,
            through an opening that fills half the window — so a gentle glow
            at that scale is a grey smudge. The outer stop stays translucent
            so the dark it is coming out of survives at the edges, which is
            what keeps the opening deep rather than flat.
          */}
          <radialGradient id="ciGlow" cx="50%" cy="62%" r="72%">
            <stop offset="0%" stopColor="#FFFFFF" />
            <stop offset="45%" stopColor="#FFF8E4" />
            <stop offset="78%" stopColor="#F6DC93" stopOpacity="0.82" />
            <stop offset="100%" stopColor="#E8C86B" stopOpacity="0.3" />
          </radialGradient>

          <clipPath id="ciGateClip">
            <path d={ARCH} />
          </clipPath>
          {LEAVES.map((leaf) => (
            <clipPath key={leaf.side} id={`ciLeaf-${leaf.side}`}>
              <path d={leaf.d} />
            </clipPath>
          ))}
        </defs>

        {/* The doorway itself, then the light waiting in it. */}
        <path d={ARCH} fill="url(#ciDark)" />
        <g clipPath="url(#ciGateClip)">
          <ellipse
            className="castle-gate-glow"
            cx="50"
            cy={RISE * 0.62}
            rx={SPAN * 0.78}
            ry={RISE * 0.72}
            fill="url(#ciGlow)"
          />
        </g>

        {/*
          The leaves, over both. They swing in on their own outer edge,
          which scaling toward nothing does convincingly at this size and a
          rotation cannot do at all — SVG has no third axis to swing them on.

          The hinge is given in viewBox units rather than as a corner of the
          element, and that is the one fiddly part. `transform-box: fill-box`
          would be the natural way to say "the left edge of this leaf", but
          an element's fill box ignores its clip — and each leaf here *is* a
          whole picture with a clip on it, so fill-box would hand back the
          bounding box of the painting and swing the door about a point
          somewhere out in the meadow. View-box units are exact and say what
          they mean: 0 is the left jamb, 100 the right.
        */}
        {LEAVES.map((leaf) => (
          <g
            key={leaf.side}
            className="castle-door"
            clipPath={`url(#ciLeaf-${leaf.side})`}
            style={{ transformBox: "view-box", transformOrigin: `${leaf.hinge}px ${RISE / 2}px` }}
          >
            <image
              href={CASTLE_SCENE}
              x={ART_IN_GATE.x}
              y={ART_IN_GATE.y}
              width={ART_IN_GATE.w}
              height={ART_IN_GATE.h}
              preserveAspectRatio="none"
            />
          </g>
        ))}
      </svg>
    </div>
  );
}
