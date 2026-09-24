"use client";

import { useEffect, useId, useMemo, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import type { Ambience } from "@/app/config";
import { useSlideIsActive } from "./SlideActive";
import {
  Apple,
  Bird,
  Blossom,
  Bubble,
  Butterfly,
  Coconut,
  Gem,
  Leaf,
  Petal,
  Snowflake,
  Spark,
  Wand,
  WAND_GRIP,
  WAND_TIP,
} from "./MilestoneMotifs";

/**
 * Something in the air over every month of her year.
 *
 * Each page gets the weather of its own film: apples for Snow White, snow for
 * Elsa, bubbles for Ariel, and on the last page — the only one with a story
 * rather than a scatter — a wand that waves itself and lights up.
 *
 * Which page gets what is set in `config.ts` beside the photo and the tint,
 * so the whole look of a month still reads off one line of that table.
 *
 * Two things govern when it runs:
 *
 *  - It is mounted only while its panel is the one on screen. A field is a
 *    few dozen running animations, and twelve of those behind the swipe
 *    would cost the rail its frame rate for weather nobody is looking at.
 *  - It starts with the swipe. The photo settles, the princess steps in, and
 *    the weather begins on the back of that — the fall is something the page
 *    does on arrival, not something it was already doing. Nothing is ever
 *    caught mid-flight on a page you have only just reached.
 */

/**
 * The beat between the swipe landing and the weather starting.
 *
 * Enough for the photo to have settled and the princess to be stepping in,
 * so the two entrances don't talk over each other — and no more than that.
 * Every particle's own stagger is stacked on top of this, so anything spent
 * here is spent again before the first apple is visible.
 */
const AFTER_TRANSITION_MS = 400;

/*
 * The particles are placed by a seeded shuffle rather than by Math.random.
 *
 * Every panel has to look scattered, but the *same* panel has to look the
 * same each time React re-renders it, or a parent's state change would
 * teleport half the petals. Seeding by the month gives every page its own
 * arrangement and gives that arrangement a memory.
 */
function scatter(seed: number) {
  let s = (seed * 2654435761) >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

/** A number somewhere in [lo, hi), to two places — CSS doesn't need more. */
const between = (rnd: () => number, lo: number, hi: number) =>
  Math.round((lo + rnd() * (hi - lo)) * 100) / 100;

const pick = <T,>(rnd: () => number, list: readonly T[]) =>
  list[Math.floor(rnd() * list.length) % list.length];

/** One particle's cast: where it goes, how long it takes, what it looks like. */
type Bit = {
  key: number;
  /** Position along the edge it enters from, as a percentage. */
  at: number;
  size: number;
  dur: number;
  delay: number;
  peak: number;
  sway: number;
  wob: number;
  /** Wingbeat, for the two fields that have wings. Ignored by the rest. */
  flap: number;
  color: string;
};

/**
 * Casts `count` particles across the panel.
 *
 * All of them start from their own edge when the page lands — you arrive and
 * the fall begins, rather than arriving at one already under way. The only
 * thing spread out is the going-off, by a second or so, so a field enters as
 * weather rather than as a curtain coming down.
 */
function cast(
  seed: number,
  count: number,
  spec: {
    size: [number, number];
    dur: [number, number];
    peak: [number, number];
    sway: [number, number];
    wob: [number, number];
    colors: readonly string[];
    /**
     * How much of the entering edge to use, as a percentage.
     *
     * Full width for anything falling or rising — those cross the whole page
     * either way. The two fields that travel *sideways* are the ones that
     * need it: a lane is a fixed height up the page, so a bird cast at 90%
     * would spend its whole flight behind the caption.
     */
    at?: [number, number];
    /**
     * How far apart to set the field going, in seconds.
     *
     * Never negative, and that is the point: a negative delay would drop a
     * particle into the middle of a crossing it began before you arrived, and
     * the page would greet you with a fall already in progress. Everything
     * starts from its own edge when the panel lands.
     *
     * The spread is only so the field doesn't come down as one rank. Keep it
     * short — it is dead time on the front of the effect, and shorter still
     * for a field of three or four, where there is no crowd to cover for a
     * straggler.
     */
    stagger?: [number, number];
  },
): Bit[] {
  const rnd = scatter(seed);
  const at = spec.at ?? [2, 98];
  const stagger = spec.stagger ?? [0, 1.3];
  return Array.from({ length: count }, (_, key) => ({
    key,
    at: between(rnd, at[0], at[1]),
    size: between(rnd, spec.size[0], spec.size[1]),
    dur: between(rnd, spec.dur[0], spec.dur[1]),
    delay: between(rnd, stagger[0], stagger[1]),
    peak: between(rnd, spec.peak[0], spec.peak[1]),
    sway: between(rnd, spec.sway[0], spec.sway[1]),
    wob: between(rnd, spec.wob[0], spec.wob[1]),
    /* Fast, and never twice the same: four birds beating in time read as one
       animated GIF rather than as four birds. */
    flap: between(rnd, 0.24, 0.42),
    color: pick(rnd, spec.colors),
  }));
}

/** The custom properties a lane reads. */
function lane(b: Bit, axis: "x" | "y"): React.CSSProperties {
  return {
    [axis === "x" ? "--x" : "--y"]: `${b.at}%`,
    "--size": `${b.size}px`,
    "--dur": `${b.dur}s`,
    "--delay": `${b.delay}s`,
    "--peak": b.peak,
    "--sway": `${b.sway}px`,
    "--wob": `${b.wob}s`,
    "--flap": `${b.flap}s`,
  } as React.CSSProperties;
}

/**
 * A field of one drawing, falling or rising or blowing through.
 *
 * `journey` is the long trip across the panel and `wobble` is what the
 * drawing does on the way; keeping them apart is what stops thirty petals
 * from moving as one sheet.
 */
function Field({
  bits,
  journey,
  wobble,
  render,
}: {
  bits: Bit[];
  /* The `-now` pair are the same trips with the run-up taken off — see the
     keyframes in globals.css. */
  journey: "mk-fall" | "mk-rise" | "mk-cross" | "mk-rise-now" | "mk-cross-now";
  wobble: string;
  render: (b: Bit) => React.ReactNode;
}) {
  const across = journey.startsWith("mk-cross");
  return (
    <>
      {bits.map((b) => (
        <span
          key={b.key}
          className={`mk-lane ${journey}${across ? " mk-lane-x" : ""}`}
          style={lane(b, across ? "y" : "x")}
        >
          <span className="mk-sprite">
            <span className={`mk-wobble ${wobble}`}>{render(b)}</span>
          </span>
        </span>
      ))}
    </>
  );
}

/* ---------------------------------------------------------------
   The palettes
   ---------------------------------------------------------------
   Literal hexes rather than the Tailwind accents, and on purpose: the
   accent colours are text colours, picked to hold AA contrast on their
   month's tint. These are the opposite job — they sit over a photograph and
   want to be soft enough to read as light rather than as stickers. Each set
   is three or four shades so a field isn't one colour repeated.
   --------------------------------------------------------------- */

const PALETTE = {
  /** Month zero: a nursery's flowers, barely there. */
  newborn: ["#F6DCE6", "#FFF3F6", "#EFD3DE", "#FBE6EC"],
  /** Snow White — her apple, and a windfall one gone dark. */
  apple: ["#C2273A", "#D8404F", "#A81F31", "#E1566A"],
  /** Aurora's butterflies: her pink, her blue, and the dawn between them. */
  aurora: ["#E9A2C0", "#C48BD6", "#F3C4D8", "#A9AFE4"],
  /** Elsa — white with the cold in it. */
  frost: ["#FFFFFF", "#E3F0F8", "#CFE4F2", "#F2FAFF"],
  /** Anna's autumn, and the same leaves on Pocahontas's wind. Reds and golds
      with no deep brown in them: month five is a *brown* costume, and a brown
      leaf crossing it simply isn't there. */
  autumn: ["#C4632A", "#D98F35", "#B93A2B", "#E0A94A", "#CE7B22"],
  /** Ariel's sea. */
  sea: ["#7FD3E8", "#A9E4F0", "#5EBBD8", "#CFF1F8"],
  /** Jasmine's emeralds. Saturated where most of these palettes are soft:
      month seven is a pale blue page, and a pastel gem on it would be a
      smudge rather than a stone. */
  emerald: ["#1E9E6A", "#12B57E", "#0E7C52", "#3FCB96", "#17A88C"],
  /** Rapunzel's tower garden — her purple, and the sun's gold. */
  tower: ["#C9A7E8", "#F3E0A8", "#E5C9F2", "#FBEFC4", "#D9B6EE"],
  /** Belle's roses. */
  rose: ["#C7283F", "#E05068", "#A81F35", "#EE8098"],
  /** Cinderella's bluebirds. */
  bluebird: ["#5FA8D8", "#7FC0E6", "#4A8FC4", "#93CDEE"],
} as const;

/* ---------------------------------------------------------------
   The twelve
   --------------------------------------------------------------- */

function Weather({ kind, seed }: { kind: Ambience; seed: number }) {
  /* A bubble's fill is a gradient, and a gradient needs an id that is unique
     in the document — this panel's stem for all of them. */
  const bubbleId = useId().replace(/[^a-zA-Z0-9-]/g, "");

  /*
   * One memo for the whole page rather than one per branch: hooks can't be
   * called conditionally, and casting all twelve fields to use one would be
   * a dozen scatters per swipe for eleven fields nobody sees.
   */
  const bits = useMemo(() => {
    switch (kind) {
      case "flower-fall":
        return cast(seed, 16, {
          size: [12, 26],
          dur: [8, 15],
          peak: [0.55, 0.9],
          sway: [10, 26],
          wob: [2.6, 5],
          colors: PALETTE.newborn,
        });
      case "apple-fall":
        return cast(seed, 11, {
          size: [16, 30],
          dur: [7, 12],
          peak: [0.7, 0.95],
          sway: [8, 22],
          wob: [2.4, 4.4],
          colors: PALETTE.apple,
        });
      case "butterflies":
        return cast(seed, 3, {
          size: [30, 46],
          /* Half what they were. A butterfly that takes sixteen seconds to
             cross is a butterfly you never see finish, and the climb is the
             whole effect. */
          dur: [7, 10.5],
          peak: [0.85, 1],
          sway: [22, 46],
          wob: [3.4, 5.6],
          /* Straight off the swipe, one just behind the next. */
          stagger: [0, 0.5],
          colors: PALETTE.aurora,
        });
      case "snow-fall":
        return cast(seed, 26, {
          size: [8, 22],
          dur: [10, 19],
          peak: [0.5, 0.9],
          sway: [8, 20],
          wob: [3, 6],
          colors: PALETTE.frost,
        });
      case "leaf-fall":
        return cast(seed, 15, {
          size: [18, 34],
          dur: [8, 14],
          peak: [0.65, 0.95],
          sway: [14, 32],
          wob: [2.2, 4.2],
          colors: PALETTE.autumn,
        });
      case "leaf-wind":
        return cast(seed, 8, {
          size: [20, 38],
          dur: [7, 12],
          peak: [0.7, 1],
          sway: [0, 0],
          wob: [3, 5],
          /* Clear of the caption: the swirl throws a leaf a radius below its
             lane, so the lowest lane has to stop short of the words by more
             than the leaf is wide. */
          at: [8, 62],
          colors: PALETTE.autumn,
        });
      case "bubbles":
        return cast(seed, 18, {
          size: [10, 34],
          dur: [8, 16],
          peak: [0.5, 0.85],
          sway: [10, 26],
          wob: [2.8, 5.4],
          colors: PALETTE.sea,
        });
      case "gem-fall":
        return cast(seed, 12, {
          size: [13, 26],
          dur: [6.5, 11],
          peak: [0.75, 1],
          sway: [8, 20],
          wob: [2.2, 4],
          colors: PALETTE.emerald,
        });
      case "flower-rise":
        return cast(seed, 14, {
          size: [12, 26],
          dur: [9, 16],
          peak: [0.6, 0.95],
          sway: [10, 24],
          wob: [2.8, 5.2],
          colors: PALETTE.tower,
        });
      case "coconut-fall":
        return cast(seed, 8, {
          size: [20, 38],
          dur: [4.5, 8],
          peak: [0.8, 1],
          sway: [2, 7],
          wob: [1.6, 2.8],
          colors: ["#6B4527", "#7A5230", "#5B381E"],
        });
      case "rose-petals":
        return cast(seed, 18, {
          size: [11, 24],
          dur: [7, 13],
          peak: [0.6, 0.95],
          sway: [12, 30],
          wob: [2.2, 4.4],
          colors: PALETTE.rose,
        });
      case "birds":
        return cast(seed, 4, {
          size: [24, 38],
          /* A bird crosses a phone screen in a few seconds or it isn't
             flying, it's drifting. */
          dur: [5.5, 8.5],
          peak: [0.85, 1],
          sway: [10, 26],
          wob: [3, 5],
          /* Birds belong in the sky, which on these photographs is the top
             third — and it keeps them off her face as well as off the words. */
          at: [7, 40],
          /* In as she lands, and strung out rather than in formation. */
          stagger: [0, 0.6],
          colors: PALETTE.bluebird,
        });
      default:
        return [];
    }
  }, [kind, seed]);

  switch (kind) {
    case "flower-fall":
      return (
        <Field
          bits={bits}
          journey="mk-fall"
          wobble="mk-tumble"
          render={(b) => <Blossom color={b.color} detail="#FFFDF6" />}
        />
      );

    case "apple-fall":
      return (
        <Field bits={bits} journey="mk-fall" wobble="mk-tumble" render={(b) => <Apple color={b.color} />} />
      );

    case "butterflies":
      return (
        <Field
          bits={bits}
          journey="mk-rise-now"
          wobble="mk-flutter"
          render={(b) => <Butterfly color={b.color} />}
        />
      );

    case "snow-fall":
      return (
        <Field bits={bits} journey="mk-fall" wobble="mk-drift" render={(b) => <Snowflake color={b.color} />} />
      );

    case "leaf-fall":
      return (
        <Field bits={bits} journey="mk-fall" wobble="mk-tumble" render={(b) => <Leaf color={b.color} />} />
      );

    /*
     * The one field that isn't a scatter. The leaves blow in from the left,
     * loop once in the middle of the panel and blow on out — three nested
     * movements, where every other field needs two, so it is spelled out
     * here rather than bent into `Field`.
     */
    case "leaf-wind":
      return (
        <>
          {bits.map((b) => (
            <span
              key={b.key}
              className="mk-lane mk-lane-x mk-cross"
              style={{ ...lane(b, "y"), ["--r" as string]: `${Math.round(b.size * 1.1)}px` }}
            >
              <span className="mk-sprite">
                <span className="mk-swirl">
                  <span className="mk-spin">
                    <Leaf color={b.color} />
                  </span>
                </span>
              </span>
            </span>
          ))}
        </>
      );

    case "bubbles":
      return (
        <Field
          bits={bits}
          journey="mk-rise"
          wobble="mk-drift"
          render={(b) => <Bubble color={b.color} id={`${bubbleId}-b${b.key}`} />}
        />
      );

    case "gem-fall":
      return (
        <Field bits={bits} journey="mk-fall" wobble="mk-tumble" render={(b) => <Gem color={b.color} />} />
      );

    case "flower-rise":
      return (
        <Field
          bits={bits}
          journey="mk-rise"
          wobble="mk-drift"
          render={(b) => <Blossom color={b.color} detail="#FFFDF6" />}
        />
      );

    case "coconut-fall":
      return (
        <Field bits={bits} journey="mk-fall" wobble="mk-rock" render={(b) => <Coconut color={b.color} />} />
      );

    case "rose-petals":
      return (
        <Field bits={bits} journey="mk-fall" wobble="mk-tumble" render={(b) => <Petal color={b.color} />} />
      );

    case "birds":
      return (
        <Field
          bits={bits}
          journey="mk-cross-now"
          wobble="mk-glide"
          render={(b) => <Bird color={b.color} />}
        />
      );

    case "magic-wand":
      return <MagicWand />;

    default:
      return null;
  }
}

/* ---------------------------------------------------------------
   The last page
   ---------------------------------------------------------------
   Her own month, and the only one where something happens rather than
   drifts: the wand comes in from the right, shakes itself through the
   spell, settles pointing at the middle of the page, and the light goes
   off the end of it.

   framer-motion here and not CSS, unlike every field above. This is one
   element following a script with named beats, and the beats have to line
   up across three of them — the travel, the wave and the light. Giving all
   three the same `duration` and `repeatDelay` and moving the beats around
   inside `times` keeps them in step by construction.
   --------------------------------------------------------------- */

/** One whole cast, in seconds. The beats below are fractions of it. */
const CAST = 5.4;
/** A breath between casts, so it reads as a spell and not as a loop. */
const BETWEEN = 1.1;

const CYCLE = { duration: CAST, repeat: Infinity, repeatDelay: BETWEEN } as const;

function MagicWand() {
  return (
    /*
     * The wrapper puts the wand's *tip* on the middle of the panel rather
     * than the wand's box — the offset is the tip's own place in that box,
     * from MilestoneMotifs — so "points at the middle" is true of the star
     * and not merely of the picture.
     */
    <div
      className="absolute left-1/2 top-1/2 w-[132px] xs:w-[152px] sm:w-[184px]"
      style={{ transform: `translate(-${WAND_TIP.left}, -${WAND_TIP.top})` }}
    >
      {/*
        Beat one: in from the right, held out there for the spell, over to
        the middle for the point, and away the way it came.

        It leaves rather than fading where it stands. A wand that dissolves
        on the spot looks like the page giving up halfway; a wand that is
        taken back off is somebody holding it.
      */}
      <motion.div
        initial={{ x: "62vw", opacity: 0 }}
        animate={{
          x: ["62vw", "17vw", "17vw", "0vw", "0vw", "0vw", "34vw"],
          opacity: [0, 1, 1, 1, 1, 1, 0],
        }}
        transition={{ ...CYCLE, times: [0, 0.18, 0.5, 0.64, 0.86, 0.9, 1], ease: "easeOut" }}
      >
        {/*
          Beat two: the spell itself. It pivots on the grip, so the star on
          the end throws the widest arc — which is what makes it read as a
          wrist flicking rather than a stick sliding about.
        */}
        <motion.div
          className="relative"
          style={{ transformOrigin: WAND_GRIP }}
          initial={{ rotate: 14 }}
          animate={{ rotate: [14, 6, -22, 16, -19, 13, -7, 0, 0, 12] }}
          transition={{
            ...CYCLE,
            times: [0, 0.16, 0.23, 0.3, 0.37, 0.44, 0.51, 0.64, 0.9, 1],
            ease: "easeInOut",
          }}
        >
          <Wand className="block w-full drop-shadow-[0_2px_10px_rgba(155,47,96,0.35)]" />

          {/* Beat three: the light, centred on the star and riding with it. */}
          {/* Sized against the wand rather than the page: big enough to be a
              flash off the star, small enough that it never becomes a white
              sheet over her face — which is what the whole page is of. */}
          <motion.div
            className="pointer-events-none absolute w-[118%]"
            style={{
              left: WAND_TIP.left,
              top: WAND_TIP.top,
              translateX: "-50%",
              translateY: "-50%",
            }}
            initial={{ scale: 0, opacity: 0 }}
            animate={{
              scale: [0, 0, 0.3, 1.05, 0.82, 0.95, 0.5, 0.5],
              opacity: [0, 0, 0.45, 0.95, 0.85, 0.7, 0, 0],
            }}
            /* Spent by 0.9, which is where the wand starts to leave — the
               light has to have gone out before the hand takes it away. */
            transition={{
              ...CYCLE,
              times: [0, 0.58, 0.63, 0.7, 0.77, 0.84, 0.9, 1],
              ease: "easeOut",
            }}
          >
            <Spark className="block w-full" />
          </motion.div>
        </motion.div>
      </motion.div>
    </div>
  );
}

/**
 * The layer itself. Sits over the photograph and over the caption — these
 * are small, soft and moving, and something falling *behind* the words reads
 * as a texture in the picture rather than as weather in the room.
 */
export function MilestoneAmbience({ kind, seed }: { kind?: Ambience; seed: number }) {
  const isActive = useSlideIsActive();
  const reduce = useReducedMotion();

  /*
   * Held back until the panel's own entrance has played out. `armed` also
   * falls back to false the moment the panel leaves, which unmounts the
   * field — so the weather starts from nothing again on the way back rather
   * than being caught mid-flight.
   */
  const [armed, setArmed] = useState(false);
  useEffect(() => {
    if (!isActive) {
      setArmed(false);
      return;
    }
    const t = window.setTimeout(() => setArmed(true), AFTER_TRANSITION_MS);
    return () => window.clearTimeout(t);
  }, [isActive]);

  if (!kind || reduce || !armed) return null;

  return (
    <div aria-hidden className="mk-field">
      <Weather kind={kind} seed={seed} />
    </div>
  );
}
