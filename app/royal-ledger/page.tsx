"use client";

import { useCallback, useEffect, useState } from "react";
import { LEDGER_KEY, PARTY_DATE } from "@/app/config";
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
     * One screenful on anything with room for it, and a scrolling list on a
     * phone. The two are the same component with one breakpoint between them.
     *
     * **From `sm` up: it fits, and nothing moves.** The host reads this
     * standing up, out loud, with a microphone in one hand, and losing your
     * place in a scrolling list is the failure to design out. It fits by
     * splitting — one to ten down the left, eleven to twenty down the right —
     * because twenty rows stacked cannot fit a short window at a size anybody
     * can read, and two tens can. The split is also how the list is used: the
     * left column is the announcement, the right is everyone else.
     *
     * **Below `sm`: one column, scrolling.** Two columns on a phone held
     * upright leaves each of them about 180px wide, which is enough for the
     * rank and the score and almost nothing of the name — and a board of
     * truncated names is no use to somebody reading them out. A phone has the
     * height to spare instead, so it spends it: the two tens stack and the
     * page scrolls, the way it did before the split.
     *
     * The breakpoint is on **width**, deliberately, which is why a phone
     * turned sideways gets the two-column board. 844x390 has no height to
     * stack in and plenty of width to split, so width is the question actually
     * being asked.
     *
     * `globals.css` locks `html, body` to `overflow: hidden` — the invitation
     * is a deck, not a document — so the scrolling half cannot lean on the
     * body. `fixed inset-0` plus `overflow-y-auto` makes this element the
     * scroller itself, which the lock cannot reach; `sm:overflow-hidden` takes
     * that away again once the board fits.
     */
    <main className="royal-dawn board-scroll fixed inset-0 flex flex-col overflow-y-auto overscroll-contain px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-[max(0.75rem,env(safe-area-inset-top))] sm:overflow-hidden sm:px-6">
      <div aria-hidden className="pointer-events-none fixed inset-0 parchment-texture" />

      {/* Sized in `vh` from here down, because height is the thing in short
          supply: this has to survive a laptop with a browser window on it as
          well as a phone, and a header measured in `rem` eats a short screen
          alive. */}
      <header className="relative flex-none text-center">
        <Crown className="mx-auto h-[clamp(1.1rem,3.4vh,1.9rem)] w-auto text-gold" />
        <h1 className="mt-[0.6vh] font-display text-[clamp(1.1rem,3.8vh,2.2rem)] italic leading-tight text-ink">
          The Royal Scoreboard
        </h1>
        <div aria-hidden className="gilt-rule mx-auto mt-[0.8vh] h-px w-[clamp(4rem,12vh,7rem)]" />
      </header>

      {/* `min-h-0` is what makes "it fits" true rather than hopeful: a flex
          child defaults to `min-height: auto` and refuses to shrink below its
          content, so without it a tall board pushes the footer off the bottom
          of the screen instead of the rows getting shorter. */}
      <section className="relative mt-3 flex flex-none items-stretch justify-center sm:mt-[1.2vh] sm:min-h-0 sm:flex-1">
        {rows === null ? (
          <p className="flex items-center gap-2 self-center font-body text-sm text-ink/55">
            <Spinner className="h-4 w-4" />
            Loading the scores…
          </p>
        ) : rows.length === 0 ? (
          <div className="self-center text-center">
            <Sparkle className="mx-auto h-6 w-6 animate-twinkle text-gold" />
            <p className="mt-3 font-body text-sm leading-relaxed text-ink/60">No scores yet.</p>
          </div>
        ) : (
          <div
            /* Two equal halves while there is a second half to show, and one
               centred column while there is not — an empty box beside a short
               list reads as something that failed to load. */
            className={
              "mx-auto flex w-full flex-col gap-3 sm:h-full sm:flex-row sm:gap-[1.4vh] " +
              (rows.length > BOARD_TOP ? "max-w-md sm:max-w-5xl" : "max-w-md")
            }
          >
            <Column rows={rows.slice(0, BOARD_TOP)} from={0} />
            {rows.length > BOARD_TOP && (
              <Column rows={rows.slice(BOARD_TOP)} from={BOARD_TOP} quiet />
            )}
          </div>
        )}
      </section>

      <div className="relative mt-[1vh] flex flex-none flex-wrap items-center justify-center gap-x-3 gap-y-[0.5vh]">
        {error && (
          <p role="alert" className="font-body text-[clamp(0.55rem,1.5vh,0.72rem)] text-berry">
            {error}
          </p>
        )}
        <button
          type="button"
          onClick={load}
          disabled={busy}
          className="flex min-h-[clamp(1.8rem,4.4vh,2.5rem)] items-center gap-2 rounded-full border border-gold/50 bg-white/60 px-[clamp(0.9rem,2.4vh,1.5rem)] font-display text-[clamp(0.65rem,1.8vh,0.85rem)] text-ink/75 transition active:scale-[0.98] hover:bg-mist hover:text-ink disabled:opacity-60"
        >
          {busy ? <Spinner className="h-3.5 w-3.5" /> : null}
          {busy ? "Reading…" : "Refresh"}
        </button>
        <p className="font-body text-[clamp(0.5rem,1.4vh,0.66rem)] uppercase tracking-[0.14em] text-ink/35">
          {read ? `Updated ${read}` : "Updates every minute"}
        </p>
      </div>
    </main>
  );
}

