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

/* ---------------------------------------------------------------
   Which size of every photograph this visit gets
   ---------------------------------------------------------------
   The pictures are served at three resolutions, and a guest downloads
   exactly one of them. See `scripts/optimize-images.py`, which renders all
   three out of `assets-src/` — that folder is the originals, and it sits
   outside `public/` so the full-size files are never deployed.
   --------------------------------------------------------------- */

export type AssetTier = "mobile" | "tablet" | "desktop";

/**
 * The tier this visit uses, chosen once and then fixed for as long as the tab
 * is open.
 *
 * Fixed, and that is the whole point. Two separate things ask for every
 * picture — the loading screen, which downloads them all at the door, and the
 * section that eventually shows one — and if those two ever disagreed about
 * which size they wanted, every photograph would be fetched twice: once to
 * wait for, and again to look at. One module constant, read by both, is what
 * makes that impossible.
 *
 * The cost of fixing it is that a desktop window dragged from narrow to wide
 * mid-visit keeps the smaller pictures until the tab is reloaded. That is a
 * fair trade against a phone — the case this is really for — where the window
 * is the screen and never changes size at all.
 *
 * The cut-offs are the layout's own: `md` (768px) is an iPad held upright, and
 * `xl` (1280px) is where a window stops being a tablet's. Keeping them in step
 * with `tailwind.config.ts` means the two-column tablet layout and the
 * middle-sized pictures arrive together.
 *
 * On the server there is no window to measure. Nothing that renders during the
 * static export shows a photograph — the deck and the castle are both behind
 * state flags that start false, and the loading screen draws no pictures at
 * all — so the value chosen here is never the one in the markup, and there is
 * nothing for hydration to disagree with.
 */
export const ASSET_TIER: AssetTier = ((): AssetTier => {
  if (typeof window === "undefined") return "desktop";
  const w = window.innerWidth;
  if (w < 768) return "mobile";
  if (w < 1280) return "tablet";
  return "desktop";
})();

/**
 * A photograph, resolved to this visit's tier.
 *
 * Write the path as the original is named in `assets-src/` — say
 * `/milestones/03-elsa.png` — and this points it at the rendered file that
 * actually ships: `/milestones/mobile/03-elsa.webp`, or the tablet or desktop
 * one. Keeping the authored path the original's means the tables below read as
 * a list of the pictures on disk rather than of build artefacts.
 *
 * Only for the four folders the optimiser knows about (`images`,
 * `milestones`, `princesses`, `venue`). Anything else — the line-art icons,
 * the music — goes through `asset()` unchanged.
 */
const picture = (path: string) => {
  if (!path) return path;
  const slash = path.lastIndexOf("/");
  const folder = path.slice(0, slash);
  const name = path.slice(slash + 1).replace(/\.(png|jpe?g|webp)$/i, ".webp");
  return asset(`${folder}/${ASSET_TIER}/${name}`);
};

export const BABY_NAME = "Mikhayla";

/**
 * Her name in full, for the one place it is the headline. "Princess" is a
 * fond title here, not part of it — the hero keeps the two apart on purpose,
 * so no one reads her name off the invitation as "Princess Mikhayla".
 */
export const BABY_FULL_NAME = "Mikhayla Maeve";

/**
 * The castle the invitation opens on — the painting the opening sequence
 * flies at, before the hero.
 *
 * It is the first thing a guest sees after the loading screen, so it is
 * also the first thing fetched: see `preloadManifest`. Landscape, and used
 * edge to edge at every shape of window, so it is cropped hard on a phone —
 * keep the castle central and the gate near the middle of the width.
 *
 * Swapping it means re-measuring the doorway in `CastleIntro.tsx`, which is
 * where the drawn doors that open are hung onto the painted ones.
 */
export const CASTLE_SCENE = picture("/images/fairy-castle.png");

