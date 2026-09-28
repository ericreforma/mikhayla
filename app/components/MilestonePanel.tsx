"use client";

import { motion, useReducedMotion, type Variants } from "framer-motion";
import { Milestone, ACCENT_STYLES, BABY_NAME, MILESTONES, MONTH_FRAME } from "@/app/config";
import { useSlideIsActive } from "./SlideActive";
import { MilestoneAmbience } from "./MilestoneAmbience";

/** The last month in the story, for the "3 / 11" counter. */
const FINAL_MONTH = MILESTONES[MILESTONES.length - 1].month;

/** The deck's easing — a quick start settling into place, used throughout. */
const EASE = [0.22, 1, 0.36, 1];

/*
 * The page turns itself on rather than appearing all at once: the photo
 * settles, her princess steps in from the edge, and the caption writes itself
 * on a line at a time. Every piece is a named state instead of a hard-coded
 * delay, so the whole cascade is driven by one `in` / `out` on the container
 * and reverses when the swipe leaves.
 */

/** Hands the cascade down a level and spaces out whatever it holds. */
const GROUP: Variants = {
  out: { transition: { staggerChildren: 0.04, staggerDirection: -1 } },
  in: { transition: { delayChildren: 0.04, staggerChildren: 0.06 } },
};

/** The note and counter wait for the heading above them to land first. */
const TAIL_GROUP: Variants = {
  out: { transition: { staggerChildren: 0.04, staggerDirection: -1 } },
  in: { transition: { delayChildren: 0.12, staggerChildren: 0.06 } },
};

/** A line of the caption, rising into place. */
const LINE: Variants = {
  out: { opacity: 0, y: 14, transition: { duration: 0.25, ease: EASE } },
  in: { opacity: 1, y: 0, transition: { duration: 0.4, ease: EASE } },
};

/** The hairline, drawn out from its middle rather than faded in. */
const RULE: Variants = {
  out: { opacity: 0, scaleX: 0, transition: { duration: 0.25, ease: EASE } },
  in: { opacity: 1, scaleX: 1, transition: { duration: 0.5, ease: EASE } },
};

/** The photograph, easing back from a breath of a push-in. */
const PHOTO: Variants = {
  out: { opacity: 0.85, scale: 1.05, transition: { duration: 0.45, ease: EASE } },
  in: { opacity: 1, scale: 1, transition: { duration: 0.6, ease: EASE } },
};

/**
 * The caption's frame, settling back out of a breath of a push-in as the page
 * lands — the same gesture the photograph opposite it makes, which is what
 * makes the two read as one spread arriving rather than two things appearing.
 *
 * It is in the cascade rather than simply present because of what it is for:
 * a border that is already there when the words turn up reads as part of the
 * furniture, and the whole point of it is to belong to the caption inside it.
 */
const FRAME: Variants = {
  out: { opacity: 0, scale: 0.97, transition: { duration: 0.3, ease: EASE } },
  in: { opacity: 1, scale: 1, transition: { duration: 0.6, ease: EASE } },
};

/** Her princess, stepping in from the edge she stands on. */
const FIGURE: Variants = {
  out: { opacity: 0, x: -24, transition: { duration: 0.3, ease: EASE } },
  in: { opacity: 1, x: 0, transition: { duration: 0.5, ease: EASE, delay: 0.1 } },
};

/**
 * The same cascade for a visitor who has asked for less motion: the order and
 * the timing survive, the travel doesn't. The CSS in `globals.css` only
 * flattens CSS animations, so this has to be handled here as well.
 */
const STILL: Variants = {
  out: { opacity: 0, transition: { duration: 0.2 } },
  in: { opacity: 1, transition: { duration: 0.3 } },
};

const STILL_PHOTO: Variants = {
  out: { opacity: 0.85, transition: { duration: 0.3 } },
  in: { opacity: 1, transition: { duration: 0.3 } },
};

/**
 * The month's own colour rising off the bottom edge, so the caption reads as
 * ink on paper that belongs to this photo rather than on a stripe of someone
 * else's parchment. It clears the top third of the frame entirely — that's
 * where her face sits.
 */
function captionFade(tint: string) {
  const c = channels(tint);
  return (
    `linear-gradient(to top, rgba(${c}, 0.97) 0%, rgba(${c}, 0.94) 22%, ` +
    `rgba(${c}, 0.78) 36%, rgba(${c}, 0.32) 50%, rgba(${c}, 0) 64%)`
  );
}

/** A `#rrggbb` tint as the "r, g, b" an `rgba()` wants. */
function channels(tint: string) {
  return [1, 3, 5].map((i) => parseInt(tint.slice(i, i + 2), 16)).join(", ");
}

