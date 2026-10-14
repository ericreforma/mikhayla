"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { BABY_NAME, GUESTBOOK_PORTRAIT } from "@/app/config";
import { Crown, Sparkle, Spinner } from "@/app/components/Ornaments";
import { useIsLandscape } from "@/app/game/orientation";
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
 *     until it is — see `sizeFor`. Nobody is going to walk over and scroll a
 *     television.
 *   * **It turns itself.** Fifteen seconds a message, and the arrow keys or a
 *     click take it anywhere sooner.
 *   * **It stays fresh.** Messages arrive *during* the party, so it asks for
 *     the list again every couple of minutes rather than being a snapshot of
 *     whenever somebody opened the tab.
 *   * **It is landscape.** A phone held upright is told so rather than being
 *     given a squashed version of a thing designed for a 16:9 screen.
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

  const total = messages?.length ?? 0;

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

  const current = messages && total > 0 ? messages[at % total] : null;

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
              key={`${at}-${current?.name}`}
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
              {/* Who it is from, above. Named first on purpose: at a party the
                  name is the thing somebody across the room looks for — so it
                  is set large enough to be read from where they are standing,
                  which is the whole brief for this screen. */}
              <header className="flex flex-none flex-col items-center">
                <Crown className="h-[5vmin] w-auto text-gold" />
                <p className="mt-[1.4vmin] max-w-[70vw] truncate font-hand text-[clamp(1.8rem,6.4vmin,5rem)] leading-none text-berry">
                  {current?.name}
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
            </motion.div>
          </AnimatePresence>
        )}
      </div>

      {total > 1 && <Progress at={at} total={total} turn={turn} />}
    </main>
  );
}

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
