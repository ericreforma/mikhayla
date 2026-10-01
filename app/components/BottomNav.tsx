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
 *
 * ---------------------------------------------------------------------------
 * On a desktop it is a menu instead
 * ---------------------------------------------------------------------------
 * Everything above describes a bar built for a thumb: at the foot of the
 * screen because that is where the thumb is, wide-tabbed and tall because a
 * finger is imprecise, with the label stacked under the icon because a tab
 * that wide would otherwise be mostly empty.
 *
 * None of those reasons survive a mouse. So from `wide-lg` the bar goes to the
 * top of the window, the label comes round beside its icon, the tabs stop
 * sharing the width out equally and take only what they need, and the whole
 * band shrinks to a menu's height. It is the same component and the same
 * tiara — the gilt line, the stone, the sparkle — turned the other way up.
 *
 * "The other way up" is meant literally, and it is most of the work below: the
 * three decorations that ride the bar's *content-facing* edge are written
 * `top-0` for a bar at the foot, and each is flipped to `bottom-0` for one at
 * the head. The name stays `BottomNav` because that is what it is on every
 * screen anyone will actually hold.
 *
 * The clearance it needs from the slides is not here. It is `--nav-at-foot` in
 * globals.css, which moves that clearance from the foot of a slide to its head
 * in one place, and `--nav-bar` beside it, which restates this bar's height as
 * arithmetic — keep the padding and the icon box below in step with it.
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
      /* The wash is reversed along with the bar, so the parchment end of it is
         always the end that meets the page and the mist end is the one against
         the edge of the screen. */
      className="pb-safe absolute inset-x-0 bottom-0 z-50 border-t border-gold/25 bg-gradient-to-b from-parchment/95 to-mist/95 backdrop-blur-md wide-lg:bottom-auto wide-lg:top-0 wide-lg:border-b wide-lg:border-t-0 wide-lg:bg-gradient-to-t"
    >
      {/* Two lines on the top edge, one over the other: a gilt wash that
          fades out towards the corners the way every other rule on the site
          does, and the plain hairline of the border underneath it, which is
          what actually separates the bar from a photograph running behind.

          The wash is held at half strength deliberately. At full strength it
          is the same gold as the progress line laid over it, and the two
          become one continuous bar — which reads as a full deck however
          little of it you have seen. */}
      {/* All three of these ride the edge the page is on — the top of a bar at
          the foot of the screen, the bottom of one at the head of it — so each
          is flipped at `wide-lg`. */}
      <div
        aria-hidden
        className="gilt-rule pointer-events-none absolute inset-x-0 top-0 h-px opacity-50 wide-lg:bottom-0 wide-lg:top-auto"
      />

      <motion.div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-[2px] origin-left bg-gold wide-lg:bottom-0 wide-lg:top-auto"
        style={{ scaleX: progress }}
      />
      {/* Held a few pixels in from each end, so at either extreme of the deck
          the sparkle sits on the bar rather than half off the corner of it. */}
      <motion.div
        aria-hidden
        className="pointer-events-none absolute inset-x-2.5 top-0 h-0 wide-lg:bottom-0 wide-lg:top-auto"
        style={{ x: tipX }}
      >
        {/* The negative margin is half the sparkle, which is what centres it on
            the line it rides. It hangs off whichever edge that is, so the pull
            upwards is cancelled and replaced by one downwards on a desktop —
            where the sparkle also comes back down to its phone size, the bar
            being a menu's height rather than a thumb's. */}
        <Sparkle className="-ml-[7px] -mt-[6px] h-3.5 w-3.5 text-gold drop-shadow-sm pad:-ml-[9px] pad:-mt-2 pad:h-[18px] pad:w-[18px] wide-lg:-mb-[7px] wide-lg:-ml-[7px] wide-lg:mt-0 wide-lg:h-3.5 wide-lg:w-3.5" />
      </motion.div>

      {/* Handed out equally across the width while the tabs are targets for a
          thumb — six of them, each as wide as a sixth of the screen, so none is
          harder to hit than its neighbour. A menu has no such duty: the tabs
          take the width their own words need and the row sits centred, which is
          what stops "Date" from being set in a box three times its size. */}
      <ul className="mx-auto flex max-w-lg items-stretch justify-between px-2 pad:max-w-3xl pad:px-5 wide-lg:max-w-none wide-lg:justify-center wide-lg:gap-0.5 wide-lg:px-4">
        {sections.map(({ id, label, Icon }) => {
          const isActive = id === activeSection;
          return (
            <li key={id} className="min-w-0 flex-1 wide-lg:flex-none">
              <button
                type="button"
                onClick={() => onSelect(id)}
                aria-current={isActive ? "true" : undefined}
                /* min-h-[3.25rem] keeps every tab past the 44px touch target
                   even though the icon itself is only 22px; past `pad` the
                   content is taller than that on its own and the floor never
                   binds. Changing the padding, the gap, or the label sizes
                   below moves the bar's real height, which `--nav-bar` in
                   globals.css restates as arithmetic — keep the two in step.

                   Everything past `pad` is in `rem`, so it also rides the root
                   type scale at the top of globals.css: an iPad gets a bigger
                   bar twice over, once from these classes and once from that.
                   `pad` rather than `md` throughout, so a phone turned
                   sideways — 932px wide and 430px tall — keeps the phone's bar
                   instead of being handed a tablet's.

                   The touch floor comes off on a desktop along with the stack:
                   a pointer needs no 44px, and left in place that one figure
                   would hold the menu at half again the height it is asking
                   for. What sets the height there is the icon's box and the
                   padding around it, which is exactly what `--nav-bar` adds up
                   in its desktop branch. */
                className={`relative flex min-h-[3.25rem] w-full flex-col items-center justify-center gap-1 px-0.5 py-2 transition-colors pad:gap-2 pad:px-1 pad:py-3 wide-lg:min-h-0 wide-lg:flex-row wide-lg:gap-2 wide-lg:px-3.5 wide-lg:py-2 ${
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
                    className="absolute inset-x-0.5 inset-y-1 -z-10 rounded-2xl border border-gold/50 bg-goldSoft/45 shadow-sm pad:inset-x-1 pad:inset-y-2 wide-lg:inset-x-0 wide-lg:inset-y-1 wide-lg:rounded-full"
                  />
                )}

                {/* The icon keeps a square box of its own — 1.5rem, 2.25rem
                    on a tablet. It is one of the terms `--nav-bar` in
                    globals.css measures the bar's height from, and it holds
                    the wide ones (the crown, the castle) on the same baseline
                    as the narrow ones.

                    The tablet sizes are `rem` rather than the pixel figures
                    the phone uses, so the icon grows with the root type scale
                    instead of staying put while its box and its label move.

                    Back to a phone's square on a desktop, and that square is
                    what the bar is measured at there: `--nav-bar` reads 1.5rem
                    from this line. A tablet's 2.25rem is a target you aim a
                    hand at; this is an icon you read beside a word. */}
                <span className="flex h-6 w-6 items-center justify-center pad:h-9 pad:w-9 wide-lg:h-6 wide-lg:w-6">
                  <Icon className="h-[22px] w-[22px] sm:h-6 sm:w-6 pad:h-8 pad:w-8 wide-lg:h-5 wide-lg:w-5" />
                </span>

                {/* nowrap + a 9px floor keeps "Her Year" on one line in six
                    tabs across a 320px screen; a wrapped label would make the
                    tabs different heights and jog the icons out of line. */}
                <span
                  className={`whitespace-nowrap text-[9px] leading-none tracking-wide xs:text-[10.5px] sm:text-xs pad:text-base wide-lg:text-sm ${
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
