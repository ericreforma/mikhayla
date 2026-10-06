"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  GAME_BIRD_SPRITE,
  GAME_PLAYER_SPRITE,
  GAME_ROCK_SPRITE,
} from "@/app/config";
import {
  createGame,
  press,
  release,
  shownScore,
  step,
  STEP,
  type Game as World,
  type Status,
} from "./engine";
import { enterFullscreen } from "@/app/components/fullscreen";
import { Crown } from "@/app/components/Ornaments";
import { lockLandscape } from "./orientation";
import { draw, measure, type Sprites, type View } from "./render";
import { cachedLeader, fetchTopScores, readBest, writeBest, type TopScore } from "./scores";
import { LIVES } from "./tuning";
import { GameOverCard, PausedCard, StartCard } from "./Cards";

/**
 * The game, wired to a screen.
 *
 * Three things live here and nothing else does: a canvas that is kept the size
 * of the window, a loop that advances `engine.ts` and paints `render.ts`, and
 * the handful of React states the cards over the top need to know about.
 *
 * ---------------------------------------------------------------------------
 * What goes through React and what does not
 * ---------------------------------------------------------------------------
 * The score changes sixty times a second. Routed through `useState` that is
 * sixty renders a second of a component tree with three cards in it, to move
 * four characters the DOM already owns — so the score is written straight onto
 * its node from the loop, the same trick the loading screen's progress bar
 * uses, and React never hears about it.
 *
 * What React *is* told about is the things that change a handful of times in a
 * run: the status, and how many lives are left. Those decide which card is on
 * screen, and a card is worth a render.
 */
