#!/usr/bin/env python3
"""
Builds the pictures the site actually serves.

---------------------------------------------------------------------------
Why this exists
---------------------------------------------------------------------------
The photographs came off the camera as full-size PNGs — fifty-five megabytes
of them, every one downloaded at the door before a guest is let in. PNG is a
lossless format meant for line art; for a soft studio portrait it stores every
sensor speckle at full fidelity and charges two and a half megabytes for it.
The same picture as WebP is around sixty kilobytes and nobody can tell.

So the originals live in `assets-src/`, which is outside `public/` and
therefore never deployed, and this script renders them into the three tiers
the site picks between at runtime. See `TIERS` for what each one is for, and
`app/config.ts` for how one gets chosen.

---------------------------------------------------------------------------
Running it
---------------------------------------------------------------------------
    python scripts/optimize-images.py            # only what's missing or stale
    python scripts/optimize-images.py --force    # rebuild everything

It needs Pillow (`pip install pillow`) and nothing else, and it is not part of
`npm run build`: the output is committed, so CI never has to run Python. Run it
by hand after adding or replacing anything in `assets-src/`, and commit what it
writes.
"""

from __future__ import annotations

import argparse
import os
import sys
from dataclasses import dataclass
from pathlib import Path

try:
    from PIL import Image
except ImportError:  # pragma: no cover - a setup problem, not a runtime one
    sys.exit("Pillow is required:  pip install pillow")


ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / "assets-src"
OUT = ROOT / "public"

# The three tiers, in the order a screen grows. The names are the folder names
# under `public/<group>/`, and they have to match the `Tier` union in
# `app/config.ts` exactly — that is the other half of this contract.
TIER_NAMES = ("mobile", "tablet", "desktop")


@dataclass(frozen=True)
class Group:
    """One folder of source pictures, and how wide each tier of it should be.

    `widths` is a width per tier, in the order of `TIER_NAMES`. Height follows
    from the source's own proportions — nothing here crops, so a picture keeps
    the framing it was composed with and the CSS goes on doing the cropping it
    already does.

    A width larger than the source is clamped to the source: upscaling would
    cost bytes and add nothing.
    """

    name: str
    widths: tuple[int, int, int]
    quality: int
    #: Whether the source carries transparency worth keeping (the cut-outs do).
    alpha: bool = False


# ---------------------------------------------------------------------------
# What each group is, and why its numbers are what they are
# ---------------------------------------------------------------------------
# The mobile figures are set so a DPR-2 phone — which is most of them — gets
# very close to a pixel-for-pixel image, and a DPR-3 phone gets about two
# thirds of one. For photographs viewed at arm's length that is a trade nobody
# notices, and it is worth taking twice over: once for the bytes on the wire,
# and again for the memory, since a decoded bitmap costs width x height x 4
# regardless of how small the file it came from was.
GROUPS = (
    # Her portraits — the hero's four, the one beside the date, the one that
    # closes the deck — and the castle the invitation opens on.
    #
    # The portraits are tall 1414x2000 studio shots shown nearly full height;
    # the castle is a wide 1536x1024 painting the opening sequence flies *into*,
    # so it is on screen magnified and wants the headroom. The desktop figure is
    # the castle's native width, which the portraits simply clamp to their own.
    Group("images", (1000, 1300, 1536), quality=80),
    # The twelve costume shots plus month zero. These *are* the page — full
    # bleed, 9:16, one per panel — so they get the most generous mobile tier
    # of the three groups.
    Group("milestones", (810, 1080, 1080), quality=80),
    # The princess cut-outs tucked in the corner of each month. They render at
    # roughly six lines of the title's type — 150-250 CSS px tall — so even
    # the desktop tier here is far smaller than the source.
    Group("princesses", (300, 420, 560), quality=82, alpha=True),
    # The venue's stills: a poster behind a play button in a 16:9 window.
    Group("venue", (480, 720, 960), quality=80),
)

#: Source files that are already small and already the right format — they are
#: copied to every tier untouched rather than re-encoded. Re-encoding a 24px
#: icon as WebP saves nothing and costs it its crispness.
PASSTHROUGH = {".svg"}


def sources(group: Group) -> list[Path]:
    """Every picture in a group's source folder, in a stable order."""
    folder = SRC / group.name
    if not folder.is_dir():
        return []
    return sorted(
        p
        for p in folder.iterdir()
        if p.is_file() and p.suffix.lower() in {".png", ".jpg", ".jpeg", ".webp"}
    )


def stale(src: Path, dest: Path) -> bool:
    """Whether `dest` needs rebuilding from `src`."""
    return not dest.exists() or dest.stat().st_mtime < src.stat().st_mtime


def render(src: Path, dest: Path, width: int, quality: int, alpha: bool) -> int:
    """Writes one tier of one picture, and returns what it weighs."""
    with Image.open(src) as im:
        # An alpha group keeps its transparency; everything else is flattened
        # to RGB, which spares WebP an alpha channel it would otherwise encode
        # for a photograph that has nothing to say in it.
        im = im.convert("RGBA" if alpha else "RGB")

        # Never upscale — see `Group.widths`.
        target = min(width, im.width)
        if target != im.width:
            height = round(im.height * target / im.width)
            im = im.resize((target, height), Image.LANCZOS)

        dest.parent.mkdir(parents=True, exist_ok=True)
        # `method=6` is the slowest, smallest setting. This script runs by hand
        # a handful of times in the life of the site, so the seconds are free
        # and every byte saved is paid for on every guest's phone.
        im.save(dest, "WEBP", quality=quality, method=6)

    return dest.stat().st_size


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--force",
        action="store_true",
        help="rebuild every tier, even ones newer than their source",
    )
    args = parser.parse_args()

    if not SRC.is_dir():
        sys.exit(f"No source folder at {SRC}. See the module docstring.")

    before = after = 0
    written = skipped = 0

    for group in GROUPS:
        found = sources(group)
        if not found:
            print(f"  {group.name}: nothing in assets-src/{group.name}, skipping")
            continue

        print(f"\n{group.name}/")
        for src in found:
            before += src.stat().st_size
            sizes: list[str] = []

            for tier, width in zip(TIER_NAMES, group.widths):
                dest = OUT / group.name / tier / f"{src.stem}.webp"

                if not args.force and not stale(src, dest):
                    after += dest.stat().st_size
                    sizes.append(f"{tier} —")
                    skipped += 1
                    continue

                weight = render(src, dest, width, group.quality, group.alpha)
                after += weight
                sizes.append(f"{tier} {weight / 1024:.0f}K")
                written += 1

            print(f"  {src.name:28s} {src.stat().st_size / 1024 / 1024:5.2f}MB  ->  " + "  ".join(sizes))

    # Anything that is already the right thing at any size, copied through.
    for group in GROUPS:
        folder = SRC / group.name
        if not folder.is_dir():
            continue
        for src in sorted(folder.iterdir()):
            if src.suffix.lower() not in PASSTHROUGH:
                continue
            for tier in TIER_NAMES:
                dest = OUT / group.name / tier / src.name
                dest.parent.mkdir(parents=True, exist_ok=True)
                if args.force or stale(src, dest):
                    dest.write_bytes(src.read_bytes())

    print(
        f"\n{written} written, {skipped} already current."
        f"\nsources {before / 1024 / 1024:.1f}MB  ->  all three tiers {after / 1024 / 1024:.1f}MB"
    )
    if before:
        # The figure worth quoting is a single tier, since a guest only ever
        # downloads one of the three.
        print(f"one tier is roughly {after / 3 / 1024 / 1024:.1f}MB of that.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
