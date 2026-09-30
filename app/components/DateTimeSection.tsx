"use client";

import { motion, useReducedMotion, type Variants } from "framer-motion";
import { DATE_PORTRAIT, PARTY_DATE, PARTY_TIME, SWIMWEAR_ICON } from "@/app/config";
import { Crown, Sparkle, ClockIcon } from "./Ornaments";
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
    /*
      The air between these rows is set per shape of screen, because how much
      there is to spend varies enormously and the page is a stack of seven
      things either way.

      Measured, with the column against the height left after the padding:
      a phone has around 220px going spare, a tablet held upright 150px, a
      desktop window 130px — and a tablet turned sideways has two. That last
      one is the whole reason the gaps were ever tight: 768px of height, less
      than a phone has, and the closing line went over the edge. So `wide:`
      keeps the close rhythm it has always had, and everything else opens up:
      `tall:` for the upright tablet, `wide-lg:` once there is desktop height,
      and the unprefixed values for the phone.

      That leaves `md:` doing nothing but feeding a screen that is neither —
      it is overridden by `tall:` or `wide:` on anything 768px or wider. It
      stays because the ladder reads wrong without it.

      The numbers are worth re-measuring rather than nudging: the smallest
      screen each tier has to hold is the one that binds, and for `wide-lg:`
      that is a 1280x800 laptop with 34px to give, not the 1440x900 window it
      is tempting to check.
    */
    <div className="relative flex min-h-full flex-col items-center overflow-hidden bg-mist pb-nav pt-8 text-center md:pt-4">
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

      {/*
        Capped once the screen is wider than it is tall. The date card below
        breaks out of this wrapper's gutter to run edge to edge, which is
        right on anything phone-shaped — an iPad held upright included — and
        wrong on a wide one: a band the full width of a 1024px screen with a
        column of writing down the middle of it reads as a rule across the
        page rather than as a card. Held to this measure it stays a card, and
        the page keeps a margin.
      */}
      <motion.div
        className="relative my-auto flex w-full flex-col items-center px-gutter wide:max-w-3xl"
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

        <motion.p variants={line} className="mt-4 font-hand text-lg text-berry xs:text-xl sm:mt-5 sm:text-2xl tall:mt-6 wide:mt-3 wide-lg:mt-4">
          Save the date
        </motion.p>

        <motion.h2
          variants={line}
          className="mt-2 font-display text-2xl italic leading-snug text-ink xs:text-3xl sm:text-4xl tall:mt-3 wide:mt-1"
        >
          A royal splash
        </motion.h2>

        <motion.div
          aria-hidden
          variants={rule}
          className="gilt-rule mt-6 h-px w-28 xs:w-36 sm:mt-7 sm:w-48 md:mt-3 tall:mt-7 wide:mt-2 wide-lg:mt-3"
        />

        {/*
          The date card: a band straight across the page, gold rules top and
          bottom and nothing down its sides, the same as the one on the
          timeline's title page. It breaks out of the gutter the rest of this
          section keeps — hence the negative margin — so the photograph can
          run right off the edge of the screen.

          The two halves are a plain flex row at every width. Stacked on a
          phone the picture would be a band of its own and the card would be
          half the page tall; side by side it stays a card with a picture in
          it, which is the point.
        */}
        <motion.div
          variants={still ? STILL : CARD}
          className="relative -mx-gutter mt-7 flex items-stretch self-stretch border-y-2 border-gold bg-white/[0.44] sm:mt-9 md:mt-5 tall:mt-9 wide:mt-3 wide-lg:mt-4"
        >
          {/* The date keeps the narrower half and centres itself in it, so it
              reads as its own panel rather than as a caption pushed against
              the left edge. */}
          <div className="flex flex-1 flex-col justify-center py-6 pl-gutter pr-3 text-center sm:py-8 sm:pr-5 wide:py-5">
            <p className="text-[11px] font-medium uppercase tracking-[0.3em] text-goldDeep sm:text-xs">
              {weekday}
            </p>

            {/* The month sits over the numeral rather than beside it: this
                column is the narrower of the two now, and a row of month,
                rule, numeral would wrap the moment the month is a long one. */}
            <p className="mt-2 font-display text-xl font-medium tracking-[0.2em] text-ink xs:text-2xl sm:mt-3 sm:text-3xl">
              {month}
            </p>

            <div className="relative mt-0.5 flex items-center justify-center">
              {/* Candlelight behind the numeral, slowly guttering. */}
              {!still && (
                <motion.span
                  aria-hidden
                  className="absolute h-20 w-20 rounded-full bg-gold/20 blur-2xl sm:h-28 sm:w-28"
                  animate={{ scale: [1, 1.15, 1], opacity: [0.45, 0.8, 0.45] }}
                  transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
                />
              )}
              <motion.span
                variants={still ? STILL : NUMERAL}
                className="relative font-display text-[3rem] font-light leading-none text-berry xs:text-6xl sm:text-7xl wide:text-6xl"
              >
                {day}
              </motion.span>
            </div>

            <p className="mt-1 font-display text-base font-medium tracking-[0.3em] text-ink xs:text-lg sm:text-xl">
              {year}
            </p>

            <div aria-hidden className="mx-auto mt-3 w-14 border-t border-dashed border-gold/60 sm:mt-4 sm:w-20" />

            {/*
              The smallest type on the card, and it has to be: this is the
              longest unbreakable-looking line in the narrower half, and at
              body size it runs past the edge of a small phone. It is left
              free to wrap rather than held on one line, so a wider font on
              some other device breaks it in two instead of clipping it.
            */}
            <p className="mt-3 flex items-center justify-center gap-1.5 font-display text-xs text-ink sm:mt-4 sm:gap-2 sm:text-base">
              <ClockIcon className="h-3.5 w-3.5 flex-none text-goldDeep sm:h-5 sm:w-5" />
              <span>
                {opens} – {closes}
              </span>
            </p>
          </div>

          {/*
            Her half, and the larger one — the card is a photograph with the
            date beside it rather than the other way round.

            The picture is scaled up inside this frame because it is
            a tall portrait in a box very nearly as tall as it is — left at
            its own size the whole shot fits, and she ends up a thumbnail.
            Past `sm` the frame is wide enough that the crop does that work on
            its own and the zoom comes back off.

            The frame carries a blush of its own because the photograph is
            loaded lazily — this section is four swipes in, and it is a big
            file. Without it the card shows a white hole until the picture
            lands.
          */}
          <div className="date-portrait-fade relative w-[52%] max-w-[20rem] shrink-0 overflow-hidden bg-rose/25 xs:w-[55%] sm:w-[57%] sm:max-w-[24rem] lg:max-w-[30rem]">
            {/*
              Absolutely placed, and that is load-bearing: `h-full` inside a
              box of automatic height resolves to `auto`, so in the ordinary
              flow the photograph's own proportions set the height and the
              card grew to half a laptop screen. Out of the flow, it fills
              whatever height the words on the left ask for.

              The crop rides higher past `sm`, where the frame is wide and
              shallow and the window into a tall portrait is a narrow band:
              left where a phone wants it, the band opens below the top of
              her head and takes the tiara off.
            */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={DATE_PORTRAIT}
              alt=""
              width={1414}
              height={2000}
              loading="lazy"
              decoding="async"
              className="absolute inset-0 h-full w-full origin-[52%_24%] scale-[1.45] object-cover object-[center_22%] sm:scale-100 sm:object-[center_12%]"
            />
          </div>
        </motion.div>

        {/*
          The one thing a guest has to act on before they arrive, so it is
          built as a pass to the pool rather than as another line of prose: a
          stub holding the icon, a perforation, and the notice itself. The
          outline pill it replaced sat quietly enough to be swiped past, and
          this is the piece nobody can afford to miss.
        */}
        <motion.div
          variants={line}
          className="mt-6 flex max-w-full items-stretch overflow-hidden rounded-xl border border-gold/50 bg-parchment/85 shadow-sm sm:mt-7 md:mt-4 tall:mt-7 wide:mt-3 wide-lg:mt-4"
        >
          <span className="flex flex-none items-center bg-goldSoft/40 px-3 sm:px-4">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={SWIMWEAR_ICON}
              alt=""
              width={20}
              height={20}
              decoding="async"
              className="h-5 w-5"
            />
          </span>

          {/* The tear line of a ticket stub. */}
          <span aria-hidden className="w-0 flex-none border-l border-dashed border-gold/60" />

          <span className="flex items-center px-3.5 py-2.5 text-left font-display text-xs leading-snug text-ink sm:px-5 sm:py-3 sm:text-base">
            Swimwear required — it&apos;s a pool party
          </span>
        </motion.div>

        <motion.p
          variants={line}
          className="mt-6 max-w-[30ch] font-hand text-lg leading-snug text-berry xs:text-xl sm:mt-7 sm:max-w-none sm:text-2xl md:mt-4 tall:mt-7 wide:mt-3 wide-lg:mt-4"
        >
          Gowns welcome. Glass slippers off at the pool gate 🌊
        </motion.p>
      </motion.div>
    </div>
  );
}