export function Game({ onLeave }: { onLeave: () => void }) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const scoreRef = useRef<HTMLSpanElement>(null);
  const leaderRef = useRef<HTMLSpanElement>(null);

  /* The simulation, the screen it is drawn on, and the artwork — all refs,
     because the loop reads them every frame and none of them is allowed to
     cause a render. */
  const viewRef = useRef<View>(measure(960, 420));
  const worldRef = useRef<World>(createGame(viewRef.current.cols));
  const spritesRef = useRef<Sprites>({ player: null, rock: null, bird: null });
  const ctxRef = useRef<CanvasRenderingContext2D | null>(null);

  const [status, setStatus] = useState<Status>("ready");
  const [lives, setLives] = useState(LIVES);
  const [score, setScore] = useState(0);
  const [best, setBest] = useState(0);

  /**
   * Who is top of the board, shown under the score while the run is on.
   *
   * Seeded from the cache so a second run paints it on the first frame, then
   * refreshed. See `loadLeader` for when that happens.
   */
  const [leader, setLeader] = useState<TopScore | null>(() => cachedLeader());

  /* The leader's score, where the loop can reach it. The loop is built once
     with no dependencies, so it cannot close over the state above. */
  const leaderScoreRef = useRef<number | null>(leader?.score ?? null);
  useEffect(() => {
    leaderScoreRef.current = leader?.score ?? null;
  }, [leader]);

  useEffect(() => setBest(readBest()), []);

  /**
   * Fetch the board in the background and keep the top name.
   *
   * Nothing waits on it and nothing reports it failing. A leaderboard is a
   * nice-to-have on a page whose actual job is to run at sixty frames a
   * second, so it is allowed to simply not arrive — the line under the score
   * falls back to this device's own best, and the Top 10 panel says so
   * properly if someone opens it.
   *
   * Called again at the start of every run, which is also what refreshes it
   * after a score has just been saved.
   */
  const loadLeader = useCallback(() => {
    fetchTopScores().then((result) => {
      if (result.ok) setLeader(result.top[0] ?? null);
    });
  }, []);

  useEffect(loadLeader, [loadLeader]);

  /* ---------------------------------------------------------------
     The canvas, kept the size of the window
     --------------------------------------------------------------- */

  useEffect(() => {
    const canvas = canvasRef.current;
    const wrap = wrapRef.current;
    if (!canvas || !wrap) return;

    const ctx = canvas.getContext("2d", { alpha: false });
    if (!ctx) return;
    ctxRef.current = ctx;

    const resize = () => {
      const rect = wrap.getBoundingClientRect();
      const w = Math.max(1, Math.round(rect.width));
      const h = Math.max(1, Math.round(rect.height));

      /*
       * Capped at two. A phone reporting three or four device pixels per CSS
       * pixel would have us filling eleven million pixels a frame for a
       * picture made of flat squares, which is where the frame rate goes on
       * exactly the devices that can least afford it. At 2 the blocks are
       * already crisper than the art needs.
       */
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      canvas.style.width = `${w}px`;
      canvas.style.height = `${h}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      /* Block art wants hard edges; a browser would otherwise smooth any
         sprite dropped in later into mush at this scale. */
      ctx.imageSmoothingEnabled = false;

      viewRef.current = measure(w, h);
      worldRef.current.cols = viewRef.current.cols;
    };

    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(wrap);
    /* A phone turned over fires `orientationchange` before the element has
       been relaid out, so the observer is what actually catches it — this is
       only here for browsers whose observer misses a fullscreen change. */
    window.addEventListener("orientationchange", resize);
    return () => {
      ro.disconnect();
      window.removeEventListener("orientationchange", resize);
    };
  }, []);

  /* ---------------------------------------------------------------
     Artwork, if there is any
     ---------------------------------------------------------------
     Every slot is optional and every one of them fails quietly: a sprite that
     404s leaves its slot null and the renderer draws its own. The game is
     never waiting on a file, which is what lets the art arrive later without
     anything else having to change.
     --------------------------------------------------------------- */

  useEffect(() => {
    const slots: [keyof Sprites, string][] = [
      ["player", GAME_PLAYER_SPRITE],
      ["rock", GAME_ROCK_SPRITE],
      ["bird", GAME_BIRD_SPRITE],
    ];
    const loaded: HTMLImageElement[] = [];

    for (const [slot, src] of slots) {
      if (!src) continue;
      const img = new Image();
      img.decoding = "async";
      img.onload = () => {
        spritesRef.current[slot] = img;
      };
      img.src = src;
      loaded.push(img);
    }

    return () => {
      for (const img of loaded) img.onload = null;
    };
  }, []);

  /* ---------------------------------------------------------------
     The loop
     --------------------------------------------------------------- */

  useEffect(() => {
    let raf = 0;
    let last = performance.now();
    let acc = 0;

    /* What React was last told, so it is only told again when it changed. */
    let sawStatus: Status = worldRef.current.status;
    let sawLives = worldRef.current.lives;
    let sawScore = -1;

    const frame = (now: number) => {
      raf = window.requestAnimationFrame(frame);

      const g = worldRef.current;
      const ctx = ctxRef.current;
      const view = viewRef.current;

      const elapsed = (now - last) / 1000;
      last = now;

      if (g.status === "running") {
        /*
         * A fixed step, with the leftover carried to the next frame.
         *
         * The clamp is the part that matters: a tab left in the background,
         * or a phone that locked, comes back with seconds of elapsed time,
         * and catching up on all of it would run the player into whatever
         * spawned while nobody was looking. Quarter of a second is the most
         * this will ever simulate at once — anything beyond that is simply
         * dropped, which is the only honest answer when the game was not on
         * screen to be played.
         */
        acc += Math.min(0.25, elapsed);
        let steps = 0;
        while (acc >= STEP && steps < 40) {
          step(g);
          acc -= STEP;
          steps += 1;
        }
        if (acc > STEP) acc = 0;
      } else {
        acc = 0;
      }

      if (ctx) draw(ctx, g, view, spritesRef.current);

      /* The HUD, written straight onto the DOM — see the note at the top. */
      const shown = shownScore(g);
      if (shown !== sawScore) {
        sawScore = shown;
        if (scoreRef.current) scoreRef.current.textContent = String(shown);

        /* Passing the person at the top of the board is the one thing worth
           reacting to mid-run, so the line under the score goes gold when it
           happens. Written straight onto the node for the same reason the
           score is — this is inside the frame loop. */
        const top = leaderScoreRef.current;
        const el = leaderRef.current;
        if (top !== null && el) {
          const ahead = String(shown > top);
          if (el.dataset.ahead !== ahead) el.dataset.ahead = ahead;
        }
      }

      if (g.lives !== sawLives) {
        sawLives = g.lives;
        setLives(g.lives);
      }

      if (g.status !== sawStatus) {
        sawStatus = g.status;
        if (g.status === "over") {
          const final = shownScore(g);
          writeBest(final);
          setScore(final);
          setBest(readBest());
        }
        setStatus(g.status);
      }
    };

    raf = window.requestAnimationFrame(frame);
    return () => window.cancelAnimationFrame(raf);
  }, []);

  /* ---------------------------------------------------------------
     Starting, pausing, and starting again
     --------------------------------------------------------------- */

  const start = useCallback(() => {
    /*
     * Both of these have to be asked for from inside the gesture that called
     * this, which is why they are here rather than in an effect that notices
     * the game started: a browser grants the screen and the orientation only
     * to a hand that just moved, and by the time an effect runs the press is
     * over. "Start running" is that press, and so is "Run again".
     *
     * Both are allowed to fail and neither is checked. See
     * `app/components/fullscreen.ts` — the game is sized against whatever box
     * it is given, and the rotate card catches a phone that turns back.
     */
    enterFullscreen();
    lockLandscape();
    loadLeader();

    const g = createGame(viewRef.current.cols);
    g.status = "running";
    worldRef.current = g;
    setLives(LIVES);
    setStatus("running");
  }, [loadLeader]);

  const pause = useCallback(() => {
    const g = worldRef.current;
    if (g.status !== "running") return;
    /* The button is let go of on the way out, so a jump that was being held
       when the phone rang does not resume into a jump nobody is holding. */
    release(g);
    g.status = "paused";
    setStatus("paused");
  }, []);

  const resume = useCallback(() => {
    const g = worldRef.current;
    if (g.status !== "paused") return;
    g.status = "running";
    setStatus("running");
  }, []);

  /*
   * Anything that takes the game off the screen pauses it.
   *
   * `visibilitychange` covers a tab switch and a phone being locked. It does
   * not cover a desktop window that is still visible but has been alt-tabbed
   * away from, which is why `blur` is here as well.
   *
   * `blur` is the one that needs the guard. It fires for things that are not a
   * player walking away — a devtools panel taking focus, and in some browsers
   * the fullscreen transition that `start` itself asks for, which would pause
   * the run in the same breath as beginning it. Asking `document.hasFocus()`
   * on the next tick, once focus has actually landed somewhere, is what tells
   * a real departure from a transient one.
   */
  useEffect(() => {
    const hide = () => {
      if (document.visibilityState === "hidden") pause();
    };
    const left = () => {
      window.setTimeout(() => {
        if (!document.hasFocus()) pause();
      }, 0);
    };
    document.addEventListener("visibilitychange", hide);
    window.addEventListener("blur", left);
    return () => {
      document.removeEventListener("visibilitychange", hide);
      window.removeEventListener("blur", left);
    };
  }, [pause]);

  /* ---------------------------------------------------------------
     The one control
     --------------------------------------------------------------- */

  const onPress = useCallback((e: React.PointerEvent) => {
    const g = worldRef.current;
    if (g.status !== "running") return;
    e.preventDefault();
    /*
     * The pointer is captured so the release always comes back to us. Without
     * it a thumb that slides off the button while held — which is most thumbs,
     * on a phone being held sideways in both hands — never fires `pointerup`
     * here, and the jump stays "held" for the rest of the run.
     */
    e.currentTarget.setPointerCapture?.(e.pointerId);
    press(g);
  }, []);

  const onRelease = useCallback((e: React.PointerEvent) => {
    e.preventDefault();
    release(worldRef.current);
  }, []);

  useEffect(() => {
    /*
     * Whether the keyboard belongs to something on screen rather than to the
     * game.
     *
     * The jump key is the space bar, and the card at the end of a run has a
     * text box in it — so without this, a player typing "Juan Dela Cruz" into
     * the leaderboard gets "JuanDelaCruz". The buttons matter for the same
     * reason from the other side: every card focuses its primary button, and
     * a space there should press that button once rather than press it and
     * start a second run underneath it.
     */
    const theirs = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement | null;
      const tag = el?.tagName;
      return (
        tag === "INPUT" ||
        tag === "TEXTAREA" ||
        tag === "SELECT" ||
        tag === "BUTTON" ||
        el?.isContentEditable === true
      );
    };

    const isJump = (e: KeyboardEvent) =>
      e.key === " " || e.key === "ArrowUp" || e.key === "w" || e.key === "W";

    const down = (e: KeyboardEvent) => {
      if (theirs(e)) return;
      if (e.key === "Escape") {
        pause();
        return;
      }
      if (!isJump(e)) return;
      e.preventDefault();
      /* Auto-repeat would re-press the button sixty times a second and hold
         every jump at its maximum, which is the whole control gone. */
      if (e.repeat) return;
      const g = worldRef.current;
      if (g.status === "running") press(g);
      else if (g.status === "ready") start();
      else if (g.status === "paused") resume();
    };

    const up = (e: KeyboardEvent) => {
      if (theirs(e) || !isJump(e)) return;
      e.preventDefault();
      release(worldRef.current);
    };

    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    return () => {
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
    };
  }, [pause, resume, start]);

  const running = status === "running";

  return (
    <div ref={wrapRef} className="relative h-full w-full overflow-hidden bg-[#7DC1EC]">
      <canvas ref={canvasRef} className="block h-full w-full" />

      {/*
        The jump zone: the right-hand half of the screen, and all of it.

        The round button below is the thing a player looks at, but the target
        is the whole side — a thumb on a phone held in two hands lands
        wherever it lands, and a game lost to a near miss on a button is a
        game lost to the button. Live only while the run is, so a tap meant
        for a card never also jumps.
      */}
      <div
        onPointerDown={onPress}
        onPointerUp={onRelease}
        onPointerCancel={onRelease}
        className={`absolute inset-y-0 right-0 w-1/2 touch-none select-none ${
          running ? "" : "pointer-events-none"
        }`}
        style={{ WebkitTapHighlightColor: "transparent" }}
        aria-hidden
      >
        <div
          className="pointer-events-none absolute bottom-[8%] right-[6%] flex items-center justify-center rounded-full border-[3px] border-white/70 bg-white/25 text-white shadow-lg backdrop-blur-[2px]"
          style={{ width: "clamp(3.5rem, 13vh, 5.5rem)", height: "clamp(3.5rem, 13vh, 5.5rem)" }}
        >
          <svg viewBox="0 0 24 24" className="h-1/2 w-1/2" fill="none" aria-hidden>
            <path
              d="M12 4 L12 20 M12 4 L6 10 M12 4 L18 10"
              stroke="currentColor"
              strokeWidth="2.6"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>
      </div>

      {/* ---------------------------------------------------------------
          The HUD
          ---------------------------------------------------------------
          Over the canvas and out of the shake, so the score stays still while
          the world lurches. Nothing in here takes a tap except the pause.
          --------------------------------------------------------------- */}
      <div
        className="pointer-events-none absolute inset-x-0 top-0 flex items-start justify-between p-3 sm:p-4"
        style={{
          paddingLeft: "max(0.75rem, env(safe-area-inset-left))",
          paddingRight: "max(0.75rem, env(safe-area-inset-right))",
        }}
      >
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={pause}
            disabled={!running}
            aria-label="Pause"
            className="pointer-events-auto flex h-9 w-9 items-center justify-center rounded-full border border-white/50 bg-black/25 text-white/90 backdrop-blur-[2px] transition active:scale-95 disabled:opacity-0"
          >
            <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor" aria-hidden>
              <rect x="7" y="5" width="3.5" height="14" rx="1" />
              <rect x="13.5" y="5" width="3.5" height="14" rx="1" />
            </svg>
          </button>

          <Hearts lives={lives} />
        </div>

        {/* On a dark pill, because the sky underneath it runs from a white
            noon to a navy midnight over the course of a long run and no single
            colour of text is legible on both. */}
        <div className="rounded-xl bg-black/25 px-2.5 py-1 text-right font-mono tabular-nums leading-none text-white backdrop-blur-[2px]">
          <span
            ref={scoreRef}
            className="block text-[clamp(1.4rem,5.5vh,2.4rem)] font-bold tracking-tight"
          >
            0
          </span>
          {/*
            Who there is to beat.

            The board's leader when we have one, and this device's own best
            when we don't — which covers a guest with no signal, a sheet that
            isn't set up, and the very first player, for whom there is no board
            yet. The name is a guest's own typing and can be a hundred
            characters, so it is given a hard ceiling and allowed to ellipsise
            rather than pushing the score off the screen.
          */}
          {leader ? (
            <span
              ref={leaderRef}
              data-ahead="false"
              className="mt-1 flex items-center justify-end gap-1 text-[clamp(0.6rem,2vh,0.8rem)] text-white/70 transition-colors data-[ahead=true]:text-gold"
            >
              <Crown className="h-[0.85em] w-auto flex-none" />
              <span className="max-w-[26vw] truncate">{leader.name}</span>
              <span className="flex-none font-semibold">{leader.score}</span>
            </span>
          ) : best > 0 ? (
            <span className="mt-0.5 block text-[clamp(0.6rem,2vh,0.8rem)] uppercase tracking-[0.18em] text-white/70">
              Best {best}
            </span>
          ) : null}
        </div>
      </div>

      {status === "ready" && <StartCard onStart={start} onLeave={onLeave} best={best} />}
      {status === "paused" && (
        <PausedCard onResume={resume} onRestart={start} onLeave={onLeave} />
      )}
      {status === "over" && (
        <GameOverCard score={score} best={best} onRestart={start} onLeave={onLeave} />
      )}
    </div>
  );
}

/**
 * Three lives, drawn as hearts that empty rather than disappear.
 *
 * A heart that vanishes tells a player how many they have; a heart that goes
 * hollow tells them how many they have *lost*, which is the number the run is
 * actually about.
 */
function Hearts({ lives }: { lives: number }) {
  return (
    <div className="flex gap-1" role="status" aria-label={`${lives} lives left`}>
      {Array.from({ length: LIVES }).map((_, i) => (
        <svg
          key={i}
          viewBox="0 0 24 22"
          aria-hidden
          className="h-[clamp(1.1rem,3.6vh,1.6rem)] w-auto drop-shadow-[0_2px_3px_rgba(0,0,0,0.4)]"
        >
          <path
            d="M12 21 C12 21 2 14.5 2 8 A5.6 5.6 0 0 1 12 4.8 A5.6 5.6 0 0 1 22 8 C22 14.5 12 21 12 21 Z"
            fill={i < lives ? "#E8536A" : "rgba(255,255,255,0.14)"}
            stroke="rgba(255,255,255,0.85)"
            strokeWidth="1.6"
            strokeLinejoin="round"
          />
        </svg>
      ))}
    </div>
  );
}
