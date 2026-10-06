#!/usr/bin/env python3
"""
Shrinks the game's sound effects into something a phone should download.

---------------------------------------------------------------------------
Why this exists
---------------------------------------------------------------------------
The sounds arrived as they came out of whatever made them: 2.1MB of 256kbps
stereo, which includes a 227KB *WAV* for a one-second jump. That is a quarter
of a megabyte to make a noise when somebody taps a button, on a page that
already spends its budget on photographs — and a party guest is on somebody
else's wifi.

Every one of them is a short, mostly-percussive effect played through a phone
speaker, where 256kbps stereo at 48kHz is spending roughly five times what the
listener can hear. Mono at 48-72kbps is indistinguishable here and about a
fifth of the size.

The whole set comes to around 550KB instead of 2.1MB, and only the menu loop
is more than a few tens of KB.

---------------------------------------------------------------------------
Why AAC rather than MP3
---------------------------------------------------------------------------
Not a preference — the only ffmpeg on this machine is the one bundled with
CapCut, and it is built without libmp3lame. AAC is the one encoder it has.

It costs nothing: AAC in `.m4a` plays everywhere this invitation will be
opened, and it is Apple's own format, which matters when the likeliest device
by a wide margin is an iPhone. At these bitrates it is also the better codec.

---------------------------------------------------------------------------
Running it
---------------------------------------------------------------------------
    python scripts/build-audio.py

Reads  assets-src/game/sfx/*          (the originals, never deployed)
Writes public/game/sfx/*.m4a

Set FFMPEG to point somewhere else if this machine ever gets a real one:

    FFMPEG=ffmpeg python scripts/build-audio.py
"""

import os
import shutil
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / "assets-src" / "game" / "sfx"
OUT = ROOT / "public" / "game" / "sfx"

FALLBACK_FFMPEG = Path(
    os.environ.get("LOCALAPPDATA", "")
) / "CapCut" / "Apps" / "9.5.0.4050" / "ffmpeg.exe"

# Bitrate per sound, in kbps. Mono throughout — every one of these is a point
# source heard through a phone speaker, and nothing in the set has a stereo
# image worth twice the bytes.
#
# The short effects sit at 48: they are a tenth of a second of noise and the
# ear has nothing to hold against it. The stings get 64 because they are
# actually music, however briefly. The menu loop gets the most because it is
# the only thing anybody hears for more than a few seconds at a time — and it
# is still the one file worth watching, at two thirds of the whole set.
RATES = {
    "button": 48,
    "hurt": 48,
    "jump": 48,
    "step-grass": 48,
    "step-rain": 48,
    "step-snow": 48,
    "gameover": 64,
    "winner-self": 64,
    "winner-all": 64,
    "main-menu": 72,
    # The weather beds are broadband noise, which is the least structured thing
    # a codec ever sees and the most forgiving: there is no tone to go sour and
    # no transient to smear. They also play quietly under everything else.
    "raining": 56,
    "snowing": 56,
}

DEFAULT_RATE = 56

# ---------------------------------------------------------------------------
# The two weather beds, which are cut down to a loop rather than shipped whole
# ---------------------------------------------------------------------------
# They arrived as 2:05 of rain and 5:01 of wind — 13.6MB of a 15.4MB folder,
# for two sounds that play under a game nobody is listening to closely.
#
# Shipping them whole is wrong twice over. The obvious cost is the bytes. The
# less obvious one is that the rain *decays*: it opens as a downpour and tapers
# to a drizzle, so looping the file whole would snap back to the downpour every
# two minutes, under a sky that never changed. A steady window taken out of it
# loops honestly and matches what is being drawn.
#
# Both windows were chosen by measuring rather than by ear — see the envelope
# analysis that picked them: steadiest level, best-matched ends, no transient
# inside to turn into a metronome, and above the file's own average loudness so
# the bed is weather rather than a hiss.
#
#   start   where the window opens, in seconds
#   length  the finished loop
#   blend   how much of the following audio is folded back over the head
LOOPS = {
    "raining": {"start": 5.5, "length": 30.0, "blend": 4.0},
    "snowing": {"start": 115.0, "length": 30.0, "blend": 4.0},
}


