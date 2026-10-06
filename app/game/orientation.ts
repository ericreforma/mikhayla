"use client";

import { useEffect, useState } from "react";

/**
 * Which way round the screen is, and asking it to stay that way.
 *
 * The game is landscape and only landscape. It is not a layout that happens to
 * suit a wide window — the field is seven blocks tall and the player needs to
 * see a dozen blocks ahead to have any warning at all, and a phone held
 * upright gives four. Played portrait it would not be hard, it would be
 * unfair, so it is not offered portrait at all.
 */

/**
 * `null` until the first measurement, which is the single frame before the
 * effect runs. The gate paints nothing during it rather than guessing — a
 * guess is a rotate-your-phone card flashing up on a laptop.
 */
export function useIsLandscape(): boolean | null {
  const [landscape, setLandscape] = useState<boolean | null>(null);

  useEffect(() => {
    /*
     * Measured off the window rather than asked of `screen.orientation`.
     *
     * A desktop has no orientation to report but can perfectly well be a tall
     * narrow window, and that window is just as unplayable as a phone held
     * upright. The question the game actually has is "is this wider than it is
     * tall", and that is the thing to ask.
     */
    const read = () => setLandscape(window.innerWidth > window.innerHeight);
    read();

    window.addEventListener("resize", read);
    window.addEventListener("orientationchange", read);
    return () => {
      window.removeEventListener("resize", read);
      window.removeEventListener("orientationchange", read);
    };
  }, []);

  return landscape;
}

type Lockable = ScreenOrientation & {
  lock?: (orientation: string) => Promise<void>;
};

/**
 * Ask the device to stay sideways.
 *
 * Best effort, and quite often refused — which is why nothing depends on it.
 * Android Chrome grants it, but only while the page holds the screen, so it is
 * called straight after `enterFullscreen`. Safari on iOS has no such API at
 * all: an iPhone stays sideways because its owner is holding it sideways, and
 * the rotate card is what catches them if they turn it back.
 *
 * Call it inside the gesture that starts the game, for the same reason
 * fullscreen is asked for there — see `app/components/fullscreen.ts`.
 */
export function lockLandscape(): void {
  if (typeof window === "undefined") return;
  const orientation = window.screen?.orientation as Lockable | undefined;
  if (!orientation?.lock) return;
  try {
    orientation.lock("landscape").catch(() => {});
  } catch {
    /* Refused, or unsupported. The card handles it. */
  }
}

/** And let it go again on the way out, so the invitation can be read upright. */
export function unlockLandscape(): void {
  if (typeof window === "undefined") return;
  try {
    window.screen?.orientation?.unlock?.();
  } catch {
    /* Nothing was locked. */
  }
}
