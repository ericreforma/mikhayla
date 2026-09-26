/**
 * The bits both of the invitation's players share: a scrap of silence to
 * unlock them with, and the volume ramps that move them.
 *
 * ---------------------------------------------------------------------------
 * The ramps
 * ---------------------------------------------------------------------------
 * Volume ramps for the invitation's two players — her months, and the bed
 * underneath them.
 *
 * Nothing here goes through React, and that is the point: a ramp writes a
 * number sixty times a second, and putting it through state would re-render
 * a screenful of photographs to move a value the DOM already owns.
 *
 * The running ramps are kept in a WeakMap keyed by the element for the same
 * reason. One element can only be fading one way at a time, so starting a
 * ramp cancels whatever that element was already doing — which is what lets
 * a song that is on its way out be caught and brought back up without the
 * two ramps fighting over the volume every frame.
 */

const ramps = new WeakMap<HTMLAudioElement, number>();

/**
 * Take `el` to `target` over `ms`, then call `done`.
 *
 * `done` fires only when the ramp finishes, never when it is cancelled —
 * which is why a fade-out can safely pause the element in its callback: if
 * something brought the volume back up half-way down, the pause that was
 * scheduled for the bottom never happens.
 */
export function fadeAudio(
  el: HTMLAudioElement,
  target: number,
  ms: number,
  done?: () => void,
): void {
  stopFade(el);
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
 * Stops a ramp dead, leaving the volume wherever it had got to.
 *
 * For teardown. A song still playing into a closed tab is the browser's
 * problem; a ramp still running against a detached element is ours.
 */
export function stopFade(el: HTMLAudioElement): void {
  const running = ramps.get(el);
  if (running) cancelAnimationFrame(running);
  ramps.delete(el);
}

/**
 * A tenth of a second of silence, as a data URI.
 *
 * No browser will let a page start audio a hand did not ask for, and iOS is
 * stricter than the rest: what it gates is the first `play()` on each
 * *element*, so a page-wide gesture somewhere else does not help. Do that one
 * play inside a genuine gesture handler, though, and the element stays
 * unlocked for the rest of the visit whatever you point it at afterwards.
 *
 * So on the first touch anywhere on the invitation, every player that has
 * nothing to play yet is handed this and told to play. Nobody hears anything,
 * and by the time a song or the bed is wanted the players will take it.
 *
 * A data URI rather than a file because it has to be instant: a fetch that
 * lands after the gesture has passed is a fetch that unlocks nothing.
 */
export const SILENCE =
  "data:audio/wav;base64,UklGRmQAAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YUAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA";
