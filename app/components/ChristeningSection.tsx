"use client";

import { motion, useReducedMotion, type Variants } from "framer-motion";
import {
  BABY_NAME,
  PASTOR_NAME,
  GODMOTHERS,
  GODFATHERS,
  COLUMN_SEPARATOR,
} from "@/app/config";
import { Sparkle, CrossIcon } from "./Ornaments";
import { useSlideIsActive } from "./SlideActive";

/** The deck's easing — a quick start settling into place. */
const EASE = [0.22, 1, 0.36, 1];

const GROUP: Variants = {
  out: { transition: { staggerChildren: 0.04, staggerDirection: -1 } },
  in: { transition: { delayChildren: 0.05, staggerChildren: 0.07 } },
};

const LINE: Variants = {
  out: { opacity: 0, y: 16, transition: { duration: 0.25, ease: EASE } },
  in: { opacity: 1, y: 0, transition: { duration: 0.45, ease: EASE } },
};

/** Hairlines are drawn out from the middle rather than faded in. */
const RULE: Variants = {
  out: { opacity: 0, scaleX: 0, transition: { duration: 0.25, ease: EASE } },
  in: { opacity: 1, scaleX: 1, transition: { duration: 0.55, ease: EASE } },
};

/**
 * The upright between the two columns, drawn out from its middle — the same
 * gesture as a hairline, turned on its side. Slower, because it is longer, and
 * last, because it is the thing that says the two columns are one plate.
 */
const UPRIGHT: Variants = {
  out: { opacity: 0, scaleY: 0, transition: { duration: 0.3, ease: EASE } },
  in: { opacity: 1, scaleY: 1, transition: { duration: 0.7, delay: 0.1, ease: EASE } },
};

const CARD: Variants = {
  out: { opacity: 0, y: 26, scale: 0.97, transition: { duration: 0.3, ease: EASE } },
  in: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.55, ease: EASE } },
};

/** The medallion arrives on its own, a beat ahead of the words. */
const MEDALLION: Variants = {
  out: { opacity: 0, scale: 0.78, transition: { duration: 0.25, ease: EASE } },
  in: { opacity: 1, scale: 1, transition: { type: "spring", stiffness: 230, damping: 18 } },
};

/** The same cascade with the travel taken out, for `prefers-reduced-motion`. */
const STILL: Variants = {
  out: { opacity: 0, transition: { duration: 0.2 } },
  in: { opacity: 1, transition: { duration: 0.3 } },
};

/** One of the sparkles in the corners, each on its own offset loop. */
function FloatingSparkle({
  className,
  size,
  drift,
  duration,
  delay = 0,
  still,
}: {
  className: string;
  size: string;
  drift: number;
  duration: number;
  delay?: number;
  still: boolean;
}) {
  return (
    <motion.div
      aria-hidden
      className={`pointer-events-none absolute ${className}`}
      animate={still ? undefined : { y: [0, drift, 0] }}
      transition={{ duration, repeat: Infinity, ease: "easeInOut", delay }}
    >
      <Sparkle className={`${size} ${still ? "" : "animate-twinkle"}`} />
    </motion.div>
  );
}

/**
 * One side of the godparents plate. The two columns sit side by side even on
 * the narrowest phone: stacked, twelve names would run past the fold, and the
 * pairing of ninang and ninong is half the point of the list.
 */
function GodparentColumn({ title, names }: { title: string; names: string[] }) {
  return (
    <div className="min-w-0 flex-1">
      <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-goldDeep sm:text-xs sm:tracking-[0.22em] wide:text-sm">
        {title}
      </p>
      <div aria-hidden className="gilt-rule mx-auto mt-1.5 h-px w-10 sm:w-14 wide:mt-2.5 wide:w-16" />
      <ul className="mt-2 space-y-1 sm:mt-2.5 sm:space-y-1.5 wide:mt-3 wide:space-y-2">
        {names.map((name) => (
          <li
            key={name}
            className="truncate font-display text-sm leading-snug text-ink xs:text-base sm:text-lg wide:text-xl"
          >
            {name}
          </li>
        ))}
      </ul>
    </div>
  );
}