/**
 * The music under the whole invitation, from the moment the curtain lifts.
 *
 * It loops, so give it something that comes round without a seam — and keep
 * it quiet and wordless. It is the thing playing while a guest reads the
 * venue and the dress code, and it steps aside entirely on her year so each
 * month's own song can be heard: see `BackgroundMusic.tsx`.
 *
 * Put the file in `public/audio/` and spell the extension exactly as the
 * file has it — GitHub Pages treats `.mp3` and `.MP3` as two different
 * files, which a Windows checkout will not show you.
 *
 * Leave it empty for an invitation with no music of its own; her months
 * keep theirs either way.
 */
export const BACKGROUND_TRACK = asset("/audio/background.mp3");

/**
 * The hand that shows a guest what to do — see `Hint.tsx`.
 *
 * A drawing rather than a photograph, but a heavy one: it is an auto-trace,
 * a couple of hundred paths of shading, so it is referenced as a file rather
 * than inlined into the bundle. The file in `public/` is already cropped to
 * the hand and a short wrist; the export it came from has a forearm that
 * leaves the hand too small to read at the size this is used.
 */
export const POINTING_HAND = asset("/icons/pointing-hand.svg");

/**
 * The pictures of her at the foot of the first screen, in the order they
 * come round. The first is the one the invitation opens on; the rest fade
 * up behind it on a turn of a few seconds — see `HeroSection`.
 *
 * She stands there edge to edge, dissolving into the page at the top so the
 * headline can sit over it, so every shot in this list wants the same
 * framing: tall, with her high in it and towards the middle. The top of the
 * picture is faded out and written over and the bottom runs off the screen,
 * so anything in either is lost — and because the pictures are stacked in
 * one box and crossfaded, a shot framed differently from its neighbours
 * will jump rather than dissolve. Put the files in `assets-src/images/` and
 * re-run `scripts/optimize-images.py`.
 *
 * One entry is a perfectly good answer: the slideshow simply doesn't turn.
 * Every picture here is downloaded at the door, though — see
 * `preloadManifest.ts` — so each one added is another hundred kilobytes or so
 * before the curtain lifts.
 */
export const HERO_PORTRAITS = [
  picture("/images/mikhayla-front.png"),
  picture("/images/mikhayla-front-2.png"),
  picture("/images/mikhayla-front-3.png"),
  picture("/images/mikhayla-front-4.png"),
];

/**
 * The picture beside the date. It stands in the right-hand half of the date
 * card, dissolving into it along its left edge, so what matters is that she
 * is high in the frame and to the middle — the left of the shot is faded
 * away and the bottom runs out of the card.
 */
export const DATE_PORTRAIT = picture("/images/mikhayla-fairy.png");

/**
 * The gilt frame around the caption on a month of her year, in the four pieces
 * the page lays out.
 *
 * Only ever drawn on a screen wider than it is tall, where the caption has a
 * column of its own to be framed in — see `MilestonePanel`. Stacked, the
 * caption sits on the photograph itself and a frame round it would be a box
 * round a picture.
 *
 * Four pieces rather than one picture because one picture cannot fit. The
 * drawing is square and the column is a tall rectangle, so a single image has
 * to be stretched to fit it — and stretched filigree reads as a picture pulled
 * out of shape, because it is. Cut up, only the two hairlines down the sides
 * are stretched, and a straight line stretches without anybody seeing it. The
 * crests keep their proportions.
 *
 * `scripts/slice-border.py` cuts them out of `assets-src/frames/royal-border.svg`
 * and prints the figures the panel positions them with. Replacing the frame
 * means re-running it — and drawing the replacement the same way, as two
 * crests joined by two straight rules, since that is the construction the
 * script looks for and the reason this fits at all.
 *
 * SVGs, and so untiered: a few hundred curves that weigh less than a
 * photograph and stay sharp at any size, which is the whole reason to prefer a
 * vector here.
 */
