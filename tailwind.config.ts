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
      wide: { raw: "(min-width: 768px) and (orientation: landscape)" },
      /*
       * The other half of the same split: a tablet held upright, where the
       * page keeps the phone's single column but has half as much again of
       * every dimension to spend on it. Anything that wants to be *bigger* on
       * an iPad without becoming a second column goes here.
       */
      tall: { raw: "(min-width: 768px) and (orientation: portrait)" },
      /* The same, once there is desktop width to spend — type comes back up
         to the size it is at on a phone held in one hand. */
      "wide-lg": { raw: "(min-width: 1280px) and (orientation: landscape)" },
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
