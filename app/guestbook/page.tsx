"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { BABY_NAME, GUESTBOOK_PORTRAIT, LEDGER_KEY } from "@/app/config";
import { Crown, Sparkle, Spinner } from "@/app/components/Ornaments";
import { useIsLandscape } from "@/app/game/orientation";
import { BOARD_TOP, fetchTopScores, type TopScore } from "@/app/game/ledger";
import { Flourishes } from "./Flourishes";
import { fetchMessages, type Message } from "./messages";

/**
 * The guestbook, for a television.
 *
 * ---------------------------------------------------------------------------
 * What this is actually for
 * ---------------------------------------------------------------------------
 * One screen in the corner of a room, left running for an afternoon, read from
 * across that room by people holding a plate. Every decision below comes from
 * that and not from the rest of the site:
 *
 *   * **It never scrolls.** A message is one screenful or it is set smaller
 *     until it is — see `fit`. Nobody is going to walk over and scroll a
 *     television.
 *   * **It turns itself.** Fifteen seconds a message, and the arrow keys or a
 *     click take it anywhere sooner.
 *   * **It stays fresh.** Messages arrive *during* the party, so it asks for
 *     the list again every couple of minutes rather than being a snapshot of
 *     whenever somebody opened the tab.
 *   * **It is landscape.** A phone held upright is told so rather than being
 *     given a squashed version of a thing designed for a 16:9 screen.
 *
 * It can also deal the **scoreboard** into the rotation, which it does not do
 * unless the URL asks with the seal word — see `showScores`. The standings are
 * the host's to announce, and this screen is the most public surface at the
 * party; switching it on is a thing to do after the announcement, not before.
 */

/** How long a message holds before the next one, in milliseconds. */
const DWELL_MS = 15_000;

/** How often the list is asked for again, for messages sent during the party. */
const REFRESH_MS = 120_000;

/**
 * The longest the words take to finish arriving, in seconds.
 *
 * The per-word delay is divided out of this rather than being a fixed figure,
 * which is the only way a four-word message and a hundred-word one both finish
 * in time to be read. At a flat 60ms a word, a long message would still be
 * assembling itself when the next one arrived.
 */
const REVEAL_S = 4.2;

/**
 * The size a message is set at, as a share of the smaller side of the screen.
 *
 * Not a tier table any more, and the reason is the room. This screen is read
 * from across it, by people holding a plate, so every message should be as
 * large as it can be — and "as large as it can be" is a different number for
 * four words than for a hundred, on every different screen it is shown on.
 * Six hard-coded steps could only ever be right for one of them; measured in
 * `sizeFor`'s old tiers, a short message on a television left most of the
 * screen empty and still set the type smaller than the wall could carry.
 *
 * So the size is *found* instead — see `fit`. These are only the rails it
 * searches between. The ceiling is what stops a two-word message from becoming
 * a poster; the floor is where a very long message stops shrinking and is
 * allowed to be clipped instead, which has not happened yet at the lengths
 * these forms accept.
 */
const FIT_MIN_VMIN = 2.4;
const FIT_MAX_VMIN = 13;

/**
 * How many messages pass between showings of the scoreboard.
 *
 * Only when it has been switched on at all — see `?scores=` below. Once per
 * full cycle would have been simpler, but with fifty messages on the wall that
 * is once every twelve minutes, which is not a thing anybody waiting to see
 * the board would sit through. Every eighth puts it on screen about every two
 * minutes without it becoming the thing the screen is mostly showing.
 */
const SCORES_EVERY = 8;

/**
 * What the wall is showing at any moment: somebody's message, or the board.
 *
 * A union rather than a flag, so the rotation is one list of slides and
 * everything that walks it — the dwell, the arrow keys, the counter in the
 * corner — carries on knowing nothing about what a slide contains.
 */
type Slide = { kind: "message"; message: Message } | { kind: "scores" };