export const MONTH_FRAME = {
  top: asset("/frames/border-top.svg"),
  bottom: asset("/frames/border-bottom.svg"),
  ruleLeft: asset("/frames/border-rule-left.svg"),
  ruleRight: asset("/frames/border-rule-right.svg"),
} as const;

/**
 * The shape of those pieces, as the slicer measured them — see its output.
 *
 * The crests are laid across the frame at full width, so their height follows
 * from their own proportions; the hairlines are placed by a share of that same
 * width, which is what keeps them under the rails the crests draw at any size
 * the frame turns out to be. Re-run the slicer and copy its figures here.
 */
export const MONTH_FRAME_SHAPE = {
  /** width / height of each crest, for the box that holds it. */
  topAspect: "1083 / 336",
  bottomAspect: "1083 / 338",
  /** How far in each hairline sits, and how thick it is. */
  ruleInset: "2.091%",
  ruleWidth: "0.336%",
} as const;

/**
 * The gilt upright that stands between two columns of text — see
 * `ChristeningSection`, which is the one page split in two.
 *
 * A rule with a fleuron at each end, four beads a quarter of the way in and a
 * medallion in the middle: the ornament a horizontal rule on an order of
 * service has, stood on end. Its two shapes are lifted out of the same artwork
 * the frame above is cut from, so it is in the same hand as the rest of the
 * page rather than a divider that happens to be gold.
 *
 * One piece rather than four, unlike that frame. The frame is cut up because
 * it has to fit a column of whatever height the page gives it; this is fitted
 * to its box instead of stretched across it, so nothing is ever scaled
 * unevenly and there is nothing to slice. It is drawn fourteen times longer
 * than it is wide so that, fitted to the height of a christening column, it
 * always comes out under the width the gap between them can spare.
 *
 * `scripts/build-column-separator.py` draws it. Redrawing it means re-running
 * that — and changing its proportions means checking the width it comes out
 * at, since the page gives it its height and it works out the rest.
 */
export const COLUMN_SEPARATOR = asset("/frames/column-separator.svg");

/**
 * The icon on the swimwear pass. A picture rather than one of the drawn
 * ornaments, so it keeps its own colours instead of taking the page's.
 */
/**
 * The picture that closes the invitation, standing at the foot of the last
 * screen the way the hero's does at the foot of the first. Same framing
 * wanted: her high in a tall shot, since the top is faded out and written
 * over and the bottom runs off the screen.
 */
export const FINALE_PORTRAIT = picture("/images/mikhayla-cake.png");

export const SWIMWEAR_ICON = asset("/icons/swimwear.png");
export const PARTY_DATE = "Saturday, October 17, 2026";
export const PARTY_TIME = "10:00 AM – 2:00 PM";
/**
 * The venue, in its two halves.
 *
 * Split because the card sets them as two lines of different size — the name
 * large, what it is beneath it in small caps — and because the old single
 * string had to wrap to fit a phone, which is where the layout came apart:
 * the icon beside it was centred against a block that was sometimes one line
 * tall and sometimes two, so it moved whenever the name did.
 *
 * Two lines by construction cannot do that. `PARTY_LOCATION` is still the
 * whole thing and is still what the maps are searched for and what the
 * buttons are labelled with — built from the halves rather than typed again,
 * so the two can never drift apart.
 */
export const PARTY_VENUE_NAME = "Casa Maria";
export const PARTY_VENUE_KIND = "Resort and Events Place";
export const PARTY_LOCATION = `${PARTY_VENUE_NAME} ${PARTY_VENUE_KIND}`;
/**
 * The address, broken where a reader would break it rather than wherever the
 * box happens to run out.
 *
 * Street and barangay on one line, then the city and province — which is how
 * it would be written on an envelope, and how somebody reading it aloud to a
 * driver would say it. Left to wrap on its own it split mid-phrase, "City of
 * San Jose" on one line and "del Monte, Bulacan" on the next, which reads as
 * two places rather than one.
 *
 * The comma between the lines is not in the data: it belongs to the join, and
 * the card puts it back at the end of every line but the last. That way
 * `PARTY_ADDRESS` — the single string the maps are searched for — is built
 * from these and cannot drift from what is on screen.
 */
