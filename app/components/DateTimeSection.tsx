"use client";

import { motion, useReducedMotion, type Variants } from "framer-motion";
import { PARTY_DATE, PARTY_TIME } from "@/app/config";
import { Crown, Sparkle, ClockIcon, SwimsuitIcon } from "./Ornaments";
import { useSlideIsActive } from "./SlideActive";

/** The deck's easing — a quick start settling into place. */
const EASE = [0.22, 1, 0.36, 1];

/* The page assembles itself as the swipe lands, the same way a month of her
   year does, and unwinds when it leaves so it plays again on the way back. */
const GROUP: Variants = {
  out: { transition: { staggerChildren: 0.04, staggerDirection: -1 } },
  in: { transition: { delayChildren: 0.05, staggerChildren: 0.08 } },
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

const CARD: Variants = {
  out: { opacity: 0, y: 26, scale: 0.97, transition: { duration: 0.3, ease: EASE } },
  in: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.55, ease: EASE } },
};

/** The one number everybody came for, so it arrives with a little spring. */
const NUMERAL: Variants = {
  out: { opacity: 0, scale: 0.72, transition: { duration: 0.25, ease: EASE } },
  in: { opacity: 1, scale: 1, transition: { type: "spring", stiffness: 240, damping: 17 } },
};

/** The same cascade with the travel taken out, for `prefers-reduced-motion`. */
const STILL: Variants = {
  out: { opacity: 0, transition: { duration: 0.2 } },
  in: { opacity: 1, transition: { duration: 0.3 } },
};

/**
 * One of the sparkles drifting around the date. They twinkle on their own in
 * CSS and drift on a longer, offset loop here, so no two are ever in step.
 */
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

