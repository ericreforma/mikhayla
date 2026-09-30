#!/usr/bin/env python3
"""
Draws the gilt upright that stands between two columns of text.

---------------------------------------------------------------------------
Why
---------------------------------------------------------------------------
Two columns side by side need something down the middle of them, or they read
as two stray stacks rather than one plate. A plain hairline does the job but
says nothing; on a page whose every other edge is filigree it reads as the one
place the drawing ran out.

So this draws the hairline the way the rest of the frame would have drawn it:
a rule with a fleuron at each end, a cluster of four beads a quarter of the way
in, and a medallion where the eye lands in the middle. It is the ornament a
horizontal rule on an order of service has, stood on end.

---------------------------------------------------------------------------
Where the ornament comes from
---------------------------------------------------------------------------
Nothing here is newly drawn. Both shapes are lifted out of
`assets-src/frames/royal-border.svg` -- the same artwork the page's frame is
cut from -- so the upright is in the same hand as everything around it, down to
the weight of the curves:

    lozenge   the pointed star at the peak of the top crest
    scroll    one of the C-scrolls out of a corner flourish

They are found by their measurements rather than by their position in the file,
so re-saving the artwork from a drawing program cannot silently pick up the
wrong curve -- it fails loudly instead. Both are normalised to sit centred on
the origin, which is what lets them be mirrored into place four at a time.

---------------------------------------------------------------------------
On its proportions
---------------------------------------------------------------------------
One piece, not four. The frame is cut up because it has to fit a column of
whatever height the page gives it, and stretched filigree reads as a picture
pulled out of shape. This does not have that problem: it is drawn once and
scaled to fit, so nothing is ever scaled unevenly and there is nothing to
slice.

Fitted to its box rather than stretched across it, though -- `ChristeningSection`
gives it a tall thin box and `background-size: contain`, so it takes the full
height it is given and works out its own width from that. Which is why it is
drawn so much longer than it is wide: at a fourteenth of its height it stays
inside the gap between the columns at every column height the page actually
produces -- which is what lets it cost the columns no width at all. Drawn
squarer it would outgrow that gap and start crowding the text.

---------------------------------------------------------------------------
Running it
---------------------------------------------------------------------------
    python scripts/build-column-separator.py

Writes `public/frames/column-separator.svg`. Like the slicer and the image
optimiser it is run by hand and its output is committed, so CI never has to run
Python.
"""

from __future__ import annotations

import re
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / "assets-src" / "frames" / "royal-border.svg"
DEST = ROOT / "public" / "frames" / "column-separator.svg"

#: The one colour the whole frame is drawn in.
GOLD = "#C6B56F"

#: The ornaments to lift, by the box each occupies in the artwork. Measured
#: rather than named because the artwork has no names in it; the tolerance is
#: wide enough for a round trip through a drawing program and far narrower than
#: the gap to the next-nearest curve.
WANTED = {
    "lozenge": (540.42, 30.57, 581.58, 84.44),
    "scroll": (61.87, 129.79, 102.44, 160.16),
}
TOLERANCE = 0.5

#: The canvas. A fourteenth as wide as it is tall -- see the note on
#: proportions. Long rather than square because it is fitted to the height it
#: is given and takes its width from that: drawn any shorter, it would run out
#: of drawing before the column ran out of height.
W, H = 100.0, 1400.0
CX = W / 2

#: Where each thing sits, measured down from the top. The bottom half is the
#: mirror of these, so there is only ever one number to change.
CAP_Y, CAP_SCALE = 22.0, 0.62
BEADS_Y, BEAD_R, BEAD_GAP = 320.0, 4.0, 11.0
MEDALLION_Y = H / 2

#: How far out from the medallion's centre its own lozenges sit, and how big.
ARM_OFFSET, ARM_SCALE = 50.0, 0.34
#: The four scrolls thrown out around the middle.
SCROLL_DX, SCROLL_DY, SCROLL_SCALE, SCROLL_TILT = 24.0, 13.0, 0.68, 20.0

