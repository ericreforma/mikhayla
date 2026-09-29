#!/usr/bin/env python3
"""
Cuts the ornamental frame into the pieces the page actually positions.

---------------------------------------------------------------------------
Why
---------------------------------------------------------------------------
The frame is one square drawing and the caption's column is a tall rectangle,
so something has to give. Stretched to fit, the filigree is squashed — the
corners go narrow, the crest goes tall — and it reads as a picture that has
been pulled out of shape, because it has.

The drawing does not need stretching, though. Looked at closely it is two
ornaments and two straight lines:

    a crest across the top, corner flourish to corner flourish
    a crest across the bottom, the same
    a hairline down the left side, joining the two
    a hairline down the right

Only the hairlines run the length of the frame, and a straight line is the one
thing that stretches without anybody seeing it. So this cuts along those
seams. The two crests come out as pieces that keep their proportions and are
laid across the top and bottom at full width; the two hairlines come out as
pieces that are stretched down the sides between them. Nothing that has a
shape is scaled unevenly.

The cut is found rather than hard-coded: the hairlines are picked out by being
long and thin, and everything else goes to whichever crest it is nearer. A
redrawn frame of the same construction slices itself.

---------------------------------------------------------------------------
Running it
---------------------------------------------------------------------------
    python scripts/slice-border.py

Reads `assets-src/frames/royal-border.svg` and writes the four pieces into
`public/frames/`. Like the image optimiser it is run by hand and its output is
committed, so CI never has to run Python. It also prints the geometry the CSS
needs — see `MilestonePanel`, which lays the hairlines against the crests
using those figures.
"""

from __future__ import annotations

import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / "assets-src" / "frames" / "royal-border.svg"
OUT = ROOT / "public" / "frames"

#: A straight rule is long and very thin. Nothing else in the drawing is, which
#: is what lets the two of them be found rather than named.
RULE_MIN_LENGTH = 300.0
RULE_MAX_THICKNESS = 20.0

TOKEN = re.compile(r"[A-Za-z]|[-+]?(?:\d*\.\d+|\d+)(?:[eE][-+]?\d+)?")
ARGS = {"M": 2, "L": 2, "C": 6, "S": 4, "H": 1, "V": 1, "Q": 4, "T": 2, "A": 7, "Z": 0}


