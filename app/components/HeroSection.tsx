"use client";

import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import { motion } from "framer-motion";
import { BABY_FULL_NAME, HERO_PORTRAITS } from "@/app/config";
import { Hint } from "./Hint";
import { Crown, Sparkle } from "./Ornaments";
import { useSlideIsActive } from "./SlideActive";

export function HeroSection() {
  /*
   * Whether the hand still has anything to teach.
   *
   * The first screen is the one place a guest has to be shown that the
   * invitation moves at all — but only once. Leaving this section is proof
   * they can, so the moment it goes off screen the hand is retired for the
   * visit; coming back to look at her name again should not be met by a
   * tutorial.
   */
  const isActive = useSlideIsActive();
  const [learned, setLearned] = useState(false);
  useEffect(() => {
    if (!isActive) setLearned(true);
  }, [isActive]);

  return (
    <div className="royal-dawn relative flex min-h-full flex-col overflow-hidden px-gutter pb-nav pt-6 text-center sm:pt-8">
      <div aria-hidden className="pointer-events-none absolute inset-0 parchment-texture" />

      <HeroPortraits active={isActive} />

      {/* Floating sparkles, kept to the top half now that the bottom of the
          screen is her photograph. */}
      <motion.div
        aria-hidden
        className="absolute left-[5%] top-[9%] text-gold sm:left-[8%] sm:top-[12%]"
        animate={{ y: [0, -18, 0] }}
        transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
      >
        <Sparkle className="h-5 w-5 animate-twinkle xs:h-7 xs:w-7 sm:h-10 sm:w-10" />
      </motion.div>
      <motion.div
        aria-hidden
        className="absolute right-[7%] top-[16%] text-roseDeep sm:right-[12%] sm:top-[20%]"
        animate={{ y: [0, 20, 0] }}
        transition={{ duration: 6, repeat: Infinity, ease: "easeInOut", delay: 0.5 }}
      >
        <Sparkle className="h-4 w-4 animate-twinkle xs:h-5 xs:w-5 sm:h-8 sm:w-8" />
      </motion.div>
      <motion.div
        aria-hidden
        className="absolute left-[11%] top-[30%] text-gold sm:left-[18%] sm:top-[34%]"
        animate={{ y: [0, -14, 0] }}
        transition={{ duration: 4.5, repeat: Infinity, ease: "easeInOut", delay: 1 }}
      >
        <Sparkle className="h-3.5 w-3.5 animate-twinkle xs:h-4 xs:w-4 sm:h-6 sm:w-6" />
      </motion.div>

      {/* The words, over the picture. Each piece rises a beat after the one
          above it — see `hero-rise` in globals.css for why the opening is CSS
          rather than framer-motion. */}
      <div className="relative flex flex-1 flex-col items-center pt-[6%] sm:pt-[4%]">
        <Crown className="hero-rise h-8 w-auto text-gold drop-shadow-sm xs:h-10 sm:h-14" />

        <p className="hero-rise mt-3 font-hand text-xl leading-none text-berry [animation-delay:0.1s] xs:text-2xl sm:text-3xl">
          By royal invitation
        </p>

        {/*
          Her name stands alone on the headline. "Princess" is a title she is
          called, not part of what she is named, so it sits underneath in
          small caps with "turns one" — which keeps the big line to the two
          words that are actually hers.
        */}
        <h1 className="hero-rise mt-2 font-display text-[2.125rem] italic leading-[1.1] text-ink [animation-delay:0.2s] xs:text-[2.75rem] sm:text-6xl md:text-7xl">
          {BABY_FULL_NAME}
        </h1>

        <p className="hero-rise mt-2.5 text-[0.6875rem] uppercase tracking-[0.28em] text-goldDeep [animation-delay:0.3s] xs:text-xs sm:mt-3 sm:text-sm sm:tracking-[0.3em]">
          Our little princess turns one
        </p>

        <div
          aria-hidden
          className="gilt-rule hero-rise mt-4 h-px w-32 [animation-delay:0.4s] xs:w-40 sm:mt-5 sm:w-56"
        />

        {/* Full-strength ink from here down: these two sit on the photograph
            rather than on parchment, and a dimmed ink over that pink falls
            below AA. */}
        <p className="hero-rise mx-auto mt-4 max-w-[30ch] text-balance text-[0.9375rem] leading-relaxed text-ink [animation-delay:0.5s] sm:mt-5 sm:max-w-md sm:text-lg">
          A crown, a cake, and a ball of her very own.
        </p>

        <span className="sr-only">
          {BABY_FULL_NAME}, one year old, in a pink gown and tiara.
        </span>

        {/* The deck moves up and down, so the cue points down. It sits at the
            foot of the screen, over her gown, so it carries the white halo
            from globals.css; the bob lives on the inner element because the
            outer one is still easing into place. */}
        <div className="hero-rise relative mt-auto pt-8 [animation-delay:0.7s]">
          {/* The hand rises out of the cue towards the top of the screen,
              which is the gesture itself. `bottom-full` puts it above the
              padding rather than on top of the words. */}
          <Hint
            gesture="swipe-up"
            active={isActive && !learned}
            className="bottom-full left-1/2 -translate-x-1/2"
          />

          <motion.div
            className="cue-halo flex flex-col items-center gap-1.5 text-ink sm:gap-2"
            animate={{ y: [0, 8, 0] }}
            transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
          >
            <span className="text-xs uppercase tracking-widest sm:text-sm">Swipe up to begin</span>
            <span aria-hidden>↓</span>
          </motion.div>
        </div>
      </div>
    </div>
  );
}

