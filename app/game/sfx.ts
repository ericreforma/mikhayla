"use client";

/**
 * The game's noises.
 *
 * ---------------------------------------------------------------------------
 * Two players, on purpose
 * ---------------------------------------------------------------------------
 * The short effects go through the Web Audio API: decoded once into a buffer
 * and fired from it as often as needed. A footstep lands five times a second
 * at full speed, and an `<audio>` element cannot do that — one element can
 * only be at one position at a time, so the second step cuts the first off,
 * and cloning an element per step allocates a decoder per step. A decoded
 * buffer has neither problem and the latency is a frame rather than tens of
 * milliseconds, which for a sound tied to a footfall is the whole difference
 * between a step and a stumble.
 *
 * The menu loop stays an ordinary `<audio>` element. It is 42 seconds long and
 * 386KB, and Web Audio would have to have all 386KB of it in hand and decoded
 * — 7MB of float samples — before it could play a note of it, where an element
 * starts on the first buffer that lands. It is also the one sound here that
 * nothing is timed against, so the latency the buffers are for buys nothing.
 *
 * ---------------------------------------------------------------------------
 * Everything here fails silently
 * ---------------------------------------------------------------------------
 * Literally. There is no state in this file that anything else reads, no
 * promise anybody awaits, and every entry point returns `void` — so a browser
 * that refuses to make a sound, a file that 404s, and a guest who has the
 * ringer off all produce the same outcome: a game that plays perfectly and
 * says nothing. Sound is the one part of this that must never be able to break
 * the rest.
 */

import { GAME_SFX } from "@/app/config";
import { SILENCE, fadeAudio, stopFade } from "@/app/components/audio";

export type Sfx =
  | "button"
  | "jump"
  | "hurt"
  | "gameover"
  | "winner-self"
  | "winner-all"
  | "step-grass"
  | "step-rain"
  | "step-snow";

/**
 * How loud each is against the others.
 *
 * The steps are the quiet ones and have to be: they are the only sound that
 * repeats, five times a second, for as long as the run lasts. At the volume
 * that suits a single footfall in isolation they become the loudest thing in
 * the game by a distance.
 */
const LEVEL: Record<Sfx, number> = {
  button: 0.55,
  jump: 0.5,
  hurt: 0.7,
  gameover: 0.8,
  "winner-self": 0.85,
  "winner-all": 0.9,
  "step-grass": 0.22,
  "step-rain": 0.22,
  "step-snow": 0.22,
};

const ALL = Object.keys(LEVEL) as Sfx[];

/** The invitation's own music switch. Turning it off there silences this too. */
const MUSIC_KEY = "mikhayla:music";

function wanted(): boolean {
  try {
    return window.localStorage.getItem(MUSIC_KEY) !== "off";
  } catch {
    return true;
  }
}

let ctx: AudioContext | null = null;
let master: GainNode | null = null;
const buffers = new Map<Sfx, AudioBuffer>();

/**
 * Open the audio device, which a browser only allows inside a gesture.
 *
 * Safe to call as often as you like — the second call onwards is a resume on a
 * context that is already running, which costs nothing.
 */
function open(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (ctx) {
    if (ctx.state === "suspended") void ctx.resume();
    return ctx;
  }
  const Ctor =
    window.AudioContext ??
    (window as unknown as { webkitAudioContext?: typeof AudioContext })
      .webkitAudioContext;
  if (!Ctor) return null;

  try {
    ctx = new Ctor();
    master = ctx.createGain();
    master.gain.value = 1;
    master.connect(ctx.destination);
    return ctx;
  } catch {
    return null;
  }
}

/** Fetch and decode one effect, once. */
async function load(name: Sfx): Promise<void> {
  if (buffers.has(name)) return;
  const at = open();
  if (!at) return;
  try {
    const res = await fetch(`${GAME_SFX}/${name}.m4a`);
    const bytes = await res.arrayBuffer();
    buffers.set(name, await at.decodeAudioData(bytes));
  } catch {
    /* No sound for this one, for the rest of the session. */
  }
}

/**
 * Fire one effect.
 *
 * Nothing is queued and nothing waits: if the buffer has not arrived yet the
 * call is simply dropped. The alternative — holding the sound until it loads —
 * plays a footstep for a step that happened half a second ago, which is worse
 * than silence.
 */
