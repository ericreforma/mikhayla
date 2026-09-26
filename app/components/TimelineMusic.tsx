"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { SILENCE, fadeAudio, stopFade } from "./audio";
import { useMusic, useMusicFloor } from "./Music";
import { SpeakerIcon, SpeakerOffIcon } from "./Ornaments";

/**
 * Her princess's song, one per month, changing as you swipe through her year.
 *
 * It lives on the rail rather than on the deck, because the songs do: the
 * moment you leave her year for the blessing or the RSVP the song fades out,
 * and the bed underneath the invitation — which stood down for it — comes
 * back up. Claiming the floor while a month is on screen is the whole of
 * that arrangement; see `Music.tsx`.
 *
 * The speaker button here is the invitation's only music control, and it
 * governs both players rather than just this one. Which is why the
 * preference behind it lives in the music context and not in this file.
 *
 * Three things make this harder than an `<audio autoplay>`:
 *
 *  - Browsers refuse to start audio a hand didn't ask for, and iOS refuses
 *    until the *first* play() on an element happens inside a real gesture
 *    handler. See SILENCE in `audio.ts`.
 *  - Cutting from one song to the next is a lurch. Two players, alternating,
 *    let the outgoing month fade under the incoming one.
 *  - The files are somebody's mobile data. Nothing is fetched until its month
 *    is reached: the element has no `src` until it is asked to play.
 */

/** How long a song takes to give way to the next, in milliseconds. */
const FADE_MS = 550;

/** Loud enough to be there, quiet enough to talk over. */
const VOLUME = 0.55;

/**
 * @param track The song for the month on screen, or nothing at all — the
 *   title page, or her year being off screen entirely.
 */
