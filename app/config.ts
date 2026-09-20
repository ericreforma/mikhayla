/**
 * EDIT THIS FILE — swap in your own details. Everything below reads from
 * this one config block, so this is the only place you need to
 * touch to make the page yours.
 */

/**
 * The site is served from a subfolder (`/mikhayla`), not a domain root, so
 * everything in `public/` answers one level in. `asset()` puts that prefix on
 * the paths below, reading it from `next.config.mjs` so there is one place to
 * change it — and leaving empty strings empty, so an unset video stays unset
 * rather than becoming a path to nothing.
 *
 * Write the paths below exactly as you see them, from the site root. The
 * prefix is added for you.
 */
const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH ?? "";
const asset = (path: string) => (path ? `${BASE_PATH}${path}` : path);

export const BABY_NAME = "Mikhayla";
export const PARTY_DATE = "Saturday, October 17, 2026";
export const PARTY_TIME = "10:00 AM – 2:00 PM";
export const PARTY_LOCATION = "Casa Maria Resort and Events Place";
export const PARTY_ADDRESS = "San Mateo St., Poblacion, City of San Jose del Monte, Bulacan";
export const RSVP_EMAIL = "rsvp@example.com";
export const RSVP_BY = "October 3";

/**
 * Where the RSVP form posts. This is the web-app URL of the Google Apps
 * Script bound to your RSVP spreadsheet — it ends in `/exec`. Deploy the
 * script in `docs/rsvp-setup.md`, then paste its URL here.
 *
 * Left empty, the RSVP button falls back to opening an email instead, so the
 * invitation works perfectly well before the sheet exists. Nothing else has
 * to change when you fill it in.
 */
export const RSVP_ENDPOINT = "https://script.google.com/macros/s/AKfycbwbEY5AXjP5W0qOQaHDlCaQUL-qHZM7ZDiEoyYuzO_g4r8BaCZhuMo7kmJC06hUiArr5w/exec";

/** The most a single RSVP can bring. The stepper stops here. */
export const RSVP_MAX_GUESTS = 12;

/* ---------------------------------------------------------------
   The venue's two windows: a walkthrough video and a map
   ---------------------------------------------------------------
   Both are empty on purpose. Each renders a framed placeholder until you
   fill it in, so the section is never a broken box waiting on an asset.
   --------------------------------------------------------------- */

/**
 * A walkthrough of the resort, served from `public/`. Drop the file in
 * `public/venue/` and point at it from the site root, e.g.
 * `"/venue/casa-maria.mp4"`.
 *
 * It plays muted, inline and on a loop, so it behaves like moving wallpaper
 * rather than a thing a guest has to start. Keep it short (20–40s) and
 * compressed — most people open this on mobile data.
 */
export const VENUE_VIDEO = asset("");

/**
 * A still pulled from the video, shown while it loads and in place of the
 * first black frame. Same idea: `"/venue/casa-maria-poster.jpg"`.
 */
export const VENUE_VIDEO_POSTER = asset("");

/**
 * A picture of the map — the venue's own directions sheet, with the
 * landmarks on it that a live map doesn't name.
 *
 * It shows cropped to fit the window on the page and opens full screen when
 * tapped, where it can be pinched and dragged, so a tall sheet like this one
 * stays readable on a phone. Anything from a photo of a printed map to a
 * screenshot works; portrait is fine.
 *
 * This takes precedence over `VENUE_MAP_EMBED` below — a drawn map with
 * "FROM MUZON" and "FROM GUMAOK" on it beats a generic pin, and the
 * "Get directions" button already covers turn-by-turn.
 */
export const VENUE_MAP_IMAGE = asset("/venue/casa-maria-poster.jpg");

/**
 * A live embedded map, used only when `VENUE_MAP_IMAGE` above is empty.
 * Google Maps → the venue → Share → Embed a map → copy the `src` out of the
 * iframe it gives you, and paste just that URL here.
 *
 * A keyless search embed works too, if you'd rather not fetch the exact pin:
 * `"https://www.google.com/maps?q=Casa+Maria+Resort+San+Jose+del+Monte+Bulacan&output=embed"`
 */
export const VENUE_MAP_EMBED = "";

/**
 * Where "Open in Google Maps" goes — the one thing that has to work on the
 * day, whether or not the embed above is filled in. Built from the address so
 * it stays right if the address changes.
 */