#: Wide enough to land on a whole pixel at the size this is actually drawn at.
#: Under that a hairline dithers to grey and reads as a smudge rather than a line.
RULE_WIDTH = 2.4
#: Air between the end of a hairline and whatever it runs up to. Small enough
#: to read as one line through the ornament, large enough not to look welded.
RULE_GAP = 2.5

TOKEN = re.compile(r"[A-Za-z]|[-+]?(?:\d*\.\d+|\d+)(?:[eE][-+]?\d+)?")
ARGS = {"M": 2, "L": 2, "C": 6, "S": 4, "H": 1, "V": 1, "Q": 4, "T": 2, "A": 7, "Z": 0}


def path_points(d: str) -> list[tuple[float, float]]:
    """Every point a path touches, control points included, in absolute coords.

    The same walk `slice-border.py` does, and wrong in the same safe direction:
    control points make the box a shade larger than the ink really is, which
    only ever makes a match harder to get by accident.
    """
    toks = TOKEN.findall(d)
    pts: list[tuple[float, float]] = []
    cx = cy = sx = sy = 0.0
    cmd = None
    i = 0
    while i < len(toks):
        if toks[i].isalpha():
            cmd = toks[i]
            i += 1
            if cmd.upper() == "Z":
                cx, cy = sx, sy
                continue
        if cmd is None:
            i += 1
            continue
        key = cmd.upper()
        rel = cmd.islower()
        n = ARGS[key]
        if i + n > len(toks):
            break
        v = [float(t) for t in toks[i : i + n]]
        i += n
        if key == "H":
            cx = cx + v[0] if rel else v[0]
        elif key == "V":
            cy = cy + v[0] if rel else v[0]
        elif key == "A":
            cx = cx + v[5] if rel else v[5]
            cy = cy + v[6] if rel else v[6]
        else:
            for j in range(0, n, 2):
                px = cx + v[j] if rel else v[j]
                py = cy + v[j + 1] if rel else v[j + 1]
                pts.append((px, py))
            cx = cx + v[n - 2] if rel else v[n - 2]
            cy = cy + v[n - 1] if rel else v[n - 1]
        pts.append((cx, cy))
        if key == "M":
            sx, sy = cx, cy
    return pts


def lift() -> dict[str, dict]:
    """Find each wanted ornament in the artwork and centre it on the origin."""
    svg = SRC.read_text(encoding="utf-8")
    found: dict[str, dict] = {}
    for d in re.findall(r'<path[^>]*?\bd="([^"]*)"', svg, re.S):
        pts = path_points(d)
        if not pts:
            continue
        box = (
            min(p[0] for p in pts),
            min(p[1] for p in pts),
            max(p[0] for p in pts),
            max(p[1] for p in pts),
        )
        for name, want in WANTED.items():
            if name in found:
                continue
            if all(abs(a - b) <= TOLERANCE for a, b in zip(box, want)):
                found[name] = {
                    "d": re.sub(r"\s+", " ", d).strip(),
                    "cx": (box[0] + box[2]) / 2,
                    "cy": (box[1] + box[3]) / 2,
                    "w": box[2] - box[0],
                    "h": box[3] - box[1],
                }
    missing = set(WANTED) - set(found)
    if missing:
        raise SystemExit(
            f"{SRC.name}: could not find {', '.join(sorted(missing))}.\n"
            "The artwork has changed shape. Re-measure the ornaments named in "
            "WANTED against it and update their boxes."
        )
    return found


def num(v: float) -> str:
    return f"{round(v, 3):g}"


def place(
    name: str,
    x: float,
    y: float,
    scale: float = 1.0,
    tilt: float = 0.0,
    mirror: bool = False,
    invert: bool = False,
) -> str:
    """One copy of an ornament, centred on (x, y)."""
    bits = [f"translate({num(x)} {num(y)})"]
    if tilt:
        bits.append(f"rotate({num(tilt)})")
    sx = -scale if mirror else scale
    sy = -scale if invert else scale
    bits.append(f"scale({num(sx)} {num(sy)})")
    return f'<use href="#{name}" transform="{" ".join(bits)}"/>'


