"use client";

import { motion, useReducedMotion, type Variants } from "framer-motion";
import {
  Milestone,
  ACCENT_STYLES,
  BABY_NAME,
  MILESTONES,
  MONTH_FRAME,
  MONTH_FRAME_SHAPE,
} from "@/app/config";
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

/*
 * The frame drawing itself.
 *
 * Cutting the border into four was done to stop it stretching, but it pays a
 * second time here: each piece can be uncovered along its own run, so the
 * frame arrives the way it would be drawn rather than simply fading up.
 *
 * The order is a hand's. It starts at the crown in the middle of the top crest
 * and spreads to both corners; the hairlines run down the sides after it; the
 * bottom crest opens from its own middle last. Each overlaps the one before,
 * so it reads as one continuous stroke rather than three separate reveals.
 *
 * It closes just under a second, which is a little behind the caption's own
 * cascade and deliberately so — the words are what a guest came for and the
 * frame is the flourish round them. Much longer and a quick swipe down the
 * rail leaves a border still drawing itself on a page already being left.
 *
 * `clipPath` rather than a stroke dash, because the artwork is filled shapes —
 * filigree, not outlines — and there is no stroke on it to pay out. An inset
 * that opens from the middle does the same thing to the eye.
 */

/**
 * The frame as a whole, which draws nothing itself.
 *
 * It exists so the four pieces below can be driven by one flag. Framer only
 * treats an element as a variant node — and so only hands `in` / `out` down to
 * its children — if it has `variants` of its own; an `animate` label on a
 * parent with none of them stops there. So this is deliberately empty rather
 * than missing.
 */
const FRAME_GROUP: Variants = { out: {}, in: {} };

/** The top crest, opening from the crown outwards to both corners. */
const DRAW_CREST_TOP: Variants = {
  out: { clipPath: "inset(0% 50% 0% 50%)", transition: { duration: 0.28, ease: EASE } },
  in: { clipPath: "inset(0% 0% 0% 0%)", transition: { duration: 0.5, ease: EASE } },
};

/** The hairlines, running down from the corners the crest just reached. */
const DRAW_RULE: Variants = {
  out: { clipPath: "inset(0% 0% 100% 0%)", transition: { duration: 0.25, ease: EASE } },
  in: {
    clipPath: "inset(0% 0% 0% 0%)",
    transition: { duration: 0.45, delay: 0.26, ease: EASE },
  },
};

/** And the bottom crest, opening from its middle to close the frame. */
const DRAW_CREST_BOTTOM: Variants = {
  out: { clipPath: "inset(0% 50% 0% 50%)", transition: { duration: 0.28, ease: EASE } },
  in: {
    clipPath: "inset(0% 0% 0% 0%)",
    transition: { duration: 0.5, delay: 0.46, ease: EASE },
  },
};

/**
 * The same for a visitor who has asked for less motion: the frame is simply
 * there, faded up with everything else. A border that draws itself is a
 * flourish, and a flourish is the first thing that setting means to switch off.
 */
