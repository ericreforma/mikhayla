"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

/**
 * What the invitation sounds like, as the two things both players need to
 * agree on.
 *
 * There are two of them now — the bed that plays under the whole
 * invitation, and her princess's song on a month's page — and they are
 * mounted in different places, so the things they have to share cannot live
 * in either one:
 *
 *  - **the preference.** One speaker button, one promise. A guest who turns
 *    the music off on her year and then swipes to the RSVP should not be met
 *    by music starting up again, so the toggle governs both players and is
 *    remembered here rather than inside the one that happens to draw the
 *    button.
 *  - **the floor.** Two tracks at once is noise. A month's song takes the
 *    floor while it is on screen and the bed stands down; leave her year and
 *    the floor is given back. `useMusicFloor` is the whole of that
 *    conversation.
 *
 * Whether a player is actually *allowed* to make a sound is not in here, on
 * purpose. Browsers gate audio per element, so each player is refused — and
 * unlocked — on its own, and there is nothing useful to share.
 */

/** Remembers a guest who turned the music off, so it stays off. */
const STORAGE_KEY = "mikhayla:music";

type Music = {
  /** Whether the guest wants music at all. Both players read this. */
  wanted: boolean;
  /** Sets it, and remembers it. */
  setWanted: (want: boolean) => void;
  /** True while a song has the floor and the bed should stand down. */
  held: boolean;
  /** Claims or releases the floor. Use `useMusicFloor` rather than this. */
  setHeld: (held: boolean) => void;
};

const MusicContext = createContext<Music | null>(null);

export function MusicProvider({ children }: { children: ReactNode }) {
  const [wanted, setWantedState] = useState(true);
  const [held, setHeld] = useState(false);

  /*
   * Read in an effect rather than during render: a value out of localStorage
   * is a value the server could not have known, and a first paint that
   * disagrees with the markup it hydrates is a warning and a flicker.
   */
  useEffect(() => {
    try {
      if (window.localStorage.getItem(STORAGE_KEY) === "off") setWantedState(false);
    } catch {
      /* Private mode, or storage turned off. The default stands. */
    }
  }, []);

  const setWanted = useCallback((want: boolean) => {
    setWantedState(want);
    try {
      window.localStorage.setItem(STORAGE_KEY, want ? "on" : "off");
    } catch {
      /* Nothing to remember it with. It still works for this visit. */
    }
  }, []);

  const value = useMemo(
    () => ({ wanted, setWanted, held, setHeld }),
    [wanted, setWanted, held],
  );

  return <MusicContext.Provider value={value}>{children}</MusicContext.Provider>;
}

export function useMusic(): Music {
  const ctx = useContext(MusicContext);
  /* Loud on purpose. The quiet alternative — a default object of no-ops —
     would leave a misplaced player working perfectly except that its mute
     button forgets and its song plays over the bed. */
  if (!ctx) throw new Error("useMusic must be used inside <MusicProvider>");
  return ctx;
}

/**
 * Hold the floor while `taken`, and give it back when it isn't — or when the
 * component holding it goes away.
 *
 * The release on unmount is the part worth having: a player torn down
 * mid-song would otherwise leave the bed standing down for a track nothing
 * is playing any more, and the invitation would go quiet for good.
 */
export function useMusicFloor(taken: boolean): void {
  const { setHeld } = useMusic();
  useEffect(() => {
    setHeld(taken);
    return () => setHeld(false);
  }, [taken, setHeld]);
}
