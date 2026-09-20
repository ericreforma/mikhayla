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
