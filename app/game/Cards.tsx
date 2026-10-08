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
   invitation is printed on, so the game reads as part of the same book.

   The look is kept apart from the width because the scoreboard needs the one
   without the other: it sizes itself to its contents rather than filling the
   space, and `w-full` and `w-auto` on the same element is a coin toss decided
   by whichever Tailwind happened to emit last. */
const CARD_LOOK =
  "relative overflow-hidden rounded-3xl border border-gold/40 bg-parchment shadow-2xl";

const CARD = `${CARD_LOOK} w-full max-w-xl`;

/**
 * The three that get a crown, in the metal they earned.
 *
 * Silver is the awkward one — a true grey all but disappears on cream — so it
 * is pushed cooler and darker than a medal really is. Read next to the gold
 * and the bronze it still says silver, which is the only place it has to work.
 */
const MEDALS = ["#C9A227", "#8A94A1", "#B0702B"];

const BACKDROP_BOX =
  "absolute inset-0 z-20 flex items-center justify-center p-[max(0.75rem,env(safe-area-inset-left))]";

/**
 * Over a game that has stopped: dimmed and blurred, so the eye goes to the card.
 *
 * Only the pause card now. Pausing is the one moment the player is being asked
 * to stop looking at the game, and taking the world out of focus says so
 * without a word.
 */
const BACKDROP = `${BACKDROP_BOX} bg-night/70 backdrop-blur-sm`;

/**
 * Over a game that is still moving: nothing at all.
 *
 * The menu, the door and the end of a run all sit over a world that is running
 * — she is out there jogging along an empty field before the first press, and
 * still standing in the one she just lost in afterwards. Dimming that would
 * throw away the only thing on screen worth looking at while you decide, and
 * blurring it costs a full-screen filter every frame for the privilege.
 */
const BACKDROP_CLEAR = BACKDROP_BOX;

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

/**
 * `PLAY` in the quieter palette, for a round button that is not the one being
 * recommended.
 *
 * It does real work on the pause card, where *home* and *replay* flank
 * *resume*: both of them throw away a run that is still waiting behind the
 * card, so neither should be the easiest thing to hit. Same shape, so the row
 * reads as one set of controls; quieter colour and smaller, so the gold one in
 * the middle is plainly the way back to what you were doing.
 */
const ROUND =
  `${BUTTON} flex-none bg-gradient-to-b from-white to-[#F6E8D8] text-ink/75 ` +
  "border-2 border-gold/60 " +
  "shadow-[0_4px_0_0_#DCC79B,0_7px_14px_rgba(62,40,20,0.22)] " +
  "hover:from-white hover:to-mist hover:text-ink " +
  "active:translate-y-[4px] active:shadow-[0_0_0_0_#DCC79B,0_2px_5px_rgba(62,40,20,0.18)]";

/**
 * The two round sizes: the one you want, and the two either side of it.
 *
 * Every stop of the smaller clamp is 78% of the matching stop of the larger —
 * 2.5/3.2, 10/13, 3.6/4.6 — so the proportion holds at every screen height
 * rather than only at the one it was eyeballed on. A ratio that drifts as the
 * window changes is how a deliberate hierarchy turns into three buttons that
 * merely happen to differ.
 */
