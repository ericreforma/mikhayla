"use client";

import { motion } from "framer-motion";
import { Crown } from "./Ornaments";
import { useSlideIsActive } from "./SlideActive";

/**
 * The title page of the timeline rail — the first thing in the story section,
 * before the twelve months. It sets the chapter up and points sideways, so
 * "keep swiping" is the only instruction needed.
 */
export function TimelineIntroPanel() {
  const isActive = useSlideIsActive();

  return (
    <div className="relative flex h-full flex-col items-center overflow-hidden bg-mist px-gutter pb-rail pt-8 text-center">
      <div aria-hidden className="pointer-events-none absolute inset-0 parchment-texture" />

      <motion.div
        className="relative my-auto w-full max-w-md"
        initial={false}
        animate={isActive ? { opacity: 1, y: 0 } : { opacity: 0, y: 16 }}
        transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
      >
        <Crown className="mx-auto h-8 w-auto text-gold sm:h-10" />
        <p className="mt-4 font-hand text-xl text-berry xs:text-2xl sm:text-3xl">
          Twelve months, twelve princesses
        </p>
        <h2 className="mt-1 font-display text-4xl font-medium italic text-ink xs:text-5xl sm:text-6xl">
          Once Upon a Year
        </h2>
        <div aria-hidden className="gilt-rule mx-auto mt-5 h-px w-40 sm:w-56" />
        <p className="mx-auto mt-5 max-w-[32ch] text-sm leading-relaxed text-ink/70 sm:text-base">
          Every gown, every giggle, every tiny first — one page at a time.
        </p>

        {/* Sideways cue: this is the one section that moves on the other axis,
            so it has to say so. */}
        <motion.p
          className="mt-10 flex items-center justify-center gap-2 text-xs uppercase tracking-widest text-ink/50 sm:text-sm"
          animate={{ x: [0, 7, 0] }}
          transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
        >
          <span>Swipe sideways through her year</span>
          <span aria-hidden>→</span>
        </motion.p>
      </motion.div>
    </div>
  );
}
