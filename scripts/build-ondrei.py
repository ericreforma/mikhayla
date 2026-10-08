#!/usr/bin/env python3
"""
Turns the supplied Ondrei sheet into a strip the game can animate.

---------------------------------------------------------------------------
What arrives
---------------------------------------------------------------------------
`assets-src/game/ondrei.png` — 1536x801, eight frames of a chibi boy flying a
blue plane, laid out four across and two down. Three things make it unusable
as it stands:

  1. **Every frame is labelled.** A rounded badge reading "1. Fly 1" is baked
     into the bottom of each one. It is annotation for a human picking frames,
     not artwork, and it has to come off.

  2. **The frames run into each other.** Each plane trails cloud to its left,
     and that cloud crosses the nominal 384px cell boundary. Cutting on the
     arithmetic grid puts a slice of the neighbour's trail — and at one
     boundary, a sliver of its wing — into the frame next door. That is the
     bleed this project has been bitten by before, and the brief rules it out.

  3. **It was matted on black.** About a tenth of the half-transparent pixels
     are near-black: a soft edge composited over a dark background, which
     reads as a dirty outline the moment it is drawn onto a bright sky.

---------------------------------------------------------------------------
What this does about it
---------------------------------------------------------------------------
Nothing here is a magic number read off a screenshot. Every boundary is found
by measuring the sheet, so re-exporting the artwork at a different size does
not silently produce garbage:

  * the two **rows** are the gaps of fully transparent scanlines
  * the **badges** fall out as bands of their own once the fringe is hardened,
    and are dropped by being far shorter than the rows of artwork
  * the **cuts between frames** are the narrowest columns near each boundary,
    not the boundaries themselves — two of the three are genuinely empty, and
    the third crosses by a wisp of cloud rather than by anything recognisable
  * the **fringe** is hardened by dropping pixels below an alpha floor

Frames are then aligned horizontally on the plane's own centre and left alone
vertically. That split is deliberate: horizontal jitter reads as the plane
speeding up and slowing down, which is wrong, while vertical movement is the
bob the artist drew and is most of what sells it as flying.

Finally they are laid into one strip with a transparent gutter between cells,
so no amount of filtering at draw time can drag a neighbour's pixels in.

---------------------------------------------------------------------------
Running it
---------------------------------------------------------------------------
    python scripts/build-ondrei.py

Reads  assets-src/game/ondrei.png     (the original, never deployed)
Writes public/game/ondrei.webp
"""

from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / "assets-src" / "game" / "ondrei.png"
OUT = ROOT / "public" / "game" / "ondrei.webp"

COLS = 4

# Below this, a pixel on a sheet that already has alpha is fringe, not drawing.
# The same floor `build-player.py` uses, for the same reason.
ALPHA_FLOOR = 40

# A pixel counts as solid for the purposes of finding edges.
SOLID = 24

# Transparent gutter around every cell in the finished strip.
PAD = 8

# How colourful a pixel has to be to count as plane rather than cloud. The
# plane is saturated blue, yellow and red; the trail is white and grey. This is
# what lets the alignment follow the aircraft instead of the weather round it.
CHROMA = 45

# What one finished cell is scaled down to, and how hard it is compressed.
#
# The sheet arrives at 421px a cell, which is more than the game can ever use.
# Ondrei is drawn a couple of blocks wide, high in the sky: on a phone turned
# over that is about 245 device pixels, so 261 is already a shade over life
# size and only a large desktop window asks for more. Against a sprite that
# crosses the screen once every thousand points, a hundred kilobytes of
# sharpness nobody will be looking at is not a good trade — this is the
# difference between 263KB and 126KB.
CELL_PX = 261
QUALITY = 80


def solid_rows(px, w, h):
    """Which scanlines have anything on them at all."""
    return [any(px[x, y][3] > SOLID for x in range(0, w, 2)) for y in range(h)]


def bands(flags):
    """Runs of True in `flags`, as (start, end) pairs."""
    out, start = [], None
    for i, on in enumerate(flags + [False]):
        if on and start is None:
            start = i
        elif not on and start is not None:
            out.append((start, i))
            start = None
    return out


def artwork_rows(rowbands):
    """
    The two rows of drawing, picked out from the label badges below them.

    Once the fringe is hardened the badges separate into bands of their own —
    they are islands of solid pixels with clear space above — so there is
    nothing to walk up and find. Keeping the bands that are more than half the
    height of the tallest leaves the artwork and drops the labels, and it keeps
    working if the sheet is re-exported with the labels already gone.
    """
    tall = max(b - a for a, b in rowbands)
    return [(a, b) for a, b in rowbands if (b - a) > tall * 0.5]


def waists(px, w, y0, y1):
    """
    The columns to cut the four frames apart on.

    The narrowest column within reach of each nominal boundary, rather than the
    boundary itself — the trails are drawn past the grid and the grid is not
    where the drawing actually parts.
    """
    pitch = w // COLS
    cuts = [0]
    for i in range(1, COLS):
        edge = i * pitch
        best, at = None, edge
        for x in range(edge - 70, edge + 71):
            n = sum(1 for y in range(y0, y1) if px[x, y][3] > SOLID)
            if best is None or n < best:
                best, at = n, x
        cuts.append(at)
        print(f"      cut near x={edge}: took x={at}, {best} rows crossing"
              f"{' (clean)' if best == 0 else ''}")
    cuts.append(w)
    return cuts