const BIG_ROUND = "clamp(3.2rem, 13vh, 4.6rem)";
const MID_ROUND = "clamp(2.5rem, 10vh, 3.6rem)";

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
      {/*
        Sized by its own contents, unlike every other card here, and that is
        the whole layout decision.

        A name and its score belong next to each other. Given the width of the
        other cards they sit at opposite ends of a long empty line, and a
        leaderboard you have to track across is not one anybody reads — but
        pinned narrow instead, a party full of full names ellipsises down to
        "Maria Cristina D…" and the board stops naming anybody.

        So: `w-auto`, and it takes the width of its longest row. A floor so a
        board of three-letter names is not a sliver, and a ceiling so one guest
        typing a hundred characters cannot push it off the screen — past that
        the name truncates, which by then is the right answer.
      */}
      <div
        className={`${CARD_LOOK} w-auto min-w-[17.5rem] max-w-[min(92vw,34rem)] max-h-full overflow-y-auto`}
      >
        <div aria-hidden className="pointer-events-none absolute inset-0 parchment-texture" />

        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="absolute right-2.5 top-2.5 z-10 flex h-8 w-8 items-center justify-center rounded-full text-ink/50 transition active:scale-95 hover:bg-mist hover:text-ink"
        >
          <CloseIcon className="h-4 w-4" />
        </button>

        <div className="relative px-5 py-[clamp(0.45rem,3vh,1.2rem)] sm:px-7">
          {/* Padded past the close button on both sides, so the title stays
              honestly centred instead of centring on a line the button is
              sitting in — which at the card's narrowest, with a board full of
              three-letter names, it otherwise runs straight into. */}
          <h2 className="px-7 text-center font-display text-[clamp(0.95rem,4vh,1.4rem)] italic text-ink">
            The royal scoreboard
          </h2>
          <div aria-hidden className="gilt-rule mx-auto mt-1.5 h-px w-20" />

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
            <ol className="mt-[clamp(0.5rem,2.6vh,1.15rem)]">
              {rows.map((row, i) => (
                <li
                  key={`${row.name}-${i}`}
                  className="flex items-baseline gap-3 border-b border-gold/15 py-[clamp(0.07rem,0.75vh,0.4rem)] text-[clamp(0.7rem,3.2vh,1.08rem)] leading-snug last:border-0"
                >
                  {/*
                    A crown for the first three, a number for the rest, both in
                    the same slot so every name starts on the same line.

                    The slot is sized in `em`, so it keeps its proportion to the
                    type rather than drifting as the rows grow on a taller
                    screen. The crown is nudged down a touch because it sits in
                    a baseline-aligned row and has no baseline of its own — left
                    alone it floats above the name beside it.
                  */}
                  <span
                    className="flex w-[1.7em] flex-none justify-center"
                    /* On the slot rather than the crown: `Crown` is drawn in
                       `currentColor` precisely so the caller can set it with
                       ordinary inheritance and the icon needs no prop for it. */
                    style={i < 3 ? { color: MEDALS[i] } : undefined}
                  >
                    {i < 3 ? (
                      <Crown className="h-[0.88em] w-auto translate-y-[0.1em]" />
                    ) : (
                      <span className="font-display font-semibold text-goldDeep">{i + 1}</span>
                    )}
                  </span>

                  {/*
                    No `flex-1`. The name contributes its own width to the card,
                    which is what lets the board size itself to the longest name
                    rather than to a figure picked in advance; the score is sent
                    to the far side by its own margin instead. `truncate` still
                    has the last word once the card hits its ceiling — the name
                    is a guest's own typing from a public endpoint and may be a
                    hundred characters.
                  */}
                  <span className="min-w-0 truncate text-ink/80">{row.name}</span>
                  <span className="ml-auto flex-none pl-2 font-mono tabular-nums font-semibold text-ink">
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

          <div className="mt-[clamp(0.4rem,1.6vh,0.7rem)] flex justify-center">
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
  onMenu,
  playLabel,
}: {
  onLeave: () => void;
  onPlay: () => void;
  onBoard: () => void;
  /** Given only where there is somewhere to go back to — see below. */
  onMenu?: () => void;
  playLabel: string;
}) {
  return (
    <div className="border-t border-gold/20 pt-3">
    <div className="flex items-center justify-center gap-3">
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

    {/*
      A second row, under the play button, and only at the end of a run.

      The menu is not one of the three ways on — it is a way *back*, and giving
      it a fourth seat in that row would say otherwise. Three equals and a
      giant play button is a row that has been designed; four equals and a
      giant one is a row that has had something added to it.

      So it sits beneath, quieter and full-width, where it reads as the way out
      of this card rather than a rival to the thing the card is for. The start
      card never gets one: you are already standing on the menu.
    */}
    {onMenu && (
      <div className="mt-2.5 flex justify-center">
        <button
          type="button"
          onClick={onMenu}
          className={`${SECONDARY} w-full max-w-[16rem]`}
        >
          Back to main menu
        </button>
      </div>
    )}
    </div>
  );
}

/* ---------------------------------------------------------------
   The door: who is playing
   ---------------------------------------------------------------
   Reached from the menu, not before it — by pressing play with no name on
   file, or by choosing *Change name*. Asked once and then never again on this
   device, the same bargain the RSVP makes, so everything after it is quiet:
   scores go up by themselves at the end of a run and nobody is asked to type
   while they are still looking at the number they just got.

   Because the menu is always what this was opened from, *Back* goes there.
   The way off the site is on the menu, one step behind, where somebody who
   wants it can find it and somebody who does not cannot hit it by accident
   while reaching for the keyboard.
   --------------------------------------------------------------- */

export function NameCard({
  onDone,
  onBack,
  suggestion,
}: {
  onDone: (name: string) => void;
  /** Back to the menu, which is always what this was opened from. */
  onBack: () => void;
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
    <div className={BACKDROP_CLEAR}>
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
              be more than one you at this party.
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
              <button type="button" onClick={onBack} className={SECONDARY}>
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
    /* Nudged up off the true centre. The field behind this card is running —
       she is down on the grass in the lower third — and a card sitting dead
       centre lands squarely on her. Bottom padding rather than a transform, so
       on a short screen the card loses the gap instead of the top of itself. */
    <div className={`${BACKDROP_CLEAR} pb-[9vh]`}>
      <div className={`${CARD} max-w-lg max-h-full overflow-y-auto`}>
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
                {" · "}
              </>
            )}
            {/*
              A party is one phone passed between six children, and without a
              way to say so, every one of their scores goes up under whoever
              typed first.

              Offered whether or not there is a name yet. Before the first run
              there is nothing to change but there is something to *set*, and
              putting it here lets somebody decide who they are on their own
              time rather than being stopped for it on the way into a game they
              have just this moment found.
            */}
            <button
              type="button"
              onClick={onRename}
              className="underline underline-offset-2 transition hover:text-ink"
            >
              {name ? "Change name" : "Set your name"}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}