export function play(name: Sfx, gain = 1): void {
  if (!wanted()) return;
  const at = ctx;
  const buffer = buffers.get(name);
  if (!at || !master || !buffer || at.state !== "running") return;

  try {
    const source = at.createBufferSource();
    source.buffer = buffer;
    const level = at.createGain();
    level.gain.value = LEVEL[name] * gain;
    source.connect(level).connect(master);
    source.start();
  } catch {
    /* A device that went away mid-run. */
  }
}

/* ---------------------------------------------------------------
   The menu loop
   --------------------------------------------------------------- */

let menu: HTMLAudioElement | null = null;

/** Whether the menu is meant to be sounding, as opposed to whether it is. */
let menuOn = false;

/** A pending "try again when a hand moves", if the first attempt was blocked. */
let retry: (() => void) | null = null;

/**
 * Start the menu music, fading up from nothing.
 *
 * Called when the card goes up and not before: 386KB is most of the game's
 * audio budget, and a guest who never opens the game should not have paid for
 * it.
 *
 * ---------------------------------------------------------------------------
 * Optimistic, with a fallback
 * ---------------------------------------------------------------------------
 * This tries to play *immediately*, without waiting for anybody to touch
 * anything, because by the time this card exists they almost always have: the
 * way in is two taps on a balloon, and `router.push` keeps the same document,
 * so the browser already counts this page as interacted with. Waiting for a
 * fresh gesture meant the title card sat in silence until the player prodded
 * something, which is the one moment the music is actually for.
 *
 * The exception is a guest who lands on `/mikhayla/escaped` cold — a bookmark, a
 * reload, a shared link — where there has been no gesture and `play()` is
 * refused. That is what `retry` is for: the rejection arms a one-shot listener
 * and the music starts on their first touch instead. Both paths end in music;
 * only the timing differs.
 */
export function startMenu(volume = 0.45): void {
  if (typeof window === "undefined") return;
  menuOn = true;
  if (!wanted()) return;

  if (!menu) {
    menu = new Audio(`${GAME_SFX}/main-menu.m4a`);
    menu.loop = true;
    menu.preload = "auto";
  }
  const el = menu;

  stopFade(el);
  el.volume = 0;

  /*
   * The fade runs alongside `play()` rather than off the back of it.
   *
   * `play()` returns a promise that resolves when sound actually begins, and
   * on a device that cannot produce any it neither resolves nor rejects — it
   * simply never settles. Hanging the fade on it therefore has one failure
   * mode where the music plays at volume zero for ever, which is the one
   * outcome worse than not playing at all. Ramping regardless costs nothing:
   * a muted element that never starts is silent either way.
   */
  el.play()?.catch(() => {
    /* Refused for want of a gesture. Wait for one, unless the card has been
       closed in the meantime — a player who pressed play before the music
       ever started should not have it begin underneath the run. */
    if (menuOn) armRetry(volume);
  });
  fadeAudio(el, volume, 600);
}

function armRetry(volume: number): void {
  clearRetry();
  const again = () => {
    clearRetry();
    if (menuOn) startMenu(volume);
  };
  const events: (keyof WindowEventMap)[] = ["pointerdown", "keydown", "touchstart"];
  for (const type of events) window.addEventListener(type, again, { once: true });
  retry = () => {
    for (const type of events) window.removeEventListener(type, again);
  };
}

function clearRetry(): void {
  retry?.();
  retry = null;
}

/**
 * Stop it, fading down — a loop cut dead mid-bar is worse than no loop.
 *
 * The timer is not redundant. `fadeAudio` ramps on `requestAnimationFrame`,
 * and a browser stops delivering those to a tab that is not on screen — so the
 * callback that actually pauses can simply never arrive, and the music plays
 * on. That is not hypothetical: leaving the game means a navigation, and a
 * navigation is exactly when rAF stops. A timer still fires when rAF does not,
 * so the fade handles the sound and this handles the silence.
 */
export function stopMenu(): void {
  menuOn = false;
  clearRetry();
  const el = menu;
  if (!el || el.paused) return;

  fadeAudio(el, 0, 450, () => el.pause());
  window.setTimeout(() => {
    if (menuOn) return; // started again while it was on its way down
    stopFade(el);
    el.volume = 0;
    el.pause();
  }, 520);
}

/* ---------------------------------------------------------------
   The weather beds
   --------------------------------------------------------------- */

const BEDS = ["raining", "snowing"] as const;
export type Bed = (typeof BEDS)[number];

/** Loud enough to be weather, quiet enough to run over. */
const BED_LEVEL = 0.45;