/**
 * Her dedication, sitting between her year and the date — because the
 * christening is part of the same day, not a separate invitation.
 *
 * It is the one page in the deck on chapel white rather than cream or blush,
 * which is what sets it apart from the party sections on either side of it.
 */
export function ChristeningSection() {
  const isActive = useSlideIsActive();
  const reduce = useReducedMotion();
  const still = Boolean(reduce);
  const state = isActive ? "in" : "out";

  const line = still ? STILL : LINE;
  const rule = still ? STILL : RULE;

  return (
    /*
      The gaps between blocks come in past `md`, and only the gaps.

      This is the longest page in the deck, and the root type scale at the top
      of globals.css makes every line of it a quarter taller on a tablet —
      which, left alone, pushed the officiant's line off the bottom of an iPad
      held upright. The type is the point of that scale, so what gives is the
      air between the blocks rather than the size of the words in them: a page
      set larger and spaced tighter still reads as larger.
    */
    /* The gutter comes off once the page splits, so the two columns can be a
       true half of the window each and the rule between them lands on its
       centre line. Nothing runs to the screen edge as a result: each column
       carries its own padding and its contents are capped and centred well
       inside that. */
    <div className="relative flex min-h-full flex-col items-center overflow-hidden bg-royalWhite px-gutter pb-nav pt-8 text-center md:pt-4 wide:px-0">
      <div aria-hidden className="pointer-events-none absolute inset-0 parchment-texture" />

      <FloatingSparkle
        className="left-[4%] top-[6%] text-gold sm:left-[10%] sm:top-[12%]"
        size="h-5 w-5 xs:h-6 xs:w-6 sm:h-8 sm:w-8"
        drift={18}
        duration={6}
        still={still}
      />
      <FloatingSparkle
        className="right-[5%] top-[9%] text-rose sm:right-[11%] sm:top-[15%]"
        size="h-4 w-4 xs:h-5 xs:w-5 sm:h-7 sm:w-7"
        drift={-16}
        duration={5.5}
        delay={0.7}
        still={still}
      />
      <FloatingSparkle
        className="bottom-[8%] left-[5%] text-rose sm:bottom-[13%] sm:left-[12%]"
        size="h-4 w-4 xs:h-5 xs:w-5 sm:h-7 sm:w-7"
        drift={15}
        duration={6.5}
        delay={1.2}
        still={still}
      />
      <FloatingSparkle
        className="bottom-[6%] right-[5%] text-gold sm:bottom-[11%] sm:right-[11%]"
        size="h-5 w-5 xs:h-6 xs:w-6 sm:h-8 sm:w-8"
        drift={-18}
        duration={7}
        delay={0.4}
        still={still}
      />

      {/*
        One column while the screen is taller than it is wide, two once it is
        not — and those two are a half of the window each.

        They were briefly unequal, the left taking a tenth more width to pull
        its paragraph from six lines to five. Even halves are the better
        trade: the rule between them lands on the centre line of the screen,
        which is where a printed order of service would put it, and the two
        sides read as one plate rather than as a column and a sidebar. What
        the left column loses in width it takes back in measure, since neither
        side now fills its half — the contents are capped and centred inside
        it, which is what keeps the line length readable when a half of a
        monitor is near a thousand pixels across.

        The verse still moves across to head the right column, where a plate of
        twelve short names was leaving a third of the page empty under it.

        Moving the verse costs the single column nothing. Stacked, the wrappers
        come out in order and their contents with them, so the reading order on
        a phone is what it always was: the paragraph, then the verse, then the
        names, then who reads them out.

        This is the longest page in the deck — a paragraph, a verse and twelve
        names — and on an iPad held sideways the officiant's line fell off the
        bottom of it and had to be scrolled to. Split in two it is the same
        page at half the height, and it fills the width instead of running as
        a narrow ribbon down the middle of it. Held upright there is height
        for all of it in one column, which is the page as drawn, so nothing
        splits.

        The order never changes: stacked, the wrappers come out in exactly the
        sequence the single column always had.
      */}
      <motion.div
        className="relative my-auto flex w-full max-w-md flex-col items-center sm:max-w-lg wide:max-w-none wide:flex-row wide:items-center wide:gap-0"
        initial={false}
        animate={state}
        variants={GROUP}
      >
      <motion.div
        className="flex w-full flex-col items-center wide:w-1/2 wide:flex-none wide:px-10 wide-lg:px-14"
        variants={GROUP}
      >
        {/* A cross in a gilt ring, with a halo behind it that breathes — the
            same candlelight the date numeral sits in, held a little softer. */}
        <motion.div variants={still ? STILL : MEDALLION} className="relative">
          {!still && (
            <motion.span
              aria-hidden
              className="absolute -inset-4 rounded-full bg-gold/15 blur-xl"
              animate={{ scale: [1, 1.18, 1], opacity: [0.5, 0.9, 0.5] }}
              transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
            />
          )}
          <span className="relative flex h-12 w-12 items-center justify-center rounded-full border border-gold/50 bg-parchment/70 text-goldDeep shadow-sm sm:h-14 sm:w-14">
            <CrossIcon className="h-6 w-6 sm:h-7 sm:w-7" />
          </span>
        </motion.div>

        <motion.p
          variants={line}
          className="mt-3 font-hand text-lg text-berry xs:text-xl sm:text-2xl wide:mt-4 wide:text-3xl"
        >
          Her dedication
        </motion.p>

        <motion.h2
          variants={line}
          className="mt-1 max-w-[18ch] text-balance font-display text-2xl italic leading-snug text-ink xs:text-3xl sm:max-w-none sm:text-4xl wide:mt-2 wide:text-5xl"
        >
          Dedicated to the King of kings
        </motion.h2>

        <motion.div
          aria-hidden
          variants={rule}
          className="gilt-rule mt-3 h-px w-28 xs:w-36 sm:mt-4 sm:w-48 md:mt-2 wide:mt-5 wide:w-40 wide-lg:w-48"
        />

        <motion.p
          variants={line}
          className="mt-3 max-w-[36ch] text-pretty text-sm leading-relaxed text-ink/70 sm:mt-4 sm:max-w-[48ch] sm:text-base md:mt-2 wide:mt-4 wide:text-lg wide:leading-loose"
        >
          Before the gowns and the crowns, she was already His. On the same day we crown our
          little princess, we give her back to the One who gave her to us — and welcome{" "}
          {BABY_NAME} into the family of God.
        </motion.p>

      </motion.div>

      {/*
        The gilt upright down the middle, and only once there is a middle for
        it to be down: stacked, the two wrappers are one column with a seam,
        and a rule across that seam would cut the page in half rather than
        divide it.

        It costs the columns no width, which is the whole reason it is built
        this way, and now also the reason the halves come out exact. The
        wrapper is a flex item of no width at all and the drawing hangs off the
        middle of it, so two columns of `w-1/2` with this between them add up
        to exactly the window and the drawing stands on the seam — which is the
        centre line of the screen. A wrapper with real width would push them
        off it, and the two halves would no longer be halves.

        There is no gap on either side of it for the same reason: the clearance
        the drawing needs is the columns' own padding, which they need anyway
        to keep their contents off the seam. A gap would come out of the halves.

        `contain` is what keeps the filigree square: the box is stretched to
        the taller column and the drawing fitted inside it at its own
        proportions, so it runs the full height of the plate and works out its
        own width from that — around forty pixels, comfortably inside the gap.
        `w-14` is a ceiling on that, for a column tall enough to want more.
      */}
      <div aria-hidden className="relative hidden w-0 flex-none self-stretch wide:block">
        {/* The half-width shift is `x` rather than a `-translate-x-1/2` class
            because the variants animate `scaleY`, and Motion composes the whole
            of `transform` itself — a Tailwind translate on the same element
            would be written over the moment the animation ran. */}
        <motion.div
          variants={still ? STILL : UPRIGHT}
          className="absolute inset-y-0 left-1/2 w-14 bg-contain bg-center bg-no-repeat"
          style={{ x: "-50%", backgroundImage: `url(${COLUMN_SEPARATOR})` }}
        />
      </div>

      {/* The plate of names, and who reads them out — its own column once
          there is width to spare and height to save. */}
      <motion.div
        className="flex w-full flex-col items-center wide:w-1/2 wide:flex-none wide:px-10 wide-lg:px-14"
        variants={GROUP}
      >
        {/* The dedication verse, set apart the way a verse is on the order of
            service — by its own setting and the air around it rather than by
            quote marks. It had a gilt upright down its left side, which went
            when the columns got one of their own: two of them a few inches
            apart read as a stray mark rather than a device. The indent went
            with it, since it was only ever there to clear it.

            The margin under it is what now holds it off the plate of names,
            which sits flush to it in two columns — see its `wide:mt-0`. */}
        <motion.figure
          variants={line}
          className="mb-5 mt-4 text-left sm:mt-5 md:mt-3 wide:mx-auto wide:mt-5"
        >
          <blockquote className="max-w-[36ch] font-display text-sm italic leading-relaxed text-royal sm:max-w-[44ch] sm:text-base wide:text-lg wide:leading-loose">
            &ldquo;For this child I prayed, and the Lord has granted me what I asked of Him.&rdquo;
          </blockquote>
          <figcaption className="mt-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-goldDeep sm:text-xs wide:text-sm">
            1 Samuel 1:27
          </figcaption>
        </motion.figure>

        {/* The people standing up with her. */}
        <motion.div
          variants={still ? STILL : CARD}
          /* Capped once the column is a half of the window rather than a share
             of a 4xl box. Left at `w-full` the plate would stretch to the best
             part of a thousand pixels to hold twelve short names, with the two
             lists drifting apart to the far edges of it. */
          className="mt-4 w-full rounded-2xl border border-gold/40 bg-parchment/70 px-4 py-4 shadow-sm sm:mt-5 sm:px-7 sm:py-5 md:mt-3 md:py-4 wide:mt-0 wide:max-w-lg wide:px-8 wide:py-5"
        >
          <p className="font-hand text-base text-berry xs:text-lg sm:text-xl wide:text-2xl">
            Standing with her
          </p>
          <div className="mt-3 flex items-start gap-3 sm:mt-4 sm:gap-6 md:mt-2 wide:mt-5 wide:gap-8">
            <GodparentColumn title="Godmothers" names={GODMOTHERS} />
            {/* A gilt upright between the columns instead of a gap, so the two
                lists read as one plate rather than two stray stacks. */}
            <div
              aria-hidden
              className="w-px self-stretch bg-gradient-to-b from-transparent via-gold/50 to-transparent"
            />
            <GodparentColumn title="Godfathers" names={GODFATHERS} />
          </div>
        </motion.div>

        <motion.p
          variants={line}
          className="mt-3 flex items-center justify-center gap-2 text-xs text-ink/70 sm:mt-4 sm:text-sm md:mt-2 wide:mt-4 wide:text-base"
        >
          <CrossIcon className="h-3.5 w-3.5 flex-none text-goldDeep sm:h-4 sm:w-4" />
          <span>Officiated by {PASTOR_NAME}</span>
        </motion.p>
      </motion.div>
      </motion.div>
    </div>
  );
}
