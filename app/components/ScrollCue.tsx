"use client";

import { motion, useReducedMotion } from "framer-motion";

/**
 * The way on to the next section: a chevron at the foot of the page, which
 * bobs, and which can be pressed.
 *
 * ---------------------------------------------------------------------------
 * Why it is a button and not a sign
 * ---------------------------------------------------------------------------
 * It used to be the character `↓`, and before that nothing at all on five of
 * the six sections. Both of those asked a guest to already know that the page
 * can be pushed. The ones this invitation is most for do not: a swipe is not
 * a gesture you can deduce, and an arrow that only *describes* one is no help
 * to somebody who has never made it.
 *
 * So it is the chevron the timeline rail uses to turn her months, and it does
 * the same kind of thing: a guest who swipes never needs it, and a guest who
 * does not can press it and still see the whole invitation, a page at a time.
 *
 * Borrowing that drawing is the point rather than a coincidence — it is the
 * only other control of its kind on the site, and anyone who has reached her
 * year has already used it. What it does *not* borrow is the rail's disc. The
 * ring earns its keep over a photograph with a month either side of it; at
 * the foot of a parchment page it was a box drawn around nothing.
 *
 * It is still a real button, and that is not negotiable: it looks like a way
 * onward, so it has to be one.
 *
 * ---------------------------------------------------------------------------
 * Why the deck renders it
 * ---------------------------------------------------------------------------
 * A section tall enough to scroll inside itself does exactly that — see
 * `overflow-y: auto` on `.deck-slide`. An arrow placed *within* a section
 * would scroll away with its contents, which is precisely when a guest most
 * needs telling that the page continues. Mounted out here it is pinned to the
 * foot of the window and stays put. One copy, one behaviour, six sections.
 */
export function ScrollCue({ onSelect }: { onSelect: () => void }) {
  const reduce = useReducedMotion();

  return (
    <motion.div
      /*
       * The wrapper bobs; the button inside is the target. Separated so the
       * movement can be turned off without touching the control — and so the
       * press area is the disc rather than this full-width strip.
       *
       * `z-20` is under the bar's own `z-50`: on the one window where the two
       * could meet, the bar wins.
       */
      className="pointer-events-none absolute inset-x-0 z-20 flex justify-center"
      /*
       * Stood on top of the bar the way the corner figures are — see
       * `.bottom-menu` in globals.css, which this is the arithmetic of, plus a
       * little air. `--nav-at-foot` takes the bar's height back out on a
       * desktop, where the bar has gone to the top of the window and there is
       * nothing down here to clear.
       */
      style={{
        bottom:
          "calc(var(--nav-bar) * var(--nav-at-foot) + env(safe-area-inset-bottom) + 0.55rem)",
      }}
      animate={reduce ? undefined : { y: [0, 8, 0] }}
      transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
    >
      <button
        type="button"
        onClick={onSelect}
        aria-label="Go to the next section"
        /*
           The rail's chevron without the rail's disc.

           The disc is what makes that control look pressable where it sits —
           in the middle of a photograph, with a month either side of it. Down
           here the chevron has parchment behind it and nothing competing, and
           the ring only drew a box around empty space at the foot of every
           page. The drawing is identical; what has gone is the furniture.

           The press area has not shrunk with it. The button keeps the disc's
           footprint as padding, so the target is still the full 44px a thumb
           needs even though there is now nothing drawn around it.
        */
        className="pointer-events-auto flex h-11 w-11 items-center justify-center rounded-full text-ink/60 transition hover:text-ink active:scale-90"
      >
        <svg
          viewBox="0 0 24 24"
          aria-hidden
          fill="none"
          /* The halo the cue used to carry as text. With the disc gone the
             chevron sits straight on whatever is behind it, and on the hero
             that is her gown — ink on pink, with nothing between the two.
             A drop-shadow is the `cue-halo` idea for a drawn line. */
          className="h-6 w-6 drop-shadow-[0_0_3px_rgba(255,255,255,0.95)]"
        >
          {/* The rail's chevron, turned a quarter to point down the deck. */}
          <path
            d="M5 9.5 L12 16.5 L19 9.5"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>
    </motion.div>
  );
}
