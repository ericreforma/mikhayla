"use client";

import { motion, useTransform, type MotionValue } from "framer-motion";
import { Sparkle } from "./Ornaments";

export type NavSection = {
  id: string;
  /** Short enough to sit under a 22px icon on a 360px-wide phone. */
  label: string;
  Icon: (props: { className?: string }) => JSX.Element;
};

/**
 * The app-style tab bar, dressed as a band of a tiara: a gilt edge along the
 * top, and the section you are on set in its own gold-rimmed stone.
 *
 * It pins to the bottom of the viewport, sits above every slide, and jumps
 * the deck to the first slide of whichever section is tapped.
 *
 * The gold line across the top doubles as a position readout — it fills left
 * to right across the whole deck, so the twelve milestone slides don't feel
 * like an unmarked stretch between two tabs — and a sparkle rides its
 * leading edge, which is the part that reads at a glance while the rest of
 * the line is behind a thumb.
 */
export function BottomNav({
  sections,
  activeSection,
  progress,
  onSelect,
}: {
  sections: NavSection[];
  activeSection: string | undefined;
  progress: MotionValue<number>;
  onSelect: (id: string) => void;
}) {
  /*
   * Where the sparkle sits. A percentage of the element's own width, and the
   * element is the full width of the bar, so this reads straight off the
   * deck's progress without anyone having to measure the viewport.
   */
  const tipX = useTransform(progress, (v) => `${v * 100}%`);

  return (
    <nav
      aria-label="Invitation sections"
      className="pb-safe absolute inset-x-0 bottom-0 z-50 border-t border-gold/25 bg-gradient-to-b from-parchment/95 to-mist/95 backdrop-blur-md"
    >
      {/* Two lines on the top edge, one over the other: a gilt wash that
          fades out towards the corners the way every other rule on the site
          does, and the plain hairline of the border underneath it, which is
          what actually separates the bar from a photograph running behind.

          The wash is held at half strength deliberately. At full strength it
          is the same gold as the progress line laid over it, and the two
          become one continuous bar — which reads as a full deck however
          little of it you have seen. */}
      <div
        aria-hidden
        className="gilt-rule pointer-events-none absolute inset-x-0 top-0 h-px opacity-50"
      />

      <motion.div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-[2px] origin-left bg-gold"
        style={{ scaleX: progress }}
      />
      {/* Held a few pixels in from each end, so at either extreme of the deck
          the sparkle sits on the bar rather than half off the corner of it. */}
      <motion.div
        aria-hidden
        className="pointer-events-none absolute inset-x-2.5 top-0 h-0"
        style={{ x: tipX }}
      >
        <Sparkle className="-ml-[7px] -mt-[6px] h-3.5 w-3.5 text-gold drop-shadow-sm md:-ml-[9px] md:-mt-2 md:h-[18px] md:w-[18px]" />
      </motion.div>

      <ul className="mx-auto flex max-w-lg items-stretch justify-between px-2 md:max-w-3xl md:px-5">
        {sections.map(({ id, label, Icon }) => {
          const isActive = id === activeSection;
          return (
            <li key={id} className="min-w-0 flex-1">
              <button
                type="button"
                onClick={() => onSelect(id)}
                aria-current={isActive ? "true" : undefined}
                /* min-h-[3.25rem] keeps every tab past the 44px touch target
                   even though the icon itself is only 22px; past `md` the
                   content is taller than that on its own and the floor never
                   binds. Changing the padding, the gap, or the label sizes
                   below moves the bar's real height, which `--nav-bar` in
                   globals.css restates as arithmetic — keep the two in step.

                   Everything past `md` is in `rem`, so it also rides the root
                   type scale at the top of globals.css: an iPad gets a bigger
                   bar twice over, once from these classes and once from that. */
                className={`relative flex min-h-[3.25rem] w-full flex-col items-center justify-center gap-1 px-0.5 py-2 transition-colors md:gap-2 md:px-1 md:py-3 ${
                  isActive ? "text-berry" : "text-ink/65 hover:text-ink/85"
                }`}
              >
                {/*
                  The stone. It is laid behind the tab rather than around it —
                  absolute, so it adds no height and the bar stays the size
                  the rest of the deck expects — and `layoutId` hands it from
                  one tab to the next, so it slides along the band instead of
                  blinking out and in.
                */}
                {isActive && (
                  <motion.span
                    aria-hidden
                    layoutId="nav-stone"
                    transition={{ type: "spring", stiffness: 420, damping: 34 }}
                    className="absolute inset-x-0.5 inset-y-1 -z-10 rounded-2xl border border-gold/50 bg-goldSoft/45 shadow-sm md:inset-x-1 md:inset-y-2"
                  />
                )}

                {/* The icon keeps a square box of its own — 1.5rem, 2.25rem
                    on a tablet. It is one of the terms `--nav-bar` in
                    globals.css measures the bar's height from, and it holds
                    the wide ones (the crown, the castle) on the same baseline
                    as the narrow ones.

                    The tablet sizes are `rem` rather than the pixel figures
                    the phone uses, so the icon grows with the root type scale
                    instead of staying put while its box and its label move. */}
                <span className="flex h-6 w-6 items-center justify-center md:h-9 md:w-9">
                  <Icon className="h-[22px] w-[22px] sm:h-6 sm:w-6 md:h-8 md:w-8" />
                </span>

                {/* nowrap + a 9px floor keeps "Her Year" on one line in six
                    tabs across a 320px screen; a wrapped label would make the
                    tabs different heights and jog the icons out of line. */}
                <span
                  className={`whitespace-nowrap text-[9px] leading-none tracking-wide xs:text-[10.5px] sm:text-xs md:text-base ${
                    isActive ? "font-semibold" : "font-medium"
                  }`}
                >
                  {label}
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
