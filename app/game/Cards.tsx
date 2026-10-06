"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { BABY_NAME } from "@/app/config";
import { Crown, Sparkle, Spinner, CheckIcon, CloseIcon } from "@/app/components/Ornaments";
import {
  cachedTop,
  CAN_SUBMIT,
  fetchTopScores,
  NAME_MAX,
  readSent,
  submitScore,
  worthSending,
  type TopScore,
} from "./scores";

/**
 * The three cards that stand in front of the game: before it, over it, and
 * after it.
 *
 * All three are laid out sideways, and that is not a stylistic choice. The
 * game is landscape-only, so the scarce dimension is *height* — a phone turned
 * over has about 390px of it, and a card stacked the usual way (heading, then
 * score, then a form, then three buttons) does not fit in that without
 * scrolling a panel nobody expects to scroll. Every size below is written in
 * `vh` so it is measured against the dimension that is actually short.
 */

/* The parchment card every one of them is built on — the same page the
   invitation is printed on, so the game reads as part of the same book. */
const CARD =
  "relative w-full max-w-xl overflow-hidden rounded-3xl border border-gold/40 bg-parchment shadow-2xl";

const BACKDROP =
  "absolute inset-0 z-20 flex items-center justify-center bg-night/70 p-[max(0.75rem,env(safe-area-inset-left))] backdrop-blur-sm";

/* ---------------------------------------------------------------
   Buttons that look like buttons
   ---------------------------------------------------------------
   A flat outlined pill reads as a label with a line round it, which is what
   these were. What makes a thing look pressable is depth and, more than
   depth, *travel*: a hard-edged shadow directly under the button, and a press
   that moves the button down onto it and takes the shadow away. Nothing here
   is a blur or a glow — the shadow has a sharp edge because a sharp edge is
   what reads as a solid object sitting on a surface rather than as a drop
   shadow floating over one.

   `active:` does the whole of the press. The travel distance and the shadow
   offset are the same number, so the button lands exactly on its own shadow
   and nothing underneath it moves — the row keeps its height and the card
   never reflows.

   `duration-75` because a press has to feel like contact. Anything over about
   a tenth of a second stops reading as the button answering and starts
   reading as an animation of a button.
   --------------------------------------------------------------- */

const BUTTON =
  "inline-flex select-none items-center justify-center gap-2 rounded-full font-display " +
  "transition-all duration-75 ease-out " +
  "active:translate-y-[3px] disabled:pointer-events-none disabled:opacity-60";

const PRIMARY =
  `${BUTTON} min-h-[2.7rem] bg-gradient-to-b from-[#E8CB63] to-[#C9A22C] px-6 ` +
  "text-[clamp(0.85rem,3.4vh,1.05rem)] font-semibold text-night " +
  "border border-[#A8841F]/60 " +
  "shadow-[0_3px_0_0_#9C7A1B,0_5px_10px_rgba(62,40,20,0.3)] " +
  "hover:from-[#F0DFA8] hover:to-[#D4AF37] " +
  "active:shadow-[0_0_0_0_#9C7A1B,0_1px_4px_rgba(62,40,20,0.25)]";

const SECONDARY =
  `${BUTTON} min-h-[2.7rem] bg-gradient-to-b from-white to-[#F6E8D8] px-5 ` +
  "text-[clamp(0.8rem,3.2vh,1rem)] text-ink/80 " +
  "border border-gold/60 " +
  "shadow-[0_3px_0_0_#DCC79B,0_5px_10px_rgba(62,40,20,0.2)] " +
  "hover:from-white hover:to-mist hover:text-ink " +
  "active:shadow-[0_0_0_0_#DCC79B,0_1px_4px_rgba(62,40,20,0.18)]";

/** The giant play button, which is the same idea made round and large. */
const PLAY =
  `${BUTTON} flex-none bg-gradient-to-b from-[#E8CB63] to-[#C9A22C] text-night ` +
  "border-2 border-[#A8841F]/60 " +
  "shadow-[0_4px_0_0_#9C7A1B,0_7px_14px_rgba(62,40,20,0.34)] " +
  "hover:from-[#F0DFA8] hover:to-[#D4AF37] " +
  "active:translate-y-[4px] active:shadow-[0_0_0_0_#9C7A1B,0_2px_5px_rgba(62,40,20,0.28)]";

/* ---------------------------------------------------------------
   The board
   ---------------------------------------------------------------
   Opened from a button on both the start and the game-over card, because
   those are the two moments anybody wants to know where they stand: before
   they try, and straight after they have.
   --------------------------------------------------------------- */

