"use client";

import { useCallback, useEffect, useRef, useState, type CSSProperties } from "react";
import { BABY_FULL_NAME } from "@/app/config";
import { Hint } from "./Hint";
import { Crown, Sparkle } from "./Ornaments";
import { PRELOAD_ASSETS } from "./preloadManifest";
import { useAssetPreload } from "./useAssetPreload";

/**
 * What the castle is busy with, by how far along the download is.
 *
 * The thresholds are not decoration — they are roughly where each group of
 * files actually falls in the manifest's order, so the line on screen is
 * describing the thing being fetched underneath it. Her gowns really are
 * arriving at 6%, and the orchestra really is tuning from about two-thirds,
 * which is where the music starts. Re-order `preloadManifest` and these want
 * moving with it.
 *
 * Kept to about twenty characters each: they sit beside the percentage on a
 * 360px phone, and a line that wraps there undoes the whole composition.
 */
const STAGES = [
  { from: 0, line: "Lighting the candles" },
  { from: 0.06, line: "Pressing her gowns" },
  { from: 0.3, line: "Hanging her portraits" },
  { from: 0.55, line: "Setting the ballroom" },
  { from: 0.64, line: "Tuning the orchestra" },
  { from: 0.93, line: "Rolling out the carpet" },
  { from: 1, line: "The ball is ready" },
] as const;

function stageAt(ratio: number) {
  let at = 0;
  for (let i = 0; i < STAGES.length; i += 1) {
    if (ratio >= STAGES[i].from) at = i;
  }
  return at;
}

/**
 * The shortest the curtain is ever up.
 *
 * A guest coming back to the invitation has every file in cache, so the bar
 * would otherwise flash from nothing to gone in about a tenth of a second —
 * which doesn't read as "fast", it reads as a glitch. Held for this long it
 * reads as an opening.
 */
const MIN_MS = 850;

/** How long the curtain takes to dissolve. Matches `duration-700` below. */
const FADE_MS = 700;

/**
 * The curtain over the invitation: her photographs and her twelve songs,
 * fetched before a guest is let in, with the percentage and the bar that the
 * waiting is spent watching.
 *
 * It shares the `royal-dawn` ground of both screens either side of it, and
 * the hero's own three opening elements — crown, "By royal invitation", her
 * name — in that order, on purpose. Nothing here cuts to anything: the
 * curtain dissolves onto the castle standing on the same dawn, and the
 * castle's light later dissolves onto the hero, so a guest sees one place
 * changing rather than three pages being swapped.
 *
 * The curtain does not lift on its own. It waits to be knocked on: see
 * `knock` below for why one deliberate tap is worth asking for, and what
 * the whole opening gets in exchange.
 *
 * `onReady` fires the moment the castle should mount, which is a beat
 * *before* the curtain starts to lift — see the reveal below for why that
 * order matters.
 */