def flanking(
    name: str, dx: float, y: float, scale: float, tilt: float = 0.0, invert: bool = False
) -> str:
    """The same ornament either side of the axis, each facing its own way."""
    return place(name, CX - dx, y, scale, -tilt, mirror=True, invert=invert) + place(
        name, CX + dx, y, scale, tilt, invert=invert
    )


def beads(y: float) -> str:
    """Four beads in a square -- the rest between one stretch of rule and the next."""
    return "".join(
        f'<circle cx="{num(CX + sx * BEAD_GAP / 2)}" '
        f'cy="{num(y + sy * BEAD_GAP / 2)}" r="{num(BEAD_R)}"/>'
        for sx in (-1, 1)
        for sy in (-1, 1)
    )


def rule(y0: float, y1: float) -> str:
    return (
        f'<rect x="{num(CX - RULE_WIDTH / 2)}" y="{num(y0)}" '
        f'width="{num(RULE_WIDTH)}" height="{num(y1 - y0)}"/>'
    )


def medallion(y: float) -> str:
    """The middle: a lozenge, four scrolls thrown out around it, and a smaller
    lozenge on the axis at each end, where the hairline runs in."""
    return "".join(
        (
            flanking("scroll", SCROLL_DX, y - SCROLL_DY, SCROLL_SCALE, -SCROLL_TILT),
            flanking(
                "scroll", SCROLL_DX, y + SCROLL_DY, SCROLL_SCALE, SCROLL_TILT, invert=True
            ),
            place("lozenge", CX, y, 1.0),
            place("lozenge", CX, y - ARM_OFFSET, ARM_SCALE),
            place("lozenge", CX, y + ARM_OFFSET, ARM_SCALE),
        )
    )


def build(parts: dict) -> str:
    lozenge_h = parts["lozenge"]["h"]
    cap_reach = CAP_Y + lozenge_h * CAP_SCALE / 2
    bead_reach = BEAD_GAP / 2 + BEAD_R
    med_reach = ARM_OFFSET + lozenge_h * ARM_SCALE / 2

    # Four stretches of hairline, each stopping just short of what it runs up to.
    runs = [
        (cap_reach, BEADS_Y - bead_reach),
        (BEADS_Y + bead_reach, MEDALLION_Y - med_reach),
        (MEDALLION_Y + med_reach, H - BEADS_Y - bead_reach),
        (H - BEADS_Y + bead_reach, H - cap_reach),
    ]

    defs = "".join(
        f'<g id="{name}"><path d="{p["d"]}" '
        f'transform="translate({num(-p["cx"])} {num(-p["cy"])})"/></g>'
        for name, p in parts.items()
    )
    body = "".join(
        (
            "".join(rule(a + RULE_GAP, b - RULE_GAP) for a, b in runs),
            beads(BEADS_Y),
            beads(H - BEADS_Y),
            place("lozenge", CX, CAP_Y, CAP_SCALE),
            place("lozenge", CX, H - CAP_Y, CAP_SCALE),
            medallion(MEDALLION_Y),
        )
    )
    return (
        "<!-- Built by scripts/build-column-separator.py from "
        "assets-src/frames/royal-border.svg. Edit that, not this. -->\n"
        f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {num(W)} {num(H)}" '
        f'fill="{GOLD}" aria-hidden="true">'
        f"<defs>{defs}</defs>{body}</svg>\n"
    )


def main() -> int:
    parts = lift()
    DEST.parent.mkdir(parents=True, exist_ok=True)
    DEST.write_text(build(parts), encoding="utf-8")
    print(f"{DEST.relative_to(ROOT)}  {DEST.stat().st_size / 1024:.1f} KB")
    for name, p in sorted(parts.items()):
        print(f"  lifted {name:8s} {p['w']:6.2f} x {p['h']:6.2f}")
    print()
    print(f"figures for ChristeningSection:  aspect {num(W)} / {num(H)}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