/**
 * One half of the board.
 *
 * From `sm` up, every row is `flex-1` of a column that is itself
 * `min-h-0 flex-1` of the screen, and that is the whole no-scrolling
 * mechanism: ten rows divide whatever height is left between them, so the
 * board cannot outgrow the window however short it gets. The type is clamped
 * well under the smallest row that arrangement can produce, so the words never
 * outgrow the row they are in either.
 *
 * On a phone none of that applies and none of it should: the rows take their
 * natural height from their own padding, the two columns stack, and the page
 * scrolls. Every `flex-1` here is therefore `sm:`-prefixed — left unprefixed
 * they would squash ten rows into whatever height the content happened to have
 * and the list would collapse into a stripe.
 *
 * `quiet` is the second ten — a wash of ink behind them and a size down — so
 * the ten being read out stay the ten the eye lands on, and the rest read as
 * the tail of the same list rather than as more of the same.
 */
function Column({
  rows,
  from,
  quiet = false,
}: {
  rows: TopScore[];
  from: number;
  quiet?: boolean;
}) {
  return (
    <ol
      className={
        "flex flex-col overflow-hidden rounded-2xl border border-gold/35 px-4 shadow-[0_6px_20px_rgba(62,40,20,0.1)] sm:min-h-0 sm:flex-1 sm:px-[1.5vh] " +
        (quiet ? "bg-ink/[0.07]" : "bg-parchment/80")
      }
    >
      {rows.map((row, i) => {
        const rank = from + i;
        return (
          <li
            key={`${row.name}-${rank}`}
            className={
              "flex items-center gap-3 border-b border-gold/15 py-2 last:border-0 " +
              "sm:min-h-0 sm:flex-1 sm:gap-[1.1vh] sm:py-0 " +
              /*
               * Sized against both axes, because each of them binds on a
               * different screen. Height decides it on a laptop, where ten
               * rows share a tall column and a `vh` figure fills them. Width
               * decides it on a phone held upright, where each column is a
               * hundred-odd pixels across — size that by height alone and
               * every name truncates to three letters. `min()` takes whichever
               * constraint is tighter, which is the one that would have broken.
               */
              (quiet
                ? "text-sm text-ink/75 sm:text-[clamp(0.55rem,min(3.3vh,3.6vw),2rem)]"
                : "text-base sm:text-[clamp(0.62rem,min(4vh,4.4vw),2.4rem)]")
            }
          >
            {/* A crown for the first three, a number for the rest, both in the
                same slot so every name starts on the same line. Sized in `em`,
                so the slot keeps its proportion to the type as the rows grow
                and shrink with the window. */}
            <span
              className="flex w-[1.8em] flex-none justify-center"
              /* On the slot rather than the crown: `Crown` draws in
                 `currentColor` precisely so the caller can set it with
                 ordinary inheritance. */
              style={rank < 3 ? { color: MEDALS[rank] } : undefined}
            >
              {rank < 3 ? (
                <Crown className="h-[0.95em] w-auto" />
              ) : (
                <span className="font-display font-semibold text-goldDeep">{rank + 1}</span>
              )}
            </span>

            {/* A guest's own typing, from a public endpoint, so it is allowed
                to ellipsise rather than push the score off the edge. */}
            <span className="min-w-0 flex-1 truncate text-ink/85">{row.name}</span>
            <span className="flex-none pl-[0.5vh] font-mono font-semibold tabular-nums text-ink">
              {row.score}
            </span>
          </li>
        );
      })}
    </ol>
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