export const VENUE_MAP_LINK = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
  `${PARTY_LOCATION}, ${PARTY_ADDRESS}`
)}`;

/* ---------------------------------------------------------------
   The dedication
   ---------------------------------------------------------------
   Her christening is part of the day, so it gets its own section
   between her year and the date.
   --------------------------------------------------------------- */

export const PASTOR_NAME = "Pastor Pablo Sabit III";

/** Listed in the order they'll be called up front. */
export const GODMOTHERS = ["Nina", "Diana", "Jasmine", "Shielo", "Jessalyn", "Cherry Ann"];
export const GODFATHERS = ["Renan", "Christian", "Gideon", "Benjie", "Romnick", "Joel"];

/** Accent keys — one per princess. Each maps to a colour in tailwind.config.ts. */
export type PrincessAccent =
  | "newborn"
  | "snow"
  | "cinderella"
  | "aurora"
  | "ariel"
  | "elsa"
  | "anna"
  | "belle"
  | "jasmine"
  | "pocahontas"
  | "mulan"
  | "tiana"
  | "rapunzel"
  | "merida"
  | "moana"
  | "mikhayla";

export type Milestone = {
  month: number;
  /** The gown she wore that month. */
  princess: string;
  title: string;
  note: string;
  /**
   * The page's colour, lifted from the bottom of its own photo. The fade the
   * caption sits on is this colour, so every page is tinted by its picture —
   * and it is the ground under the photo too, so a month has its colour
   * before the image lands, and keeps one if it never gets a photo.
   *
   * Sampled pale on purpose: dark ink has to stay legible on top of it.
   */
  tint: string;
  accent: PrincessAccent;
  /**
   * The princess herself, from the film — a small figure tucked into the
   * bottom-left corner of the page, so it is obvious at a glance who the gown
   * is. Put the file in `public/princesses/` and reference it from the
   * site root, e.g. `character: "/princesses/elsa.png"`.
   *
   * It renders at the height of the title and keeps its own proportions, so
   * a transparent cut-out with the figure tight to the edges works best.
   * Decorative only — the caption already names her — so it is hidden from
   * screen readers. Month zero has no gown, and so no figure.
   */
  character?: string;
  /**
   * The costume shot for this month. It is the page — it fills the whole
   * panel edge to edge, with the caption sitting over a `tint` fade at the
   * bottom. Put the file in `public/milestones/` and reference it from
   * the site root, e.g. `photo: "/milestones/01-snowwhite.png"`.
   *
   * Tall phone-shaped portraits (9:16) fit the panel exactly. The image is
   * cropped to fill and anchored near the top, so keep her face in the upper
   * half and leave the bottom third quiet — that is where the words go.
   * When omitted, the page is simply its `tint`.
   */
  photo?: string;
};

/**
 * Twelve months, twelve gowns. The costumes below are the official Disney
 * Princess line-up — swap `princess`, `accent` and `tint` on any row to match
 * the gown she actually wore that month. The titles nod to her princess; the
 * notes are the real milestone she hit in that gown, so those are the ones
 * worth rewriting in your own words.
 */
const MILESTONE_PAGES: Milestone[] = [
  { month: 0,  princess: "",           title: "A princess is born",            note: "Before the gowns and the crowns — the day your kingdom met you.",         tint: "#EAE2E1", accent: "newborn",                                            photo: "/milestones/00-newborn.png" },
  { month: 1,  princess: "Snow White", title: "Fairest of them all",           note: "One month old, and already able to hush a room full of admirers.",        tint: "#F1E9DA", accent: "snow",       character: "/princesses/snowwhite.png", photo: "/milestones/01-snowwhite.png" },
  { month: 2,  princess: "Aurora",     title: "Once upon a dream",             note: "Your first real smile arrived mid-nap, like something you'd dreamt up.",  tint: "#F1DADD", accent: "aurora",     character: "/princesses/aurora.png",    photo: "/milestones/02-aurora.png" },
  { month: 3,  princess: "Elsa",       title: "The cold never bothered you",   note: "You found your own hands this month and would not let them go.",          tint: "#DEE4ED", accent: "elsa",       character: "/princesses/elsa.png",      photo: "/milestones/03-elsa.png" },
  { month: 4,  princess: "Anna",       title: "For the first time in forever", note: "Front to back, all on your own, and very pleased about it.",              tint: "#E2E0EB", accent: "anna",       character: "/princesses/anna.png",      photo: "/milestones/04-anna.png" },
  { month: 5,  princess: "Pocahontas", title: "Colors of the wind",            note: "Giggles for days — the best sound in the house, and it carried.",         tint: "#EDDEE2", accent: "pocahontas", character: "/princesses/pocahontas.png", photo: "/milestones/05-pocahontas.png" },
  { month: 6,  princess: "Ariel",      title: "Part of your world",            note: "Sitting up solo, suddenly eye-level with the whole world.",               tint: "#DDE2EE", accent: "ariel",      character: "/princesses/ariel.png",     photo: "/milestones/06-ariel.png" },
  { month: 7,  princess: "Jasmine",    title: "A whole new world",             note: "Your first taste of real food. Mashed banana went everywhere. Worth it.", tint: "#DAE9F1", accent: "jasmine",    character: "/princesses/jasmine.png",   photo: "/milestones/07-jasmine.png" },
  { month: 8,  princess: "Rapunzel",   title: "Let down your hair",            note: "You said something very close to “dada”. We are counting it.",            tint: "#EEDFDD", accent: "rapunzel",   character: "/princesses/rapunzel.png",  photo: "/milestones/08-rapunzel.png" },
  { month: 9,  princess: "Moana",      title: "How far you'll go",             note: "You started crawling, and nothing in this house was safe again.",         tint: "#F1DADB", accent: "moana",      character: "/princesses/moana.png",     photo: "/milestones/09-moana.png" },
  { month: 10, princess: "Belle",      title: "Tale as old as time",           note: "You waved bye-bye. A tiny hand, and a very big deal.",                    tint: "#F1E9DA", accent: "belle",      character: "/princesses/belle.png",     photo: "/milestones/10-belle.png" },
  { month: 11, princess: "Cinderella", title: "If the shoe fits",              note: "First steps — wobbly, brave, and gone in a blink. No midnight needed.",   tint: "#E1E1EA", accent: "cinderella", character: "/princesses/cinderella.png", photo: "/milestones/11-cinderella.png" },
  { month: 12, princess: "Mikhayla",   title: "A crown of your own",           note: "A year ago you arrived. Now the whole kingdom comes to you.",             tint: "#F1DAEA", accent: "mikhayla",                                           photo: "/milestones/12-mikhayla.png" },
];

/**
 * The same twelve pages, with the site prefix put on every file path. This is
 * what the page reads — write the rows above from the site root and let this
 * do the prefixing, so the table stays a table.
 */
export const MILESTONES: Milestone[] = MILESTONE_PAGES.map((page) => ({
  ...page,
  character: page.character && asset(page.character),
  photo: page.photo && asset(page.photo),
}));

/**
 * Tailwind can't build class names at runtime, so every class is spelled out
 * here in full for the compiler to find. `text` is the month's heading colour
 * and `rule` its hairline, both sitting on that month's `tint`.
 */
export const ACCENT_STYLES: Record<PrincessAccent, { text: string; rule: string }> = {
  newborn:    { text: "text-newborn", rule: "bg-newborn/30" },
  snow:       { text: "text-snow", rule: "bg-snow/30" },
  cinderella: { text: "text-cinderella", rule: "bg-cinderella/30" },
  aurora:     { text: "text-aurora", rule: "bg-aurora/30" },
  ariel:      { text: "text-ariel", rule: "bg-ariel/30" },
  elsa:       { text: "text-elsa", rule: "bg-elsa/30" },
  anna:       { text: "text-anna", rule: "bg-anna/30" },
  belle:      { text: "text-belle", rule: "bg-belle/30" },
  jasmine:    { text: "text-jasmine", rule: "bg-jasmine/30" },
  pocahontas: { text: "text-pocahontas", rule: "bg-pocahontas/30" },
  mulan:      { text: "text-mulan", rule: "bg-mulan/30" },
  tiana:      { text: "text-tiana", rule: "bg-tiana/30" },
  rapunzel:   { text: "text-rapunzel", rule: "bg-rapunzel/30" },
  merida:     { text: "text-merida", rule: "bg-merida/30" },
  moana:      { text: "text-moana", rule: "bg-moana/30" },
  mikhayla:   { text: "text-mikhayla", rule: "bg-mikhayla/30" },
};
