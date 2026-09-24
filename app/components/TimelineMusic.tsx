"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { SpeakerIcon, SpeakerOffIcon } from "./Ornaments";

/**
 * Her princess's song, one per month, changing as you swipe through her year.
 *
 * Only the timeline has music, so this lives on the rail rather than on the
 * deck: the moment you leave her year for the blessing or the RSVP the song
 * fades out, and nothing plays over a page that isn't hers.
 *
 * Three things make this harder than an `<audio autoplay>`:
 *
 *  - Browsers refuse to start audio a hand didn't ask for, and iOS refuses
 *    until the *first* play() on an element happens inside a real gesture
 *    handler. See PRIMER below.
 *  - Cutting from one song to the next is a lurch. Two players, alternating,
 *    let the outgoing month fade under the incoming one.
 *  - The files are somebody's mobile data. Nothing is fetched until its month
 *    is reached: the element has no `src` until it is asked to play.
 */

/** How long a song takes to give way to the next, in milliseconds. */
const FADE_MS = 550;

/** Loud enough to be there, quiet enough to talk over. */
const VOLUME = 0.55;

/** Remembers a guest who turned the music off, so it stays off. */
const STORAGE_KEY = "mikhayla:music";

/**
 * A tenth of a second of silence, as a data URI.
 *
 * iOS will not let a page start audio on its own. What it actually gates is
 * the first `play()` on each element: do that once from inside a genuine
 * gesture handler and the element stays unlocked for the rest of the visit,
 * whatever you point it at afterwards. So on the first touch anywhere on the
 * invitation — the swipe that opens her year, most likely — both players are
 * handed this and told to play. Nobody hears anything, and by the time a song
 * is wanted the players will take it.
 *
 * It is a data URI rather than a file because it has to be instant: a fetch
 * that lands after the gesture has passed is a fetch that unlocks nothing.
 */
const PRIMER =
  "data:audio/wav;base64,UklGRmQAAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YUAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA";

/*
 * Volume ramps, one per player, cancelled by whatever starts the next.
 *
 * A WeakMap rather than state: these run every frame and nothing renders off
 * them, so putting them through React would be sixty renders a second to
 * animate a number the DOM already owns.
 */
const ramps = new WeakMap<HTMLAudioElement, number>();

function fadeTo(el: HTMLAudioElement, target: number, ms: number, done?: () => void) {
  const running = ramps.get(el);
  if (running) cancelAnimationFrame(running);
  const from = el.volume;
  const started = performance.now();
  const step = (now: number) => {
    const k = ms <= 0 ? 1 : Math.min(1, (now - started) / ms);
    el.volume = Math.min(1, Math.max(0, from + (target - from) * k));
    if (k < 1) {
      ramps.set(el, requestAnimationFrame(step));
    } else {
      ramps.delete(el);
      done?.();
    }
  };
  ramps.set(el, requestAnimationFrame(step));
}

/**
 * @param track The song for the month on screen, or nothing at all — the
 *   title page, or her year being off screen entirely.
 */
export function TimelineMusic({ track }: { track?: string }) {
  /*
   * Whether the guest wants music, which is not the same as whether any is
   * playing. It starts as yes and is overridden from storage in an effect
   * rather than read during render: a value read from localStorage while
   * rendering is a value the server could not have known, and the first paint
   * would not match the markup it hydrates.
   */
  const [wanted, setWanted] = useState(true);

  /* The browser refused to start it. Not an error — it is the default state
     of any page nobody has touched yet — but the button says "off" while it
     holds, so a tap is understood to be what turns the music on. */
  const [blocked, setBlocked] = useState(false);

  const oneRef = useRef<HTMLAudioElement>(null);
  const twoRef = useRef<HTMLAudioElement>(null);
  /** Which of the two is holding the song right now. */
  const liveRef = useRef<0 | 1>(0);

  useEffect(() => {
    try {
      if (window.localStorage.getItem(STORAGE_KEY) === "off") setWanted(false);
    } catch {
      /* Private mode, or storage turned off. The default stands. */
    }
  }, []);

  /* The unlocking touch — see PRIMER. Once only, and it listens on the way
     down so it runs before the swipe it belongs to has finished. */
  useEffect(() => {
    const prime = () => {
      for (const el of [oneRef.current, twoRef.current]) {
        if (!el || el.src) continue; // already carrying a song; leave it be
        el.src = PRIMER;
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
    const live = (liveRef.current === 0 ? oneRef : twoRef).current;
    const idle = (liveRef.current === 0 ? twoRef : oneRef).current;
    if (!live || !idle) return;

    // Off her year, or the guest has asked for quiet.
    if (!song || !want) {
      fadeTo(live, 0, FADE_MS, () => live.pause());
      return;
    }

    // Already her song — she has come back to this month, or the music was
    // just turned on again. Pick it up where it stands.
    if (live.dataset.track === song) {
      if (live.paused) {
        void live.play().then(
          () => setBlocked(false),
          () => setBlocked(true),
        );
      }
      fadeTo(live, VOLUME, FADE_MS);
      return;
    }

    fadeTo(live, 0, FADE_MS, () => live.pause());

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
        setBlocked(false);
        fadeTo(idle, VOLUME, FADE_MS);
      },
      () => setBlocked(true),
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
        const running = ramps.get(el);
        if (running) cancelAnimationFrame(running);
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
    setWanted(next);
    /* A tap is the gesture the browser was holding out for. */
    if (next) setBlocked(false);
    try {
      window.localStorage.setItem(STORAGE_KEY, next ? "on" : "off");
    } catch {
      /* Nothing to remember it with. It still works for this visit. */
    }
    /* Played from inside the tap, not from the effect that follows it: on a
       phone, only the first of those two counts as being asked. */
    apply(track, next);
  }, [apply, on, track]);

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