/**
 * The largest type that still fits the box, found by halving.
 *
 * Binary search rather than a formula, because the thing being solved for —
 * how many lines a paragraph wraps into — is a step function with no closed
 * form: it depends on where the spaces fall, which words are long, and the
 * font's own metrics at that exact size. Twelve halvings of a ~200px range
 * lands inside a twentieth of a pixel, which is far past what anyone can see,
 * and costs twelve layout reads on a screen that changes every fifteen
 * seconds.
 *
 * Both axes are checked. Height is what usually binds, but a single
 * unbreakable word — a long name, a URL somebody pasted — overflows sideways
 * at a size the height was perfectly happy with.
 */
function fit(box: HTMLElement, text: HTMLElement, min: number, max: number): number {
  let lo = min;
  let hi = max;
  for (let i = 0; i < 12; i += 1) {
    const mid = (lo + hi) / 2;
    text.style.fontSize = `${mid}px`;
    const fits = text.scrollHeight <= box.clientHeight && text.scrollWidth <= box.clientWidth;
    if (fits) lo = mid;
    else hi = mid;
  }
  text.style.fontSize = `${lo}px`;
  return lo;
}

export default function Guestbook() {
  const landscape = useIsLandscape();

  const [messages, setMessages] = useState<Message[] | null>(null);
  const [error, setError] = useState("");
  const [at, setAt] = useState(0);

  /*
   * The scoreboard, which this screen does not show unless asked.
   *
   * It is **off by default and gated on the same word as `/royal-ledger`**,
   * because this screen is a television in a room full of guests: turning it
   * on puts the standings in front of everybody, which is the opposite of what
   * the sealed board in the game is for. That is a thing to do *after* the
   * host has read the top ten out, and the person who has that link is the
   * person who decides when.
   *
   * One secret rather than two, deliberately. `?scores=<the seal word>`.
   *
   * Nothing is fetched while it is off, so a guestbook left running all
   * afternoon never so much as asks the sheet for a score.
   */
  const [showScores, setShowScores] = useState(false);
  const [scores, setScores] = useState<TopScore[]>([]);
  useEffect(() => {
    const asked = new URLSearchParams(window.location.search).get("scores");
    setShowScores(asked === LEDGER_KEY);
  }, []);

  /* Bumped on every manual move, so the dwell timer restarts rather than
     firing halfway through a message somebody just chose. */
  const [turn, setTurn] = useState(0);

  const load = useCallback(() => {
    fetchMessages().then((result) => {
      if (result.ok) {
        setMessages(result.messages);
        setError("");
      } else {
        /* The list already on screen is left alone. A guestbook that was right
           two minutes ago is better than an error where the messages were —
           this thing is unattended, and nobody is coming to press retry. */
        setError(result.error);
        setMessages((was) => was ?? []);
      }
    });
  }, []);

  useEffect(load, [load]);

  useEffect(() => {
    const id = window.setInterval(load, REFRESH_MS);
    return () => window.clearInterval(id);
  }, [load]);

  /* The board, on the same heartbeat — runs are still being played while this
     is on screen, so a board fetched once at eleven o'clock would be a lie by
     one o'clock. A failure leaves whatever is already there. */
  useEffect(() => {
    if (!showScores) return;
    const read = () => {
      fetchTopScores().then((result) => {
        if (result.ok) setScores(result.top);
      });
    };
    read();
    const id = window.setInterval(read, REFRESH_MS);
    return () => window.clearInterval(id);
  }, [showScores]);

  /*
   * The rotation: every message, with the board dealt in among them.
   *
   * Built here rather than at the point of rendering so that `total` — which
   * the dwell timer, the arrow keys and the counter all work off — counts
   * slides rather than messages. The fallback at the end covers the party that
   * has scores but no approved messages yet: without it the board would be
   * switched on and never once appear.
   */
  const slides = useMemo<Slide[]>(() => {
    const out: Slide[] = [];
    const board: Slide = { kind: "scores" };
    const showing = showScores && scores.length > 0;
    (messages ?? []).forEach((message, i) => {
      out.push({ kind: "message", message });
      if (showing && (i + 1) % SCORES_EVERY === 0) out.push(board);
    });
    if (showing && !out.some((slide) => slide.kind === "scores")) out.push(board);
    return out;
  }, [messages, showScores, scores.length]);

  const total = slides.length;

  const go = useCallback(
    (by: number) => {
      if (total === 0) return;
      setAt((i) => (i + by + total) % total);
      setTurn((t) => t + 1);
    },
    [total]
  );

  /* The dwell. Keyed on `turn` as well as `at` so a manual move gives the new
     message its full fifteen seconds. */
  useEffect(() => {
    if (total < 2) return;
    const id = window.setTimeout(() => go(1), DWELL_MS);
    return () => window.clearTimeout(id);
  }, [at, turn, total, go]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight" || e.key === " " || e.key === "Enter") {
        e.preventDefault();
        go(1);
      } else if (e.key === "ArrowLeft") {
        e.preventDefault();
        go(-1);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [go]);

  const slide = total > 0 ? slides[at % total] : null;
  const current = slide?.kind === "message" ? slide.message : null;

  /* Split once per message rather than once per render: the reveal below maps
     over this, and re-splitting on every frame of an animation would rebuild
     every word's element and restart the animation it was in the middle of. */
  const words = useMemo(() => (current ? current.message.split(/\s+/) : []), [current]);
  const step = words.length > 0 ? Math.min(0.075, REVEAL_S / words.length) : 0;

  /*
   * Sizing the message to the space it has.
   *
   * Done through a **callback ref** rather than an effect, and that is not a
   * stylistic choice. `AnimatePresence mode="wait"` keeps the outgoing message
   * mounted until its exit animation finishes, so an effect watching `current`
   * fires while the *previous* paragraph is still the one in the DOM — it
   * would measure the old text, and the new message would arrive wearing the
   * old message's size. A callback ref fires when the new node is attached,
   * which is exactly the moment there is something new to measure.
   *
   * The box is read off `node.parentElement` rather than a second ref because
   * React attaches refs child-first: a `boxRef` on the wrapper is still null
   * at the moment this runs on a first mount.
   *
   * No React state holds the result. `fit` writes the size onto the node
   * itself during the commit, before the browser paints, so there is no frame
   * at the wrong size; and since the paragraph is rendered with no `style`
   * prop, no later re-render undoes it.
   */
  const refit = useCallback((node: HTMLParagraphElement | null) => {
    const box = node?.parentElement;
    if (!node || !box) return;
    const vmin = Math.min(window.innerWidth, window.innerHeight) / 100;
    fit(box, node, FIT_MIN_VMIN * vmin, FIT_MAX_VMIN * vmin);
  }, []);

  const textRef = useRef<HTMLParagraphElement | null>(null);
  const attach = useCallback(
    (node: HTMLParagraphElement | null) => {
      textRef.current = node;
      refit(node);
    },
    [refit]
  );

  /* A window that changes shape invalidates every measurement behind the
     current size — a TV rotated into a different mode, a browser window
     dragged, a phone turned. The fonts line matters as much: the display face
     arrives after first layout, and the search would otherwise be holding a
     size it measured against a fallback with different metrics. */
  useEffect(() => {
    const again = () => refit(textRef.current);
    window.addEventListener("resize", again);
    document.fonts?.ready.then(again).catch(() => {});
    return () => window.removeEventListener("resize", again);
  }, [refit]);

  if (landscape === null) return <div className="fixed inset-0 royal-dawn" />;
  if (!landscape) return <TurnSideways />;

  return (
    <main
      onClick={() => go(1)}
      className="royal-dawn fixed inset-0 cursor-pointer select-none overflow-hidden"
    >
      <div aria-hidden className="pointer-events-none absolute inset-0 parchment-texture" />
      <Flourishes />
      <Portrait />

      {/*
        The text column, held off the portrait's corner.

        `pl-[54vmin]` is measured rather than chosen: she is `h-[64vmin]` and
        fills her frame at about 0.78 as wide as she is tall, so she occupies
        50vmin across — this is that plus four of air. Everything else is
        centred in what is left, so the message sits in the middle of the room
        rather than the middle of the screen.
      */}
      <div className="relative flex h-full flex-col items-center justify-center px-[6vmin] pb-[7vmin] pt-[6vmin] pl-[54vmin]">
        {messages === null ? (
          <p className="flex items-center gap-3 font-hand text-[3vmin] text-ink/50">
            <Spinner className="h-[3vmin] w-[3vmin]" />
            Opening the guestbook…
          </p>
        ) : total === 0 ? (
          <Empty error={error} />
        ) : (
          <AnimatePresence mode="wait">
            <motion.div
              key={`${at}-${slide?.kind === "scores" ? "scores" : current?.name}`}
              /* `h-full` and a column, so the message below can be handed
                 everything the name does not use. The old version let the pair
                 size themselves and centred the result, which on a television
                 left a third of the screen empty above and below. */
              className="flex h-full w-full flex-col items-center"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0, transition: { duration: 0.35 } }}
              transition={{ duration: 0.4 }}
            >
              {/* Who it is from, above — or what this slide is, when it is
                  the board. Named first on purpose: at a party the name is the
                  thing somebody across the room looks for, so it is set large
                  enough to be read from where they are standing, which is the
                  whole brief for this screen. The board borrows the same slot
                  and the same type, so it reads as another page of the same
                  book rather than as a different screen. */}
              <header className="flex flex-none flex-col items-center">
                <Crown className="h-[5vmin] w-auto text-gold" />
                <p className="mt-[1.4vmin] max-w-[70vw] truncate font-hand text-[clamp(1.8rem,6.4vmin,5rem)] leading-none text-berry">
                  {slide?.kind === "scores" ? "Royal Scoreboard" : current?.name}
                </p>
                <div aria-hidden className="gilt-rule mt-[2vmin] h-px w-[26vmin]" />
              </header>

              {/*
                And the message, a word at a time, set to whatever size fills
                what is left.

                `min-h-0` is load-bearing: a flex child defaults to
                `min-height: auto` and refuses to shrink below its content, so
                without it this box reports the height of the text it is meant
                to be *measuring* and the fit never converges. `overflow-hidden`
                is the backstop for the one case the search cannot solve — a
                message so long that even the floor size overflows.
              */}
              {slide?.kind === "scores" ? (
                <Board rows={scores} />
              ) : (
              <div className="flex min-h-0 w-full flex-1 items-center justify-center overflow-hidden pt-[3vmin]">
                <p
                  ref={attach}
                  /* Deliberately no `style` — see `refit`. The size is written
                     onto this node during the commit and must survive every
                     later render of it. */
                  className="text-center font-display italic leading-[1.3] text-ink"
                >
                  {words.map((word, i) => (
                    <motion.span
                      key={`${at}-${i}`}
                      className="inline-block whitespace-pre"
                      initial={{ opacity: 0, y: "0.25em" }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * step, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
                    >
                      {word}
                      {i < words.length - 1 ? " " : ""}
                    </motion.span>
                  ))}
                </p>
              </div>
              )}
            </motion.div>
          </AnimatePresence>
        )}
      </div>

      {total > 1 && <Progress at={at} total={total} turn={turn} />}
    </main>
  );
}