export const PARTY_ADDRESS_LINES = [
  "San Mateo St., Poblacion",
  "City of San Jose del Monte, Bulacan",
] as const;

export const PARTY_ADDRESS = PARTY_ADDRESS_LINES.join(", ");
export const RSVP_EMAIL = "rsvp@example.com";
export const RSVP_BY = "October 10";

/**
 * Where the RSVP form posts. This is the web-app URL of the Google Apps
 * Script bound to your RSVP spreadsheet — it ends in `/exec`. Deploy the
 * script in `docs/rsvp-setup.md`, then paste its URL here.
 *
 * Left empty, the RSVP button falls back to opening an email instead, so the
 * invitation works perfectly well before the sheet exists. Nothing else has
 * to change when you fill it in.
 */
export const RSVP_ENDPOINT = "https://script.google.com/macros/s/AKfycbzS7KwNFdcg7avWe0kPgc5ddtYK7v_5FS288LVQCuYzmsZnP1qwBBS8F4BOrFJACkiB4A/exec";

/* ---------------------------------------------------------------
   The game hidden behind the balloon
   ---------------------------------------------------------------
   Two taps on the rising balloon open `/game` — a block-built running game
   with Mikhayla's head for a player. It is not linked from anywhere and
   nothing on the invitation mentions it; finding it is the point.

   See `docs/game.md` for how it plays and what every number does.
   --------------------------------------------------------------- */

/**
 * Where a finished run posts its score.
 *
 * The *same* Apps Script URL as the RSVP above, deliberately: one script,
 * bound to one spreadsheet, which reads a `kind` field off each post and
 * drops the row in the right tab — RSVPs in `RSVPs`, scores in `GAME`. One
 * deployment to keep public, one URL to keep right.
 *
 * It does mean the script has to be the updated one. The version in
 * `docs/rsvp-setup.md` handles both; an older deployment that has never heard
 * of `kind` will file scores as RSVPs. Redeploy before the party.
 *
 * Left empty, the game still plays and still keeps a personal best on the
 * device — it simply stops asking for a name at the end.
 */
export const GAME_ENDPOINT = RSVP_ENDPOINT;

/**
 * Her three animations, as horizontal sprite strips.
 *
 * Built from the supplied artwork by `scripts/build-player.py` — the originals
 * live in `assets-src/game/` and are never deployed. Every frame of all three
 * shares one cell, one ground line and one head centre, so she neither drifts
 * nor changes size as the animation changes.
 *
 * `hurt` is the one nobody drew: it is the running frames with her crying head
 * pasted over her happy one. See the script, which explains why that is a
 * whole-head swap rather than a change of expression.
 */
export const GAME_RUN_SPRITE = asset("/game/run.webp");
export const GAME_JUMP_SPRITE = asset("/game/jump.webp");
export const GAME_HURT_SPRITE = asset("/game/hurt.webp");

/**
 * The four things in her way.
 *
 * All empty, and the game draws blocky stand-ins for each: grey castle
 * battlements, a flapping bird, a rabbit at its burrow, a rolling stone. Drop
 * artwork into `public/game/` and name it here and the drawing is replaced —
 * PNG or WebP with transparency, 128px is plenty. One block square each,
 * except the rabbit, which is drawn into a box 0.8 of a block wide by 0.75
 * tall.
 *
 * Nothing else changes when you do, and each is independent. Animation comes
 * later the same way: the renderer already gives a bird its wingbeat by
 * squashing whatever it is handed and rolls the boulder by turning it, so a
 * single still frame arrives moving.
 */
