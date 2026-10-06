#!/usr/bin/env python3
"""
Turns the supplied artwork into the three sprite strips the game animates.

---------------------------------------------------------------------------
What arrives, and what is wrong with it
---------------------------------------------------------------------------
Three files land in `assets-src/game/`:

    running-sprite-16f.png          16 frames of her running
    running-sprite-16f-crying.png   the same, crying
    jumping-sprite.png               5 frames of a jump

None of them can be used as they are, for three separate reasons:

  1. **Transparency, or the lack of it.** The run sheet has a real alpha
     channel; the jump sheet is RGB with a checkerboard *painted into it* where
     the transparency should be. So `load` does whichever is needed — and for
     the painted one, the obvious test ("light and grey") eats the white frills
     of her dress, so the background is found by flooding inward from the
     border instead. Her dress is enclosed by its own outline, so the flood
     stops at it; the white inside is never reached.

  2. **Baked drop shadows.** Each figure has a pale lavender ellipse under it.
     The game draws its own shadow, which shrinks and fades as she rises, so a
     second one painted onto her feet would ride up into the air with her. The
     keying threshold is set low enough to take them (see `BG_FLOOR`).

  3. **Two different scales.** She is drawn about a third larger on the jump
     sheet than on the run sheet. Left alone she would visibly grow the moment
     she left the ground. Both sheets are normalised on the width of her head,
     which is the one measurement a change of pose does not alter.

(There was a fourth once. Before a crying run was supplied, the hurt animation
was built here by pasting her crying head from `faces.png` over her happy one —
which worked, and always looked like what it was, because the supplied crying
face was a front view being grafted onto a body in profile. `faces.png` is no
longer read by anything.)

---------------------------------------------------------------------------
Running it
---------------------------------------------------------------------------
    python scripts/build-player.py

Writes `public/game/run.webp`, `jump.webp` and `hurt.webp` — one horizontal
strip each, every frame the same cell, every cell sharing a ground line and a
head centre so she neither drifts nor jitters between frames.

It also prints the two numbers `tuning.ts` needs. If the artwork is ever
re-supplied, run this and check them against `PLAYER_CELL` there.
"""

from collections import deque
from pathlib import Path
from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / "assets-src" / "game"
OUT = ROOT / "public" / "game"

# Flood-fill test for the painted-in checkerboard. The floor is low enough to
# take the lavender drop shadows (their darkest is about 193) and still well
# above anything in her dress, which is pink enough to fail the spread test
# long before it fails this one.
BG_FLOOR = 180
BG_SPREAD = 28

# Below this, a pixel on a sheet that already has alpha is fringe, not drawing.
ALPHA_FLOOR = 40

# How tall each output cell is. She is drawn about 75 CSS pixels tall on the
# largest screen this runs on, so 200 is comfortably past what a 2x phone can
# resolve and still small enough that eight of them are a few tens of KB.
CELL_H = 200

# A transparent gutter around every cell, in output pixels.
#
# Without it the frames sit edge to edge, and the browser bleeds one into the
# next: `drawImage` with smoothing on has to interpolate at the boundary of the
# source rectangle, and the texels it reaches for there belong to the frame
# alongside. The result is a sliver of the next pose down one side of her, which
# is exactly what it looks like. Eight pixels of nothing is enough that the
# filter finds transparency instead, at every scale the game draws her.
PAD = 8


def load(path):
    """
    A sheet with a usable alpha channel, however it arrived.

    A sheet that already has one only needs its fringe hardened — everything
    under `ALPHA_FLOOR` goes fully clear, so a halo of near-transparent pixels
    does not survive the downscale as a dirty outline. One without goes through
    the flood fill below.
    """
    im = Image.open(path)
    if im.mode == "RGBA" and im.split()[-1].getextrema()[0] < 250:
        im = im.convert("RGBA")
        r, g, b, a = im.split()
        im.putalpha(a.point(lambda v: 0 if v < ALPHA_FLOOR else v))
        return im
    return keyed(im.convert("RGB"))


