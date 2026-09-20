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

## The walkthrough video — still to come

Drop the clip here, then point `app/config.ts` at it:

```ts
export const VENUE_VIDEO = "/venue/casa-maria.mp4";
export const VENUE_VIDEO_POSTER = "/venue/casa-maria-still.jpg";
```

- **Format** — MP4 (H.264 + AAC). It plays inline and muted on every phone.
- **Length** — 20–40 seconds. It loops, so it doesn't need an ending.
- **Shape** — 16:9 landscape. The frame is `aspect-video` and the video is
  cropped to fill, so a portrait clip will lose its top and bottom.
- **Size** — keep it under ~8 MB. Most guests open this on mobile data.
- **Poster** — a still from the clip, same 16:9. It shows while the video
  loads, in place of a black first frame.

Until the video is in, the Walkthrough tab shows a framed placeholder rather
than an empty box.
