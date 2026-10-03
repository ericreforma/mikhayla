"use client";

/* ---------------------------------------------------------------
   The wallpaper
   ---------------------------------------------------------------
   Five princess silhouettes tiled across the page and drifting
   diagonally, behind everything else on this panel.

   Drawn as one repeating background image rather than as elements: at a
   20px icon on a 30px lattice a laptop window wants some two thousand of
   them, and two thousand SVGs is a page that scrolls like tar. One tile,
   repeated by the browser, costs nothing.

   Each shape is drawn in the same 24×24 box as the ornaments in
   Ornaments.tsx and scaled down into its cell, so the two sets stay
   comparable.
   --------------------------------------------------------------- */

/** The icon itself. */
const CELL = 20;
/** Space on every side of it, so the lattice steps by CELL + GAP. */
const GAP = 10;
const PITCH = CELL + GAP;

/*
 * A pastel pink, painted at half strength by the layer that carries it.
 * Baked into the tile as a literal
 * rather than taken from the palette: the shapes live inside a data URI,
 * which is an image and cannot see the page's colours.
 *
 * Between the two, the wallpaper stays light on purpose — the small print
 * is allowed to fall on a silhouette, and anything that darkens the
 * wallpaper darkens the worst ground that text ever sits on.
 */
const ICON_COLOR = "#F2D6E1";

/**
 * A five-petal bloom. The eye is painted white rather than cut out — the
 * page behind this pattern is white, and a real hole would need a
 * fill-rule spanning separate elements.
 */
const FLOWER =
  [0, 72, 144, 216, 288]
    .map((a) => `<ellipse cx="12" cy="6.8" rx="3.6" ry="5.1" transform="rotate(${a} 12 12)"/>`)
    .join("") + `<circle cx="12" cy="12" r="2.6" fill="#fff"/>`;

/** A crown, redrawn square — the one in Ornaments is a wide 64×46. */
const CROWN = `<path d="M3 18.4 L3 7 L8.5 11.6 L12 5 L15.5 11.6 L21 7 L21 18.4 Z"/><rect x="2.6" y="18" width="18.8" height="2.8" rx="1.4"/>`;

/** Snow White's apple — the stem is what keeps it from being a circle. */
const APPLE = `<path d="M12 7.4 C10.5 5.4 7.4 4.6 5.5 6.8 C3.3 9.3 4.3 14.8 7.1 18.6 C8.3 20.2 9.8 20.9 12 19.8 C14.2 20.9 15.7 20.2 16.9 18.6 C19.7 14.8 20.7 9.3 18.5 6.8 C16.6 4.6 13.5 5.4 12 7.4 Z"/><path d="M12 6.6 C12 4.8 12.4 3.4 13.2 2.4" fill="none" stroke="${ICON_COLOR}" stroke-width="1.8" stroke-linecap="round"/><path d="M13.1 4.6 C14.6 2.6 17.2 2.3 18.6 2.6 C18.4 4.8 16.4 6.4 14 6 Z"/>`;

/** A bow — two loops and a knot. */
const BOW = `<path d="M2.6 8 C2.6 7 3.6 6.4 4.4 6.9 L10.6 11 C11.2 11.4 11.2 12.6 10.6 13 L4.4 17.1 C3.6 17.6 2.6 17 2.6 16 Z"/><path d="M21.4 8 C21.4 7 20.4 6.4 19.6 6.9 L13.4 11 C12.8 11.4 12.8 12.6 13.4 13 L19.6 17.1 C20.4 17.6 21.4 17 21.4 16 Z"/><rect x="9.9" y="9.5" width="4.2" height="5" rx="1.5"/>`;

/**
 * Cinderella's slipper, long and low. Drawn at a true pump's proportions —
 * tall counter, pointed toe — it reads as a bird every time: the raised
 * back becomes a head and the heel a leg. Flattened to about one unit of
 * height for every three of length, with the opening scooped out of the
 * top, it reads as a shoe at 20px of pale pink.
 */
