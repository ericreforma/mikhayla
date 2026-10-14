"use client";

import { Sparkle } from "@/app/components/Ornaments";

/**
 * The things turning slowly around the edge of the guestbook.
 *
 * Everything here is decoration and says so: `aria-hidden` throughout, and
 * `pointer-events-none`, because the whole screen is one big button for
 * advancing the message and a flower must never swallow a click.
 *
 * It is also deliberately cheap. This page is meant to run unattended on a
 * television for the length of a party, so there is no canvas, no timer and no
 * React state out here — just a dozen SVGs on CSS transforms, which the
 * compositor animates without waking the main thread at all. The alternative,
 * a particle system, would be a laptop fan running for four hours behind the
 * cake.
 */

/*
 * A note on the opacities below: every one of them is a multiple of five.
 *
 * Tailwind's opacity scale steps in fives, and a value off it — `/12`, say —
 * generates no class at all. Nothing errors: the `className` is simply a word
 * the stylesheet has never heard of, `currentColor` keeps whatever it
 * inherited, and a pale pink flower comes out the colour of the body text.
 * Which is exactly what happened here.
 */

/** One five-petal bloom. Flat, a little lopsided, drawn once and reused. */
function Flower({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 100 100" className={className} aria-hidden fill="none">
      {[0, 72, 144, 216, 288].map((a) => (
        <ellipse
          key={a}
          cx="50"
          cy="27"
          rx="15.5"
          ry="22"
          fill="currentColor"
          transform={`rotate(${a} 50 50)`}
        />
      ))}
      <circle cx="50" cy="50" r="11" fill="#F7E7A8" />
      <circle cx="50" cy="50" r="5.5" fill="#E8CB63" />
    </svg>
  );
}

export function Flourishes() {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
      {/*
        Corners first, and large. A television is watched from across a room,
        so the border has to be readable at four metres — a scattering of small
        marks reads as dust on the screen at that distance.
      */}
      <Flower className="animate-spin-slow absolute -left-[5vmin] -top-[6vmin] h-[22vmin] w-[22vmin] text-berry/15" />
      <Flower className="animate-spin-slower absolute -right-[7vmin] -top-[9vmin] h-[28vmin] w-[28vmin] text-gold/20" />
      <Flower className="animate-spin-slower absolute -bottom-[8vmin] -right-[4vmin] h-[24vmin] w-[24vmin] text-berry/15" />

      {/* Mid-field blooms, smaller and further apart, to keep the long
          diagonals from reading as empty. */}
      <Flower className="animate-spin-slow absolute left-[14vmin] bottom-[26vmin] h-[9vmin] w-[9vmin] text-gold/15" />
      <Flower className="animate-spin-slower absolute right-[20vmin] top-[34vmin] h-[7vmin] w-[7vmin] text-berry/10" />

      {/* Sparkles, on two different periods so they never blink together —
          which is what makes a handful of them read as light rather than as a
          row of indicator lamps. */}
      <Sparkle className="animate-twinkle absolute left-[26vmin] top-[12vmin] h-[4vmin] w-[4vmin] text-gold/70" />
      <Sparkle className="animate-drift absolute right-[30vmin] top-[16vmin] h-[3vmin] w-[3vmin] text-gold/55" />
      <Sparkle className="animate-twinkle absolute right-[12vmin] bottom-[22vmin] h-[4.5vmin] w-[4.5vmin] text-gold/60" />
      <Sparkle className="animate-drift-slow absolute left-[40vmin] bottom-[9vmin] h-[3vmin] w-[3vmin] text-berry/45" />
      <Sparkle className="animate-twinkle absolute left-[8vmin] top-[44vmin] h-[3.5vmin] w-[3.5vmin] text-gold/45" />
      <Sparkle className="animate-drift absolute right-[44vmin] bottom-[13vmin] h-[2.5vmin] w-[2.5vmin] text-gold/50" />

      {/* Two soft lamps, to lift the corners the flowers do not reach. */}
      <div className="absolute -left-[12vmin] bottom-[8vmin] h-[42vmin] w-[42vmin] rounded-full bg-berry/[0.07] blur-3xl" />
      <div className="absolute right-[6vmin] top-[6vmin] h-[34vmin] w-[34vmin] rounded-full bg-gold/[0.09] blur-3xl" />
    </div>
  );
}
