"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { BABY_NAME } from "@/app/config";
import { Crown, Sparkle, Spinner, CheckIcon, CloseIcon } from "@/app/components/Ornaments";
import {
  cachedTop,
  CAN_SUBMIT,
  fetchTopScores,
  NAME_MAX,
  readName,
  submitScore,
  writeName,
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

const PRIMARY =
  "flex min-h-[2.6rem] items-center justify-center gap-2 rounded-full bg-gold px-6 font-display text-[clamp(0.85rem,3.4vh,1.05rem)] font-semibold text-night shadow-lg shadow-gold/20 transition active:scale-[0.98] hover:bg-goldSoft disabled:opacity-60";

const SECONDARY =
  "flex min-h-[2.6rem] items-center justify-center rounded-full border border-gold/50 px-5 font-display text-[clamp(0.8rem,3.2vh,1rem)] text-ink/75 transition active:scale-[0.98] hover:bg-mist hover:text-ink";

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
      <div className={`${CARD} max-h-full overflow-y-auto`}>
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
      Top 10
    </button>
  );
}

/* ---------------------------------------------------------------
   Before
   --------------------------------------------------------------- */

export function StartCard({
  onStart,
  onLeave,
  best,
}: {
  onStart: () => void;
  onLeave: () => void;
  best: number;
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
            <p className="mt-0.5 font-hand text-[clamp(0.8rem,3.4vh,1.1rem)] text-berry">
              Mind the rocks. Mind the birds.
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
            <Rule>
              Birds fly low — <b className="font-semibold text-ink">don&apos;t jump</b>, run
              underneath them.
            </Rule>
          </ul>

          <div className="flex flex-wrap items-center justify-center gap-2.5">
            <button type="button" onClick={onStart} className={PRIMARY} autoFocus>
              <Sparkle className="h-3.5 w-3.5" />
              Start running
            </button>
            {CAN_SUBMIT && <BoardButton onClick={() => setBoard(true)} />}
            <button type="button" onClick={onLeave} className={SECONDARY}>
              Back
            </button>
          </div>

          {best > 0 && (
            <p className="text-center text-[clamp(0.65rem,2.6vh,0.8rem)] text-ink/50">
              Your best so far: <span className="font-semibold text-ink/70">{best}</span>
            </p>
          )}
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
type Sending = "idle" | "sending" | "sent" | "error" | "unsure";

export function GameOverCard({
  score,
  best,
  onRestart,
  onLeave,
}: {
  score: number;
  best: number;
  onRestart: () => void;
  onLeave: () => void;
}) {
  const [name, setName] = useState("");
  const [state, setState] = useState<Sending>("idle");
  const [error, setError] = useState("");
  const [board, setBoard] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  /* Read on mount rather than in `useState`'s initialiser: this renders on the
     server during the export, where there is no `localStorage` to read. */
  useEffect(() => setName(readName()), []);

  const beaten = score > 0 && score >= best;

  /**
   * Whether the save is in flight.
   *
   * It takes the whole card over: while it is true, "Run again" and "Back to
   * the invitation" are not drawn at all. Both of them throw the card away —
   * one starts a new run, the other leaves the page — and a save that is still
   * waiting on a round trip to Google would go with it, silently, half a second
   * before it would have landed. Disabling them would say the same thing, but a
   * greyed button still reads as something to press and wait out; a button that
   * is not there is not a decision anybody has to make.
   */
  const sending = state === "sending";

  if (board) return <Leaderboard onClose={() => setBoard(false)} />;

  async function send(e: React.FormEvent) {
    e.preventDefault();
    if (state === "sending" || state === "sent") return;
    if (!name.trim()) {
      setError("Who shall we put on the board?");
      inputRef.current?.focus();
      return;
    }
    setState("sending");
    setError("");
    writeName(name.trim());

    const result = await submitScore(name, score);
    if (result.ok) {
      setState("sent");
      return;
    }
    setState(result.certain ? "error" : "unsure");
    setError(result.error);
  }

  return (
    <div className={BACKDROP}>
      <div className={`${CARD} max-h-full overflow-y-auto`}>
        <div aria-hidden className="pointer-events-none absolute inset-0 parchment-texture" />

        <div className="relative px-5 py-[clamp(0.75rem,3.5vh,1.5rem)] sm:px-7">
          {/* Side by side, because height is what a landscape screen has least
              of — the score on the left, the scoreboard on the right. */}
          <div className="flex flex-col items-stretch gap-4 sm:flex-row sm:items-center">
            <div className="flex-none text-center sm:w-40">
              <p className="font-hand text-[clamp(0.85rem,3.4vh,1.15rem)] text-berry">
                {beaten ? "A new best!" : "Game over"}
              </p>
              <p className="font-display text-[clamp(1.9rem,9vh,3.2rem)] font-bold leading-none text-ink">
                {score}
              </p>
              <p className="mt-1 text-[clamp(0.62rem,2.5vh,0.78rem)] uppercase tracking-[0.16em] text-goldDeep">
                {beaten ? "Your best yet" : `Best ${best}`}
              </p>
            </div>

            <div aria-hidden className="hidden w-px self-stretch bg-gold/30 sm:block" />

            <div className="min-w-0 flex-1">
              {!CAN_SUBMIT ? (
                <p className="text-center text-[clamp(0.7rem,2.9vh,0.9rem)] leading-snug text-ink/60">
                  Kept on this device. The royal scoreboard isn&apos;t open yet.
                </p>
              ) : state === "sent" ? (
                <div className="text-center">
                  <span className="mx-auto flex h-9 w-9 items-center justify-center rounded-full border border-gold/50 text-goldDeep">
                    <CheckIcon className="h-5 w-5" />
                  </span>
                  <p className="mt-1.5 text-[clamp(0.72rem,2.9vh,0.9rem)] leading-snug text-ink/70">
                    On the board, {name.trim()}. Beat it?
                  </p>
                </div>
              ) : state === "unsure" ? (
                /* Not a failure and not a success. The row has very likely
                   landed — see `submitScore` — so the honest thing is to say
                   what is and isn't known and leave sending it again as a
                   deliberate act rather than the obvious correction. */
                <div className="text-center">
                  <p className="text-[clamp(0.72rem,2.9vh,0.9rem)] leading-snug text-ink/75">
                    It&apos;s probably on the board already — we just didn&apos;t get an answer
                    back to be sure.
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      setState("idle");
                      setError("");
                    }}
                    className={`${SECONDARY} mx-auto mt-2`}
                  >
                    Send it again anyway
                  </button>
                </div>
              ) : (
                <form onSubmit={send} noValidate className="flex flex-col gap-2">
                  <label
                    htmlFor="game-name"
                    className="text-[clamp(0.6rem,2.4vh,0.72rem)] font-semibold uppercase tracking-[0.14em] text-goldDeep"
                  >
                    Add your score to the board
                  </label>
                  <div className="flex gap-2">
                    <input
                      ref={inputRef}
                      id="game-name"
                      name="name"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      autoComplete="name"
                      maxLength={NAME_MAX}
                      placeholder="Your name"
                      className="min-w-0 flex-1 rounded-xl border border-gold/40 bg-parchment px-3 py-2 font-body text-[clamp(0.8rem,3.2vh,1rem)] text-ink shadow-sm outline-none transition placeholder:text-ink/30 focus:border-gold focus:ring-2 focus:ring-gold/30"
                    />
                    <button
                      type="submit"
                      disabled={sending}
                      className={`${PRIMARY} flex-none px-5`}
                    >
                      {sending ? <Spinner className="h-4 w-4" /> : "Save"}
                    </button>
                  </div>
                  {error && (
                    <p
                      role="alert"
                      className="text-[clamp(0.62rem,2.5vh,0.78rem)] leading-snug text-snow"
                    >
                      {error}
                    </p>
                  )}
                </form>
              )}
            </div>
          </div>

          {/* Gone entirely while the save is in flight — see `sending` above. */}
          {!sending && (
            <div className="mt-3 flex flex-wrap items-center justify-center gap-2.5 border-t border-gold/20 pt-3">
              <button type="button" onClick={onRestart} className={PRIMARY} autoFocus>
                Run again
              </button>
              {CAN_SUBMIT && <BoardButton onClick={() => setBoard(true)} />}
              <button type="button" onClick={onLeave} className={SECONDARY}>
                Back to the invitation
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
