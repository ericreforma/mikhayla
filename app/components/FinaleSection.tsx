"use client";

import { BABY_FULL_NAME, BABY_NAME, FINALE_PORTRAIT } from "@/app/config";
import { Crown } from "./Ornaments";

/**
 * The last screen, built the way the first one is: the words at the top and
 * her standing at the foot of the page, edge to edge, dissolving into it.
 *
 * Where the hero gives its photograph a fixed share of the screen, this one
 * hands it whatever is left under the words — there is more to read here
 * than on the hero, and a fixed share would put the closing line across her
 * face on a short phone. Taking the remainder means the two can never
 * collide, however the paragraph happens to wrap.
 */
export function FinaleSection() {
  return (
    <div className="relative flex min-h-full flex-col overflow-hidden pt-6 text-center sm:pt-8">
      <div aria-hidden className="pointer-events-none absolute inset-0 parchment-texture" />

      <div className="relative flex flex-col items-center px-gutter">
        <Crown className="h-9 w-auto text-gold drop-shadow-sm sm:h-12" />

        {/*
          Her name alone on the big line, with the sentiment in small caps
          underneath — the same shape the hero makes, and on purpose. These
          are the first and last screens of the invitation, so closing the
          way it opened makes the two read as a pair of covers rather than as
          two unrelated pages that happen to share a photograph.

          Which is also why the name is set a size under the hero's: this is
          the echo, not the announcement.
        */}
        <h2 className="mt-4 font-display text-[1.875rem] italic leading-[1.15] text-ink xs:text-[2.25rem] sm:mt-5 sm:text-5xl">
          {BABY_FULL_NAME}
        </h2>

        {/* Too long for a phone at this tracking, so it is given a width to
            break against and `text-balance` to break evenly — two tidy lines
            rather than five words and an orphan. Past `sm` there is room for
            all of it on one line, which is where the hero's own subtitle
            sits, so the width comes off. */}
        <p className="mx-auto mt-2.5 max-w-[30ch] text-balance text-[0.6875rem] uppercase tracking-[0.28em] text-goldDeep xs:text-xs sm:mt-3 sm:max-w-none sm:text-sm sm:tracking-[0.3em]">
          One whole year of our little princess
        </p>

        <div aria-hidden className="gilt-rule mt-4 h-px w-32 xs:w-40 sm:mt-5 sm:w-56" />
        <p className="mx-auto mt-4 max-w-[34ch] text-sm leading-relaxed text-ink/75 sm:mt-5 sm:max-w-md sm:text-base">
          Thank you for being part of her first year — every gown, every giggle, every tiny
          milestone. We can&apos;t wait to celebrate this one with you.
        </p>
        <p className="mt-5 font-hand text-xl text-berry xs:text-2xl sm:mt-6">
          And they all lived happily ever after 👑
        </p>
      </div>

      {/*
        She takes the rest of the page. The negative margin slides the top of
        the frame back up under the closing line, so the words finish over
        the dissolve rather than on the bare edge of it — the hero reads the
        same way.

        No bottom padding anywhere on this panel: the picture is meant to run
        on behind the tab bar rather than stop above it.

        Past `sm` it stops widening and stands centred, for the same reason
        the hero's does: a tall portrait cropped to fill a wide, shallow box
        blows up until her face is cut in half by the bottom of it.
      */}
      <div
        aria-hidden
        className="relative -mt-6 min-h-[38%] flex-1 sm:-mt-8 sm:mx-auto sm:w-full sm:max-w-[34rem] md:max-w-[38rem]"
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={FINALE_PORTRAIT}
          alt=""
          width={1414}
          height={2000}
          loading="lazy"
          decoding="async"
          className="finale-portrait-fade absolute inset-0 h-full w-full object-cover object-top"
        />

        {/* The two cut sides, where the frame is narrower than the screen,
            faded into the page the way the top is. `parchment` is the colour
            behind this section. */}
        <div className="absolute inset-y-0 left-0 hidden w-14 bg-gradient-to-r from-parchment to-transparent sm:block md:w-20" />
        <div className="absolute inset-y-0 right-0 hidden w-14 bg-gradient-to-l from-parchment to-transparent sm:block md:w-20" />
      </div>

      <span className="sr-only">
        {BABY_NAME} at one year old, with her cake.
      </span>
    </div>
  );
}
