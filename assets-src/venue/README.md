# Venue assets

## The map — `casa-maria-poster.jpg` ✅ in place

The venue's directions sheet, wired up as `VENUE_MAP_IMAGE` in
`app/config.ts`. On the RSVP page it fills the Map tab cropped from the top,
and tapping it opens a full-screen viewer that pinches, scrolls and
double-taps to zoom, and drags to pan.

> The filename says "poster" because this folder was set up expecting a video
> poster there. Nothing is broken — config points at the real path — but if
> you'd rather it read straight, rename it to `casa-maria-map.jpg` and change
> the one line in `app/config.ts` to match.

Replacing it: any aspect ratio works, portrait included. Bigger is better,
since the whole point is zooming in on street names — 1500px on the long edge
is plenty, and keep it under ~1 MB so it isn't slow on mobile data.

## The walkthrough — `walkthrough-poster.jpg` ✅ in place

The walkthrough is hosted rather than served from here: it is a YouTube
Short, wired up as `VENUE_VIDEO_YOUTUBE` in `app/config.ts`. YouTube hands
each guest the quality their phone and their signal can take, which is the
one thing a file in this folder cannot do for a clip that runs minutes.

What *is* in this folder is `walkthrough-poster.jpg` — the still behind the
play button, pointed at by `VENUE_VIDEO_POSTER`. It comes down with the rest
of the invitation at the loading screen, so the Walkthrough tab is drawn
from here and nothing of YouTube's is fetched until a guest taps it. Tapping
opens the player full screen, where the music steps aside for it.

Replacing the video: put the new link in `app/config.ts` — a `shorts/`,
`watch?v=`, `youtu.be/` or bare id all work, share tail and all — and drop a
new still here under the same name. Portrait is fine; the tab is 16:9 and
crops a low band out of it (`object-[50%_72%]` in
`PartyDetailsSection.tsx`), so put what should show there. YouTube will hand you one: `i.ytimg.com/vi/<id>/oardefault.jpg` is
the frame in the video's own shape, and `maxresdefault.jpg` the 16:9 one.

### Serving it from here instead

If the clip is ever short enough to ship with the site, drop the MP4 in this
folder and fill in `VENUE_VIDEO` — a file there wins over the YouTube link,
and plays in the tab itself rather than behind a tap:

```ts
export const VENUE_VIDEO = "/venue/casa-maria.mp4";
```

- **Format** — MP4 (H.264 + AAC). It plays inline and muted on every phone.
- **Length** — 20–40 seconds. It loops, so it doesn't need an ending.
- **Shape** — 16:9 landscape. The frame is `aspect-video` and the video is
  cropped to fill, so a portrait clip will lose its top and bottom.
- **Size** — keep it under ~8 MB. Most guests open this on mobile data.

With neither a link nor a file, the Walkthrough tab shows a framed
placeholder rather than an empty box.