export const GAME_ROCK_SPRITE = asset("");
export const GAME_BIRD_SPRITE = asset("");
export const GAME_RABBIT_SPRITE = asset("");
export const GAME_BOULDER_SPRITE = asset("");

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
 *
 * Empty, and the YouTube link below is used instead — which is what the
 * invitation does today. A file here wins if both are filled in: it asks
 * nothing of a third party, and it can play in the tab itself.
 */
export const VENUE_VIDEO = asset("");

/**
 * The walkthrough as it actually exists: the last turn off the main road and
 * the run up to the gate, filmed from the road and put up as a Short.
 *
 * Paste the link in whichever form YouTube hands you — a `shorts/` link, a
 * `watch?v=`, a `youtu.be/`, or the bare id. The share tail (`?si=…`) can
 * stay; the id is picked out of it below.
 *
 * It sits on YouTube rather than in `public/` on purpose. This is the one
 * asset here that is minutes of video rather than seconds, and YouTube hands
 * a guest the quality their phone and their signal can actually take — which
 * is the one thing a file served from this site cannot do.
 */
export const VENUE_VIDEO_YOUTUBE = "https://youtube.com/shorts/Ixs0pT8rSUY";

/**
 * The id, pulled out of whichever form of link that is: the `v=` of a watch
 * link, or the last segment of a `shorts/`, `embed/` or `youtu.be/` one.
 * Anything with no slash in it is taken to be an id already.
 */
const YOUTUBE_ID = (() => {
  const link = VENUE_VIDEO_YOUTUBE.trim();
  if (!link) return "";
  if (!link.includes("/")) return link;
  const watch = link.match(/[?&]v=([\w-]{6,})/);
  if (watch) return watch[1];
  const path = link.match(/(?:shorts|embed|live|youtu\.be)\/([\w-]{6,})/);
  return path ? path[1] : "";
})();

/**
 * The player that opens full screen when a guest taps the Walkthrough tab.
 *
 * `youtube-nocookie.com` is YouTube's own no-tracking host: same player,
 * but it sets nothing on a guest's phone unless they actually watch. The
 * rest is small print — `autoplay` because the dialog is only ever opened by
 * a tap and nobody should have to press play twice, `playsinline` so a phone
 * plays it in the dialog rather than throwing up its own full-screen player
 * over the invitation, and `rel=0` so whatever YouTube offers at the end
 * comes from this channel rather than from the whole internet.
 */
export const VENUE_VIDEO_EMBED = YOUTUBE_ID
  ? `https://www.youtube-nocookie.com/embed/${YOUTUBE_ID}?autoplay=1&playsinline=1&rel=0`
  : "";

/**
 * Whether the walkthrough stands taller than it is wide, which decides the
 * shape of the frame it opens into. Read off the link rather than set by
 * hand: a Short is vertical by definition.
 */
export const VENUE_VIDEO_VERTICAL = /\/shorts\//.test(VENUE_VIDEO_YOUTUBE);

/**
 * A still from the walkthrough — and the one picture of it a guest ever
 * loads unless they ask for the video.
 *
 * With a file in `VENUE_VIDEO` it is the poster, shown while the video loads
 * in place of a black first frame. With the YouTube link it is the tab
 * itself: the frame behind the play button, so the window onto the
 * walkthrough is served from here and YouTube is not asked for anything
 * until a guest taps it.
 *
 * Portrait is fine — the tab is 16:9 and crops it, and the crop is set in
 * `PartyDetailsSection` to hold the venue's name and the turn.
 */
export const VENUE_VIDEO_POSTER = picture("/venue/walkthrough-poster.jpg");

/**
 * The venue as Google Maps searches for it. The live map in the "Map" tab and
 * the "Get directions" button are both built from this, so both stay right if
 * the name or the address above changes.
 */
const MAP_QUERY = encodeURIComponent(`${PARTY_LOCATION}, ${PARTY_ADDRESS}`);

