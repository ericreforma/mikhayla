"use client";

/**
 * Reading the board back.
 *
 * Deliberately a module of its own rather than another export on `scores.ts`,
 * and the split is the point rather than tidiness.
 *
 * The scoreboard is sealed: scores are recorded all through the party and read
 * out by the host at the end of it, and nothing a guest can open shows them a
 * standing. Leaving this function beside the ones the game *does* use would
 * have left the board's URL sitting in the game's own bundle — unused, but one
 * line of someone else's curiosity away, and findable by anybody who opened
 * the file. Here it is reachable only from `/royal-ledger`, which is the one
 * page allowed to ask, and the game's bundle cannot name the board at all.
 *
 * Being honest about the limit: the endpoint itself is public, the same one
 * the game posts scores to, so this hides the board from everybody except
 * somebody willing to take the invitation apart. See `LEDGER_KEY` in
 * `app/config.ts`.
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

    return { ok: true, top };
  } catch {
    return {
      ok: false,
      error: "We couldn't reach the ledger — your connection may have dropped.",
    };
  }
}