/**
 * How long a picture holds before the next one starts fading up, in ms.
 * The dissolve itself is the `duration-1000` below, so each shot is fully
 * itself for a couple of seconds and on its way out for the last one.
 */
const HOLD_MS = 3000;

/**
 * How far a finger has to travel sideways before it counts as a swipe rather
 * than a tap that wandered.
 */
const SWIPE_PX = 40;

/**
 * Her pictures at the foot of the first screen, crossfading on a turn.
 *
 * ---------------------------------------------------------------------------
 * The box
 * ---------------------------------------------------------------------------
 * She stands at the bottom of the screen, edge to edge — no frame, no gutter
 * — with the top of the picture dissolved into the dawn wash so the headline
 * can sit over it. `object-top` keeps her face and tiara in frame and lets
 * the gown run off the bottom of the screen instead, which is the part there
 * is most of and least to lose.
 *
 * Height is a share of the screen rather than a fixed figure, so the same
 * proportion holds from a short phone to a laptop. The taller this box is,
 * the higher up the screen her face lands — which is why the fade in
 * globals.css is measured against it.
 *
 * Full bleed is a phone's shape, though: on a wide, short window a portrait
 * cropped to fill the width blows up until all that is left of her is a
 * forehead. So past `sm` the picture stops widening and stands centred
 * instead, at about the width of a phone held up to the screen — and takes a
 * shorter share of the height, which is what walks her head back down the
 * screen and out from under the words.
 *
 * ---------------------------------------------------------------------------
 * The turn
 * ---------------------------------------------------------------------------
 * Every picture is in the DOM at once, stacked in that one box, and only
 * opacity moves: a dissolve between two shots of the same girl in the same
 * frame reads as her shifting pose, where a slide would read as a carousel
 * and drag the eye away from her name. There is deliberately nothing to
 * press — no dots, no arrows — because the first screen already asks for one
 * gesture (swipe up, to begin) and a second set of controls arguing with it
 * is how a guest ends up stuck here. A sideways swipe works for anyone who
 * tries it; nothing advertises that it does.
 *
 * The turn stops while the hero is off screen, so a guest four sections deep
 * isn't paying for a slideshow nobody is watching, and comes back to the
 * picture they left on. Under `prefers-reduced-motion` the global rule in
 * globals.css flattens the dissolve to a cut — the pictures still change,
 * but nothing animates.
 */
function HeroPortraits({ active }: { active: boolean }) {
  const count = HERO_PORTRAITS.length;
  const [shown, setShown] = useState(0);

  /* Keyed on `shown` as well as `active`, so the clock restarts from whatever
     picture a swipe just landed on — otherwise a swipe could be overtaken by
     the turn a moment later. */
  useEffect(() => {
    if (!active || count < 2) return;
    const t = window.setTimeout(() => setShown((i) => (i + 1) % count), HOLD_MS);
    return () => window.clearTimeout(t);
  }, [active, shown, count]);

  /*
   * A sideways swipe turns the pictures by hand. The deck underneath moves up
   * and down, so only clearly horizontal travel is taken — and `touch-pan-y`
   * on the box below leaves the vertical gesture to the deck, which also
   * means the browser cancels this pointer the moment a swipe up starts
   * scrolling. Nothing here calls preventDefault: the deck's gesture must
   * survive a finger that happens to start on her gown.
   */
  const from = useRef<{ x: number; y: number } | null>(null);

  const onDown = (e: ReactPointerEvent) => {
    from.current = { x: e.clientX, y: e.clientY };
  };

  const onUp = (e: ReactPointerEvent) => {
    const start = from.current;
    from.current = null;
    if (!start || count < 2) return;
    const dx = e.clientX - start.x;
    const dy = e.clientY - start.y;
    if (Math.abs(dx) < SWIPE_PX || Math.abs(dx) <= Math.abs(dy)) return;
    setShown((i) => (i + (dx < 0 ? 1 : -1) + count) % count);
  };

  const onCancel = () => {
    from.current = null;
  };

  return (
    <div
      aria-hidden
      onPointerDown={onDown}
      onPointerUp={onUp}
      onPointerCancel={onCancel}
      className="absolute inset-x-0 bottom-0 mx-auto h-[74%] touch-pan-y select-none sm:h-[68%] sm:max-w-[34rem] md:max-w-[38rem]"
    >
      {HERO_PORTRAITS.map((src, i) => (
        /* eslint-disable-next-line @next/next/no-img-element */
        <img
          key={src}
          src={src}
          alt=""
          width={1414}
          height={2000}
          draggable={false}
          decoding="async"
          fetchPriority={i === 0 ? "high" : "low"}
          className={`hero-portrait-fade absolute inset-0 h-full w-full object-cover object-top transition-opacity duration-1000 ease-in-out ${
            i === shown ? "opacity-100" : "opacity-0"
          }`}
        />
      ))}

      {/*
        Where the picture is narrower than the screen, its two sides are cut
        edges against the wash, so they get the same treatment as the top.
        `mist` is the colour the dawn wash lands on down here, which is why
        a flat gradient disappears into it.
      */}
      <div className="absolute inset-y-0 left-0 hidden w-14 bg-gradient-to-r from-mist to-transparent sm:block md:w-20" />
      <div className="absolute inset-y-0 right-0 hidden w-14 bg-gradient-to-l from-mist to-transparent sm:block md:w-20" />
    </div>
  );
}