def box(px, x0, x1, y0, y1):
    """Tight bounds of the drawing inside a region, in sheet coordinates."""
    lo_x, hi_x, lo_y, hi_y = x1, x0 - 1, y1, y0 - 1
    for y in range(y0, y1):
        for x in range(x0, x1):
            if px[x, y][3] > SOLID:
                if x < lo_x:
                    lo_x = x
                if x > hi_x:
                    hi_x = x
                if y < lo_y:
                    lo_y = y
                if y > hi_y:
                    hi_y = y
    return lo_x, lo_y, hi_x + 1, hi_y + 1


def plane_centre(px, x0, x1, y0, y1):
    """
    The horizontal centre of the aircraft, ignoring the cloud around it.

    A bounding box would follow the trail, and the trail changes shape every
    frame — aligning on it would make the plane shuffle sideways as it flew.
    Weighting by colour finds the thing that is actually supposed to hold
    still.
    """
    total = weight = 0
    for y in range(y0, y1, 2):
        for x in range(x0, x1, 2):
            r, g, b, a = px[x, y]
            if a > 128 and max(r, g, b) - min(r, g, b) > CHROMA:
                total += x
                weight += 1
    return total / weight if weight else (x0 + x1) / 2


def main() -> None:
    if not SRC.exists():
        raise SystemExit(f"No sheet at {SRC}")

    sheet = Image.open(SRC).convert("RGBA")
    w, h = sheet.size
    print(f"sheet {w}x{h}")

    # Harden the fringe before measuring anything, so the dark rim left by the
    # black matte does not count as drawing and drag every edge outwards.
    a = sheet.split()[-1].point(lambda v: 0 if v < ALPHA_FLOOR else v)
    sheet.putalpha(a)
    px = sheet.load()

    found = bands(solid_rows(px, w, h))
    rows = artwork_rows(found)
    print(f"bands: {found}")
    print(f"  -> artwork rows {rows}, "
          f"{len(found) - len(rows)} label band(s) dropped")
    if len(rows) != 2:
        raise SystemExit(f"expected two rows of frames, found {len(rows)}")

    frames = []
    for ri, (y0, y1) in enumerate(rows, 1):
        print(f"\n  row {ri}: y {y0}..{y1}")
        cut = y1
        cuts = waists(px, w, y0, cut)
        for i in range(COLS):
            x0, x1 = cuts[i], cuts[i + 1]
            b = box(px, x0, x1, y0, cut)
            c = plane_centre(px, b[0], b[2], b[1], b[3])
            frames.append({"box": b, "centre": c})
            print(f"      frame {ri * COLS - COLS + i + 1}: "
                  f"{b[2] - b[0]}x{b[3] - b[1]} at {b[0]},{b[1]}  "
                  f"centre {c - b[0]:.0f} from its left edge")

    # One cell, big enough for every frame once they are lined up on that
    # centre — measured outwards from the anchor rather than from the widest
    # bounding box, which is the mistake that caused bleeding here once before.
    left = max(f["centre"] - f["box"][0] for f in frames)
    right = max(f["box"][2] - f["centre"] for f in frames)
    cw = int(round(left + right))

    # Vertically the frames keep whatever offset they were drawn with: that is
    # the bob, and flattening it would ground the aeroplane.
    top = min(f["box"][1] - rows[0][0] if i < COLS else f["box"][1] - rows[1][0]
              for i, f in enumerate(frames))
    heights = [
        (f["box"][3] - (rows[0][0] if i < COLS else rows[1][0])) - top
        for i, f in enumerate(frames)
    ]
    ch = int(max(heights))

    print(f"\ncell {cw}x{ch}, anchor {left:.1f} from its left edge")

    pw, ph = cw + PAD * 2, ch + PAD * 2
    strip = Image.new("RGBA", (pw * len(frames), ph), (0, 0, 0, 0))

    for i, f in enumerate(frames):
        x0, y0, x1, y1 = f["box"]
        band_top = rows[0][0] if i < COLS else rows[1][0]
        cell = sheet.crop((x0, y0, x1, y1))
        dx = round(i * pw + PAD + left - (f["centre"] - x0))
        dy = round(PAD + (y0 - band_top) - top)
        strip.alpha_composite(cell, (dx, dy))

    # Down to the size it is actually drawn at, in one resample of the finished
    # strip. The gutter scales with it, so the cells stay separated.
    if CELL_PX < pw:
        k = CELL_PX / pw
        strip = strip.resize(
            (round(strip.size[0] * k), round(strip.size[1] * k)), Image.LANCZOS
        )
        pw, ph = round(pw * k), round(ph * k)
        print(f"  scaled to {CELL_PX}px a cell ({k * 100:.0f}%)")

    OUT.parent.mkdir(parents=True, exist_ok=True)
    strip.save(OUT, "WEBP", quality=QUALITY, method=6)

    before = SRC.stat().st_size
    after = OUT.stat().st_size
    print(f"\n  {SRC.name} {before / 1024:.0f}KB -> {OUT.name} {after / 1024:.0f}KB "
          f"({100 - after / before * 100:.0f}% off)")
    print(f"  {len(frames)} frames, strip {strip.size[0]}x{strip.size[1]}")
    print("\nFor app/game/tuning.ts:")
    print(f"  export const ONDREI_FRAMES = {len(frames)};")
    print(f"  export const ONDREI_CELL = {{ aspect: {pw / ph:.4f} }};"
          f"   // cell is {pw}x{ph} including its {PAD}px gutter")


if __name__ == "__main__":
    main()