/* ---------------------------------------------------------------
   During
   --------------------------------------------------------------- */

/**
 * Something to read while you get your breath back.
 *
 * A pause card is dead space — the one screen in the game with nothing to do
 * on it — and a line that is different every time turns it into something a
 * child will pause *on purpose* to collect. Which is the point: this is a
 * birthday invitation, and the game is a party trick.
 *
 * They are about the field she is standing in rather than about pausing in
 * general, because a joke that knows what the player was just doing is worth
 * three that could sit on any game ever made. The birds, the boulder, the
 * berries and the weather are all out there, waiting, and saying so is funnier
 * than saying "take a break".
 */
const PAUSE_LINES = [
  "The rocks will wait. They're very patient.",
  "Even a princess may sit down.",
  "The birds have agreed to hover politely.",
  "Somewhere, a rabbit is holding its breath.",
  "The boulder has stopped. Don't keep it waiting.",
  "Tiara adjustment in progress.",
  "The sun is holding still for you.",
  "Nobody tell the bushes.",
  "Royal decree: one short rest.",
  "The clouds have been asked to stay put.",
  "Time has stopped. The cake has not.",
  "Breathe. The berries aren't going anywhere.",
  "Even the weather is waiting.",
  "This is the easiest part of the game.",
  "Your legs are fine. It's the birds.",
  "A perfectly reasonable place to stop.",
  "The high score will keep.",
  "The ground birds are plotting. The sky ones are smug.",
  "One does not simply run forever.",
  "Mind the rocks. Later.",
  "Intermission. Refreshments at the party.",
  "The field is holding its breath too.",
  "No rush — the party isn't going anywhere.",
  "Three lives, and all the time in the world.",
];

/** The last one shown, so the next pause is never the same line twice. */
let lastLine = -1;

/**
 * One line, at random, but never the one just seen.
 *
 * Without the nudge a run of two dozen will repeat itself back to back often
 * enough to notice — roughly one pause in twenty-four — and a "random" line
 * that comes up twice running reads as broken rather than as chance.
 */
function pauseLine(): string {
  let i = Math.floor(Math.random() * PAUSE_LINES.length);
  if (i === lastLine) i = (i + 1) % PAUSE_LINES.length;
  lastLine = i;
  return PAUSE_LINES[i];
}

/**
 * Three round controls, and no words on any of them.
 *
 * A pause card is the one place in the game where nothing has to be explained.
 * Whoever is looking at it is already playing, already knows what the triangle
 * does, and wants their run back — so the whole card is a house, a triangle and
 * a circling arrow, which a child who cannot read yet can still use.
 *
 * Resume is the big gold one in the middle and the only one focused, because
 * it is what nine presses in ten are reaching for. Home and replay match each
 * other and are smaller, which is the hierarchy said twice — in size and in
 * colour — so it survives both a glance and a sideways phone in bright sun.
 * They are also the two that throw away a run still waiting behind the card,
 * and a destructive button should never be the easiest thing to hit.
 *
 * Home leads to the menu rather than off the site. Leaving altogether is one
 * step further on, which is the right distance for it — nobody quits a game
 * they have paused mid-run by accident, and the menu's *Invitation* is right
 * there for anyone who means it.
 */
