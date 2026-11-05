"use client";

/**
 * Reading the board back.
 *
 * A module of its own rather than another export on `scores.ts`, which is a
 * split worth keeping even now that it has outlived the reason it was made.
 *
 * It was made for the seal: for the length of the party the standings were the
 * host's to announce, nothing a guest could open showed a position, and
 * keeping this function out of `scores.ts` meant the board's URL was not in
 * the game's bundle at all — not merely unused in it. The party is over and
 * the board is open again, so the game imports this now like anything else.
 *
 * What survives is the shape: one module that knows how to ask for the board,
 * used by the game's own scoreboard panel and by `/royal-ledger`. That page is
 * still the only one that shows all twenty, and is still gated — see
 * `LEDGER_KEY` in `app/config.ts`.
 */

import { GAME_ENDPOINT } from "@/app/config";
import { NAME_MAX } from "./scores";

/**
 * How much of the board is asked for, and how much of it gets read out.
 *
 * Twenty are fetched and all twenty are drawn — the host wants the whole list
 * in front of them. The first ten are the ones announced, so the ledger draws
 * the other ten quieter beneath them and the two groups are told apart at a
 * glance.
 *
 * Only the ledger uses either of them. See `SealedBoard` in `Cards.tsx` for
 * why the game itself no longer asks for the board at all.
 *
 * The script decides what it actually sends. A deployment that predates the
 * `limit` parameter answers with ten whatever is asked, which is not a
 * failure: the ledger simply has ten names on it. See `docs/rsvp-setup.md`.
 */
export const BOARD_MAX = 20;
export const BOARD_TOP = 10;

export type TopScore = { name: string; score: number };

export type BoardResult =
  | { ok: true; top: TopScore[] }
  | { ok: false; error: string };


/**
 * The last board the server gave us, for as long as the tab is open.
 *
 * The panel is built and thrown away every time it is opened, so without this
 * every open is a spinner — including the second one, two seconds after the
 * first. Module-level rather than React state precisely because it has to
 * outlive the component that reads it.
 *
 * It is a cache, not a source of truth: the panel paints this immediately and
 * then asks again behind it, so a stale board is on screen for one fetch at
 * most and never instead of a fresh one.
 */
let board: TopScore[] | null = null;

/** Whatever we last heard, or null if we have not heard yet. */
export function cachedTop(): TopScore[] | null {
  return board;
}

/**
 * The one name worth putting on screen during a run.
 *
 * Read by the HUD, which seeds its corner from this so a second run paints the
 * leader on its first frame instead of popping it in once the fetch lands.
 */
export function cachedLeader(): TopScore | null {
  return board && board.length > 0 ? board[0] : null;
}

/**
 * The best of them, for the ledger.
 *
 * A plain `GET` with no headers of our own, which matters for the same reason
 * the POST sends `text/plain`: anything that would make this a non-simple
 * request earns a CORS preflight, and an Apps Script web app cannot answer
 * one. No `cache: "no-store"` either — that is a header in disguise. The
 * freshness comes from Apps Script, which sends `no-store` itself.
 *
 * One row per person rather than per run, and the folding happens in the
 * script rather than here — see `topScores` in `docs/rsvp-setup.md`. Doing it
 * on this side would mean downloading every run anybody has ever had in order
 * to throw almost all of them away.
 */
export async function fetchTopScores(): Promise<BoardResult> {
  if (!GAME_ENDPOINT) return { ok: false, error: "No ledger is set up yet." };

  try {
    const res = await fetch(`${GAME_ENDPOINT}?board=game&limit=${BOARD_MAX}`);
    const data = (await res.json().catch(() => null)) as
      | { ok?: boolean; error?: string; top?: unknown }
      | null;

    if (!data?.ok || !Array.isArray(data.top)) {
      return {
        ok: false,
        error: data?.error || "The ledger didn't answer with a board.",
      };
    }

    /* Rows come from a public endpoint and a spreadsheet anybody at the party
       can type into, so nothing is trusted: each is rebuilt from scratch and
       anything that isn't a name and a number is dropped. */
    const top: TopScore[] = [];
    for (const row of data.top) {
      if (!row || typeof row !== "object") continue;
      const { name, score } = row as { name?: unknown; score?: unknown };
      if (typeof name !== "string" || typeof score !== "number") continue;
      if (!Number.isFinite(score)) continue;
      top.push({ name: name.trim().slice(0, NAME_MAX), score: Math.floor(score) });
    }

    board = top;
    return { ok: true, top };
  } catch {
    return {
      ok: false,
      error: "We couldn't reach the ledger — your connection may have dropped.",
    };
  }
}