def keyed(im):
    """The sheet with its painted-on background removed."""
    w, h = im.size
    px = im.load()
    bg = bytearray(w * h)

    def background(x, y):
        r, g, b = px[x, y]
        return min(r, g, b) >= BG_FLOOR and (max(r, g, b) - min(r, g, b)) <= BG_SPREAD

    q = deque()

    def seed(x, y):
        if not bg[y * w + x] and background(x, y):
            bg[y * w + x] = 1
            q.append((x, y))

    for x in range(w):
        seed(x, 0)
        seed(x, h - 1)
    for y in range(h):
        seed(0, y)
        seed(w - 1, y)

    while q:
        x, y = q.popleft()
        for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
            nx, ny = x + dx, y + dy
            if 0 <= nx < w and 0 <= ny < h:
                seed(nx, ny)

    out = im.convert("RGBA")
    out.putalpha(Image.frombytes("L", (w, h), bytes(0 if v else 255 for v in bg)))
    return out


def frames(sheet):
    """
    Split a strip into its figures, by the empty columns between them.

    Columns are enough here — unlike the face sheet, which needed a proper
    component pass because its rows overlapped. These are laid out in one line
    with clear daylight between each.
    """
    w, h = sheet.size
    alpha = sheet.split()[-1].point(lambda a: 255 if a > 8 else 0)
    px = alpha.load()

    used = [any(px[x, y] for y in range(h)) for x in range(w)]
    spans, start = [], None
    for x, on in enumerate(used):
        if on and start is None:
            start = x
        elif not on and start is not None:
            spans.append((start, x))
            start = None
    if start is not None:
        spans.append((start, w))

    boxes = []
    for x0, x1 in spans:
        if x1 - x0 < 20:
            continue
        rows = [y for y in range(h) if any(px[x, y] for x in range(x0, x1))]
        boxes.append((x0, rows[0], x1, rows[-1] + 1))
    return boxes