export function TimelineMusic({ track }: { track?: string }) {
  /*
   * Whether the guest wants music, which is not the same as whether any is
   * playing — and shared with the bed, so one button answers for both.
   */
  const { wanted, setWanted } = useMusic();

  /* The browser refused to start it. Not an error — it is the default state
     of any page nobody has touched yet — but the button says "off" while it
     holds, so a tap is understood to be what turns the music on. */
  const [blocked, setBlocked] = useState(false);

  const oneRef = useRef<HTMLAudioElement>(null);
  const twoRef = useRef<HTMLAudioElement>(null);
  /** Which of the two is holding the song right now. */
  const liveRef = useRef<0 | 1>(0);

  /*
   * Which call to `apply` is the current one.
   *
   * `play()` answers a promise, and the answer can arrive after the question
   * stopped mattering — a guest who lands on a month and swipes straight on
   * asks for two contradictory things inside a few milliseconds. The later
   * call fades the song away; the earlier call's promise then resolves and
   * fades it back up, over a page that isn't hers and over the bed that had
   * just been given the floor back. Stamping each call and checking the
   * stamp on the way out is the whole guard.
   */
  const turnRef = useRef(0);

  /*
   * Stand the bed down while a month with a song is on screen.
   *
   * `track` is already exactly that question — the rail hands over nothing
   * at all for the title page or for her year being off screen — so the
   * floor is claimed and released by the same fact that starts and stops the
   * song. `blocked` is deliberately not in here: a browser that has refused
   * this player has refused the bed too, and a floor held by silence would
   * simply mean no music anywhere.
   */
  useMusicFloor(Boolean(track) && wanted);

  /* The unlocking touch — see SILENCE. Once only, and it listens on the way
     down so it runs before the swipe it belongs to has finished. */
  useEffect(() => {
    const prime = () => {
      for (const el of [oneRef.current, twoRef.current]) {
        if (!el || el.src) continue; // already carrying a song; leave it be
        el.src = SILENCE;
        el.volume = 0;
        void el.play().then(
          () => el.pause(),
          () => {},
        );
      }
    };
    const opts = { once: true, capture: true } as const;
    document.addEventListener("pointerdown", prime, opts);
    document.addEventListener("keydown", prime, opts);
    return () => {
      document.removeEventListener("pointerdown", prime, opts);
      document.removeEventListener("keydown", prime, opts);
    };
  }, []);

  /*
   * Bring the two players into line with what should be playing: the outgoing
   * month fades away while the new one fades up underneath it.
   *
   * A plain function rather than the body of the effect, because the effect
   * is not the only caller. Turning the music on by hand has to play from
   * inside the tap itself — see `toggle` — and an effect scheduled after that
   * tap is, as far as a phone is concerned, the page helping itself to the
   * speakers again.
   *
   * Calling it twice for the same month is harmless: the second call finds
   * the song already live and only tops up the volume.
   */
  const apply = useCallback((song: string | undefined, want: boolean) => {
    const turn = (turnRef.current += 1);
    const current = () => turnRef.current === turn;
    const live = (liveRef.current === 0 ? oneRef : twoRef).current;
    const idle = (liveRef.current === 0 ? twoRef : oneRef).current;
    if (!live || !idle) return;

    // Off her year, or the guest has asked for quiet.
    if (!song || !want) {
      fadeAudio(live, 0, FADE_MS, () => live.pause());
      return;
    }

    // Already her song — she has come back to this month, or the music was
    // just turned on again. Pick it up where it stands.
    if (live.dataset.track === song) {
      if (live.paused) {
        void live.play().then(
          () => current() && setBlocked(false),
          () => current() && setBlocked(true),
        );
      }
      fadeAudio(live, VOLUME, FADE_MS);
      return;
    }

    fadeAudio(live, 0, FADE_MS, () => live.pause());

    /*
     * The `src` is set here and nowhere else, which is what keeps the download
     * to the months actually visited. Note it replaces the silent primer
     * rather than a previous song: the players alternate, so the one being
     * loaded has been quiet for a month already and nothing is cut off.
     */
    idle.dataset.track = song;
    idle.src = song;
    idle.volume = 0;
    liveRef.current = liveRef.current === 0 ? 1 : 0;
    void idle.play().then(
      () => {
        if (!current()) return;
        setBlocked(false);
        fadeAudio(idle, VOLUME, FADE_MS);
      },
      () => current() && setBlocked(true),
    );
  }, []);

  /*
   * `blocked` is in here as well as the month and the preference, so that
   * clearing a refusal is itself a reason to try again.
   */
  useEffect(() => {
    apply(track, wanted);
  }, [apply, track, wanted, blocked]);

  /* Nothing should outlive the page — a song still playing into a closed tab
     is a browser's problem, but a ramp still running is ours. */
  useEffect(
    () => () => {
      for (const el of [oneRef.current, twoRef.current]) {
        if (!el) continue;
        stopFade(el);
        el.pause();
      }
    },
    [],
  );

  /** On as far as the guest is concerned: they want it and it is allowed. */
  const on = wanted && !blocked;

  /*
   * What the button does has to be the opposite of what the button *shows*,
   * which is `on` — not `wanted`.
   *
   * The two come apart in exactly the case that matters. A browser that
   * refused to start the music leaves `wanted` true and `blocked` true, so
   * the guest is looking at a speaker with a line through it while the
   * preference underneath still says yes; toggling that preference would turn
   * a silent page into a silent page, and the one control that promises
   * music would be the one thing that can't produce any.
   */
  const toggle = useCallback(() => {
    const next = !on;
    /* Remembered by the provider, and read by the bed as well as by this. */
    setWanted(next);
    /* A tap is the gesture the browser was holding out for. */
    if (next) setBlocked(false);
    /* Played from inside the tap, not from the effect that follows it: on a
       phone, only the first of those two counts as being asked. */
    apply(track, next);
  }, [apply, on, setWanted, track]);

  return (
    <>
      {/*
        Both players are muted in the markup and `preload="none"`, so a page
        that is never swiped into her year fetches no audio at all and a
        browser has nothing to autoplay even if it were minded to.
      */}
      <audio ref={oneRef} loop preload="none" aria-hidden />
      <audio ref={twoRef} loop preload="none" aria-hidden />

      {/*
        The control sits in the corner of the photograph rather than in the
        bottom bar: the bar belongs to the whole invitation, and this only
        governs her year. Same parchment disc as the rail's arrows, so the two
        read as the same set of controls over the same picture.
      */}
      <button
        type="button"
        onClick={toggle}
        aria-pressed={on}
        aria-label={on ? "Turn the music off" : "Play the music"}
        className="absolute left-1.5 top-3 z-30 flex h-9 w-9 items-center justify-center rounded-full border border-gold/40 bg-parchment/80 text-ink/60 shadow-sm backdrop-blur transition hover:bg-parchment hover:text-ink active:scale-95 sm:left-3 sm:top-4 sm:h-11 sm:w-11 md:left-5"
      >
        {on ? <SpeakerIcon className="h-5 w-5" /> : <SpeakerOffIcon className="h-5 w-5" />}
      </button>
    </>
  );
}