export function DateTimeSection() {
  const isActive = useSlideIsActive();
  const reduce = useReducedMotion();
  const still = Boolean(reduce);
  const state = isActive ? "in" : "out";

  const line = still ? STILL : LINE;
  const rule = still ? STILL : RULE;

  // PARTY_DATE reads "Saturday, October 17, 2026".
  const [weekdayPart, monthDayPart, yearPart] = PARTY_DATE.split(",").map((p) => p.trim());
  const weekday = weekdayPart.toUpperCase();
  const [monthName, day] = monthDayPart.split(" ");
  const month = monthName.toUpperCase();
  const year = yearPart;

  /*
   * PARTY_TIME reads "10:00 AM – 2:00 PM". Both halves carry a meridiem here,
   * but they need not — written "2:00 – 5:00 PM" it sits only on the closing
   * time, and an opening time shown bare is the kind of thing that gets a
   * guest to a pool party four hours early.
   */
  const [openRaw, closeRaw] = PARTY_TIME.split(/[–—-]/).map((p) => p.trim());
  const meridiem = /[ap]\.?m\.?/i.exec(closeRaw ?? "")?.[0] ?? "";
  const opens = /[ap]\.?m\.?/i.test(openRaw) ? openRaw : `${openRaw} ${meridiem}`.trim();
  const closes = closeRaw ?? "";

  return (
    <div className="relative flex min-h-full flex-col items-center overflow-hidden bg-mist px-gutter pb-nav pt-8 text-center">
      <div aria-hidden className="pointer-events-none absolute inset-0 parchment-texture" />

      {/* Tucked into the corners, where the card never reaches — even on a
          phone, where it runs nearly the full width of the screen. */}
      <FloatingSparkle
        className="left-[5%] top-[7%] text-gold sm:left-[12%] sm:top-[12%]"
        size="h-5 w-5 xs:h-6 xs:w-6 sm:h-9 sm:w-9"
        drift={-18}
        duration={5}
        still={still}
      />
      <FloatingSparkle
        className="right-[6%] top-[10%] text-roseDeep sm:right-[13%] sm:top-[16%]"
        size="h-4 w-4 xs:h-5 xs:w-5 sm:h-7 sm:w-7"
        drift={20}
        duration={6}
        delay={0.6}
        still={still}
      />
      <FloatingSparkle
        className="bottom-[9%] left-[8%] text-roseDeep sm:bottom-[14%] sm:left-[16%]"
        size="h-4 w-4 xs:h-5 xs:w-5 sm:h-7 sm:w-7"
        drift={16}
        duration={5.5}
        delay={0.3}
        still={still}
      />
      <FloatingSparkle
        className="bottom-[7%] right-[7%] text-gold sm:bottom-[12%] sm:right-[14%]"
        size="h-5 w-5 xs:h-6 xs:w-6 sm:h-8 sm:w-8"
        drift={-20}
        duration={6.5}
        delay={1.1}
        still={still}
      />

      <motion.div
        className="relative my-auto flex w-full flex-col items-center"
        initial={false}
        animate={state}
        variants={GROUP}
      >
        {/* The crown keeps breathing after it has arrived, so the page is never
            completely still while you read it. */}
        <motion.div variants={line}>
          <motion.div
            animate={still ? undefined : { y: [0, -6, 0] }}
            transition={{ duration: 4.5, repeat: Infinity, ease: "easeInOut" }}
          >
            <Crown className="h-7 w-auto text-gold drop-shadow-sm xs:h-8 sm:h-11" />
          </motion.div>
        </motion.div>

        <motion.p variants={line} className="mt-3 font-hand text-lg text-berry xs:text-xl sm:text-2xl">
          Save the date
        </motion.p>

        <motion.h2
          variants={line}
          className="mt-1 font-display text-2xl italic leading-snug text-ink xs:text-3xl sm:text-4xl"
        >
          A royal splash
        </motion.h2>

        <motion.div
          aria-hidden
          variants={rule}
          className="gilt-rule mt-4 h-px w-28 xs:w-36 sm:w-48"
        />

        {/* A gilt-framed card, like the date panel on a real invitation. */}
        <motion.div
          variants={still ? STILL : CARD}
          className="relative mt-5 w-full max-w-md overflow-hidden rounded-2xl border border-gold/40 bg-parchment/70 px-5 py-6 shadow-sm sm:mt-7 sm:max-w-lg sm:px-10 sm:py-9"
        >
          {/* A sheen crossing the gilt every few seconds, the way light moves
              over foil when the card is tilted. */}
          {!still && (
            <motion.div
              aria-hidden
              className="pointer-events-none absolute inset-y-0 -left-1/4 w-1/4 skew-x-12 bg-gradient-to-r from-transparent via-goldSoft/50 to-transparent"
              animate={{ x: ["0%", "500%"] }}
              transition={{ duration: 3.4, repeat: Infinity, repeatDelay: 3.6, ease: "easeInOut" }}
            />
          )}

          <p className="text-[11px] font-medium uppercase tracking-[0.35em] text-goldDeep sm:text-xs">
            {weekday}
          </p>

          {/* Flanking rules are real hairlines rather than runs of underscores,
              so they shrink with the viewport instead of forcing the row wider
              than a phone screen. */}
          <div className="mt-3 flex items-center justify-center gap-3 sm:gap-4 sm:mt-4">
            <span aria-hidden className="gilt-rule h-px w-8 xs:w-12 sm:w-16" />
            <span className="font-display text-xl font-medium tracking-[0.2em] text-ink xs:text-2xl sm:text-3xl">
              {month}
            </span>
            <span aria-hidden className="gilt-rule h-px w-8 xs:w-12 sm:w-16" />
          </div>

          <div className="relative mt-1 flex items-center justify-center">
            {/* Candlelight behind the numeral, slowly guttering. */}
            {!still && (
              <motion.span
                aria-hidden
                className="absolute h-24 w-24 rounded-full bg-gold/20 blur-2xl sm:h-32 sm:w-32"
                animate={{ scale: [1, 1.15, 1], opacity: [0.45, 0.8, 0.45] }}
                transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
              />
            )}
            <motion.span
              variants={still ? STILL : NUMERAL}
              className="relative font-display text-[3rem] font-light leading-none text-berry xs:text-6xl sm:text-7xl"
            >
              {day}
            </motion.span>
          </div>

          <p className="mt-2 font-display text-lg font-medium tracking-[0.3em] text-ink xs:text-xl sm:text-2xl">
            {year}
          </p>

          <div aria-hidden className="mx-auto mt-4 w-16 border-t border-dashed border-gold/60 sm:mt-5 sm:w-24" />

          <p className="mt-4 flex items-center justify-center gap-2 font-display text-base text-ink xs:text-lg sm:text-xl">
            <ClockIcon className="h-4 w-4 flex-none text-goldDeep sm:h-5 sm:w-5" />
            <span className="whitespace-nowrap">
              {opens} – {closes}
            </span>
          </p>
        </motion.div>

        {/*
          The one thing a guest has to be told before they arrive, so it is a
          badge rather than another line of prose — and it carries the icon,
          which is what the eye lands on first.
        */}
        <motion.p
          variants={line}
          className="mt-4 inline-flex items-center gap-2 rounded-full border border-gold/40 bg-parchment/70 px-4 py-2 font-display text-sm text-ink shadow-sm sm:mt-5 sm:gap-2.5 sm:px-5 sm:text-base"
        >
          <SwimsuitIcon className="h-4 w-4 flex-none text-berry sm:h-5 sm:w-5" />
          <span>Swimwear required — it&apos;s a pool party</span>
        </motion.p>

        <motion.p
          variants={line}
          className="mt-4 max-w-[30ch] font-hand text-lg leading-snug text-berry xs:text-xl sm:mt-5 sm:max-w-none sm:text-2xl"
        >
          Gowns welcome. Glass slippers off at the pool gate 🌊
        </motion.p>
      </motion.div>
    </div>
  );
}