/**
 * The board, as a page of the guestbook.
 *
 * Two columns — one to ten on the left, eleven to twenty on the right — for
 * the same reason the ledger has them: twenty rows stacked on a screen this
 * shape would either run off the bottom or be set too small to read from the
 * other side of the room. This screen never scrolls, so the rows are `flex-1`
 * of a `min-h-0` column and divide the height between them however much there
 * is.
 *
 * The rows arrive one after another, the way the words of a message do, and
 * **in rank order across both columns** — the delay comes off `rank`, not off
 * the row's position in its own column, so the board fills from first place to
 * twentieth rather than both columns racing each other down the screen. On a
 * board being read out, the order is the drama.
 */
function Board({ rows }: { rows: TopScore[] }) {
  /* The whole board lands inside `REVEAL_S` however many rows there are, same
     arithmetic as the words of a message. */
  const step = rows.length > 0 ? Math.min(0.1, REVEAL_S / rows.length) : 0;
  return (
    <div className="flex min-h-0 w-full flex-1 gap-[3vmin] pt-[3.5vmin]">
      <BoardColumn rows={rows.slice(0, BOARD_TOP)} from={0} step={step} />
      {rows.length > BOARD_TOP && (
        <BoardColumn rows={rows.slice(BOARD_TOP)} from={BOARD_TOP} step={step} quiet />
      )}
    </div>
  );
}

