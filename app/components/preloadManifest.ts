import {
  BACKGROUND_TRACK,
  CASTLE_SCENE,
  DATE_PORTRAIT,
  FINALE_PORTRAIT,
  HERO_PORTRAITS,
  MILESTONES,
  MONTH_FRAME,
  POINTING_HAND,
  SWIMWEAR_ICON,
  VENUE_MAP_IMAGE,
  VENUE_VIDEO_POSTER,
} from "@/app/config";
import type { PreloadAsset } from "./useAssetPreload";

/**
 * Everything the invitation fetches ahead of time, in two waves.
 *
 * ---------------------------------------------------------------------------
 * A word on weight, because this is the one number worth watching here
 * ---------------------------------------------------------------------------
 * This list used to be some 53 MB of photographs — full-size PNGs of a baby in
 * a gown, every one of them waited for at the door. On a middling 4G
 * connection that was the better part of a minute before a guest saw anything,
 * and on a poor one it was longer than anyone will wait.
 *
 * The photographs are WebP now, rendered at three sizes by
 * `scripts/optimize-images.py`, and a guest downloads whichever of the three
 * their screen actually wants — see `ASSET_TIER` in `app/config.ts`. The same
 * pictures are around 2 MB on a phone. Nothing about the invitation looks
 * different; there is simply thirty times less of it.
 *
 * That left the music as the heaviest thing here by a wide margin, which is
 * what the two waves below are about.
 *
 * ---------------------------------------------------------------------------
 * The two waves
 * ---------------------------------------------------------------------------
 * `PRELOAD_ASSETS` is the gate: the loading screen holds the door until every
 * one of these has landed. It is the pictures, and the one piece of music that
 * starts playing a second after the curtain lifts.
 *
 * `DEFERRED_ASSETS` is everything fetched *after* a guest is inside, quietly,
 * while they are reading the first screen. It is her twelve months' songs —
 * fifteen megabytes that used to sit in front of the door for the sake of a
 * rail nobody reaches in under ten seconds. Moved behind it, the door opens on
 * about a fifth of what it did, and the songs are still in the cache long
 * before the swipe that wants one.
 *
 * Both lists keep the order they are met in, because both are worked down in
 * order: what a guest sees soonest is fetched soonest.
 */

/**
 * Whether her twelve songs are fetched ahead of the swipe that plays them.
 *
 * On, because a song that starts the instant a month lands is the point of the
 * timeline, and a song that buffers mid-swipe is a page that stutters — but
 * they are now in the second wave, so this costs a guest nothing at the door.
 * Off, the invitation behaves exactly as it did before there was a loading
 * screen: nothing is fetched until its month is reached, which is what
 * `TimelineMusic` does on its own either way.
 */
const INCLUDE_AUDIO = true;

/**
 * Rough byte weights, by what kind of thing it is. See `PreloadAsset.est` —
 * these are only the bar's opening proportions, replaced by the real figure
 * off the wire a moment later. Taken from what the optimiser writes today at
 * the middle tier, so they are the right order of magnitude at all three.
 */
const EST = {
  /** The castle the opening sequence flies at. */
  scene: 130_000,
  /** The music under the whole invitation, and much the heaviest thing here. */
  bed: 2_400_000,
  /** One of the big portraits: hero, date, finale. */
  portrait: 110_000,
  /** A month's costume shot — the largest group. */
  photo: 150_000,
  /** A princess cut-out, tucked in the corner of her month. */
  figure: 22_000,
  /** A song. */
  song: 1_100_000,
  /** Line art, and the venue's stills. */
  small: 60_000,
} as const;

/**
 * A picture.
 *
 * `hold` is the one argument worth thinking about — see `PreloadAsset.hold`.
 * It is set on the handful of images that have to be on screen within a second
 * or two of the curtain lifting, and left off everything else.
 */
const image = (url: string, est: number, hold = false): PreloadAsset => ({
  url,
  kind: "image",
  est,
  hold,
});

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
 * The first wave: what the loading screen holds the door for.
 *
 * A module constant, and it has to stay one: `useAssetPreload` keys its whole
 * download pool off this array's identity, so building it per render would
 * restart the pool on every frame.
 */
export const PRELOAD_ASSETS: PreloadAsset[] = collect(
  /*
   * The castle the curtain lifts onto, the first screen behind it, and the
   * music that starts with them — in the order they are actually met. These
   * are the only things here that are wanted within seconds of the door
   * opening, so these are the ones held decoded.
   *
   * The bed is in this wave rather than the second, and that is not an
   * oversight: it plays a second after the curtain lifts, so a guest who
   * waited at the door and then heard it buffer would have waited for nothing.
   * At 2.4 MB it is now the single heaviest thing in front of the door — if
   * the wait ever needs shortening again, this is where to look, not at the
   * pictures.
   */
  [
    image(CASTLE_SCENE, EST.scene, true),
    /* Every one of the hero's pictures, not just the one it opens on: the
       first turn comes three seconds after the curtain lifts, which is
       sooner than a guest could reach anything else on this list, and a
       dissolve into a picture still downloading is a blank where she was. */
    ...HERO_PORTRAITS.map((src) => image(src, EST.portrait, true)),
    audio(BACKGROUND_TRACK, EST.bed),
  ],

  /* Her year: the four pieces of the gilt frame every month's caption is set
     in — one set for all thirteen — then each month's photograph and the
     figure that stands on it. */
  Object.values(MONTH_FRAME).map((src) => image(src, EST.small)),

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
    /* The teaching hand. Wanted a couple of seconds after the curtain
       lifts, which is sooner than anything else in this group — so it is
       held, even though it is line art rather than a photograph. */
    image(POINTING_HAND, EST.small, true),
    image(VENUE_MAP_IMAGE, EST.small),
    image(VENUE_VIDEO_POSTER, EST.small),
  ],
);

/**
 * The second wave: fetched once a guest is already inside.
 *
 * Her twelve months' songs, which are fifteen megabytes between them and are
 * wanted by nobody until they have read the first screen and swiped down to
 * her year. Nothing waits on this list — it is started when the invitation
 * opens and simply runs, and if a guest outruns it then `TimelineMusic` loads
 * the month they landed on the way it always did.
 *
 * Also a module constant, for the same reason as above.
 */
export const DEFERRED_ASSETS: PreloadAsset[] = collect(
  INCLUDE_AUDIO ? MILESTONES.flatMap((m) => (m.music ? [audio(m.music)] : [])) : [],
);
