"use client";

import { motion } from "framer-motion";
import { BABY_NAME } from "@/app/config";
import { Crown, Sparkle } from "./Ornaments";

export function HeroSection() {
  return (
    <div className="royal-dawn relative flex min-h-full flex-col items-center overflow-hidden px-gutter pb-nav pt-8 text-center">
      <div aria-hidden className="pointer-events-none absolute inset-0 parchment-texture" />

      {/* Floating sparkles: small and tucked toward the edges on a phone so
          they never land on top of the headline, then grown from sm up. */}
      <motion.div
        aria-hidden
        className="absolute left-[5%] top-[14%] text-gold sm:left-[8%] sm:top-[18%]"
        animate={{ y: [0, -18, 0] }}
        transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
      >
        <Sparkle className="h-5 w-5 animate-twinkle xs:h-7 xs:w-7 sm:h-10 sm:w-10" />
      </motion.div>
      <motion.div
        aria-hidden
        className="absolute right-[6%] top-[24%] text-roseDeep sm:right-[12%] sm:top-[30%]"
        animate={{ y: [0, 20, 0] }}
        transition={{ duration: 6, repeat: Infinity, ease: "easeInOut", delay: 0.5 }}
      >
        <Sparkle className="h-4 w-4 animate-twinkle xs:h-5 xs:w-5 sm:h-8 sm:w-8" />
      </motion.div>
      <motion.div
        aria-hidden
        className="absolute bottom-[18%] left-[10%] text-gold sm:bottom-[22%] sm:left-[18%]"
        animate={{ y: [0, -14, 0] }}
        transition={{ duration: 4.5, repeat: Infinity, ease: "easeInOut", delay: 1 }}
      >
        <Sparkle className="h-3.5 w-3.5 animate-twinkle xs:h-4 xs:w-4 sm:h-6 sm:w-6" />
      </motion.div>

      <div className="relative my-auto flex flex-col items-center">
        <Crown className="h-9 w-auto text-gold drop-shadow-sm xs:h-11 sm:h-16" />

        <p className="mt-4 font-hand text-xl text-berry xs:text-2xl sm:text-3xl">
          By royal invitation
        </p>
        <h1 className="mt-2 max-w-[18ch] font-display text-[2rem] italic leading-[1.15] text-ink xs:text-4xl sm:max-w-none sm:text-6xl sm:leading-tight md:text-7xl">
          Princess {BABY_NAME} Turns One
        </h1>
        <div aria-hidden className="gilt-rule mt-5 h-px w-32 xs:w-40 sm:w-56" />
        <p className="mx-auto mt-5 max-w-[32ch] text-base leading-relaxed text-ink/70 sm:max-w-md sm:text-lg">
          Twelve months, twelve gowns, one very small royal. Swipe up through her story — then
          come celebrate the big day at the ball.
        </p>

        {/* The deck moves up and down, so the cue points down. */}
        <motion.div
          className="mt-10 flex flex-col items-center gap-2 text-ink/50 sm:mt-14"
          animate={{ y: [0, 8, 0] }}
          transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
        >
          <span className="text-xs uppercase tracking-widest sm:text-sm">Swipe up to begin</span>
          <span aria-hidden>↓</span>
        </motion.div>
      </div>
    </div>
  );
}
