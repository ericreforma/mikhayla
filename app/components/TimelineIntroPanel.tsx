"use client";

import { motion } from "framer-motion";
import { Crown } from "./Ornaments";
import { useSlideIsActive } from "./SlideActive";
import { PrincessPattern } from "./PrincessPattern";


/**
 * The title page of the timeline rail — the first thing in the story
 * section, before the twelve months. It sets the chapter up and points
 * sideways, so "keep swiping" is the only instruction needed.
 *
 * A band laid straight across a white page: a gold rule along its top and
 * bottom edge, nothing down its sides, and a wash of white rather than a
 * fill, so the drifting silhouettes carry on faintly underneath it. It spans the full width, past
 * the gutter the rest of the deck keeps, and every word lives inside it.
 */
export function TimelineIntroPanel() {
  const isActive = useSlideIsActive();

  return (
    <div className="relative flex h-full flex-col justify-center overflow-hidden bg-white pb-rail pt-8">
      <PrincessPattern />

      {/*
        The band is a pane of glass laid over the wallpaper.

        The blur is what does it: the silhouettes go soft under the pane and
        stay sharp on either side of it, and that difference is the whole
        illusion — a translucent white fill alone just reads as paler paint.

        Held at 8px, not more, and it is the cheaper number as well as the
        better-looking one: the wallpaper drifts, so whatever sits behind
        this pane is re-blurred every frame it moves.

        The fill is thin at the top and bottom edges and thick through the
        middle, which is the opposite of how light would fall on real glass
        and is done for a plainer reason. These silhouettes are pale pink at
        half strength; behind an even fill heavy enough to carry the small
        print, they vanish altogether and the pane reads as paint. Thinning
        it where the padding is lets them ghost through against the gold
        rules — the part of the pane that actually looks like glass — while
        the band behind the words stays opaque enough to read on.
        The rest is lighting. The fill is graded, brighter along the top edge
        as though the light were above; a white hairline inside the top edge
        is the lit lip of the glass, and a dark one inside the bottom edge is
        its shadowed underside.
      */}
      <motion.div
        className="relative border-y-2 border-gold bg-gradient-to-b from-white/20 via-white/55 to-white/25 py-9 text-center shadow-[0_10px_30px_-20px_rgba(61,43,79,0.45)] backdrop-blur backdrop-saturate-125 sm:py-11"
        initial={false}
        animate={isActive ? { opacity: 1, y: 0 } : { opacity: 0, y: 16 }}
        transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
      >
        <span aria-hidden className="pointer-events-none absolute inset-x-0 top-0 h-px bg-white/75" />
        <span aria-hidden className="pointer-events-none absolute inset-x-0 bottom-0 h-px bg-ink/10" />

        {/* The band is full-bleed; the gutter belongs to the words inside
            it, so nothing lands under a notch or a rounded corner. */}
        <div className="mx-auto w-full max-w-md px-gutter sm:max-w-xl">
          <Crown className="mx-auto h-8 w-auto text-gold sm:h-10" />

          <p className="mt-4 font-hand text-xl leading-none text-berry xs:text-2xl sm:text-3xl">
            Twelve months, twelve princesses
          </p>
          <h2 className="mt-2 font-display text-4xl font-medium italic text-ink xs:text-5xl sm:text-6xl">
            Once Upon a Year
          </h2>

          {/* Four-fifths ink is the floor for the small print here, and the
              reason it is not the half-strength this line started at: the
              band is a wash rather than a fill now, so a line can sit on a
              silhouette showing through it, and half-strength ink against
              that is 2.8:1. */}
          <p className="mx-auto mt-5 max-w-[32ch] text-sm leading-relaxed text-ink/80 sm:text-base">
            Every gown, every giggle, every tiny first — one page at a time.
          </p>

          {/* Sideways cue: this is the one section that moves on the other
              axis, so it has to say so. */}
          <motion.p
            className="mt-8 flex items-center justify-center gap-2 text-xs uppercase tracking-widest text-ink/80 sm:text-sm"
            animate={{ x: [0, 7, 0] }}
            transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
          >
            <span>Swipe sideways through her year</span>
            <span aria-hidden>→</span>
          </motion.p>
        </div>
      </motion.div>
    </div>
  );
}