/**
 * The live map shown in the "Map" tab, and the one that opens full screen
 * when a guest taps it.
 *
 * This is Google's keyless search embed, which needs no API key and no
 * billing account — it finds the venue by name, the same way a guest would.
 * To pin an exact spot instead: Google Maps → the venue → Share → Embed a map
 * → copy the `src` out of the iframe it gives you, and paste just that URL
 * here.
 */
export const VENUE_MAP_EMBED = `https://www.google.com/maps?q=${MAP_QUERY}&z=16&hl=en&output=embed`;

/**
 * A picture of a map, used only when `VENUE_MAP_EMBED` above is emptied — the
 * venue's own directions sheet, say, with the landmarks on it that a live map
 * doesn't name.
 *
 * It shows cropped to fit the window on the page and opens full screen when
 * tapped, where it can be pinched and dragged, so a tall sheet stays readable
 * on a phone. Anything from a photo of a printed map to a screenshot works;
 * portrait is fine.
 *
 * The sheet the invitation shipped with is still in the repo, if you ever
 * want it back in place of the live map: `"/venue/casa-maria-poster.jpg"`.
 * Name the original, as everywhere else — the rendered WebP is found for you.
 */
export const VENUE_MAP_IMAGE = picture("");

/**
 * Where "Get directions" goes — the one thing that has to work on the day,
 * whatever the tab above is showing. These leave the site and hand the guest
 * to a real navigation app, which the embed can't do on its own.
 *
 * Both are ordinary https links, and that matters: a phone with the app
 * installed opens it, and a phone without one opens the same place on the
 * web instead of failing. Neither is an `app://` scheme, which is the only
 * thing that can dead-end.
 *
 * Which of them a guest is offered is decided on their phone — see
 * `Directions.tsx`. An iPhone without Google Maps installed would otherwise
 * land on a web page nagging it to install one, so it gets the choice.
 */
export const VENUE_MAP_LINKS = {
  google: `https://www.google.com/maps/search/?api=1&query=${MAP_QUERY}`,
  /* Apple's own form. Every iPhone has Maps, so this one can't fail there;
     elsewhere it opens Apple's web map. */
  apple: `https://maps.apple.com/?q=${MAP_QUERY}`,
};

/* ---------------------------------------------------------------
   The dedication
   ---------------------------------------------------------------
   Her christening is part of the day, so it gets its own section
   between her year and the date.
   --------------------------------------------------------------- */

export const PASTOR_NAME = "Pastor Pablo Sabit III";

/** Listed in the order they'll be called up front. */
export const GODMOTHERS = ["Niña", "Diana", "Jasmine", "Shielo", "Jessalyn", "Cherry Ann"];
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

/**
 * What is in the air over a month's page — her princess's own weather, drawn
 * over the photograph once the page has finished arriving.
 *
 * The three verbs are worth reading as a set, because they are what the
 * effect actually is: something `-fall`s down the page, something `-rise`s up
 * it, and the rest cross it or play out a little scene.
 *
 * The drawings are in `MilestoneMotifs.tsx` and the movement in
 * `MilestoneAmbience.tsx` — adding a kind means a case in each.
 */
