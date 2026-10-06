"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  GAME_BIRD_SPRITE,
  GAME_BOULDER_SPRITE,
  GAME_HURT_SPRITE,
  GAME_JUMP_SPRITE,
  GAME_RUN_SPRITE,
  GAME_RABBIT_SPRITE,
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
import {
  cachedLeader,
  fetchTopScores,
  readBest,
  readName,
  suggestedName,
  writeBest,
  writeName,
  type TopScore,
} from "./scores";
import { arm, play, startMenu, stopMenu, weather, type Sfx } from "./sfx";
import { LIVES, RUN_CYCLE_BLOCKS, SKIES, STEP_PHASE } from "./tuning";
import { GameOverCard, NameCard, PausedCard, StartCard } from "./Cards";

/**
 * Which surface she is running on.
 *
 * The two weathers cross-fade over eight seconds, so a threshold rather than a
 * test for zero: the sound swaps once, half way through the change, instead of
 * alternating between two footsteps for the length of it.
 */
function footstep(g: World): Sfx {
  if (g.snow > 0.5) return "step-snow";
  if (g.rain > 0.5) return "step-rain";
  return "step-grass";
}

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
  const spritesRef = useRef<Sprites>({
    run: null,
    jump: null,
    hurt: null,
    rock: null,
    bird: null,
    rabbit: null,
    boulder: null,
  });
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

  /* ---------------------------------------------------------------
     Who is playing
     ---------------------------------------------------------------
     Asked once, at the door, and kept on the device — the same bargain the
     RSVP makes. Everything after it is quieter for it: a finished run uploads
     itself, and nobody is asked to type while they are looking at the number
     they just got.

     `ready` is a third state rather than `name === ""`, because there is one
     frame before the effect runs where nothing is known. Painting the name
     card during it would flash a form at a player who has one stored.
     --------------------------------------------------------------- */
  const [name, setName] = useState("");
  const [nameReady, setNameReady] = useState(false);
  const [asking, setAsking] = useState(false);

  useEffect(() => {
    const chosen = readName();
    /* The RSVP only ever fills the box; it never answers for them. */
    setName(chosen || suggestedName());
    setAsking(!chosen);
    setNameReady(true);
  }, []);

  const named = useCallback((chosen: string) => {
    writeName(chosen);
    setName(chosen);
    setAsking(false);
  }, []);

  /* ---------------------------------------------------------------
     Sound
     ---------------------------------------------------------------
     Three effects, each answering to a different thing.
     --------------------------------------------------------------- */

  /* Open the device and fetch the effects. Usually immediate — see `arm`. */
  useEffect(() => arm(), []);

  /**
   * The menu music follows the menu, and nothing else.
   *
   * On exactly while a card is up before the first run: the one asking a name
   * and the one with the title and the instructions on it. `nameReady` is in
   * here because it gates the card itself — there is one frame where the
   * status is `ready` but nothing is drawn yet, and music under a blank screen
   * is music under a blank screen.
   *
   * Starting it is allowed to be optimistic; `startMenu` falls back to the
   * first touch if the browser refuses, and gives up if the card has gone by
   * then. The status never returns to `ready`, so this plays once, at the door.
   */
  const menuUp = status === "ready" && nameReady;
  useEffect(() => {
    if (menuUp) startMenu();
    else stopMenu();
  }, [menuUp]);

  /* Leaving the game stops everything it was making. The players live at
     module scope and outlive this component, so without this the menu music
     follows a guest back out to the invitation and plays over its own. */
  useEffect(
    () => () => {
      stopMenu();
      weather(0, 0);
    },
    []
  );

  /**
   * Fetch the board in the background and keep the top name.
   *
   * Nothing waits on it and nothing reports it failing. A leaderboard is a
   * nice-to-have on a page whose actual job is to run at sixty frames a
   * second, so it is allowed to simply not arrive — the line under the score
   * falls back to this device's own best, and the Scoreboard panel says so
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
      ["run", GAME_RUN_SPRITE],
      ["jump", GAME_JUMP_SPRITE],
      ["hurt", GAME_HURT_SPRITE],
      ["rock", GAME_ROCK_SPRITE],
      ["bird", GAME_BIRD_SPRITE],
      ["rabbit", GAME_RABBIT_SPRITE],
      ["boulder", GAME_BOULDER_SPRITE],
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

    /*
     * And what the speaker was last told, for the same reason.
     *
     * Every sound in the game is an *edge* on something the simulation already
     * tracks, found here rather than fired from the place that caused it. That
     * is deliberate: `engine.ts` is a pure function of its own state and is run
     * headless by the test harness, and a jump that made a noise could not be.
     * So the engine stays silent and this loop watches it — which also means
     * there is exactly one place a jump can be announced from, however many
     * ways there are to ask for one.
     */
    let sawGrounded = worldRef.current.grounded;
    let sawBeat = 0;

    /* How much of the weather bed is let through. Eased rather than switched,
       so a pause lowers the rain instead of cutting it — and so the ending
       sting is not fighting a downpour for the last word. */
    let gate = 0;

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

      /* The rain and the wind, held at whatever the sky is doing. The engine
         already eases these two over eight seconds, so handing them straight
         to the speaker crossfades the sound on the same curve as the picture. */
      gate += ((g.status === "running" ? 1 : 0) - gate) * Math.min(1, elapsed * 6);
      weather(g.rain * gate, g.snow * gate);

      /* The HUD, written straight onto the DOM — see the note at the top. */
      const shown = shownScore(g);
      if (shown !== sawScore) {
        sawScore = shown;
        if (scoreRef.current) scoreRef.current.textContent = String(shown);

        /* Passing the person at the top of the board is the one thing worth
           reacting to mid-run, so the corner goes gold when it happens.
           Written straight onto the node for the same reason the score is —
           this is inside the frame loop. */
        const top = leaderScoreRef.current;
        const el = leaderRef.current;
        if (top !== null && el) {
          const ahead = String(shown > top);
          if (el.dataset.ahead !== ahead) el.dataset.ahead = ahead;
        }
      }

      /* Up. `grounded` only ever goes false in `press`, and only when a jump
         actually begins — so this is the jump, and a press that bought nothing
         because she was already in the air is silent, as it should be. */
      if (g.grounded !== sawGrounded) {
        if (!g.grounded) play("jump");
        sawGrounded = g.grounded;
      }

      /*
       * And down: a footfall twice a stride, on the two frames where the
       * artwork actually plants a foot (see `STEP_PHASE`).
       *
       * Counted off distance rather than off time, because the animation is —
       * tie it to a clock and the sound drifts out of her legs as the tiers
       * speed up. `beat` is reassigned whatever happens, so the distance
       * covered in the air is swallowed rather than arriving all at once as a
       * burst of footsteps the moment she lands.
       */
      const beat = Math.floor((g.distance / RUN_CYCLE_BLOCKS - STEP_PHASE) * 2);
      if (beat !== sawBeat) {
        if (beat === sawBeat + 1 && g.status === "running" && g.grounded) {
          play(footstep(g));
        }
        sawBeat = beat;
      }

      if (g.lives !== sawLives) {
        /* A heart lost, but not the last one — the last one is the game over
           below, which has its own three sounds and should not have this
           underneath it. */
        if (g.lives < sawLives && g.lives > 0) play("hurt");
        sawLives = g.lives;
        setLives(g.lives);
      }

      if (g.status !== sawStatus) {
        sawStatus = g.status;
        if (g.status === "over") {
          const final = shownScore(g);

          /* Both read *before* the write, which is what makes beating your own
             record detectable at all — a moment later this run is the record. */
          const mine = readBest();
          const theirs = leaderScoreRef.current;

          writeBest(final);
          setScore(final);
          setBest(readBest());

          /*
           * One sound, in this order. Topping the board is the bigger thing
           * and swallows topping yourself; either of them replaces the game
           * over rather than playing over it — the run ended, but that is not
           * the news.
           *
           * With no board to compare against — no signal, or the very first
           * player — `theirs` is null and beating yourself is the best news
           * available, which is the right answer for a guest playing alone.
           */
          if (theirs !== null && final > theirs) play("winner-all");
          else if (final > mine) play("winner-self");
          else play("gameover");
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

  /**
   * Debug: pin the hour or the weather from the URL.
   *
   *   ?sky=0..4        morning, afternoon, sunset, evening, dawn
   *   ?weather=rain | snow | clear
   *
   * Read once and applied to every run, restarts included, so a look at the
   * snow does not end the moment you die. It exists because the alternative is
   * playing for four minutes to see whether the snow is the right white — and
   * on the phone it has to be checked on, four minutes is four minutes.
   *
   * Nothing is reachable without typing it. The route is already unlisted and
   * `noindex`, and these change the light and nothing else: not the speed, not
   * the spawns, not the score. A run with the weather pinned is still a real
   * run and its score still counts, which is deliberate — a debug switch that
   * quietly invalidated the scoreboard would be a worse bug than the one it
   * was added to find.
   */
  const pinned = useRef<{ sky: number | null; weather: number | null }>({
    sky: null,
    weather: null,
  });

  /** Hold a game at whatever the URL asked for. */
  const applyPins = useCallback((g: World) => {
    const { sky, weather } = pinned.current;
    if (sky !== null) {
      g.forceSky = sky;
      g.sky = sky;
      g.skyFrom = sky;
      g.skyBlend = 1;
    }
    if (weather !== null) {
      g.forceWeather = weather;
      /* Snapped rather than eased in. The eight-second gather is right for
         weather that arrives during a run and wrong for weather you came to
         look at. */
      g.rain = weather === 1 ? 1 : 0;
      g.snow = weather === 2 ? 1 : 0;
    }
  }, []);

  useEffect(() => {
    const q = new URLSearchParams(window.location.search);

    const sky = Number(q.get("sky"));
    pinned.current.sky =
      q.has("sky") && Number.isInteger(sky) && sky >= 0 && sky < SKIES.length ? sky : null;

    const weather = { clear: 0, rain: 1, snow: 2 }[q.get("weather") ?? ""];
    pinned.current.weather = weather ?? null;

    /* The world standing behind the start card is a game too, and it is the
       first thing anybody checking the weather will look at. */
    applyPins(worldRef.current);
  }, [applyPins]);

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
    applyPins(g);
    g.status = "running";
    worldRef.current = g;
    setLives(LIVES);
    setStatus("running");
  }, [applyPins, loadLeader]);

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
    <div
      ref={wrapRef}
      /*
        Every button in the game, caught in one place.

        The alternative is a `play("button")` inside a dozen `onClick`s spread
        across four cards, which is a dozen chances to add a thirteenth button
        and forget. Capture, so a card that stops the event still makes a
        noise; `pointerdown` rather than `click`, because a tap that slides off
        the button never clicks, and a sound that arrives on release reads as
        lag rather than as a button.

        The jump zone deliberately is not a button, so it never fires here —
        jumping has its own sound and does not want a click under it.
      */
      onPointerDownCapture={(e) => {
        if ((e.target as HTMLElement | null)?.closest("button")) play("button");
      }}
      className="relative h-full w-full overflow-hidden bg-[#7DC1EC]"
    >
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
          className="pointer-events-none absolute bottom-[8%] right-[6%] flex items-center justify-center rounded-full border-[3px] border-white/80 bg-white/30 text-white backdrop-blur-[2px] shadow-[0_4px_0_0_rgba(0,0,0,0.3),0_8px_18px_rgba(0,0,0,0.3)]"
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

          Three columns, and the outer two are both `flex-1` on purpose: that
          is what makes the middle one land on the true centre of the screen
          rather than on the centre of whatever is left over once the pause and
          the leaderboard have taken their share. Those two are never the same
          width — one holds three hearts, the other holds somebody's name.

          All of it sits in the top strip of sky. Nothing in the game is drawn
          up there: the bird's own lane is a block or two off the ground, which
          is most of the way down the screen.
          --------------------------------------------------------------- */}
      <div
        className="pointer-events-none absolute inset-x-0 top-0 flex items-start gap-2 p-3 sm:p-4"
        style={{
          paddingLeft: "max(0.75rem, env(safe-area-inset-left))",
          paddingRight: "max(0.75rem, env(safe-area-inset-right))",
        }}
      >
        <div className="flex flex-1 items-center gap-2.5">
          <button
            type="button"
            onClick={pause}
            disabled={!running}
            aria-label="Pause"
            /* The same raised-and-pressed idea the cards' buttons use, in the
               HUD's own palette: it sits on the game rather than on parchment,
               so the shadow under it is the dark it is already drawn in. */
            className="pointer-events-auto inline-flex flex-none select-none items-center justify-center rounded-full border-2 border-white/70 bg-black/35 text-white backdrop-blur-[2px] transition-all duration-75 ease-out shadow-[0_3px_0_0_rgba(0,0,0,0.45)] active:translate-y-[3px] active:shadow-[0_0_0_0_rgba(0,0,0,0.45)] disabled:opacity-0"
            style={{
              width: "clamp(2.6rem, 9vh, 3.6rem)",
              height: "clamp(2.6rem, 9vh, 3.6rem)",
            }}
          >
            <svg viewBox="0 0 24 24" className="h-[45%] w-[45%]" fill="currentColor" aria-hidden>
              <rect x="7" y="5" width="3.5" height="14" rx="1" />
              <rect x="13.5" y="5" width="3.5" height="14" rx="1" />
            </svg>
          </button>

          <Hearts lives={lives} />
        </div>

        {/* The score, dead centre and the biggest thing on the screen — it is
            the only number anybody is playing for. On a dark pill because the
            sky under it runs from a white noon to a navy midnight over the
            course of a long run, and no one colour of text is legible on both. */}
        <div className="flex-none rounded-2xl bg-black/30 px-4 py-1 text-center font-mono tabular-nums leading-none text-white backdrop-blur-[2px]">
          <span
            ref={scoreRef}
            className="block text-[clamp(2rem,9.5vh,3.6rem)] font-bold tracking-tight"
          >
            0
          </span>
        </div>

        {/*
          Who there is to beat, in the far corner.

          The board's leader when we have one, and this device's own best when
          we don't — which covers a guest with no signal, a sheet that isn't set
          up, and the very first player, for whom there is no board yet. The
          name is a guest's own typing and can be a hundred characters, so it is
          given a hard ceiling and allowed to ellipsise rather than pushing the
          score off its centre.
        */}
        <div className="flex flex-1 justify-end">
          {leader ? (
            <span
              ref={leaderRef}
              data-ahead="false"
              className="flex min-w-0 items-center gap-1.5 rounded-xl bg-black/30 px-2.5 py-1.5 text-[clamp(0.85rem,3.4vh,1.25rem)] leading-none text-white/85 backdrop-blur-[2px] transition-colors data-[ahead=true]:text-gold"
            >
              <Crown className="h-[0.95em] w-auto flex-none" />
              <span className="max-w-[24vw] truncate">{leader.name}</span>
              <span className="flex-none font-mono font-semibold tabular-nums">
                {leader.score}
              </span>
            </span>
          ) : best > 0 ? (
            <span className="rounded-xl bg-black/30 px-2.5 py-1.5 text-[clamp(0.8rem,3vh,1.1rem)] uppercase leading-none tracking-[0.14em] text-white/85 backdrop-blur-[2px]">
              Best <span className="font-mono font-semibold tabular-nums">{best}</span>
            </span>
          ) : null}
        </div>
      </div>

      {status === "ready" &&
        nameReady &&
        (asking ? (
          <NameCard onDone={named} onLeave={onLeave} suggestion={name} />
        ) : (
          <StartCard
            onStart={start}
            onLeave={onLeave}
            onRename={() => setAsking(true)}
            best={best}
            name={name}
          />
        ))}
      {status === "paused" && (
        <PausedCard onResume={resume} onRestart={start} onLeave={onLeave} />
      )}
      {status === "over" && (
        <GameOverCard
          score={score}
          best={best}
          name={name}
          onRestart={start}
          onLeave={onLeave}
        />
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