def loop_filter(start: float, length: float, blend: float) -> str:
    """
    A seamless loop, by folding the tail back over the head.

    Take `length + blend` of audio. The output is the first `length` of it,
    with the extra `blend` at the end mixed back over the first `blend`
    seconds as a crossfade. The output then ends on material that leads
    naturally into its own beginning, because its beginning already contains
    where the end was going.

    `qsin` rather than the default linear fade, and that detail matters here:
    rain crossfaded against rain is two uncorrelated noise sources, which sum
    by power rather than by amplitude. Linear fades would dip about 3dB in the
    middle of every crossfade — a hole in the rain, once every thirty seconds.
    Quarter-sine keeps `in² + out² = 1` and the level holds flat across it.
    """
    head, tail = start, start + length
    return (
        f"[0:a]atrim=start={head}:end={tail},asetpts=PTS-STARTPTS,"
        f"afade=t=in:st=0:d={blend}:curve=qsin[main];"
        f"[0:a]atrim=start={tail}:end={tail + blend},asetpts=PTS-STARTPTS,"
        f"afade=t=out:st=0:d={blend}:curve=qsin[tail];"
        f"[main][tail]amix=inputs=2:duration=longest:normalize=0:"
        f"dropout_transition=0[out]"
    )


def ffmpeg() -> str:
    found = os.environ.get("FFMPEG") or shutil.which("ffmpeg")
    if found:
        return found
    if FALLBACK_FFMPEG.exists():
        return str(FALLBACK_FFMPEG)
    raise SystemExit(
        "No ffmpeg. Install one, or point FFMPEG at a binary:\n"
        "    FFMPEG=/path/to/ffmpeg python scripts/build-audio.py"
    )


def main() -> None:
    if not SRC.is_dir():
        raise SystemExit(f"No sounds at {SRC}")

    exe = ffmpeg()
    OUT.mkdir(parents=True, exist_ok=True)
    print(f"ffmpeg: {exe}\n")

    before = after = 0
    for source in sorted(SRC.iterdir()):
        if source.suffix.lower() not in {".wav", ".mp3", ".m4a", ".ogg", ".aac"}:
            continue

        rate = RATES.get(source.stem, DEFAULT_RATE)
        target = OUT / f"{source.stem}.m4a"
        loop = LOOPS.get(source.stem)

        shape = ["-filter_complex", loop_filter(**loop), "-map", "[out]"] if loop \
            else []

        result = subprocess.run(
            [
                exe, "-hide_banner", "-loglevel", "error", "-y",
                "-i", str(source),
                *shape,
                "-ac", "1",            # mono
                "-ar", "44100",
                "-c:a", "aac",
                "-b:a", f"{rate}k",
                # No container padding and no metadata: on a file this small
                # the tags were a measurable share of it.
                "-map_metadata", "-1",
                "-movflags", "+faststart",
                str(target),
            ],
            capture_output=True,
            text=True,
        )
        if result.returncode != 0:
            print(result.stderr, file=sys.stderr)
            raise SystemExit(f"ffmpeg failed on {source.name}")

        a, b = source.stat().st_size, target.stat().st_size
        before += a
        after += b
        note = f"@{rate}k mono"
        if loop:
            note += f", looped {loop['length']:.0f}s from {loop['start']:.1f}s"
        print(
            f"  {source.name:<18} {a/1024:7.1f}KB -> {target.name:<18} "
            f"{b/1024:6.1f}KB  {note}  ({100 - b / a * 100:.0f}% off)"
        )

    print(f"\n  total  {before/1024:.0f}KB -> {after/1024:.0f}KB "
          f"({100 - after / before * 100:.0f}% off)")


if __name__ == "__main__":
    main()