function Leaderboard({ onClose }: { onClose: () => void }) {
  /*
   * Opens on whatever the background fetch already found — see `cachedTop` —
   * and refreshes behind that. The spinner is therefore only ever seen by the
   * first person to open the panel before the game's own request has landed,
   * which on any normal connection is nobody.
   */
  const [rows, setRows] = useState<TopScore[] | null>(() => cachedTop());
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const load = useCallback(() => {
    setBusy(true);
    setError("");
    fetchTopScores().then((result) => {
      setBusy(false);
      /* The old list is left on screen if the refresh fails. A board that was
         right a minute ago is better than an error where the board was. */
      if (result.ok) setRows(result.top);
      else setError(result.error);
    });
  }, []);

  useEffect(load, [load]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div className={`${BACKDROP} z-30`}>
      {/* Narrow, unlike every other card here, and that is the whole layout
          decision. A name and its score belong next to each other — read at
          the width of the rest of the cards they sat at opposite ends of a
          long empty line, and a leaderboard you have to track across is not
          one anybody reads. */}
      <div className={`${CARD} max-w-[19rem] max-h-full overflow-y-auto sm:max-w-xs`}>
        <div aria-hidden className="pointer-events-none absolute inset-0 parchment-texture" />

        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="absolute right-2.5 top-2.5 z-10 flex h-8 w-8 items-center justify-center rounded-full text-ink/50 transition active:scale-95 hover:bg-mist hover:text-ink"
        >
          <CloseIcon className="h-4 w-4" />
        </button>

        <div className="relative px-5 py-[clamp(0.6rem,3vh,1.2rem)] sm:px-7">
          <h2 className="text-center font-display text-[clamp(0.95rem,4vh,1.4rem)] italic text-ink">
            The royal scoreboard
          </h2>
          <div aria-hidden className="gilt-rule mx-auto mt-1 h-px w-20" />

          {rows === null ? (
            <p className="flex items-center justify-center gap-2 py-6 text-[clamp(0.7rem,2.9vh,0.88rem)] text-ink/55">
              <Spinner className="h-4 w-4" />
              Reading the board…
            </p>
          ) : rows.length === 0 ? (
            <p className="py-6 text-center text-[clamp(0.72rem,2.9vh,0.9rem)] leading-snug text-ink/60">
              Nobody has made it onto the board yet. Be first.
            </p>
          ) : (
            /*
             * Ten numbered rows, one under the other.
             *
             * They fit a phone on its side with nothing to spare — ten rows at
             * about 22px, plus the heading and the button, against the 390px
             * such a screen has — which is why the type and the padding here
             * are a notch tighter than the other cards'. The card scrolls if a
             * screen is shorter still.
             */
            <ol className="mt-2">
              {rows.map((row, i) => (
                <li
                  key={`${row.name}-${i}`}
                  className="flex items-baseline gap-2.5 border-b border-gold/15 py-[clamp(0.1rem,0.6vh,0.3rem)] text-[clamp(0.68rem,2.7vh,0.88rem)] last:border-0"
                >
                  <span className="w-5 flex-none text-right font-display font-semibold text-goldDeep">
                    {i + 1}
                  </span>
                  {/* The name is a guest's own typing arriving from a public
                      endpoint, so it is allowed to ellipsise rather than being
                      trusted to be short enough to leave room for the score. */}
                  <span className="min-w-0 flex-1 truncate text-ink/80">{row.name}</span>
                  <span className="flex-none font-mono tabular-nums font-semibold text-ink">
                    {row.score}
                  </span>
                </li>
              ))}
            </ol>
          )}

          {error && (
            <p
              role="alert"
              className="mt-2 text-center text-[clamp(0.62rem,2.4vh,0.76rem)] leading-snug text-snow"
            >
              {error}
            </p>
          )}

          <div className="mt-2.5 flex justify-center">
            <button
              type="button"
              onClick={load}
              disabled={busy}
              className={`${SECONDARY} gap-2 disabled:opacity-60`}
            >
              {busy ? <Spinner className="h-3.5 w-3.5" /> : null}
              {busy ? "Refreshing…" : "Refresh"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/** The button that opens it, so both cards spell it the same way. */
function BoardButton({ onClick }: { onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className={SECONDARY}>
      Scoreboard
    </button>
  );
}

/**
 * The three ways on, in one place because both cards show the same three.
 *
 *     Invitation  ·  ▶  ·  Scoreboard
 *
 * The middle one is deliberately giant rather than one of three equals. A
 * player sitting in front of either card is going to press play, and making
 * them pick it out of a row of look-alikes is a tax on the thing they came to
 * do — so it is given the size that says so, and the other two stay quiet
 * either side of it.
 *
 * Shared rather than written twice, which is the only way the two cards can be
 * relied on to stay the same: the start card and the game-over card are edited
 * at different times for different reasons, and a row that is "the same" by
 * coincidence stops being the same on the first of those edits.
 */
function WaysOn({
  onLeave,
  onPlay,
  onBoard,
  playLabel,
}: {
  onLeave: () => void;
  onPlay: () => void;
  onBoard: () => void;
  playLabel: string;
}) {
  return (
    <div className="flex items-center justify-center gap-3 border-t border-gold/20 pt-3">
      <button type="button" onClick={onLeave} className={SECONDARY}>
        Invitation
      </button>

      <button
        type="button"
        onClick={onPlay}
        aria-label={playLabel}
        autoFocus
        className={PLAY}
        style={{
          width: "clamp(3.2rem, 13vh, 4.6rem)",
          height: "clamp(3.2rem, 13vh, 4.6rem)",
        }}
      >
        {/* Offset a hair right: a triangle centred on its bounding box reads
            as sitting left of centre inside a circle. */}
        <svg viewBox="0 0 24 24" className="h-[42%] w-[42%] translate-x-[6%]" fill="currentColor" aria-hidden>
          <path d="M8 5.5 L19 12 L8 18.5 Z" />
        </svg>
      </button>

      {/* The board's slot is held even when there is no board, so the play
          button stays on the centre line rather than sliding across. */}
      {CAN_SUBMIT ? (
        <BoardButton onClick={onBoard} />
      ) : (
        <span className="w-[5.9rem]" aria-hidden />
      )}
    </div>
  );
}

/* ---------------------------------------------------------------
   The door: who is playing
   ---------------------------------------------------------------
   Asked once, before the first run, and never again on this device — the same
   bargain the RSVP makes. Everything after it is quieter for it: scores go up
   by themselves at the end of a run, and nobody is asked to type while they
   are still looking at the number they just got.
   --------------------------------------------------------------- */

export function NameCard({
  onDone,
  onLeave,
  suggestion,
}: {
  onDone: (name: string) => void;
  onLeave: () => void;
  /** Whatever they RSVP'd as, if they did. Very often the only time they will
      have typed their name on this site. */
  suggestion: string;
}) {
  const [name, setName] = useState(suggestion);
  const [error, setError] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  function go(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) {
      setError("We need something to put on the board.");
      inputRef.current?.focus();
      return;
    }
    onDone(trimmed.slice(0, NAME_MAX));
  }

  return (
    <div className={BACKDROP}>
      <div className={`${CARD} max-w-md max-h-full overflow-y-auto`}>
        <div aria-hidden className="pointer-events-none absolute inset-0 parchment-texture" />

        <div className="relative px-5 py-[clamp(0.9rem,4vh,1.6rem)] sm:px-7">
          <header className="text-center">
            <Crown className="mx-auto h-[clamp(1.1rem,4vh,1.75rem)] w-auto text-gold" />
            <h1 className="mt-1 font-display text-[clamp(1.05rem,4.6vh,1.7rem)] italic leading-tight text-ink">
              Who is playing?
            </h1>
          </header>

          <form onSubmit={go} noValidate className="mt-3 flex flex-col gap-2">
            <input
              ref={inputRef}
              id="game-name"
              name="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoComplete="name"
              maxLength={NAME_MAX}
              placeholder="Juan Dela Cruz"
              className="w-full rounded-xl border border-gold/40 bg-parchment px-3.5 py-2.5 text-center font-body text-[clamp(0.9rem,3.6vh,1.1rem)] text-ink shadow-sm outline-none transition placeholder:text-ink/30 focus:border-gold focus:ring-2 focus:ring-gold/30"
            />

            {/* The one instruction that matters, and the reason for it. A
                scoreboard of "Mika", "Mika" and "Mika" belongs to nobody. */}
            <p className="text-center text-[clamp(0.65rem,2.7vh,0.82rem)] leading-snug text-ink/60">
              Your <b className="font-semibold text-ink/80">full name</b>, please — there will
              be more than one Mika at this party.
            </p>

            {error && (
              <p role="alert" className="text-center text-[clamp(0.65rem,2.6vh,0.8rem)] text-snow">
                {error}
              </p>
            )}

            <div className="mt-1 flex items-center justify-center gap-2.5">
              <button type="submit" className={PRIMARY}>
                <Sparkle className="h-3.5 w-3.5" />
                That&apos;s me
              </button>
              <button type="button" onClick={onLeave} className={SECONDARY}>
                Back
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

/* ---------------------------------------------------------------
   Before
   --------------------------------------------------------------- */

export function StartCard({
  onStart,
  onLeave,
  onRename,
  best,
  name,
}: {
  onStart: () => void;
  onLeave: () => void;
  onRename: () => void;
  best: number;
  name: string;
}) {
  const [board, setBoard] = useState(false);
  if (board) return <Leaderboard onClose={() => setBoard(false)} />;

  return (
    <div className={BACKDROP}>
      <div className={`${CARD} max-h-full overflow-y-auto`}>
        <div aria-hidden className="pointer-events-none absolute inset-0 parchment-texture" />

        <div className="relative flex flex-col gap-3 px-5 py-[clamp(0.75rem,3.5vh,1.5rem)] sm:px-7">
          <header className="text-center">
            <Crown className="mx-auto h-[clamp(1.1rem,4vh,1.75rem)] w-auto text-gold" />
            <h1 className="mt-1 font-display text-[clamp(1.1rem,5vh,1.9rem)] italic leading-tight text-ink">
              {BABY_NAME}&apos;s Royal Dash
            </h1>
            {/* Her name rather than the subtitle, once we know it. It is the
                whole of what "welcome back" needs to be — and it doubles as the
                check that the phone still thinks it is her, which on a phone
                being passed round a party it very often is not. */}
            <p className="mt-0.5 font-hand text-[clamp(0.8rem,3.4vh,1.1rem)] text-berry">
              {name ? `Welcome back, ${name}` : "Mind the rocks. Mind the birds."}
            </p>
          </header>

          {/*
            The rules, and all three of them.

            A hidden game gets one explanation and no second chance at it — a
            guest who does not understand the button inside ten seconds closes
            the tab. The third line is the one that is not obvious from
            playing: a bird is passed by *not* jumping, which is the opposite
            of what every other obstacle has taught them.
          */}
          {/* The second line is the one that earns its place now. A tap clears
              an ordinary rock in a window of about a tenth of a second; a hold
              more than doubles that, and the wide rocks take nothing else. */}
          <ul className="mx-auto grid w-full max-w-md gap-1.5 text-left">
            <Rule>
              <b className="font-semibold text-ink">Tap</b> the right of the screen for a quick
              hop.
            </Rule>
            <Rule>
              <b className="font-semibold text-ink">Hold</b> it for a bigger jump — the wide
              rocks need one.
            </Rule>
            {/* The birds are two rules wearing one drawing, and which one
                applies is the lane. Said as a pair, because said as either one
                alone it is worse than saying nothing. */}
            <Rule>
              <b className="font-semibold text-ink">Jump</b> a bird on the ground.{" "}
              <b className="font-semibold text-ink">Don&apos;t</b> jump at one in the air —
              run under it.
            </Rule>
          </ul>

          <WaysOn
            onLeave={onLeave}
            onPlay={onStart}
            onBoard={() => setBoard(true)}
            playLabel="Start running"
          />

          <p className="text-center text-[clamp(0.65rem,2.6vh,0.8rem)] leading-snug text-ink/50">
            {best > 0 && (
              <>
                Your best so far: <span className="font-semibold text-ink/70">{best}</span>
                {name ? " · " : ""}
              </>
            )}
            {/* A party is one phone passed between six children. Without this
                every one of their scores goes up under whoever typed first. */}
            {name && (
              <button
                type="button"
                onClick={onRename}
                className="underline underline-offset-2 transition hover:text-ink"
              >
                Not you?
              </button>
            )}
          </p>
        </div>
      </div>
    </div>
  );
}

function Rule({ children }: { children: React.ReactNode }) {
  return (
    <li className="flex items-start gap-2 text-[clamp(0.7rem,2.9vh,0.9rem)] leading-snug text-ink/70">
      <Sparkle className="mt-[0.3em] h-2.5 w-2.5 flex-none text-gold" />
      <span>{children}</span>
    </li>
  );
}

/* ---------------------------------------------------------------
   During
   --------------------------------------------------------------- */

export function PausedCard({
  onResume,
  onRestart,
  onLeave,
}: {
  onResume: () => void;
  onRestart: () => void;
  onLeave: () => void;
}) {
  return (
    <div className={BACKDROP}>
      <div className={`${CARD} max-w-md`}>
        <div aria-hidden className="pointer-events-none absolute inset-0 parchment-texture" />
        <div className="relative px-5 py-[clamp(0.9rem,4vh,1.6rem)] text-center sm:px-7">
          <h2 className="font-display text-[clamp(1.1rem,5vh,1.7rem)] italic text-ink">Paused</h2>
          <div aria-hidden className="gilt-rule mx-auto mt-2 h-px w-24" />
          <div className="mt-3 flex flex-wrap items-center justify-center gap-2.5">
            <button type="button" onClick={onResume} className={PRIMARY} autoFocus>
              Keep running
            </button>
            <button type="button" onClick={onRestart} className={SECONDARY}>
              Start over
            </button>
            <button type="button" onClick={onLeave} className={SECONDARY}>
              Leave
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ---------------------------------------------------------------
   After
   --------------------------------------------------------------- */

/**
 * `unsure` is the state that exists because of how an Apps Script web app
 * answers: the row is appended and the reply comes back separately, so a
 * failure on screen often sits on top of a score that did save. See
 * `submitScore`. It reads as neither success nor failure, and it is the one
 * state that does not put a plain "Save" back in front of the player.
 */
/**
 * How the automatic save is going.
 *
 * `kept` is the one that needs explaining: the run was real but did not beat
 * what the board already has for this player, so nothing was sent. See
 * `worthSending`, and the note over `SENT_KEY` for why that is measured
 * against what was *sent* rather than against their best.
 */
type Saving = "sending" | "sent" | "kept" | "error" | "unsure" | "off";

export function GameOverCard({
  score,
  best,
  name,
  onRestart,
  onLeave,
}: {
  score: number;
  best: number;
  name: string;
  onRestart: () => void;
  onLeave: () => void;
}) {
  const [state, setState] = useState<Saving>("sending");
  const [error, setError] = useState("");
  const [board, setBoard] = useState(false);
  /* What the board already holds for them, read in the effect rather than in
     render — `localStorage` has no business being touched while rendering. */
  const [standing, setStanding] = useState(0);

  const beaten = score > 0 && score >= best;

  /*
   * The save happens by itself, the moment the run ends.
   *
   * Nobody is asked to type at the end of a game any more — the name was taken
   * at the door, which is the only moment a player is not in the middle of
   * something. What is left here is a line of status and three buttons.
   *
   * It runs once. React in development mounts effects twice, so the guard is
   * not optional: without it every score goes up twice.
   */
  const sent = useRef(false);
  useEffect(() => {
    if (sent.current) return;
    sent.current = true;

    if (!CAN_SUBMIT || !name) {
      setState("off");
      return;
    }
    if (!worthSending(score)) {
      setStanding(readSent());
      setState("kept");
      return;
    }

    submitScore(name, score).then((result) => {
      if (result.ok) setState("sent");
      else {
        setState(result.certain ? "error" : "unsure");
        setError(result.error);
      }
    });
  }, [name, score]);

  if (board) return <Leaderboard onClose={() => setBoard(false)} />;

  const saving = state === "sending";

  return (
    <div className={BACKDROP}>
      <div className={`${CARD} max-w-md max-h-full overflow-y-auto`}>
        <div aria-hidden className="pointer-events-none absolute inset-0 parchment-texture" />

        <div className="relative px-5 py-[clamp(0.75rem,3.5vh,1.5rem)] text-center sm:px-7">
          <p className="font-hand text-[clamp(0.85rem,3.4vh,1.15rem)] text-berry">
            {beaten ? "A new best!" : "Game over"}
          </p>
          <p className="font-display text-[clamp(2.2rem,11vh,3.8rem)] font-bold leading-none text-ink">
            {score}
          </p>

          {/* One line, always, so the card never changes height as the save
              settles and the buttons never move under a finger. */}
          <p className="mt-1.5 flex min-h-[1.4em] items-center justify-center gap-1.5 text-[clamp(0.65rem,2.7vh,0.82rem)] leading-snug text-ink/60">
            {saving && (
              <>
                <Spinner className="h-3.5 w-3.5" />
                Saving your score…
              </>
            )}
            {state === "sent" && (
              <>
                <CheckIcon className="h-4 w-4 text-goldDeep" />
                On the board, {name}.
              </>
            )}
            {state === "kept" && <>Your {standing} on the board still stands.</>}
            {state === "off" && <>Kept on this device.</>}
            {state === "unsure" && <>It&apos;s probably on the board — we didn&apos;t hear back.</>}
            {state === "error" && <span className="text-snow">{error}</span>}
          </p>

          {/*
            Hidden while the save is in flight. Two of the three throw this
            card away, and a save still waiting on a round trip to Google would
            go with it.
          */}
          {!saving && (
            <div className="mt-3">
              <WaysOn
                onLeave={onLeave}
                onPlay={onRestart}
                onBoard={() => setBoard(true)}
                playLabel="Play again"
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
