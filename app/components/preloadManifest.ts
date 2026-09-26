import {
  BACKGROUND_TRACK,
  CASTLE_SCENE,
  DATE_PORTRAIT,
  FINALE_PORTRAIT,
  HERO_PORTRAIT,
  MILESTONES,
  SWIMWEAR_ICON,
  VENUE_MAP_IMAGE,
  VENUE_VIDEO_POSTER,
} from "@/app/config";
import type { PreloadAsset } from "./useAssetPreload";

/**
 * Everything the loading screen waits for, in the order it is asked for.
 *
 * ---------------------------------------------------------------------------
 * A word on weight, because this is the one number worth watching here
 * ---------------------------------------------------------------------------
 * As it stands, the list below is roughly 44 MB of photographs and 25 MB of
 * music. That is a lot to ask of a guest on mobile data — on a middling 4G
 * connection it is the better part of a minute at the door, and on a poor one
 * it is longer than anyone will wait.
 *
 * Two things follow from that.
 *
 * First, the order. The pool works down this list, so the things a guest sees
 * soonest are fetched soonest: her portrait, then her year, then the rooms
 * further in, and the music last. If anyone ever leaves early — see the way
 * out on the loading screen — what they already have is the front of the
 * invitation rather than a random scattering of it.
 *
 * Second, the lever. `INCLUDE_AUDIO` below takes the songs out of the gate in
 * one line, which halves the wait; they go back to being fetched a month at a
 * time as a guest reaches them, which is what TimelineMusic was written to do
 * and still does. Worth reaching for if the invitation is ever opened
 * somewhere with a thin connection.
 *
 * The real fix is upstream of this file, though: the twelve costume shots are
 * full-size PNGs, and as WebP at phone resolution they would be a tenth of
 * what they are now without a guest being able to tell the difference.
 */

/**
 * Whether her twelve songs are downloaded up front along with the pictures.
 *
 * On, because a song that starts the instant a month lands is the point of
 * the timeline, and a song that buffers mid-swipe is a page that stutters.
 * Off, the invitation behaves exactly as it did before there was a loading
 * screen: nothing is fetched until its month is reached.
 */
const INCLUDE_AUDIO = true;

/**
 * Rough byte weights, by what kind of thing it is. See `PreloadAsset.est` —
 * these are only the bar's opening proportions, replaced by the real figure
 * off the wire a moment later. Taken from what is in `public/` today.
 */
const EST = {
  /** The castle the opening sequence flies at. */
  scene: 2_200_000,
  /** The music under the whole invitation. */
  bed: 4_300_000,
  /** The three big portraits: hero, date, finale. */
  portrait: 2_900_000,
  /** A month's costume shot — the largest group, and the heaviest. */
  photo: 2_500_000,
  /** A princess cut-out, tucked in the corner of her month. */
  figure: 450_000,
  /** A song. */
  song: 1_900_000,
  /** Line art, and the venue's stills. */
  small: 60_000,
} as const;

const image = (url: string, est: number): PreloadAsset => ({ url, kind: "image", est });
const audio = (url: string, est: number = EST.song): PreloadAsset => ({
  url,
  kind: "audio",
  est,
});

/** Drops anything the config leaves empty, and anything listed twice. */
function collect(...groups: PreloadAsset[][]): PreloadAsset[] {
  const seen = new Set<string>();
  const out: PreloadAsset[] = [];
  for (const asset of groups.flat()) {
    if (!asset.url || seen.has(asset.url)) continue;
    seen.add(asset.url);
    out.push(asset);
  }
  return out;
}

/**
 * A module constant, and it has to stay one: `useAssetPreload` keys its whole
 * download pool off this array's identity, so building it per render would
 * restart the pool on every frame.
 */
export const PRELOAD_ASSETS: PreloadAsset[] = collect(
  /*
   * The castle the curtain lifts onto, the first screen behind it, and the
   * music that starts with them — in the order they are actually met.
   *
   * The bed is in here whatever `INCLUDE_AUDIO` says below, and that is not
   * an oversight: the flag is about her twelve songs, which are only wanted
   * if a guest swipes as far as the month that owns them. This one plays a
   * second after the curtain lifts, so a guest who waited at the door and
   * then heard it buffer would have waited for nothing.
   */
  [
    image(CASTLE_SCENE, EST.scene),
    image(HERO_PORTRAIT, EST.portrait),
    audio(BACKGROUND_TRACK, EST.bed),
  ],

  /* Her year: each month's photograph, then the figure that stands on it. */
  MILESTONES.flatMap((m) =>
    collect(
      m.photo ? [image(m.photo, EST.photo)] : [],
      m.character ? [image(m.character, EST.figure)] : [],
    ),
  ),

  /* The rooms further in. */
  [
    image(DATE_PORTRAIT, EST.portrait),
    image(FINALE_PORTRAIT, EST.portrait),
    image(SWIMWEAR_ICON, EST.small),
    image(VENUE_MAP_IMAGE, EST.small),
    image(VENUE_VIDEO_POSTER, EST.small),
  ],

  /* And the music, last — see INCLUDE_AUDIO. */
  INCLUDE_AUDIO ? MILESTONES.flatMap((m) => (m.music ? [audio(m.music)] : [])) : [],
);
