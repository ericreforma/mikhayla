"use client";

import { useCallback, useEffect, useRef } from "react";
import { BACKGROUND_TRACK } from "@/app/config";
import { SILENCE, fadeAudio, stopFade } from "./audio";
import { useMusic } from "./Music";

/**
 * The bed under the whole invitation, from the moment the curtain lifts.
 *
 * `playing` is that moment — it goes true with the castle rather than with
 * the deck, so the music starts as the gate does and carries through the
 * light into her name, one piece across what is meant to read as one
 * continuous opening.
 *
 * The player itself is mounted long before that, on the very first paint,
 * and the difference matters. A browser gates audio on a gesture, and iOS
 * gates it on a gesture *aimed at this element*: an invitation that only
 * creates its player when the curtain lifts can only be unlocked by a touch
 * after that, and the whole minute a guest spends watching the loading bar —
 * which is where they are most likely to tap the screen — is wasted. Mounted
 * from the start, any touch at all counts, and the bed is ready to play the
 * instant it is wanted.
 *
 * It stands down for her months. A princess's song is the thing a guest is
 * supposed to be listening to on those pages, and two tracks at once is
 * noise; `held` in the music context is that conversation, claimed by
 * TimelineMusic while a month with a song is on screen. Leave her year and
 * the floor comes back here.
 *
 * Nothing here draws a control. The one speaker button lives on her year,
 * where the music it governs is most obviously playing, and it governs this
 * too — see `MusicProvider`.
 */

/**
 * Two speeds, because the two directions are not the same gesture.
 *
 * Standing down has to be quick: her song is already coming up underneath
 * and a bed that takes a second and a half to leave is a second and a half
 * of two tracks. Coming back is the opposite — there is nothing to get out
 * of the way of, and a room's sound that arrives suddenly is a room's sound
 * you notice, which is the one thing this should never be.
 */
const FADE_IN_MS = 1400;
const FADE_OUT_MS = 420;

/**
 * Well under the months' 0.55.
 *
 * It has to sit beneath a voice rather than beside one — and it is the
 * thing playing while a guest reads the venue, the date and the dress code,
 * which is to say while they are trying to think.
 */
const VOLUME = 0.28;

export function BackgroundMusic({ playing }: { playing: boolean }) {
  const { wanted, held } = useMusic();
  const ref = useRef<HTMLAudioElement>(null);

  /** Past the curtain, wanted, and nothing louder has the floor. */
  const on = playing && wanted && !held;

  /*
   * Which call to `settle` is the current one.
   *
   * `play()` answers a promise, and the answer can arrive after the question
   * stopped mattering — which is not a hypothetical here. Turning the music
   * back on while standing on one of her months sets it wanted and takes the
   * floor in the same breath, so this runs twice in two frames: once told to
   * play, once told to stand down. Without the stamp the first call's promise
   * lands after the second has already faded the bed out, and fades it
   * straight back up underneath her song.
   */
  const turnRef = useRef(0);

  /**
   * The one place that brings the element into line with what is wanted.
   *
   * A plain function rather than the body of an effect, because the effect is
   * not the only caller: the unlocking touch below has to start the music
   * from inside the gesture handler itself, and an effect scheduled after
   * that touch is, as far as a phone is concerned, the page helping itself to
   * the speakers again.
   */
  const settle = useCallback((want: boolean) => {
    const el = ref.current;
    if (!el) return;
    const turn = (turnRef.current += 1);

    if (!want) {
      /* Nothing to stop if the track was never put on — the element may be
         sitting on the scrap of silence it was unlocked with, or on nothing
         at all. */
      if (el.dataset.track) fadeAudio(el, 0, FADE_OUT_MS, () => el.pause());
      return;
    }

    /*
     * The `src` is set here and nowhere else, which is what keeps a four
     * megabyte download off the critical path while the loading screen is
     * still fetching that very file into the cache. Note it replaces the
     * primer rather than a previous track, so nothing is ever cut off.
     */
    if (el.dataset.track !== BACKGROUND_TRACK) {
      el.dataset.track = BACKGROUND_TRACK;
      el.src = BACKGROUND_TRACK;
    }

    if (el.paused) {
      el.volume = 0;
      void el.play().then(
        () => {
          if (turnRef.current === turn) fadeAudio(el, VOLUME, FADE_IN_MS);
        },
        () => {
          /* Refused, which before a guest has touched anything is simply the
             state of every page on the web. The touch below picks it up. */
        },
      );
    } else {
      fadeAudio(el, VOLUME, FADE_IN_MS);
    }
  }, []);

  useEffect(() => {
    settle(on);
  }, [on, settle]);

  /*
   * The unlocking touch — see SILENCE in `audio.ts` for what it is and why.
   *
   * `onRef` and not `on`, so the listener is attached once, on the first
   * paint, and reads the state at the moment the finger lands rather than the
   * state it was subscribed with. A touch during the loading screen finds the
   * bed not yet wanted and leaves it paused but open; a touch afterwards
   * starts it there and then, inside the gesture, which is the only place a
   * phone will take it.
   */
  const onRef = useRef(on);
  onRef.current = on;

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const prime = () => {
      /* Whatever it is holding, or a scrap of silence if it is holding
         nothing. Either way this is a play() inside a real gesture, which is
         the whole point of it. */
      if (!el.dataset.track) el.src = SILENCE;
      el.volume = 0;
      void el.play().then(
        () => {
          if (onRef.current) settle(true);
          else el.pause();
        },
        () => {},
      );
    };
    const opts = { once: true, capture: true } as const;
    document.addEventListener("pointerdown", prime, opts);
    document.addEventListener("keydown", prime, opts);
    return () => {
      document.removeEventListener("pointerdown", prime, opts);
      document.removeEventListener("keydown", prime, opts);
    };
  }, [settle]);

  /* A ramp left running against a detached element is ours to stop. */
  useEffect(
    () => () => {
      const el = ref.current;
      if (!el) return;
      stopFade(el);
      el.pause();
    },
    [],
  );

  /* No `src` and `preload="none"` in the markup, so a guest who never gets
     past the loading screen fetches no music at all and a browser has
     nothing to autoplay even if it were minded to. */
  return <audio ref={ref} loop preload="none" aria-hidden />;
}