def head_width(sheet, box):
    """
    The widest row in the top third of a figure, which is her head.

    It is the one measurement that survives a change of pose: her legs swing,
    her arms swing, her whole body leaves the ground, and her head stays the
    size it is. That makes it the only honest way to put two sheets drawn at
    different scales onto the same one.
    """
    x0, y0, x1, y1 = box
    px = sheet.split()[-1].load()
    widest = 0
    for y in range(y0, y0 + max(1, (y1 - y0) // 3)):
        xs = [x for x in range(x0, x1) if px[x, y] > 8]
        if xs:
            widest = max(widest, xs[-1] - xs[0] + 1)
    return widest


def head_centre(sheet, box):
    """Where her head sits across the frame — the anchor the cell is built on."""
    x0, y0, x1, y1 = box
    px = sheet.split()[-1].load()
    band = max(1, (y1 - y0) // 3)
    xs = [x for y in range(y0, y0 + band) for x in range(x0, x1) if px[x, y] > 8]
    return (sum(xs) / len(xs)) if xs else (x0 + x1) / 2


def build(sheet, boxes, scale, cell, anchor_x, name):
    """Lay the frames into one strip, on a shared ground line and head centre."""
    cw, ch = cell
    # The cell as stored: the content, with `PAD` of nothing all the way round.
    pw, ph = cw + PAD * 2, ch + PAD * 2
    strip = Image.new("RGBA", (pw * len(boxes), ph), (0, 0, 0, 0))

    for i, box in enumerate(boxes):
        figure = sheet.crop(box)
        fw = max(1, round(figure.size[0] * scale))
        fh = max(1, round(figure.size[1] * scale))
        figure = figure.resize((fw, fh), Image.LANCZOS)

        # Head centre to the middle of the content, feet to the bottom of it —
        # both measured inside the gutter rather than against the cell edge.
        anchor = (head_centre(sheet, box) - box[0]) * scale
        strip.alpha_composite(
            figure, (round(i * pw + PAD + anchor_x - anchor), PAD + ch - fh)
        )

    path = OUT / f"{name}.webp"
    strip.save(path, "WEBP", quality=90, method=6)
    print(f"  {path.relative_to(ROOT)}  {strip.size[0]}x{strip.size[1]}  "
          f"{len(boxes)} frames  {path.stat().st_size // 1024}KB")


def main():
    OUT.mkdir(parents=True, exist_ok=True)

    run_sheet = load(SRC / "running-sprite-16f.png")
    hurt_sheet = load(SRC / "running-sprite-16f-crying.png")
    jump_sheet = load(SRC / "jumping-sprite.png")

    run_boxes = frames(run_sheet)
    hurt_boxes = frames(hurt_sheet)
    jump_boxes = frames(jump_sheet)
    print(f"running: {len(run_boxes)}   crying: {len(hurt_boxes)}   jumping: {len(jump_boxes)}")
    if len(hurt_boxes) != len(run_boxes):
        raise SystemExit("The crying sheet must have the same frame count as the run")

    # Normalise both sheets onto the run sheet's scale, by head width.
    run_head = sum(head_width(run_sheet, b) for b in run_boxes) / len(run_boxes)
    jump_head = sum(head_width(jump_sheet, b) for b in jump_boxes) / len(jump_boxes)
    print(f"head width: run {run_head:.0f}px, jump {jump_head:.0f}px "
          f"-> jump scaled by {run_head / jump_head:.3f}")

    # One cell for all three strips, so a frame can never change her size.
    # Everything is measured in run-sheet pixels.
    hurt_head = sum(head_width(hurt_sheet, b) for b in hurt_boxes) / len(hurt_boxes)
    print(f"            crying {hurt_head:.0f}px -> scaled by {run_head / hurt_head:.3f}")

    every = (
        [(run_sheet, b, 1.0) for b in run_boxes]
        + [(hurt_sheet, b, run_head / hurt_head) for b in hurt_boxes]
        + [(jump_sheet, b, run_head / jump_head) for b in jump_boxes]
    )

    # The cell is measured *from the anchor outward*, not from the widest
    # bounding box. Frames are placed by her head, and in the airborne jump
    # frame her head is well off the centre of her outline — so a cell sized to
    # the widest box left that one frame hanging over the edge of its own cell
    # and bleeding into the next.
    anchor_left = max((head_centre(sh, b) - b[0]) * s for sh, b, s in every)
    anchor_right = max((b[2] - head_centre(sh, b)) * s for sh, b, s in every)
    cell_w = round(anchor_left + anchor_right)
    cell_h = max(round((b[3] - b[1]) * s) for sh, b, s in every)

    # The run pose's height, as a share of the cell. The game multiplies the
    # height it wants her drawn at by the reciprocal — see `PLAYER_CELL`.
    run_h = sum(b[3] - b[1] for b in run_boxes) / len(run_boxes)

    out_scale = CELL_H / cell_h
    cell = (round(cell_w * out_scale), CELL_H)

    anchor_x = anchor_left * out_scale
    build(run_sheet, run_boxes, out_scale, cell, anchor_x, "run")
    build(hurt_sheet, hurt_boxes, out_scale * run_head / hurt_head, cell, anchor_x, "hurt")
    build(jump_sheet, jump_boxes, out_scale * run_head / jump_head, cell, anchor_x, "jump")

    print()
    # Everything the game is told is measured against the *padded* cell, since
    # that is the rectangle it draws.
    pw, ph = cell[0] + PAD * 2, cell[1] + PAD * 2

    print("for app/game/tuning.ts:")
    print(f"  RUN_FRAMES  {len(run_boxes)}")
    print(f"  JUMP_FRAMES {len(jump_boxes)}")
    print("  PLAYER_CELL = {")
    print(f"    aspect:  {pw / ph:.4f},   // cell width / cell height")
    print(f"    runFill: {run_h * out_scale / ph:.4f},   // run pose height, as a share of the cell")
    print(f"    foot:    {(PAD + cell[1]) / ph:.4f},   // how far down the cell the ground line is")
    print("  }")


if __name__ == "__main__":
    main()