const FRAME_STILL: Variants = {
  out: { opacity: 0, transition: { duration: 0.2 } },
  in: { opacity: 1, transition: { duration: 0.3 } },
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
        /*
          Two elements, and the outer one is only there to stand her in the
          right place — Framer writes its own `transform` for the step-in
          below and would overwrite anything positional in the class list.
        */
        <span
          aria-hidden
          className="pointer-events-none absolute bottom-menu left-0 z-10 text-2xl leading-none xs:text-3xl sm:text-4xl md:text-5xl wide:left-auto wide:right-[58%] wide:translate-x-0"
        >
        <motion.div initial={false} animate={state} variants={reduce ? STILL : FIGURE}>
          {/*
            Everywhere else she is sized in title lines — see the comment
            above. On a landscape page she is sized against the page instead,
            because there she is not a footnote in the corner any more: she
            stands better than a third of the slide tall. A share of the slide
            is a figure the type ladder cannot express, and it is the figure
            that matters here.

            And she stands in the *corner* of the caption's column rather than
            the middle of it, hard against the inside of the frame's right-hand
            rule.

            The middle is where she used to be, and it only ever worked on a
            tall enough window. The caption is a narrow block centred in its
            column, so a figure centred in the same column is directly behind
            it: on a 4:3 tablet there was room for her to clear the words, but
            on a laptop window — 1164 by 533 is the one that showed it — the
            title and the note landed squarely across her face. She was always
            behind them (see the `z-20` on the caption against the `z-10`
            here), so nothing was unreadable; it simply looked like a mistake.

            In the corner there is no overlap to manage at any height. The
            caption keeps the middle of the column, she keeps the corner, and
            the two stop competing for the same few inches.

            `right` rather than `left`, so what she is pinned to is the edge she
            stands beside: 58% from the right puts her inside the 45% column
            with a margin clear of the rule the frame draws down it. Measured
            from the other side she would drift off that edge as the panel
            resized, which is the whole thing this is trying to hold still.
          */}
          {/*
            Sized by its height, with a ceiling on how wide that is allowed to
            make it.

            The ceiling is what keeps her out of the caption's way. The figures
            are a set of pictures and a new one need not be shaped like the
            eleven before it: her own month's is nearly square where a princess
            is tall and narrow, and left to its own proportions it grew wide
            enough to reach across the column and put the title on her wings.

            5.6em is the widest a figure can be and still sit inside that
            clearance. Every drawn princess is narrower than it already — the
            broadest is a shade over 5.4em — so this changes none of them; it
            is a floor under the assumption rather than a new rule. Anything
            wider is held to it and loses height to keep its proportions.

            `object-bottom` because the box is still a full 6.375em tall when
            the ceiling bites, and she stands on the foot of it rather than
            floating in the middle. `object-contain` because without it a
            capped box would simply squash her.

            None of it applies once the page is landscape: there she stands in
            the caption's own column with the words above her, not beside them,
            so there is no inset to respect and she is free to be as wide as
            38vh of height makes her.
          */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={m.character}
            alt=""
            loading="lazy"
            decoding="async"
            className="block h-[6.375em] w-auto max-w-[5.6em] object-contain object-bottom drop-shadow-sm wide:h-[38vh] wide:max-w-none"
          />
        </motion.div>
        </span>
      ) : null}

      {/*
        The caption. On a phone it is hung from the foot of the page, over the
        fade, with the photograph filling everything above it.

        On a screen wider than it is tall it becomes the left-hand half of
        the page and sits in the upper part of a frame of its own — still
        centred as a setting, the way it is on a phone, just in a column of its
        own beside her instead of a band under her.

        Hung from the top rather than centred in the frame, and the padding is
        in `vw` rather than a share of the height, both for the same reason:
        what it has to clear is the crest, and the crest is laid across the
        frame at full width, so where its ink ends is a share of the *width* of
        the page. Measured that way the gap under it holds from an iPad to a
        laptop — a little over a dozen pixels on one and a little over twenty
        on the other. Hung from the top, it also holds from month to month: a
        four-line title grows downwards into the room the princess leaves,
        instead of pushing its first line up under the ornament.
      */}
      <div
        className="relative flex h-full flex-col justify-end px-gutter pb-rail pt-8 text-center wide:w-[45%] wide:justify-start wide:px-12 wide:pt-[calc(var(--stage-w)*0.14)] wide:text-center"
      >
        {/*
          The caption's frame, in its four pieces.

          Landscape's alone. Stacked, the caption sits over the photograph
          itself and a frame drawn round it would be a box round a picture;
          given a column of its own there is a shape to dress, and this is the
          invitation it would be if it were printed.

          A column of three: the top crest, whatever height is left, the bottom
          crest. The crests are laid across at full width and take their own
          height from their own proportions, so neither is ever scaled unevenly
          — which is the whole reason the drawing is cut up at all. The middle
          band is the flexible one, and all that runs down it is two straight
          hairlines, which stretch to any height without anybody seeing it.

          The hairlines are placed by a share of the frame's *width*, not its
          height, because that is what the crests above and below them are
          scaled to: it is what keeps them under the rails the crests draw, at
          whatever size the frame turns out to be. The figures come from the
          slicer — see `MONTH_FRAME_SHAPE` in config.

          Cut into four, each piece can also be uncovered along its own run as
          the page lands, so the frame draws itself rather than fading up — see
          the variants above.

          `--nav-bar` at the foot keeps the whole thing off the tab bar, which
          the panel itself runs behind — multiplied by `--nav-at-foot`, so on a
          desktop, where the bar has gone to the top of the window, the frame
          runs down to the foot of the panel instead of stopping short of a bar
          that is no longer there.
        */}
        <motion.span
          aria-hidden
          initial={false}
          animate={state}
          variants={FRAME_GROUP}
          className="pointer-events-none absolute inset-x-3 top-[3%] z-0 hidden flex-col wide:flex"
          style={{ bottom: "calc(var(--nav-bar) * var(--nav-at-foot) + 0.75rem)" }}
        >
          {/* It is here to hold the four pieces in place and to hand `in` /
              `out` down to them, each of which draws itself along its own
              run — see `FRAME_GROUP` for why it carries empty variants. */}
          <motion.span
            variants={reduce ? FRAME_STILL : DRAW_CREST_TOP}
            className="block w-full flex-none bg-[length:100%_100%] bg-no-repeat"
            style={{
              aspectRatio: MONTH_FRAME_SHAPE.topAspect,
              backgroundImage: `url(${MONTH_FRAME.top})`,
            }}
          />

          <span className="relative block min-h-0 flex-1">
            <motion.span
              variants={reduce ? FRAME_STILL : DRAW_RULE}
              className="absolute inset-y-0 block min-w-px bg-[length:100%_100%] bg-no-repeat"
              style={{
                left: MONTH_FRAME_SHAPE.ruleInset,
                width: MONTH_FRAME_SHAPE.ruleWidth,
                backgroundImage: `url(${MONTH_FRAME.ruleLeft})`,
              }}
            />
            <motion.span
              variants={reduce ? FRAME_STILL : DRAW_RULE}
              className="absolute inset-y-0 block min-w-px bg-[length:100%_100%] bg-no-repeat"
              style={{
                right: MONTH_FRAME_SHAPE.ruleInset,
                width: MONTH_FRAME_SHAPE.ruleWidth,
                backgroundImage: `url(${MONTH_FRAME.ruleRight})`,
              }}
            />
          </span>

          <motion.span
            variants={reduce ? FRAME_STILL : DRAW_CREST_BOTTOM}
            className="block w-full flex-none bg-[length:100%_100%] bg-no-repeat"
            style={{
              aspectRatio: MONTH_FRAME_SHAPE.bottomAspect,
              backgroundImage: `url(${MONTH_FRAME.bottom})`,
            }}
          />
        </motion.span>

        {/*
          The caption's own measure, and on a desktop it is measured off a
          different edge.

          `46vh` is the page's height, which on a tablet turned sideways is a
          fair stand-in for the width of the column this sits in: 4:3 makes
          46vh about three quarters of the 45% the column gets, which is the
          proportion the setting was drawn at. A monitor is not 4:3. At 16:9
          the same 46vh is barely half the column, so the words pull into a
          narrow ribbon down the middle of a frame drawn for something twice
          as wide, and the page reads as a tablet's caption that has lost its
          way rather than as a desktop's.

          So past `wide-lg` the cap is taken off the width instead — the thing
          it was always standing in for. 34vw is three quarters of the column
          at any shape of screen, which is the proportion, held directly.
        */}
        <motion.div
          /* `month-caption-beside` is the tablet-upright case only, where the
             figure grows tall enough to reach the title and the whole caption
             has to move to her right rather than just the note. It is inert
             at every other size — see globals.css. */
          className={`relative z-20 w-full wide:mx-auto wide:max-w-[46vh] wide-lg:max-w-[calc(var(--stage-w)*0.34)]${
            m.character ? " month-caption-beside" : ""
          }`}
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
            The note and the counter are the two lines that can fall inside the
            figure's height — the title never reaches her.

            Stacked, they are set down *beside* her: left-aligned and pushed
            clear by `.beside-figure`, which is measured against the widest
            cut-out's visible edge rather than its box. Centring them instead
            puts the note's first line across her crown, which is what this
            undoes.

            It does leave the caption in two settings — a centred title over a
            left-hung note — and that is the trade being made knowingly. The
            alternative reads tidier in the abstract and worse on the page:
            words printed over a face.

            Landscape is the exception and keeps the centring, because there
            she is not in the corner at all. The caption has a column to
            itself, she stands inside it, and `caption-halo` — which is scoped
            to that same query — is what carries the lines across her.

            Month zero has no gown and so no figure: nothing to clear, nothing
            to carry, and it stays centred at every size.
          */}
          <motion.div
            variants={TAIL_GROUP}
            className={`mt-3 wide:mx-auto wide:max-w-[30ch] wide:text-center${
              m.character
                ? " beside-figure text-left caption-halo"
                : " mx-auto max-w-[32ch]"
            }`}
          >
            {/* A shade heavier than the parchment sections: the ground under
                it is a tint rather than near-white paper.

                Beside the figure the measure has to be set here rather than on
                the group, because the group is carrying the inset as padding
                and `border-box` would have a width on it fight the two. */}
            <motion.p
              variants={line}
              className={`text-sm leading-relaxed text-ink/80 sm:text-base wide:text-lg${
                m.character ? " max-w-[34ch] wide:max-w-none" : ""
              }`}
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