export function PausedCard({
  onResume,
  onRestart,
  onMenu,
}: {
  onResume: () => void;
  onRestart: () => void;
  onMenu: () => void;
}) {
  const [line] = useState(pauseLine);

  return (
    <div className={BACKDROP}>
      <div className={`${CARD} max-w-md`}>
        <div aria-hidden className="pointer-events-none absolute inset-0 parchment-texture" />
        <div className="relative px-5 py-[clamp(0.9rem,4vh,1.6rem)] text-center sm:px-7">
          <h2 className="font-display text-[clamp(1.1rem,5vh,1.7rem)] italic text-ink">Paused</h2>

          {/* Chosen once, when the card mounts, so it holds still while it is
              being read — picked during render rather than in an effect, which
              is safe here because this card is never on screen at build time:
              a run has to start before it can be paused. */}
          <p className="mx-auto mt-1 max-w-[34ch] font-hand text-[clamp(0.78rem,3.1vh,1.02rem)] leading-snug text-berry">
            {line}
          </p>

          <div aria-hidden className="gilt-rule mx-auto mt-2 h-px w-24" />

          <div className="mt-3.5 flex items-center justify-center gap-3 sm:gap-4">
            <button
              type="button"
              onClick={onMenu}
              aria-label="Main menu"
              className={ROUND}
              style={{ width: MID_ROUND, height: MID_ROUND }}
            >
              {/* A shade smaller than the circling arrow at the same size: the
                  house is a wider, more solid shape and matching the numbers
                  would make it the heaviest thing in the row. */}
              <HomeIcon className="h-[46%] w-[46%]" />
            </button>

            <button
              type="button"
              onClick={onResume}
              aria-label="Keep running"
              autoFocus
              className={PLAY}
              style={{ width: BIG_ROUND, height: BIG_ROUND }}
            >
              {/* Offset a hair right: a triangle centred on its bounding box
                  reads as sitting left of centre inside a circle. */}
              <svg
                viewBox="0 0 24 24"
                className="h-[42%] w-[42%] translate-x-[6%]"
                fill="currentColor"
                aria-hidden
              >
                <path d="M8 5.5 L19 12 L8 18.5 Z" />
              </svg>
            </button>

            <button
              type="button"
              onClick={onRestart}
              aria-label="Start over"
              className={ROUND}
              style={{ width: MID_ROUND, height: MID_ROUND }}
            >
              <ReplayIcon className="h-[48%] w-[48%]" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/** A house. Roof, walls, door — nothing else survives being drawn this small. */
function HomeIcon({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" aria-hidden>
      <path
        d="M3.2 11.4 L12 4.2 L20.8 11.4"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M5.7 10.1 V19.8 H18.3 V10.1"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M9.9 19.8 V14.4 H14.1 V19.8"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/**
 * Round again: three quarters of a circle with an arrowhead carrying on round.
 *
 * The arc runs from the right, under the bottom and up the left, finishing at
 * the top — so the head at the top is travelling rightwards and the whole
 * thing turns clockwise, which is the direction this glyph is read in
 * everywhere else it appears.
 */
function ReplayIcon({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" aria-hidden>
      <path
        d="M19.5 12 A7.5 7.5 0 1 1 12 4.5"
        stroke="currentColor"
        strokeWidth="2.1"
        strokeLinecap="round"
      />
      <path d="M12 1.9 L12 7.1 L15.4 4.5 Z" fill="currentColor" />
    </svg>
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
  onMenu,
  onLeave,
  slideRef,
}: {
  score: number;
  best: number;
  name: string;
  onRestart: () => void;
  onMenu: () => void;
  onLeave: () => void;
  /**
   * The card itself, for the loop to move.
   *
   * Its entrance is not this component's to time. It comes down while the
   * world is still braking and she is still bouncing, and the only clock that
   * knows about either is the simulation's — so `Game.tsx` writes the transform
   * straight onto this node every frame, the same way it writes the score.
   * A timer in here would be a second clock to keep in step with the first,
   * and it was: the card used to arrive a second and a half after she landed.
   */
  slideRef?: React.Ref<HTMLDivElement>;
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
    /* Clear, and the card comes down over it. The world behind is the field she
       just lost in and it is still moving — dimming it would throw away the one
       thing on screen, and a card that simply appears in the middle of a
       running game reads as a dialog box rather than as the run ending. */
    <div className={BACKDROP_CLEAR}>
      <div ref={slideRef} className={`${CARD} max-w-md max-h-full overflow-y-auto`}>
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
                onMenu={onMenu}
                playLabel="Play again"
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
