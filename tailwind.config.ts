import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{js,ts,jsx,tsx,mdx}"],
  // Mobile-first: `hover:` only applies on devices that actually hover, so
  // tapped elements on a phone don't get stuck in their hover state.
  future: { hoverOnlyWhenSupported: true },
  theme: {
    // Phone-first ladder. Unprefixed utilities are the phone design;
    // `xs:` covers large phones, `sm:` and up are the scale-ups.
    screens: {
      xs: "400px",
      sm: "640px",
      md: "768px",
      lg: "1024px",
      xl: "1280px",

      /*
       * The two-column layouts: the hero and the finale as a spread, a month
       * of her year beside its caption, the long sections split in half.
       *
       * Width alone is the wrong test for these, which is what this exists to
       * fix. An iPad held upright is 768px across — wide enough by that
       * measure — but it is 1024px tall, and on a tall screen the phone's
       * single column is simply the better page: her photograph across the
       * foot of it, the words above, nothing cramped and nothing to scroll.
       * Turn the same iPad sideways and it is 768px *tall*, which is where
       * one column stops fitting and the second earns its place.
       *
       * So: wide enough for two columns, and short enough to want them.
       * Every desktop window that is wider than it is tall gets them too,
       * which is the same bargain for the same reason.
       *
       * Declared after the width ladder on purpose. Tailwind emits variants
       * in the order they are written here and cannot sort a `raw` query by
       * width, so these have to come last to win against the `md:` and `lg:`
       * rules they are meant to override.
       */
      /*
       * A tablet, by both of its dimensions — either way up.
       *
       * This is the "held at arm's length in two hands" test, and it exists
       * because `md` is not it. `md` asks only how wide the screen is, and a
       * phone turned sideways is 932px across: wide enough to pass, while
       * being 430px tall. Everything sized for a tablet off `md` was therefore
       * being handed to a landscape phone as well — most visibly the tab bar,
       * which at 6.5rem took very nearly a third of the height of the window
       * it was sitting in.
       *
       * Asking for height as well as width is what tells the two apart, and
       * 700px is the figure: comfortably under the 768 of the shortest iPad
       * held sideways, and comfortably over the 430 of the tallest phone.
       *
       * Keep this in step with the `--nav-h` / `--nav-bar` block in
       * globals.css, which is read from here by name; the bar's arithmetic
       * there and the padding, icon box and label in BottomNav are two
       * statements of one height and have to move together.
       */
      pad: { raw: "(min-width: 768px) and (min-height: 700px)" },

      wide: { raw: "(min-width: 768px) and (orientation: landscape)" },
      /*
       * The other half of the same split: a tablet held upright, where the
       * page keeps the phone's single column but has half as much again of
       * every dimension to spend on it. Anything that wants to be *bigger* on
       * an iPad without becoming a second column goes here.
       */
      tall: { raw: "(min-width: 768px) and (orientation: portrait)" },
      /*
       * ---------------------------------------------------------------
       * A desktop — and the one test that is actually about desktops
       * ---------------------------------------------------------------
       * A desktop is not a third layout. It is the `wide` one above, which it
       * satisfies by being wider than it is tall, grown into the room it has;
       * the root type scale in globals.css does nearly all of that growing on
       * its own, because every size on this site is a multiple of it. These
       * two rungs are for the handful of places where a pure scale is not
       * enough — a cap that made sense against an iPad's width and strands a
       * column in the middle of a monitor, a stack whose pieces only shared a
       * left edge because they happened to be the same width, and the tab bar,
       * which stops being a bar at the foot of the screen and becomes a menu
       * at the top of it.
       *
       * That last one is why the size test alone was wrong, and it was wrong
       * in a way worth writing down. An iPad Pro 13" held sideways is 1376 by
       * 1032: wider than a great many laptops and taller than most of them. No
       * reading of width and height will ever separate it from a desktop,
       * because by those measures it *is* one — and it was duly getting the
       * desktop's top menu, which is the one thing a tablet must not have. The
       * bottom bar exists for a thumb. Whether there is a thumb is not a
       * question about how big the screen is.
       *
       * So the real question gets asked directly: `hover: hover` and
       * `pointer: fine` are true of a mouse or a trackpad and false of a
       * finger, on any size of glass. A touchscreen all-in-one gets the bar at
       * the foot, which is right — it is operated by a finger. A small laptop
       * window gets the menu, which is also right.
       *
       * The width floor is kept as a second lock rather than the only one. At
       * 1440 it sits comfortably above that iPad's 1376, so the tablet layout
       * holds on the real device *and* in a desktop browser window dragged
       * down to its size — which is how this gets checked day to day, and
       * where a pointer test on its own would quietly report a desktop.
       *
       * Height is still asked for, and for the reason it always was: see the
       * comment over the type scale in globals.css, where the dedication page
       * sets the figures. Both rungs are consumed from there by name through
       * `@media screen(...)`, so this is the only place either is written.
       */
      "wide-lg": {
        raw: "(min-width: 1440px) and (min-height: 760px) and (orientation: landscape) and (hover: hover) and (pointer: fine)",
      },
      /* The second rung of the same scale, where the page is set larger again. */
      "wide-xl": {
        raw: "(min-width: 1600px) and (min-height: 830px) and (orientation: landscape) and (hover: hover) and (pointer: fine)",
      },
    },
    extend: {
      colors: {
        /* ---- storybook surfaces ---- */
        parchment: "#FFF8F0", // warm page, like an old fairytale book
        mist: "#FBEAF0", // soft blush section background
        night: "#2E1F3D", // deep royal plum, for the ballroom section
        /* Chapel light — the dedication page. A white with the faintest lilac
           cast, so it reads as its own surface next to parchment's cream
           rather than as a page that failed to load its colour. */
        royalWhite: "#FAF9FB",

        /* ---- core ink & accents (all AA-verified on parchment) ---- */
        ink: "#3D2B4F", // 12.03:1
        berry: "#A8325C", // 6.09:1 — handwritten accents
        royal: "#5B3E8E", // 7.90:1
        gold: "#D4AF37", // decorative only (borders, crowns) — NOT text
        goldDeep: "#7E6212", // 4.98:1 on mist, 5.6:1 on parchment — safe for text
        goldSoft: "#F0DFA8", // gilt washes and rules
        rose: "#E8B4C8",
        roseDeep: "#D98BAB",

        /* ---- one accent per princess ----
           Each is AA both on parchment and on its own month's `tint`, which
           is the ground it actually sits on in the timeline. Ratios below are
           against parchment; the tint is the tighter of the two. */
        newborn: "#8A5570", // 5.52:1 — the month-zero page, before the gowns
        snow: "#B3202E", // 6.30:1
        cinderella: "#2C6896", // 5.65:1
        aurora: "#BD1759", // 5.81:1
        ariel: "#186D63", // 5.85:1
        elsa: "#15687F", // 6.01:1
        anna: "#426F2B", // 5.63:1
        belle: "#816613", // 5.19:1
        jasmine: "#0E716A", // 5.56:1
        pocahontas: "#8A5A2B", // 5.57:1
        mulan: "#A63A4A", // 6.00:1
        tiana: "#2F7D4F", // 4.78:1
        rapunzel: "#6D4AA8", // 6.24:1
        merida: "#B0522B", // 4.88:1
        moana: "#186785", // 6.01:1
        mikhayla: "#9B2F60", // 6.71:1 — the last page, and the only gown of her own
      },
      fontFamily: {
        display: ["var(--font-display)"],
        body: ["var(--font-body)"],
        hand: ["var(--font-hand)"],
      },
      keyframes: {
        "balloon-sway": {
          "0%, 100%": { transform: "translateX(0px)" },
          "50%": { transform: "translateX(-14px)" },
        },
        twinkle: {
          "0%, 100%": { opacity: "0.25", transform: "scale(0.8) rotate(0deg)" },
          "50%": { opacity: "1", transform: "scale(1.15) rotate(15deg)" },
        },
      },
      animation: {
        "balloon-sway": "balloon-sway 6s ease-in-out infinite",
        twinkle: "twinkle 3.5s ease-in-out infinite",
      },
    },
  },
  plugins: [],
};

export default config;