def path_points(d: str) -> list[tuple[float, float]]:
    """Every point a path touches, control points included, in absolute coords.

    Control points make the box a little larger than the ink really is, which
    is the safe direction to be wrong in: a piece cut slightly generously still
    holds all of its ornament.
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
            if cmd in "Zz":
                cx, cy = sx, sy
                continue
        if cmd is None:
            break
        up, rel, n = cmd.upper(), cmd.islower(), ARGS[cmd.upper()]
        if i + n > len(toks):
            break
        v = [float(t) for t in toks[i : i + n]]
        i += n
        if up in ("M", "L", "T"):
            x, y = (cx + v[0], cy + v[1]) if rel else (v[0], v[1])
            pts.append((x, y))
            cx, cy = x, y
            if up == "M":
                sx, sy = x, y
                # Pairs that follow a moveto are linetos, not more movetos.
                cmd = "l" if rel else "L"
        elif up == "H":
            cx = cx + v[0] if rel else v[0]
            pts.append((cx, cy))
        elif up == "V":
            cy = cy + v[0] if rel else v[0]
            pts.append((cx, cy))
        elif up in ("C", "S", "Q"):
            pairs = [(v[k], v[k + 1]) for k in range(0, n, 2)]
            if rel:
                pairs = [(cx + a, cy + b) for a, b in pairs]
            pts += pairs
            cx, cy = pairs[-1]
        elif up == "A":
            x, y = (cx + v[5], cy + v[6]) if rel else (v[5], v[6])
            pts.append((x, y))
            cx, cy = x, y
    return pts


def elements(svg: str) -> list[tuple[str, float, float, float, float]]:
    """Every drawable in the file, as (markup, x0, y0, x1, y1).

    The source carries no transforms, so a path's own coordinates are the
    page's — see the assert in `main`, which is what keeps that true.
    """
    found: list[tuple[str, float, float, float, float]] = []
    for m in re.finditer(r"<path\b[^>]*/?>", svg, re.S):
        d = re.search(r'\sd="([^"]*)"', m.group(0), re.S)
        if not d:
            continue
        pts = path_points(d.group(1))
        if not pts:
            continue
        xs = [p[0] for p in pts]
        ys = [p[1] for p in pts]
        found.append((m.group(0), min(xs), min(ys), max(xs), max(ys)))

    for m in re.finditer(r"<circle\b[^>]*/?>", svg, re.S):
        tag = m.group(0)

        def num(name: str) -> float:
            return float(re.search(rf'\s{name}="([^"]+)"', tag).group(1))

        cx, cy, r = num("cx"), num("cy"), num("r")
        found.append((tag, cx - r, cy - r, cx + r, cy + r))

    return found


def write(name: str, parts, box, stretch: bool) -> Path:
    """One piece, its viewBox cropped to what it holds."""
    x0, y0, x1, y1 = box
    # The hairlines are the only pieces told to stretch. The crests keep their
    # proportions, which is the whole point of cutting them out.
    ratio = ' preserveAspectRatio="none"' if stretch else ""
    body = "\n".join(p[0] for p in parts)
    svg = (
        '<svg xmlns="http://www.w3.org/2000/svg" '
        f'viewBox="{x0:.2f} {y0:.2f} {x1 - x0:.2f} {y1 - y0:.2f}"{ratio}>\n'
        f"{body}\n</svg>\n"
    )
    dest = OUT / name
    dest.parent.mkdir(parents=True, exist_ok=True)
    dest.write_text(svg, encoding="utf-8")
    return dest


def main() -> int:
    if not SRC.is_file():
        sys.exit(f"No source at {SRC}")
    svg = SRC.read_text(encoding="utf-8")

    if "transform=" in svg:
        sys.exit(
            "The drawing has transforms on it now, so a path's coordinates are "
            "no longer the page's and these boxes would be wrong. Flatten them "
            "in the editor, or teach this script to compose them."
        )

    all_els = elements(svg)
    if not all_els:
        sys.exit("Found nothing to slice — has the drawing changed shape?")

    # The two hairlines: long, thin, and one down each side.
    rules = [
        e
        for e in all_els
        if (e[4] - e[2]) >= RULE_MIN_LENGTH and (e[3] - e[1]) <= RULE_MAX_THICKNESS
    ]
    if len(rules) != 2:
        sys.exit(
            f"Expected two side hairlines, found {len(rules)}. The frame is not "
            "built the way this script assumes — see the note at the top."
        )
    left_rule, right_rule = sorted(rules, key=lambda e: e[1])

    # Everything else belongs to whichever crest it is nearer.
    rest = [e for e in all_els if e not in rules]
    mid = (min(e[2] for e in all_els) + max(e[4] for e in all_els)) / 2
    top = [e for e in rest if (e[2] + e[4]) / 2 < mid]
    bottom = [e for e in rest if (e[2] + e[4]) / 2 >= mid]

    def bbox(parts):
        return (
            min(p[1] for p in parts),
            min(p[2] for p in parts),
            max(p[3] for p in parts),
            max(p[4] for p in parts),
        )

    tb, bb = bbox(top), bbox(bottom)
    # The crests are given one shared width so that, laid across the frame at
    # full width, their corners line up with each other and with the hairlines.
    x0 = min(tb[0], bb[0])
    x1 = max(tb[2], bb[2])
    span = x1 - x0

    pieces = (
        ("border-top.svg", top, (x0, tb[1], x1, tb[3]), False),
        ("border-bottom.svg", bottom, (x0, bb[1], x1, bb[3]), False),
        ("border-rule-left.svg", [left_rule], left_rule[1:5], True),
        ("border-rule-right.svg", [right_rule], right_rule[1:5], True),
    )

    print(f"source {SRC.name}: {len(all_els)} drawables")
    print()
    for name, parts, box, stretch in pieces:
        dest = write(name, parts, box, stretch)
        w, h = box[2] - box[0], box[3] - box[1]
        print(
            f"  {name:24s} {len(parts):3d} el  {w:7.1f} x {h:7.1f}"
            f"  {dest.stat().st_size / 1024:6.1f} KB"
        )

    # What the panel needs to lay the hairlines against the crests. Both are
    # shares of the crest's own width, because the crests are scaled to the
    # frame's width — so these hold at whatever size the frame ends up.
    print()
    print("figures for MilestonePanel (shares of the frame's width):")
    print(f"  top crest     aspect  {span:.1f} / {tb[3] - tb[1]:.1f}")
    print(f"  bottom crest  aspect  {span:.1f} / {bb[3] - bb[1]:.1f}")
    for side, rule in (("left", left_rule), ("right", right_rule)):
        inset = (rule[1] - x0) if side == "left" else (x1 - rule[3])
        print(
            f"  {side:6s} hairline inset {inset / span * 100:.3f}%"
            f"   width {(rule[3] - rule[1]) / span * 100:.3f}%"
        )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