const beds = new Map<Bed, HTMLAudioElement>();
const pointed = new Set<Bed>();

/**
 * Hold the two weather beds at the level the sky is at.
 *
 * Called every frame with the engine's own eased `rain` and `snow`, which
 * means the sound crossfades on exactly the curve the picture does, over the
 * same eight seconds, with nothing here needing to know when the weather turns
 * or how long it takes.
 *
 * ---------------------------------------------------------------------------
 * Why they are not fetched until it rains
 * ---------------------------------------------------------------------------
 * Between them they are 424KB — nearly half the game's audio — and the weather
 * does not turn until 1500 points, which is two and a half minutes of running
 * without losing all three lives. Most guests at this party will never hear
 * either, and making all of them download both would be the single most
 * wasteful thing in the project.
 *
 * So the elements exist from the first gesture but point at nothing until the
 * weather actually starts coming in, at which moment there is an eight-second
 * ramp to arrive over — ample for 212KB, and if it is not, the bed fades in
 * late, which is the one failure here that nobody can even notice.
 */
export function weather(rain: number, snow: number): void {
  const on = wanted();
  level("raining", on ? rain : 0);
  level("snowing", on ? snow : 0);
}

function level(name: Bed, amount: number): void {
  const el = beds.get(name);
  if (!el) return;

  if (amount <= 0.01) {
    if (pointed.has(name) && !el.paused) el.pause();
    return;
  }

  if (!pointed.has(name)) {
    pointed.add(name);
    el.src = `${GAME_SFX}/${name}.m4a`;
    el.loop = true;
    el.load();
  }

  el.volume = Math.min(1, amount * BED_LEVEL);
  if (el.paused) el.play()?.catch(() => {});
}

/* ---------------------------------------------------------------
   Waking the whole thing up
   --------------------------------------------------------------- */

let armed = false;

/**
 * Open the audio device and fetch every effect — now if the browser allows it,
 * and on the first touch if it does not.
 *
 * **Usually now.** The way into the game is two taps on a balloon followed by
 * a `router.push`, which keeps the same document — so by the time this runs the
 * page has been interacted with and a new `AudioContext` comes up `running`
 * rather than `suspended`. Only a guest who lands here cold — a bookmark, a
 * reload, a shared link — has to wait for a hand.
 *
 * All nine effects are fetched at once rather than on first use, because the
 * first use of a footstep sound *is* a footstep, and a sound that arrives after
 * the step it belongs to is not worth having. They come to 150KB between them,
 * two thirds of which is the three endings — none of which can be needed for a
 * good fifteen seconds.
 *
 * The gesture listeners are registered either way, and `once`, so this costs
 * one event and then nothing. They are what unlocks the two weather beds, and
 * that genuinely cannot be done early: see below.
 */
export function arm(onWake?: () => void): () => void {
  if (typeof window === "undefined") return () => {};

  const wake = () => {
    if (armed) return;
    armed = true;
    if (open()) void Promise.all(ALL.map(load));

    onWake?.();
  };

  /*
   * Unlock the two weather beds, on a scrap of silence, inside the gesture.
   *
   * This is the one thing here that cannot be done early, and it is why the
   * listeners are registered even when the device is already open: what iOS
   * gates is the first `play()` on each *element*, so a gesture that has
   * already been and gone does not help an element created afterwards. Play
   * the silence from inside a live handler and the element stays unlocked for
   * the rest of the visit whatever it is pointed at later — the same bargain
   * `SILENCE` makes for the invitation's own players, and the reason it is a
   * data URI rather than a file it would have to go and fetch.
   *
   * `loop` stays off until there is something worth looping, or these would
   * sit here playing a tenth of a second of nothing for ever.
   */
  const unlockBeds = () => {
    for (const name of BEDS) {
      if (beds.has(name)) continue;
      const el = new Audio();
      el.preload = "none";
      el.volume = 0;
      el.src = SILENCE;
      el.play()?.catch(() => {});
      beds.set(name, el);
    }
  };

  const onGesture = () => {
    unlockBeds();
    wake();
  };

  const events: (keyof WindowEventMap)[] = ["pointerdown", "keydown", "touchstart"];
  for (const type of events) window.addEventListener(type, onGesture, { once: true });

  /* Already allowed? Then do everything but the beds right now, rather than
     holding the whole game's sound back for a touch that may not come for
     another ten seconds. */
  if (open()?.state === "running") wake();

  return () => {
    for (const type of events) window.removeEventListener(type, onGesture);
  };
}