export type Ambience =
  /** Month 0 — blossoms falling like confetti. */
  | "flower-fall"
  /** Snow White — her apples, tumbling down. */
  | "apple-fall"
  /** Aurora — a few butterflies climbing the page from below. */
  | "butterflies"
  /** Elsa — snow. */
  | "snow-fall"
  /** Anna — autumn leaves coming down. */
  | "leaf-fall"
  /** Pocahontas — the same leaves on a wind, blown left to right, looping
      once as they pass the middle. */
  | "leaf-wind"
  /** Ariel — bubbles up from the bottom. */
  | "bubbles"
  /** Jasmine — green gems out of the Cave of Wonders. */
  | "gem-fall"
  /** Rapunzel — flowers rising instead of falling. */
  | "flower-rise"
  /** Moana — coconuts, and they drop like coconuts. */
  | "coconut-fall"
  /** Belle — rose petals. */
  | "rose-petals"
  /** Cinderella — bluebirds across the page. */
  | "birds"
  /** Her own month — the invitation's own sparkles, coming down. */
  | "sparkle-fall";

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
   * is. Put the file in `assets-src/princesses/`, re-run
   * `scripts/optimize-images.py`, and reference it here by the *original's*
   * name from the site root, e.g. `character: "/princesses/elsa.png"` — the
   * tier folder and the `.webp` ending are filled in for you.
   *
   * It renders at the height of the title and keeps its own proportions, so
   * a transparent cut-out with the figure tight to the edges works best — the
   * transparency survives the WebP rendering.
   *
   * Decorative only — the caption already names her — so it is hidden from
   * screen readers. Month zero has no gown, and so no figure.
   */
  character?: string;
  /**
   * The costume shot for this month. It is the page — it fills the whole
   * panel edge to edge, with the caption sitting over a `tint` fade at the
   * bottom. Put the file in `assets-src/milestones/`, re-run
   * `scripts/optimize-images.py`, and reference it here by the *original's*
   * name from the site root, e.g. `photo: "/milestones/01-snowwhite.png"`.
   *
   * Tall phone-shaped portraits (9:16) fit the panel exactly. The image is
   * cropped to fill and anchored near the top, so keep her face in the upper
   * half and leave the bottom third quiet — that is where the words go.
   * When omitted, the page is simply its `tint`.
   */
  photo?: string;
  /**
   * The month's weather — what drifts across the photo once the page has
   * settled. See `Ambience` above for the list. Omit it for a still page.
   */
  ambience?: Ambience;
  /**
   * Her princess's song, played while this page is the one on screen and
   * faded out into the next month's as you swipe. Put the file in
   * `public/audio/` and reference it from the site root, e.g.
   * `music: "/audio/elsa.MP3"`.
   *
   * Spell the extension exactly as the file has it. These are served from
   * GitHub Pages, where `elsa.MP3` and `elsa.mp3` are two different files and
   * only one of them exists — a mistake a Windows checkout will not show you,
   * because Windows thinks they are the same name.
   *
   * Nothing is fetched until its page is reached, so a guest only ever
   * downloads the months they actually look at. Keep clips short for that
   * reason: a five-minute song is several megabytes of somebody's mobile
   * data spent on a page they may swipe past in four seconds.
   *
   * Omit it for a silent page — the title page has no song, and needs none.
   */
  music?: string;
};

/**
 * Twelve months, twelve gowns. The costumes below are the official Disney
 * Princess line-up — swap `princess`, `accent` and `tint` on any row to match
 * the gown she actually wore that month. The titles nod to her princess; the
 * notes are the real milestone she hit in that gown, so those are the ones
 * worth rewriting in your own words.
 */
