"use client";

import { useCallback, useEffect, useState } from "react";
import { BABY_NAME, LEDGER_KEY, PARTY_DATE } from "@/app/config";
import { Crown, Sparkle, Spinner } from "@/app/components/Ornaments";
import { BOARD_TOP, fetchTopScores, type TopScore } from "@/app/game/ledger";

/**
 * The royal ledger, at `/royal-ledger?seal=…`.
 *
 * ---------------------------------------------------------------------------
 * The one page that still prints the scores
 * ---------------------------------------------------------------------------
 * The game's own scoreboard is sealed — see `SealedBoard` in
 * `app/game/Cards.tsx`. Scores are recorded the whole time and shown to
 * nobody, because the standings are the host's to announce at the party rather
 * than something a guest can look up between runs.
 *
 * This is the exception, and it exists for exactly one person: whoever is
 * reading the names out. So it is built for that job and not for a guest —
 * twenty names rather than ten, no interest in hiding the ones below the top
 * three, and a refresh button, because runs will still be arriving while the
 * host is walking to the microphone.
 *
 * ---------------------------------------------------------------------------
 * The latch
 * ---------------------------------------------------------------------------
 * `?seal=` has to match `LEDGER_KEY`, so the address alone is not enough and
 * the link that was handed over is. Without it this page says precisely what
 * the game says, which is also the right answer for anybody who finds the URL
 * by accident: there is nothing here to see yet.
 *
 * It is a latch and not a lock. The rows come from the same public Apps Script
 * URL the game posts to, so somebody determined enough to open a network tab
 * can still read them — see the note on `LEDGER_KEY`. What this stops is the
 * guessed address and the forwarded screenshot, which is the whole of what
 * happens at a birthday party.
 */

/** How often the list refreshes itself while the page is left open. */
const REFRESH_MS = 60_000;

/** Gold, silver, bronze — the same three the rest of the site crowns with. */
const MEDALS = ["#C9A227", "#8A94A1", "#B0702B"];

