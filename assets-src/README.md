# The original photographs

Everything in here is a **source** file. None of it is deployed — this folder
sits outside `public/`, so the static export never sees it.

What ships is rendered out of here by:

```bash
python scripts/optimize-images.py          # only what's missing or stale
python scripts/optimize-images.py --force  # rebuild everything
```

which writes three sizes of every picture into
`public/<folder>/{mobile,tablet,desktop}/<name>.webp`. A guest downloads one
of the three; which one is decided once per visit from the width of their
screen — see `ASSET_TIER` in `app/config.ts`.

The output is **committed**, so CI never runs Python. Add or replace a file
here, run the script, and commit both.

## Why

These started as full-size PNGs served straight out of `public/`: 55 MB of
them, every one downloaded before a guest was let past the loading screen. PNG
is a lossless format meant for line art, and for a soft studio portrait it
stores every sensor speckle at full fidelity and charges two and a half
megabytes for it. The same photographs as WebP, at the size the screen
actually shows them, come to about 2 MB on a phone — around a thirtieth,
with nothing visibly given up.

## Referring to them from config

Write the path as the original is named here. `app/config.ts` fills in the
rest:

```ts
photo: "/milestones/03-elsa.png"   // → /milestones/tablet/03-elsa.webp
```

That keeps the tables in config reading as a list of the pictures on disk
rather than of build artefacts, and means the tiers can be re-cut — different
widths, a different format — without touching a single path.

## The folders

| Folder         | What it is                                    | Widths (mobile / tablet / desktop) |
| -------------- | --------------------------------------------- | ---------------------------------- |
| `images/`      | Her portraits, and the castle the site opens on | 1000 / 1300 / 1536              |
| `milestones/`  | The thirteen costume shots, one per month      | 810 / 1080 / 1080                  |
| `princesses/`  | The cut-out figures, corner of each month      | 300 / 420 / 560                    |
| `venue/`       | The map sheet and the walkthrough still        | 480 / 720 / 960                    |

Nothing is cropped — only resized, and never upscaled past the original. The
framing you compose is the framing that ships; the cropping is done in CSS, so
the same file serves a phone held upright and an iPad held sideways.

Transparency survives (the `princesses/` cut-outs need it); the rest is
flattened to RGB, which spares WebP an alpha channel a photograph has no use
for.
