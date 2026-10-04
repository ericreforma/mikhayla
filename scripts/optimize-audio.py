#!/usr/bin/env python3
"""
Builds the music the site actually serves.

---------------------------------------------------------------------------
Why this exists
---------------------------------------------------------------------------
The same argument as `optimize-images.py`, one wave later. The photographs
were the weight at the door and are now about two megabytes; that left the
music as much the heaviest thing the invitation downloads, and nothing had
ever been done to it.

Her thirteen songs and the bed under the invitation are 16.6 MB between them,
encoded at 192-256 kbps joint stereo, 44.1 kHz — the settings a music player
would want. They are not being used that way. They are short loops played
quietly under a photograph, through a phone speaker or one earbud, while
somebody reads a caption. At 96 kbps mono the same thirteen songs come to
around 7.6 MB, which is the single largest saving left anywhere in the
project, and on a phone speaker it is not a difference anyone can hear.

That weight matters for one specific reason, which is worth stating because
it is not obvious: the songs are fetched in month order *after* the
invitation opens (see `useBackgroundFetch`), and a guest swiping through her
year at a normal reading pace can outrun that queue. When they do, the month
lands in silence and the song catches up a beat later. Halving the bytes
halves the race. `TimelineMusic` now also buffers the next month ahead of the
swipe, which attacks the same problem from the other end.

---------------------------------------------------------------------------
Running it
---------------------------------------------------------------------------
    python scripts/optimize-audio.py              # only what's missing or stale
    python scripts/optimize-audio.py --force      # rebuild everything
    python scripts/optimize-audio.py --dry-run    # just say what it would do

It needs ffmpeg on PATH and nothing else:

    winget install Gyan.FFmpeg          # Windows
    brew install ffmpeg                 # macOS

Like the image script it is *not* part of `npm run build` — the output is
committed, so CI never has to run it. Run it by hand after adding or replacing
anything in `assets-src/audio/`, and commit what it writes.

---------------------------------------------------------------------------
The one-time move before this can run
---------------------------------------------------------------------------
The MP3s in `public/audio/` are still the masters — unlike the pictures,
there has never been an `assets-src` copy of them. Re-encoding in place would
throw the originals away, so the first run needs them moved out of the way:

    git mv public/audio assets-src/audio
    python scripts/optimize-audio.py

After that `assets-src/audio/` holds the masters (never deployed, like the
rest of `assets-src/`) and `public/audio/` holds only what this writes. The
filenames are preserved exactly, so nothing in `app/config.ts` changes —
including the inconsistent `.MP3` casing, which is deliberate: those strings
are in the config and on a case-sensitive host they have to keep matching.
"""

from __future__ import annotations

import argparse
import shutil
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / "assets-src" / "audio"
OUT = ROOT / "public" / "audio"

# ---------------------------------------------------------------------------
# The settings, and why these numbers
# ---------------------------------------------------------------------------
# 96 kbps mono at 44.1 kHz. Mono is the real saving and the easy call: both
# players are a bed under a picture, there is no stereo image worth keeping,
# and a phone held in one hand is playing through a single speaker anyway.
#
# 96 kbps for mono is roughly equivalent to 192 for stereo in bits-per-channel
# terms, so this is not even a quality cut by that measure — it is dropping a
# channel nobody is listening to. Going below this starts to be audible on the
# strings in a couple of her tracks; going above buys nothing on a phone.
BITRATE = "96k"
CHANNELS = 1
SAMPLE_RATE = 44_100


def encode(src: Path, dst: Path, dry: bool) -> tuple[int, int]:
    """Render one song, returning (bytes before, bytes after)."""
    before = src.stat().st_size
    if dry:
        return before, 0

    dst.parent.mkdir(parents=True, exist_ok=True)
    subprocess.run(
        [
            "ffmpeg",
            "-nostdin",
            "-loglevel", "error",
            "-y",
            "-i", str(src),
            "-vn",                      # drop any embedded cover art
            "-map_metadata", "-1",      # and the tags; nothing reads them
            "-ac", str(CHANNELS),
            "-ar", str(SAMPLE_RATE),
            "-b:a", BITRATE,
            "-codec:a", "libmp3lame",
            str(dst),
        ],
        check=True,
    )
    return before, dst.stat().st_size


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("--force", action="store_true", help="rebuild everything")
    ap.add_argument("--dry-run", action="store_true", help="say what would happen")
    args = ap.parse_args()

    if not shutil.which("ffmpeg"):
        sys.exit("ffmpeg is required and is not on PATH - see the note at the top of this file.")

    if not SRC.is_dir():
        sys.exit(
            f"No masters at {SRC}.\n"
            "The originals are still in public/audio. Move them first:\n"
            "    git mv public/audio assets-src/audio"
        )

    songs = sorted(p for p in SRC.iterdir() if p.suffix.lower() == ".mp3")
    if not songs:
        sys.exit(f"No .mp3 files in {SRC}")

    total_before = total_after = 0
    built = skipped = 0

    for src in songs:
        # The output keeps the source's exact name, casing included — those
        # strings are in app/config.ts and a case-sensitive host will hold us
        # to them.
        dst = OUT / src.name
        fresh = dst.exists() and dst.stat().st_mtime >= src.stat().st_mtime
        if fresh and not args.force:
            total_before += src.stat().st_size
            total_after += dst.stat().st_size
            skipped += 1
            continue

        before, after = encode(src, dst, args.dry_run)
        total_before += before
        total_after += after
        built += 1
        if args.dry_run:
            print(f"  would build  {src.name:<22} {before / 1024:7.0f} KB")
        else:
            cut = 100 * (1 - after / before) if before else 0
            print(f"  {src.name:<22} {before / 1024:7.0f} KB -> {after / 1024:6.0f} KB  ({cut:4.1f}% off)")

    print()
    print(f"{built} built, {skipped} already current")
    if not args.dry_run and total_before:
        print(
            f"total {total_before / 1_048_576:.1f} MB -> {total_after / 1_048_576:.1f} MB "
            f"({100 * (1 - total_after / total_before):.0f}% off)"
        )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
