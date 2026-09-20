"use client";

import { BABY_NAME } from "@/app/config";
import { Crown } from "./Ornaments";

export function FinaleSection() {
  return (
    <div className="relative flex min-h-full flex-col items-center overflow-hidden px-gutter pb-nav pt-8 text-center">
      <div aria-hidden className="pointer-events-none absolute inset-0 parchment-texture" />

      <div className="relative my-auto flex flex-col items-center">
        <Crown className="h-11 w-auto text-gold drop-shadow-sm sm:h-14" />
        <h2 className="mt-5 max-w-[20ch] font-display text-2xl italic leading-snug text-ink xs:text-3xl sm:mt-6 sm:max-w-none sm:text-5xl">
          One whole year of Princess {BABY_NAME}
        </h2>
        <div aria-hidden className="gilt-rule mt-5 h-px w-32 xs:w-40 sm:w-56" />
        <p className="mx-auto mt-5 max-w-[34ch] text-sm leading-relaxed text-ink/70 sm:max-w-md sm:text-base">
          Thank you for being part of her first year — every gown, every giggle, every tiny
          milestone. We can&apos;t wait to celebrate this one with you.
        </p>
        <p className="mt-8 font-hand text-xl text-berry xs:text-2xl sm:mt-10">
          And they all lived happily ever after 👑
        </p>
      </div>
    </div>
  );
}