/**
 * One month of her first year, filling the screen: the photo *is* the page,
 * edge to edge, with the month and its milestone written across a fade at the
 * foot of it. A page of the timeline rail.
 *
 * Every panel is mounted from the start, so the entrance is driven by
 * `useSlideIsActive` rather than by mounting or by a scroll position — the
 * page assembles itself as the swipe lands, and unwinds when it leaves so it
 * plays again on the way back.
 */
export function MilestonePanel({ m }: { m: Milestone }) {
  const isActive = useSlideIsActive();
  const accent = ACCENT_STYLES[m.accent];
  const reduce = useReducedMotion();

  const state = isActive ? "in" : "out";
  const line = reduce ? STILL : LINE;
  const rule = reduce ? STILL : RULE;

  /*
   * The last page is her own gown rather than a borrowed one, so `princess` is
   * her own name there — "dressed as Mikhayla" would be a nonsense to read out.
   */
  const altText = !m.princess
    ? `${BABY_NAME} at month ${m.month}`
    : m.princess === BABY_NAME
      ? `${BABY_NAME} in a gown of her own at month ${m.month}`
      : `${BABY_NAME} dressed as ${m.princess}`;

  return (
    <div className="relative h-full w-full overflow-hidden" style={{ backgroundColor: m.tint }}>
      {/*
        The tint is the page's ground as well as its fade, so the rail changes
        colour as it turns — and a month has its own colour before its photo
        has loaded, or if it never gets one.
      */}
      {m.photo ? (
        <motion.div
          className="absolute inset-0 wide:left-auto wide:w-[55%]"
          initial={false}
          animate={state}
          variants={reduce ? STILL_PHOTO : PHOTO}
        >
          {/*
            The photos are phone-shaped (9:16), so on a phone they fill the
            panel with no crop at all. Where the panel is wider than that — a
            desktop window, a landscape phone — the crop is anchored high
            rather than centred, which keeps her face in frame instead of
            landing on the middle of her gown.
          */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={m.photo}
            alt={altText}
            loading="lazy"
            decoding="async"
            className="h-full w-full object-cover object-[center_18%]"
          />
        </motion.div>
      ) : (
        <span className="sr-only">{altText}</span>
      )}

      <div aria-hidden className="pointer-events-none absolute inset-0 parchment-texture" />
      {/* Stacked, the caption sits *on* the photograph and needs the ground
          under it faded up out of the picture. Side by side it does not — it
          has a half of the page to itself — so the fade is a phone's and a
          tall tablet's only, and the seam below does that work instead. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 wide:hidden"
        style={{ backgroundImage: captionFade(m.tint) }}
      />

      {/*
        Her princess, from the film, standing in the very corner of the page —
        a footnote to the costume, not a second photo.

        `bottom-menu` puts her feet on the top edge of the tab bar, and `left-0`
        takes her past the page's gutter to the screen edge itself. The type
        ladder here is the title's, so the `em` height below is measured in
        title lines and grows with it — which is how she keeps her proportion
        to the caption she stands beside at every width, and why a tablet gets
        her twice over: once from the `md` step below, and again from the root
        type scale at the top of globals.css.

        Keep `.pb-figure` in globals.css in step with the last rung of that
        ladder. It is the caption's clearance over her head, and it is measured
        in the same title lines.
      */}
      {m.character ? (
        <motion.div
          aria-hidden
          className="pointer-events-none absolute bottom-menu left-0 z-10 text-2xl leading-none xs:text-3xl sm:text-4xl md:text-5xl wide:left-[28%]"
          initial={false}
          animate={state}
          variants={reduce ? STILL : FIGURE}
        >
          {/*
            Everywhere else she is sized in title lines — see the comment
            above. On a landscape page she is sized against the page instead,
            because there she is not a footnote in the corner any more: she
            stands against the right-hand side of the caption's frame at a
            little over a third of the slide's height, stepping out over the
            photograph beside her. A share of the slide is a figure the type
            ladder cannot express, and it is the figure that matters here.
          */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={m.character}
            alt=""
            loading="lazy"
            decoding="async"
            className="block h-[6.375em] w-auto drop-shadow-sm wide:h-[38vh]"
          />
        </motion.div>
      ) : null}

      {/*
        The caption. On a phone it is hung from the foot of the page, over the
        fade, with the photograph filling everything above it.

        On a screen wider than it is tall it becomes the left-hand half of
        the page and centres itself down that half — still centred as a
        setting, the way it is on a phone, just in a column of its own beside
        her instead of a band under her, and inside a frame of its own. The
        top padding matches the frame's own top inset, which is what gives the
        two a shared middle to centre on.
      */}
      <div
        className={`relative flex h-full flex-col justify-end px-gutter pb-rail pt-8 text-center wide:w-[45%] wide:justify-center wide:px-12 wide:pt-[11%] wide:text-center${
          m.character ? " pl-figure" : ""
        }`}
      >
        {/*
          The caption's frame.

          Landscape's alone. Stacked, the caption sits over the
          photograph itself and a frame drawn round it would be a box round a
          picture; given a column of its own there is a shape to dress, and
          this is the invitation it would be if it were printed — a gilt frame
          with the month's own object at the corner of it.

          The frame keeps its own proportions rather than being stretched to
          the column: it is a painting, with a crown at the head of it and gems
          down the sides, and a crown half again as wide as it was drawn reads
          as a mistake. So it is sized by its height — which is the scarce
          dimension on a landscape page — and centred in whatever width is
          left. `--nav-bar` at the foot is what keeps it off the tab bar, which
          the panel itself runs behind.

          One picture for every month, so it is one download however far down
          the rail a guest swipes. See `MONTH_FRAME` in config.
        */}
        {/*
          Two elements, and they have to be two: the outer one is where the
          frame *is* and the inner one is what it does on arrival. Framer
          Motion writes its own `transform` on anything it animates, which
          silently throws away a `-translate-x-1/2` sitting in the class list —
          so the centring lives out here where nothing will overwrite it, and
          the scale-and-fade lives inside.
        */}
        <span
          aria-hidden
          className="pointer-events-none absolute left-1/2 top-[6%] z-0 hidden aspect-[971/1619] -translate-x-1/2 wide:block"
          style={{ bottom: "calc(var(--nav-bar) + 0.75rem)" }}
        >
          <motion.span
            initial={false}
            animate={state}
            variants={reduce ? STILL : FRAME}
            className="absolute inset-0 block"
            style={{
              backgroundImage: `url(${MONTH_FRAME})`,
              backgroundRepeat: "no-repeat",
              backgroundSize: "100% 100%",
            }}
          />
        </span>

        <motion.div
          className="relative z-20 w-full wide:mx-auto wide:max-w-[38vh]"
          initial={false}
          animate={state}
          variants={GROUP}
        >
          {/* The heading group clears the top of the figure, so it stays
              centred on the page as before. */}
          <motion.div className="mx-auto w-full max-w-sm sm:max-w-md wide:max-w-none" variants={GROUP}>
            <motion.p
              variants={line}
              className={`font-hand text-xl leading-none xs:text-2xl wide:text-3xl ${accent.text}`}
            >
              Month {m.month}
              {m.princess ? ` · ${m.princess}` : ""}
            </motion.p>

            <motion.h3
              variants={line}
              className="mt-2 font-display text-2xl font-medium leading-snug text-ink xs:text-3xl sm:text-4xl wide:text-[2.6rem]"
            >
              {m.title}
            </motion.h3>
            <motion.div
              aria-hidden
              variants={rule}
              className={`mx-auto mt-3 h-px w-16 sm:w-20 wide:w-24 ${accent.rule}`}
            />
          </motion.div>

          {/*
            The note and the counter are the two lines that fall inside the
            figure's height, so they set down to the right of it and read from
            its edge rather than from the middle of the page. `beside-figure`
            is measured from the same screen edge the figure stands on, which
            is what keeps the gap between them even as the page resizes.

            Month zero has no gown and so no figure. With nothing to sit beside
            it keeps the centred setting the rest of the caption uses, and with
            the whole width to itself it is left uncapped rather than held to
            the 32-character measure the other months read at.
          */}
          <motion.div
            variants={TAIL_GROUP}
            className={
              m.character
                ? "beside-figure mt-3 text-left md:mx-auto md:max-w-[32ch] wide:mx-auto wide:max-w-[30ch] wide:text-center"
                : "mt-3 wide:mx-auto wide:max-w-[30ch]"
            }
          >
            {/* A shade heavier than the parchment sections: the ground under it
                is a tint rather than near-white paper. */}
            <motion.p
              variants={line}
              className={`text-sm leading-relaxed text-ink/80 sm:text-base wide:text-lg${m.character ? " max-w-[32ch] wide:max-w-none" : ""}`}
            >
              {m.note}
            </motion.p>

            <motion.p
              variants={line}
              className="mt-4 text-[11px] uppercase tracking-[0.2em] text-ink/55 sm:mt-5 wide:text-sm"
            >
              {m.month} / {FINAL_MONTH}
            </motion.p>
          </motion.div>
        </motion.div>
      </div>

      {/*
        The month's own weather — her apples, her snow, her bubbles. Last in
        the panel, so it passes in front of the caption rather than behind
        it: a petal that falls *behind* the words reads as a mark on the
        photograph, where one that crosses them reads as something in the
        room. It draws nothing until the page above has finished arriving.
      */}
      <MilestoneAmbience kind={m.ambience} seed={m.month + 1} />
    </div>
  );
}