/** One half of it. `quiet` is the second ten: a wash of ink and a size down. */
function BoardColumn({
  rows,
  from,
  step,
  quiet = false,
}: {
  rows: TopScore[];
  from: number;
  step: number;
  quiet?: boolean;
}) {
  return (
    <ol
      className={
        /*
         * `min-w-0` as well as `min-h-0`, and the width one is the subtle one:
         * a flex item defaults to `min-width: auto` and refuses to shrink
         * below its *content*, so a column holding one long name pushes itself
         * — and the whole board — off the right of the screen, while every
         * `truncate` inside it sits there with nothing to do because the span
         * was never actually squeezed. Measured on a 1024x768 screen without
         * it: the board ran 153px past the edge.
         */
        "flex min-h-0 min-w-0 flex-1 flex-col px-[2vmin] " +
        (quiet ? "rounded-[2vmin] bg-ink/[0.05]" : "")
      }
    >
      {rows.map((row, i) => {
        const rank = from + i;
        return (
          <motion.li
            key={`${row.name}-${rank}`}
            className={
              "flex min-h-0 flex-1 items-center gap-[1.6vmin] border-b border-gold/15 last:border-0 " +
              /* Sized against both axes. Height binds on a 16:9 television,
                 where ten rows share the column; width binds on a squarer
                 screen, where the portrait has already taken 54vmin and two
                 columns have to share what is left. `min()` takes whichever
                 would have broken first. */
              (quiet
                ? "text-[clamp(0.75rem,min(3.2vmin,2.2vw),2.2rem)] text-ink/70"
                : "text-[clamp(0.85rem,min(3.8vmin,2.6vw),2.6rem)] text-ink/85")
            }
            initial={{ opacity: 0, y: "0.3em" }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: rank * step, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
          >
            {/* A crown for the first three, a number for the rest, both in the
                same slot so every name starts on the same line. */}
            <span
              className="flex w-[1.8em] flex-none justify-center"
              style={rank < 3 ? { color: MEDALS[rank] } : undefined}
            >
              {rank < 3 ? (
                <Crown className="h-[0.95em] w-auto" />
              ) : (
                <span className="font-display font-semibold text-goldDeep">{rank + 1}</span>
              )}
            </span>

            <span className="min-w-0 flex-1 truncate font-display italic">{row.name}</span>
            <span className="flex-none pl-[1vmin] font-mono font-semibold tabular-nums text-ink">
              {row.score}
            </span>
          </motion.li>
        );
      })}
    </ol>
  );
}

/** Gold, silver, bronze — the same three the rest of the site crowns with. */
const MEDALS = ["#C9A227", "#8A94A1", "#B0702B"];

/**
 * Her, standing in the corner of the room.
 *
 * A cut-out, so there is no background to deal with and none of the tricks a
 * rectangle needed. The earlier version was a studio photograph masked by a
 * radial gradient anchored on this corner — opaque at her, gone before it
 * reached the text — which worked, but a fade that hides a background dims the
 * subject with it. She is simply there now.
 *
 * **Sized by height, with the width left to follow.** `w-auto` plus
 * `object-contain` is what keeps her in proportion at every shape of screen;
 * giving the box both dimensions is how a cut-out ends up subtly stretched,
 * and a stretched person is the one thing on this screen everybody would
 * notice. See `GUESTBOOK_PORTRAIT` for where the message's left padding comes
 * from — it is this height times her proportions, and the two move together.
 *
 * The drop shadow is the only thing added back. A cut-out with no shadow does
 * not stand on the floor, it hovers slightly above it; this is small enough to
 * read as the room's own light rather than as an effect.
 */
function Portrait() {
  if (!GUESTBOOK_PORTRAIT) return null;
  return (
    <div
      aria-hidden
      className="pointer-events-none absolute bottom-0 left-0 h-[64vmin] w-auto"
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={GUESTBOOK_PORTRAIT}
        alt=""
        className="h-full w-auto object-contain object-bottom drop-shadow-[0_0.5vmin_1.4vmin_rgba(62,40,20,0.22)]"
      />
    </div>
  );
}

/** Where we are, and how long this one has left. Quiet on purpose. */
function Progress({ at, total, turn }: { at: number; total: number; turn: number }) {
  return (
    <div className="pointer-events-none absolute inset-x-0 bottom-0 flex flex-col items-center gap-[1.4vmin] pb-[2.4vmin]">
      <p className="font-body text-[1.7vmin] uppercase tracking-[0.28em] text-ink/35">
        {at + 1} / {total}
      </p>
      {/* Restarted by the key, which changes on every move — so the bar is
          always measuring the message actually on screen. */}
      <div className="h-[0.35vmin] w-[26vmin] overflow-hidden rounded-full bg-ink/10">
        <motion.div
          key={`${at}-${turn}`}
          className="h-full rounded-full bg-gold/70"
          initial={{ width: "0%" }}
          animate={{ width: "100%" }}
          transition={{ duration: DWELL_MS / 1000, ease: "linear" }}
        />
      </div>
    </div>
  );
}

/**
 * Nothing to show, and why.
 *
 * The *why* is the whole point of this panel. An empty guestbook almost never
 * means nobody wrote anything — it means nothing has been approved yet, and a
 * blank screen at a party reads as broken software rather than as a column
 * waiting to be ticked.
 */
function Empty({ error }: { error: string }) {
  return (
    <div className="text-center">
      <Sparkle className="mx-auto h-[5vmin] w-[5vmin] animate-twinkle text-gold" />
      <h1 className="mt-[2vmin] font-display text-[clamp(1.4rem,4.4vmin,3rem)] italic text-ink">
        {error ? "The guestbook is not answering" : "No messages yet"}
      </h1>
      <p className="mx-auto mt-[2vmin] max-w-[46ch] font-body text-[clamp(0.9rem,2.3vmin,1.3rem)] leading-relaxed text-ink/60">
        {error ||
          `Messages appear here once a guest has shared one publicly and somebody has ticked Approved in the sheet. ${BABY_NAME}'s guestbook is waiting.`}
      </p>
    </div>
  );
}

/** A phone held upright, told so. */
function TurnSideways() {
  return (
    <main className="royal-dawn fixed inset-0 flex items-center justify-center px-8 text-center">
      <div>
        <Crown className="mx-auto h-8 w-auto text-gold" />
        <h1 className="mt-4 font-display text-2xl italic leading-snug text-ink">
          Turn your phone sideways
        </h1>
        <p className="mx-auto mt-2 max-w-[30ch] font-body text-sm leading-relaxed text-ink/65">
          {BABY_NAME}&apos;s guestbook is made for a wide screen — a television, a
          monitor, or a phone turned over.
        </p>
      </div>
    </main>
  );
}
