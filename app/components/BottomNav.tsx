"use client";

import { motion, type MotionValue } from "framer-motion";

export type NavSection = {
  id: string;
  /** Short enough to sit under a 22px icon on a 360px-wide phone. */
  label: string;
  Icon: (props: { className?: string }) => JSX.Element;
};

/**
 * The app-style tab bar. It pins to the bottom of the viewport, sits above
 * every slide, and jumps the deck to the first slide of whichever section
 * is tapped.
 *
 * The hairline across the top doubles as a position readout: it fills left
 * to right across the whole deck, so the twelve milestone slides don't feel
 * like an unmarked stretch between two tabs.
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
  return (
    <nav
      aria-label="Invitation sections"
      className="pb-safe absolute inset-x-0 bottom-0 z-50 border-t border-gold/30 bg-parchment/90 backdrop-blur-md"
    >
      <motion.div
        aria-hidden
        className="absolute inset-x-0 top-0 h-[2px] origin-left bg-gold"
        style={{ scaleX: progress }}
      />

      <ul className="mx-auto flex max-w-lg items-stretch justify-between px-1">
        {sections.map(({ id, label, Icon }) => {
          const isActive = id === activeSection;
          return (
            <li key={id} className="min-w-0 flex-1">
              <button
                type="button"
                onClick={() => onSelect(id)}
                aria-current={isActive ? "true" : undefined}
                /* min-h-[3.25rem] keeps every tab past the 44px touch target
                   even though the icon itself is only 22px. */
                className={`flex min-h-[3.25rem] w-full flex-col items-center justify-center gap-1 rounded-xl px-0.5 py-2 transition-colors ${
                  isActive ? "text-berry" : "text-ink/50 hover:text-ink/70"
                }`}
              >
                <span className="relative flex h-6 w-6 items-center justify-center">
                  <Icon className="h-[22px] w-[22px] sm:h-6 sm:w-6" />
                  {isActive && (
                    <motion.span
                      aria-hidden
                      layoutId="nav-glow"
                      transition={{ type: "spring", stiffness: 420, damping: 34 }}
                      className="absolute -inset-1.5 -z-10 rounded-full bg-berry/10"
                    />
                  )}
                </span>
                {/* nowrap + a 9px floor keeps "Her Year" on one line in five
                    tabs across a 320px screen; a wrapped label would make the
                    tabs different heights and jog the icons out of line. */}
                <span
                  className={`whitespace-nowrap text-[9px] leading-none tracking-wide xs:text-[10.5px] sm:text-xs ${
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