export function LoadingScreen({ onReady }: { onReady: () => void }) {
  const { ratioRef, done } = useAssetPreload(PRELOAD_ASSETS);

  const rootRef = useRef<HTMLDivElement>(null);
  const barRef = useRef<HTMLDivElement>(null);
  const pctRef = useRef<HTMLSpanElement>(null);

  const [stage, setStage] = useState(0);
  const [waited, setWaited] = useState(false);
  /** The guest has knocked. Nothing opens until they do — see `knock`. */
  const [entered, setEntered] = useState(false);

  /**
   * `loading` → `revealing` (the deck mounts behind us) → `leaving` (we
   * dissolve) → `gone` (we unmount).
   */
  const [phase, setPhase] = useState<"loading" | "revealing" | "leaving" | "gone">("loading");

  /*
   * Stops the animation loop below for good.
   *
   * A ref and not `phase`, for two reasons. Reaching `gone` renders nothing
   * but does not unmount this component — the page holds it — so no effect
   * cleanup ever fires on its own, and a loop left running would go on
   * writing to a detached element sixty times a second for as long as the
   * invitation is open. And putting `phase` in the loop's dependencies would
   * tear the loop down and rebuild it on every step of the reveal, losing the
   * eased position each time.
   */
  const stopped = useRef(false);

  useEffect(() => {
    const min = window.setTimeout(() => setWaited(true), MIN_MS);
    return () => window.clearTimeout(min);
  }, []);

  /*
   * The bar, the crown's gilding, the sparkle on the leading edge and the
   * number are all driven from one custom property written straight onto the
   * root each frame — see `--p` in globals.css. Nothing here goes through
   * React, for the same reason the volume ramps in TimelineMusic don't: this
   * runs sixty times a second and React would be re-rendering the whole
   * screen to move a width the DOM already owns.
   *
   * The shown value eases toward the real one and never retreats — bytes
   * arrive in bursts, so the raw figure lurches, and a bar that goes
   * backwards is a bar nobody trusts.
   */
  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    let raf = 0;
    let shown = 0;
    let lastPct = -1;
    let lastStage = -1;

    const tick = () => {
      if (stopped.current) return;

      /*
       * `Math.max` is the ratchet, and it is doing real work rather than
       * guarding against nothing: the underlying figure genuinely can step
       * backwards for a frame, when a file's `Content-Length` turns out
       * larger than its estimate and the total everything is measured
       * against grows underneath it.
       */
      const target = Math.max(shown, ratioRef.current);
      shown += (target - shown) * 0.12;
      if (target - shown < 0.0015) shown = target;
      root.style.setProperty("--p", shown.toFixed(4));

      /* Floored, not rounded: 100 is a promise, and it should only appear
         when the last byte is actually in. */
      const pct = Math.floor(shown * 100);
      if (pct !== lastPct) {
        lastPct = pct;
        if (pctRef.current) pctRef.current.textContent = String(pct);
        barRef.current?.setAttribute("aria-valuenow", String(pct));
      }

      const next = stageAt(shown);
      if (next !== lastStage) {
        lastStage = next;
        setStage(next);
      }

      raf = requestAnimationFrame(tick);
    };

    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [ratioRef]);

  /** Everything is in the cache and the curtain has been up long enough. */
  const ready = done && waited;

  /*
   * The knock, and why the door is not simply opened.
   *
   * No browser will start audio a hand did not ask for, and this screen is
   * the last place on the invitation where a hand can be asked. Opened on a
   * timer, the curtain dissolves into the castle, the castle into her name,
   * and none of it makes a sound until a guest happens to touch something —
   * which on a laptop, where a wheel is not a gesture as far as the audio
   * gate is concerned, can be several screens later or never.
   *
   * So the last beat of the wait is a tap. It costs one deliberate gesture
   * and buys the whole opening its music, which is a good trade: knocking at
   * a castle gate is not the worst thing to ask of somebody either.
   *
   * It is the same gesture that unlocks the players — see BackgroundMusic —
   * so nothing here has to know about the music at all.
   */
  const knock = useCallback(() => setEntered(true), []);

  /*
   * The reveal, in the order it has to happen.
   *
   * `onReady` first, so the castle is raised while the curtain is still
   * solid. It is one drawing and costs little, but its opening beat is the
   * thing being protected: the castle has to be standing and still by the
   * time it can be seen, or a guest watches it appear rather than watching
   * the curtain come off it. The expensive render — the deck, six sections
   * and fourteen timeline panels — is the castle's problem, and it hides
   * that one behind its own flood of light the same way.
   *
   * Two frames and a short settle later the dissolve starts, and what comes
   * through it is a castle already there.
   */
  const announced = useRef(false);

  useEffect(() => {
    if (!entered || announced.current) return;
    announced.current = true;
    setPhase("revealing");
    onReady();
  }, [entered, onReady]);

  useEffect(() => {
    if (phase !== "revealing") return;
    let second = 0;
    let settle = 0;
    const first = requestAnimationFrame(() => {
      second = requestAnimationFrame(() => {
        settle = window.setTimeout(() => setPhase("leaving"), 140);
      });
    });
    return () => {
      cancelAnimationFrame(first);
      cancelAnimationFrame(second);
      window.clearTimeout(settle);
    };
  }, [phase]);

  useEffect(() => {
    if (phase !== "leaving") return;
    const t = window.setTimeout(() => {
      stopped.current = true;
      setPhase("gone");
    }, FADE_MS);
    return () => window.clearTimeout(t);
  }, [phase]);

  if (phase === "gone") return null;

  const leaving = phase === "leaving";

  return (
    <div
      ref={rootRef}
      /* Above the bottom bar, above the map viewer, above the leave guard —
         while it is up, it is the page. */
      className={`royal-dawn fixed inset-0 z-[100] flex flex-col items-center justify-center overflow-hidden px-gutter pb-safe transition-opacity duration-700 ${
        leaving ? "pointer-events-none opacity-0" : "opacity-100"
      }`}
      style={{ "--p": 0 } as CSSProperties}
    >
      <div aria-hidden className="pointer-events-none absolute inset-0 parchment-texture" />

      {/* The same sparkles that float over the hero, and CSS rather than
          framer-motion for the same reason its opening is: this is the first
          thing painted, and it paints from the static HTML whether or not the
          bundle has landed yet. */}
      <div aria-hidden className="pointer-events-none absolute inset-0">
        <span
          className="load-float absolute left-[8%] top-[16%] text-gold"
          style={{ "--float": "5s", "--rise": "-18px" } as CSSProperties}
        >
          <Sparkle className="h-5 w-5 animate-twinkle sm:h-8 sm:w-8" />
        </span>
        <span
          className="load-float absolute right-[10%] top-[23%] text-roseDeep"
          style={{ "--float": "6.5s", "--rise": "20px" } as CSSProperties}
        >
          <Sparkle className="h-4 w-4 animate-twinkle sm:h-6 sm:w-6" />
        </span>
        <span
          className="load-float absolute bottom-[19%] left-[13%] text-roseDeep"
          style={{ "--float": "5.8s", "--rise": "14px" } as CSSProperties}
        >
          <Sparkle className="h-3.5 w-3.5 animate-twinkle sm:h-5 sm:w-5" />
        </span>
        <span
          className="load-float absolute bottom-[24%] right-[14%] text-gold"
          style={{ "--float": "4.6s", "--rise": "-15px" } as CSSProperties}
        >
          <Sparkle className="h-4 w-4 animate-twinkle sm:h-6 sm:w-6" />
        </span>
      </div>

      {/*
        Two wrappers, because they carry two transforms that must not fight:
        the outer one is sized to the window (see `.load-fit` in globals.css,
        for a phone held sideways), and the inner one lifts and thins as the
        curtain goes, so it leaves rather than simply stops being there.
      */}
      <div className="load-fit relative w-full">
        <div
          className={`flex w-full flex-col items-center pb-8 transition-transform duration-700 ${
            leaving ? "-translate-y-2 scale-[1.03]" : ""
          }`}
        >
          {/*
            The crown is the progress bar's twin: it gilds from the base up as
            the download runs, so the number and the bar have something to be
            *about*. Two copies of the same drawing — a faint one for what is
            still to come, a solid one clipped to how far along we are — and a
            glow behind that brightens with it.
          */}
          <div className="relative aspect-[32/23] h-12 xs:h-14 sm:h-16">
            {/* A radial falloff rather than a blurred shape: `blur` on a solid
                rounded box leaves a faintly rectangular smudge at this size,
                and costs a filter pass to do it. This is one gradient, and it
                actually ends in nothing. */}
            <div
              aria-hidden
              className="load-halo absolute -inset-x-16 -inset-y-10 bg-[radial-gradient(closest-side,rgba(212,175,55,0.32),rgba(212,175,55,0))]"
            />
            <Crown className="absolute inset-0 h-full w-full text-gold/20" />
            <div aria-hidden className="load-gild absolute inset-0">
              <Crown className="h-full w-full text-gold drop-shadow-sm" />
            </div>
          </div>

          <p className="mt-4 font-hand text-xl leading-none text-berry xs:text-2xl sm:text-3xl">
            By royal invitation
          </p>

          <h1 className="mt-2 font-display text-[2rem] italic leading-[1.1] text-ink xs:text-[2.5rem] sm:text-5xl">
            {BABY_FULL_NAME}
          </h1>

          <div aria-hidden className="gilt-rule mt-4 h-px w-32 xs:w-40 sm:w-52" />

          {/* The rail, and the sparkle riding its leading edge — the same
              gesture the bottom bar makes across the deck, so the two read as
              one idea: gold filling left to right is how this invitation shows
              you where you are. */}
          <div
            ref={barRef}
            role="progressbar"
            aria-label="Preparing the invitation"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={0}
            className="relative mt-7 h-[3px] w-full max-w-[19rem] rounded-full bg-gold/15 xs:max-w-[21rem]"
          >
            <div className="load-fill absolute inset-y-0 left-0 overflow-hidden rounded-full" />
            <span aria-hidden className="load-rider absolute top-1/2 text-gold">
              <Sparkle className="h-3.5 w-3.5 animate-twinkle sm:h-4 sm:w-4" />
            </span>
          </div>

          <div className="mt-3.5 flex w-full max-w-[19rem] items-baseline justify-between gap-4 xs:max-w-[21rem]">
            {/*
              The live region is the outer span and never moves, because a
              region that is itself mounted fresh is one several screen readers
              will not announce. Inside it, `key` on the stage index makes React
              throw the old line away and mount a new one, which restarts the
              hero's own rise animation — each caption arrives the way every
              other line on this invitation arrives.
            */}
            <span
              role="status"
              aria-live="polite"
              className="text-[0.6875rem] uppercase leading-tight tracking-[0.2em] text-goldDeep sm:text-xs"
            >
              <span key={stage} className="hero-rise inline-block">
                {STAGES[stage].line}
              </span>
            </span>

            {/* The progressbar above already carries this number for a screen
                reader; announcing every one of a hundred steps as well would be
                a hundred interruptions. */}
            <span
              aria-hidden
              className="shrink-0 font-display text-lg leading-none tabular-nums text-ink sm:text-xl"
            >
              <span ref={pctRef}>0</span>
              <span className="text-goldDeep">%</span>
            </span>
          </div>

          {/*
            The way in. Nothing opens until a guest presses it — see `knock`
            — so the space it will occupy is reserved from the start, and
            the composition doesn't jump when it arrives.
          */}
          <div className="relative mt-8 flex h-14 items-start justify-center">
            {ready ? (
              <button
                type="button"
                onClick={knock}
                autoFocus
                /* Focused on arrival, so a guest on a screen reader or a
                   keyboard lands on the one thing there is to do — and given
                   a gilt ring rather than the browser's black one, since
                   with autofocus that ring is something every guest sees
                   before they have touched anything. */
                className="hero-rise flex min-h-[3rem] items-center justify-center rounded-full border border-gold/60 bg-parchment/70 px-8 font-display text-base text-ink shadow-sm transition hover:bg-goldSoft/40 focus:outline-none focus-visible:ring-2 focus-visible:ring-goldDeep/60 focus-visible:ring-offset-2 focus-visible:ring-offset-mist active:scale-[0.98] sm:px-9 sm:text-lg"
              >
                Open the gates
              </button>
            ) : null}

            {/*
              And the hand, reaching up to press it.

              After the button in the source, and that is the whole of the
              fix it was: `hero-rise` gives the button a transform, a
              transform makes a stacking context, and two stacking contexts
              with nothing to separate them are painted in the order they
              are written. The hand was drawn first and so went underneath,
              with its fingertip disappearing under the button's edge — a
              hand pressing *through* a button rather than on it.

              It comes from below, so the words it is telling you to read
              are never under a finger — and so the press itself reaches
              upward, which is what `hint-tap` is about. This offset is set
              against the top of that reach rather than the rest of it: the
              frame that has to look right is the one where the finger is
              on the button.

              Two and a half seconds of grace first, which is long enough
              that anybody who was going to press it unaided already has and
              never sees a hand at all.
            */}
            {ready && (
              <Hint
                gesture="tap"
                after={2500}
                className="left-1/2 top-[3rem] z-10 -translate-x-1/2"
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