const MILESTONE_PAGES: Milestone[] = [
  { month: 0,  princess: "",           title: "A princess is born",            note: "Before the gowns and the crowns — the day your kingdom met you.",         tint: "#EAE2E1", accent: "newborn",                                            photo: "/milestones/00-newborn.png",    ambience: "flower-fall",  music: "/audio/newborn.mp3" },
  { month: 1,  princess: "Snow White", title: "Fairest of them all",           note: "One month old, and already able to hush a room full of admirers.",        tint: "#F1E9DA", accent: "snow",       character: "/princesses/snowwhite.png", photo: "/milestones/01-snowwhite.png",  ambience: "apple-fall",   music: "/audio/snow-white.MP3" },
  { month: 2,  princess: "Aurora",     title: "Once upon a dream",             note: "Your first real smile arrived mid-nap, like something you'd dreamt up.",  tint: "#F1DADD", accent: "aurora",     character: "/princesses/aurora.png",    photo: "/milestones/02-aurora.png",     ambience: "butterflies",  music: "/audio/aurora.MP3" },
  { month: 3,  princess: "Elsa",       title: "The cold never bothered you",   note: "You found your own hands this month and would not let them go.",          tint: "#DEE4ED", accent: "elsa",       character: "/princesses/elsa.png",      photo: "/milestones/03-elsa.png",       ambience: "snow-fall",    music: "/audio/elsa.MP3" },
  { month: 4,  princess: "Anna",       title: "For the first time in forever", note: "Front to back, all on your own, and very pleased about it.",              tint: "#E2E0EB", accent: "anna",       character: "/princesses/anna.png",      photo: "/milestones/04-anna.png",       ambience: "leaf-fall",    music: "/audio/anna.MP3" },
  { month: 5,  princess: "Pocahontas", title: "Colors of the wind",            note: "Giggles for days — the best sound in the house, and it carried.",         tint: "#EDDEE2", accent: "pocahontas", character: "/princesses/pocahontas.png", photo: "/milestones/05-pocahontas.png", ambience: "leaf-wind",    music: "/audio/pocahontas.MP3" },
  { month: 6,  princess: "Ariel",      title: "Part of your world",            note: "Sitting up solo, suddenly eye-level with the whole world.",               tint: "#DDE2EE", accent: "ariel",      character: "/princesses/ariel.png",     photo: "/milestones/06-ariel.png",      ambience: "bubbles",      music: "/audio/ariel.MP3" },
  { month: 7,  princess: "Jasmine",    title: "A whole new world",             note: "Your first taste of real food. Mashed banana went everywhere. Worth it.", tint: "#DAE9F1", accent: "jasmine",    character: "/princesses/jasmine.png",   photo: "/milestones/07-jasmine.png",    ambience: "gem-fall",     music: "/audio/jasmine.MP3" },
  { month: 8,  princess: "Rapunzel",   title: "Let down your hair",            note: "You said something very close to “dada”. We are counting it.",            tint: "#EEDFDD", accent: "rapunzel",   character: "/princesses/rapunzel.png",  photo: "/milestones/08-rapunzel.png",   ambience: "flower-rise",  music: "/audio/rapunzel.MP3" },
  { month: 9,  princess: "Moana",      title: "How far you'll go",             note: "You started crawling, and nothing in this house was safe again.",         tint: "#F1DADB", accent: "moana",      character: "/princesses/moana.png",     photo: "/milestones/09-moana.png",      ambience: "coconut-fall", music: "/audio/moana.MP3" },
  { month: 10, princess: "Belle",      title: "Tale as old as time",           note: "You waved bye-bye. A tiny hand, and a very big deal.",                    tint: "#F1E9DA", accent: "belle",      character: "/princesses/belle.png",     photo: "/milestones/10-belle.png",      ambience: "rose-petals",  music: "/audio/belle.MP3" },
  { month: 11, princess: "Cinderella", title: "If the shoe fits",              note: "First steps — wobbly, brave, and gone in a blink. No midnight needed.",   tint: "#E1E1EA", accent: "cinderella", character: "/princesses/cinderella.png", photo: "/milestones/11-cinderella.png", ambience: "birds",        music: "/audio/cinderella.MP3" },
  { month: 12, princess: "Mikhayla",   title: "A crown of your own",           note: "A year ago you arrived. Now the whole kingdom comes to you.",             tint: "#F1DAEA", accent: "mikhayla", character: "/princesses/mikhayla.png",    photo: "/milestones/12-mikhayla.png",   ambience: "sparkle-fall", music: "/audio/mikhayla.mp3" },
];

/**
 * The same twelve pages, with the site prefix put on every file path. This is
 * what the page reads — write the rows above from the site root and let this
 * do the prefixing, so the table stays a table.
 */
export const MILESTONES: Milestone[] = MILESTONE_PAGES.map((page) => ({
  ...page,
  character: page.character && picture(page.character),
  photo: page.photo && picture(page.photo),
  music: page.music && asset(page.music),
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