export default function RoyalLedger() {
  /* `null` until the query string has been read. Three states rather than two:
     rendering the ledger and then snatching it away, or flashing the sealed
     card at the host who used the right link, are both worse than one frame of
     nothing.

     Read off `window` rather than through `useSearchParams`, which in a static
     export has to be wrapped in a Suspense boundary to build at all. */
  const [allowed, setAllowed] = useState<boolean | null>(null);
  useEffect(() => {
    const seal = new URLSearchParams(window.location.search).get("seal");
    setAllowed(seal === LEDGER_KEY);
  }, []);

  const [rows, setRows] = useState<TopScore[] | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [read, setRead] = useState("");

  const load = useCallback(() => {
    setBusy(true);
    fetchTopScores().then((result) => {
      setBusy(false);
      if (result.ok) {
        setRows(result.top);
        setError("");
        setRead(new Date().toLocaleTimeString([], { hour: "numeric", minute: "2-digit" }));
      } else {
        /* Whatever is already on screen stays. A list that was right a minute
           ago is worth more to somebody about to read it out than an error
           message where the names were. */
        setError(result.error);
        setRows((was) => was ?? []);
      }
    });
  }, []);

  useEffect(() => {
    if (!allowed) return;
    load();
    const id = window.setInterval(load, REFRESH_MS);
    return () => window.clearInterval(id);
  }, [allowed, load]);

  if (allowed === null) return <main className="royal-dawn fixed inset-0" />;
  if (!allowed) return <Sealed />;

  return (
    /*
     * Its own scrolling viewport, and it has to be.
     *
     * `globals.css` locks `html, body` to `height: 100%; overflow: hidden` —
     * the invitation is a deck with one moving track, not a document, and that
     * lock is what stops iOS rubber-banding the whole page behind it. Every
     * other route here either fits the screen exactly (the game, the
     * guestbook) or scrolls inside a box of its own, so this is the first page
     * that is simply *long*: twenty names will not fit a phone, and left as an
     * ordinary tall `<main>` the bottom of the list is clipped away with no
     * way to reach it.
     *
     * `fixed inset-0` takes the viewport directly and `overflow-y-auto` makes
     * this element the thing that scrolls, which the body lock cannot reach.
     * `overscroll-contain` keeps a flick at the end of the list from handing
     * the gesture back to the locked body underneath.
     */
    <main className="royal-dawn board-scroll fixed inset-0 overflow-y-auto overscroll-contain px-4 pb-[max(2rem,env(safe-area-inset-bottom))] pt-8 sm:px-6 sm:pt-12">
      {/* `fixed` rather than `absolute`: an absolutely-positioned child of a
          scroll container scrolls away with the content, which would leave the
          grain covering only the first screenful. */}
      <div aria-hidden className="pointer-events-none fixed inset-0 parchment-texture" />

      <div className="relative mx-auto w-full max-w-xl">
        <header className="text-center">
          <Crown className="mx-auto h-8 w-auto text-gold" />
          <h1 className="mt-3 font-display text-3xl italic leading-tight text-ink sm:text-4xl">
            The Royal Scoreboard
          </h1>
          <div aria-hidden className="gilt-rule mx-auto mt-3 h-px w-28" />
          <p className="mt-3 font-body text-sm leading-relaxed text-ink/60">
            {BABY_NAME}&apos;s Royal Dash — all the scores, highest first.
          </p>
          {/* Said plainly, at the top, because the person reading this is the
              only one who can give it away. */}
          <p className="mx-auto mt-1.5 max-w-[42ch] font-body text-xs leading-relaxed text-ink/45">
            Only you can see this page. The players can&apos;t see their scores — the top{" "}
            {BOARD_TOP} are announced at the party on {PARTY_DATE}.
          </p>
        </header>

        <section className="relative mt-7 overflow-hidden rounded-3xl border border-gold/35 bg-parchment/80 shadow-[0_10px_30px_rgba(62,40,20,0.12)]">
          <div aria-hidden className="pointer-events-none absolute inset-0 parchment-texture" />

          <div className="relative px-5 py-4 sm:px-7 sm:py-5">
            {rows === null ? (
              <p className="flex items-center justify-center gap-2 py-10 font-body text-sm text-ink/55">
                <Spinner className="h-4 w-4" />
                Loading the scores…
              </p>
            ) : rows.length === 0 ? (
              <div className="py-10 text-center">
                <Sparkle className="mx-auto h-6 w-6 animate-twinkle text-gold" />
                <p className="mt-3 font-body text-sm leading-relaxed text-ink/60">
                  No scores yet.
                </p>
              </div>
            ) : (
              <ol>
                {rows.map((row, i) => (
                  <li
                    key={`${row.name}-${i}`}
                    /*
                     * Past the tenth the list carries on quieter — a wash of
                     * ink behind it and a size down — so the ten being read
                     * out are the ten the eye lands on, and the rest read as
                     * the tail of the same list.
                     *
                     * The negative margins are what let that wash reach the
                     * card's edges; without them it stops where the text does
                     * and leaves a parchment margin down both sides, which
                     * turns one shaded section into ten shaded rectangles.
                     */
                    className={
                      "flex items-baseline gap-3 border-b border-gold/15 leading-snug last:border-0 " +
                      (i < BOARD_TOP
                        ? "py-2 text-base sm:text-lg"
                        : "-mx-5 bg-ink/[0.055] px-5 py-1.5 text-sm sm:-mx-7 sm:px-7")
                    }
                  >
                    {/* A crown for the first three, a number for the rest, both
                        in the same slot so every name starts on the same line.
                        Sized in `em` so the slot keeps its proportion to the
                        type in both halves of the list. */}
                    <span
                      className="flex w-[1.7em] flex-none justify-center"
                      /* On the slot rather than the crown: `Crown` draws in
                         `currentColor` precisely so the caller can set it with
                         ordinary inheritance. */
                      style={i < 3 ? { color: MEDALS[i] } : undefined}
                    >
                      {i < 3 ? (
                        <Crown className="h-[0.88em] w-auto translate-y-[0.1em]" />
                      ) : (
                        <span className="font-display font-semibold text-goldDeep">{i + 1}</span>
                      )}
                    </span>

                    {/* A guest's own typing, from a public endpoint, so it is
                        allowed to ellipsise rather than push the score off the
                        edge of a phone. */}
                    <span className="min-w-0 truncate text-ink/80">{row.name}</span>
                    <span className="ml-auto flex-none pl-2 font-mono font-semibold tabular-nums text-ink">
                      {row.score}
                    </span>
                  </li>
                ))}
              </ol>
            )}
          </div>
        </section>

        {error && (
          <p role="alert" className="mt-3 text-center font-body text-xs leading-snug text-berry">
            {error}
          </p>
        )}

        <div className="mt-5 flex flex-col items-center gap-2">
          <button
            type="button"
            onClick={load}
            disabled={busy}
            className="flex min-h-[2.75rem] items-center gap-2 rounded-full border border-gold/50 bg-white/60 px-6 font-display text-sm text-ink/75 transition active:scale-[0.98] hover:bg-mist hover:text-ink disabled:opacity-60"
          >
            {busy ? <Spinner className="h-3.5 w-3.5" /> : null}
            {busy ? "Reading…" : "Refresh"}
          </button>
          <p className="font-body text-[0.68rem] uppercase tracking-[0.18em] text-ink/35">
            {read ? `Updated ${read} · updates every minute` : "Updates every minute"}
          </p>
        </div>
      </div>
    </main>
  );
}

/**
 * What anybody without the link gets.
 *
 * Deliberately the same message the game gives, rather than "wrong key" — one
 * says the scores are sealed, the other says there is a door here and you have
 * the wrong word for it. The first is true and ends the matter; the second is
 * an invitation.
 */
function Sealed() {
  return (
    /* Scrolls for the same reason the ledger does — see the note there. The
       centring is `min-h-full` on the inner box rather than `items-center` on
       a fixed-height one: a card taller than a landscape phone then makes its
       wrapper grow and stays reachable, instead of having its top half
       centred off the edge where nothing can scroll to it. */
    <main className="royal-dawn board-scroll fixed inset-0 overflow-y-auto overscroll-contain text-center">
      <div aria-hidden className="pointer-events-none fixed inset-0 parchment-texture" />
      <div className="relative flex min-h-full items-center justify-center px-6 py-10">
        <div className="max-w-sm">
          <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full border-2 border-gold/50 bg-gradient-to-b from-[#F3E3B5] to-[#D9BC6A] shadow-[0_2px_6px_rgba(62,40,20,0.25)]">
            <Crown className="h-6 w-auto text-goldDeep" />
          </span>
          <h1 className="mt-4 font-display text-2xl italic leading-snug text-ink">
            Scores are hidden
          </h1>
          <div aria-hidden className="gilt-rule mx-auto mt-3 h-px w-20" />
          <p className="mt-4 font-body text-sm leading-relaxed text-ink/70">
            Don&apos;t worry — your score is saved. We&apos;re just keeping the list a secret
            until the party.
          </p>
          <p className="mt-2 font-body text-sm leading-relaxed text-ink/55">
            The top 10 will be announced on{" "}
            <span className="whitespace-nowrap font-semibold text-ink">{PARTY_DATE}</span>. Keep
            playing — someone may have beaten you already!
          </p>
        </div>
      </div>
    </main>
  );
}