const SLIPPER = `<path d="M2.8 18.4 C2.8 16.2 4.8 14.8 7.8 14.8 C10.2 14.8 11.8 15.8 13.4 15.8 C15.2 15.8 16.6 14.6 17.2 12.6 C17.6 11.4 19.2 11.8 19 13.2 C18.6 15.6 18.2 17.2 17.8 18.4 Z"/><path d="M15.6 18.2 L18 18.2 L18.8 22.2 L17.6 22.4 Z"/>`;

const SHAPES = [FLOWER, CROWN, APPLE, BOW, SLIPPER];

/**
 * Cells across the tile.
 *
 * A tile repeats, and the eye is very good at finding the repeat — the only
 * defences are making the period long and its contents irregular. Twelve
 * squared is a hundred and forty-four cells before anything comes round
 * again, a 360px period: far enough that two copies are never both in view
 * on a phone.
 */
const COLUMNS = 12;
const TILE = PITCH * COLUMNS;

/** Pixels of travel per second, so a bigger tile is not a faster one. */
const PIXELS_PER_SECOND = 4;

/**
 * Deterministic pseudo-random (mulberry32).
 *
 * Deliberately not Math.random: this tile is built once at module scope and
 * rendered into the markup, so a server and a browser that disagreed about
 * the arrangement would be a hydration mismatch. A fixed seed means one
 * arbitrary layout, chosen once, the same everywhere.
 */
function seeded(seed: number) {
  return () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * One tile of the wallpaper, as a data URI.
 *
 * The five shapes are declared once in `defs` and stamped with `use`.
 * Spelled out longhand, a hundred and forty-four copies of these paths is
 * some 50KB of inline style on every page load; by reference it is a few.
 *
 * Each stamp gets its own shape and its own small rotation, which is what
 * keeps a grid of identical upright icons from reading as graph paper. The
 * lattice is inset by half a gap so a rotated shape leans into its own
 * margin instead of over the tile's edge, where it would be cut in half.
 */
function buildTile() {
  const rand = seeded(20261017);
  const defs = SHAPES.map((shape, i) => `<g id="p${i}">${shape}</g>`).join("");

  const stamps: string[] = [];
  for (let row = 0; row < COLUMNS; row++) {
    for (let col = 0; col < COLUMNS; col++) {
      const shape = Math.floor(rand() * SHAPES.length);
      const angle = Math.round((rand() * 2 - 1) * 18);
      const x = col * PITCH + GAP / 2;
      const y = row * PITCH + GAP / 2;
      stamps.push(
        `<use href="#p${shape}" transform="translate(${x} ${y}) scale(${CELL / 24}) rotate(${angle} 12 12)"/>`
      );
    }
  }

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${TILE}" height="${TILE}" fill="${ICON_COLOR}"><defs>${defs}</defs>${stamps.join("")}</svg>`;
  return `url("data:image/svg+xml,${encodeURIComponent(svg)}")`;
}

const TILE_URL = buildTile();

/**
 * The tiled page behind the words.
 *
 * It travels exactly one tile on both axes, which is what makes a diagonal
 * loop seamless — the lattice maps onto itself at that distance and nowhere
 * short of it, so ending anywhere else would make the pattern jump.
 *
 * Two tiles of overhang on every side, not the one the travel strictly
 * needs: at the end of a pass the layer's far edges would otherwise land
 * exactly on the viewport's, and a fractional device pixel there is a
 * hairline of bare white down the side once every loop.
 *
 * `--tile` feeds the keyframes in globals.css, so the lattice above stays
 * the only place the number is written down.
 */
export function PrincessPattern({ className = "" }: { className?: string }) {
  return (
    <div aria-hidden className={`pointer-events-none absolute inset-0 overflow-hidden ${className}`}>
      <div
        /* Half strength: at full opacity this much pink competes with the
           band for the eye, and the words are the point of the page. */
        className="princess-drift absolute opacity-50"
        style={
          {
            "--tile": `${TILE}px`,
            "--drift-duration": `${Math.round(TILE / PIXELS_PER_SECOND)}s`,
            inset: `-${TILE * 2}px`,
            backgroundImage: TILE_URL,
            backgroundSize: `${TILE}px ${TILE}px`,
          } as React.CSSProperties
        }
      />
    </div>
  );
}
