"use client";

/**
 * Where a score goes when the run is over.
 *
 * The same place an RSVP goes: one Apps Script bound to one spreadsheet,
 * posted to straight from the page. The script decides which tab the row lands
 * in from the `kind` field below — an RSVP to the `RSVPs` tab, a score to the
 * `Game` tab beside it — so there is one URL, one deployment, and one thing to
 * get right. See `docs/rsvp-setup.md`, which carries the script both halves share.
 *
 * Everything here fails softly. A guest at a party is on somebody else's wifi
 * holding somebody else's phone, and a leaderboard is not worth a dead end: a
 * score that cannot be sent is still shown, still kept on the device, and the
 * player is still offered another go.
 */

import { GAME_ENDPOINT } from "@/app/config";

/** This device's best, so a player has something to beat before anyone else does. */
const BEST_KEY = "mikhayla-game-best";

/** And the name they last played under, so the second run doesn't ask again. */
const NAME_KEY = "mikhayla-game-name";

/** The RSVP's own store, which already knows what to call this guest. */
const RSVP_KEY = "mikhayla-rsvp";

/* Every touch of localStorage is guarded: it throws outright in some privacy
   modes, and a thrown getter here would take the game-over card down with it. */

export function readBest(): number {
  try {
    const raw = window.localStorage.getItem(BEST_KEY);
    const n = raw ? Number.parseInt(raw, 10) : 0;
    return Number.isFinite(n) && n > 0 ? n : 0;
  } catch {
    return 0;
  }
}

export function writeBest(score: number) {
  try {
    if (score > readBest()) window.localStorage.setItem(BEST_KEY, String(score));
  } catch {
    /* A player in a private window simply starts from nothing each visit. */
  }
}

/**
 * The name to put in the box before anyone types.
 *
 * Falls back to whatever they RSVP'd as, which is very often the only time
 * they will have typed their name on this site — and a prefilled box is the
 * difference between a leaderboard of names and a leaderboard of blanks.
 */
export function readName(): string {
  try {
    const own = window.localStorage.getItem(NAME_KEY);
    if (own) return own;
    const rsvp = window.localStorage.getItem(RSVP_KEY);
    if (!rsvp) return "";
    const parsed = JSON.parse(rsvp) as { name?: string } | null;
    return typeof parsed?.name === "string" ? parsed.name : "";
  } catch {
    return "";
  }
}

export function writeName(name: string) {
  try {
    window.localStorage.setItem(NAME_KEY, name);
  } catch {
    /* Nothing is lost but the convenience. */
  }
}

/** Whether there is anywhere to post at all — see `GAME_ENDPOINT` in config. */
export const CAN_SUBMIT = Boolean(GAME_ENDPOINT);

/**
 * The longest name the board will take.
 *
 * Stated once and enforced three times — the input's `maxLength`, the trim
 * below, and again in the Apps Script. The first is a courtesy, the second
 * stops a paste going out, and only the third actually guarantees anything,
 * because the endpoint is public and anyone can post to it directly.
 */
export const NAME_MAX = 100;

export type SubmitResult =
  | { ok: true }
  /**
   * `certain` is the difference between "the scoreboard said no" and "we never
   * heard back" — see the long note in `submitScore`. It decides whether the
   * card may invite the player to press Save again, because only one of those
   * two can be retried without risking a second row.
   */
  | { ok: false; error: string; certain: boolean };

/**
 * Send one score to the sheet.
 *
 * The `text/plain` content type is deliberate and is the same trap documented
 * over the RSVP form: `application/json` makes the browser send a CORS
 * preflight `OPTIONS` first, and an Apps Script web app has no way to answer
 * one, so the real POST never leaves. The body is still JSON — the script
 * parses it regardless of what the header claimed.
 *
 * ---------------------------------------------------------------------------
 * Why a failure here does not mean the score was not saved
 * ---------------------------------------------------------------------------
 * An Apps Script web app does not answer the POST. It appends the row, and
 * *then* replies with a 302 to a one-shot URL on `script.googleusercontent.com`
 * which the browser has to follow to read anything. So the write and the answer
 * are two separate round trips, in that order, and everything that can go wrong
 * with the second one — a 404 from a deployment that is still propagating, a
 * dropped connection, a redirect the browser won't follow — goes wrong *after*
 * the row is already in the sheet.
 *
 * That is not a theoretical ordering. It showed up the first time this was
 * pointed at a freshly created deployment: a 404 on screen and the score
 * sitting in the sheet behind it.
 *
 * So the only answer worth trusting is one the script itself wrote. A readable
 * `{ok:…}` is definitive either way. Anything else is genuinely unknown, and
 * the card says so rather than reporting a failure that probably wasn't one —
 * telling a player it failed invites them to press Save again, and that is how
 * one run becomes two rows.
 */
export async function submitScore(name: string, score: number): Promise<SubmitResult> {
  if (!GAME_ENDPOINT) {
    return { ok: false, error: "No leaderboard is set up yet.", certain: true };
  }

  let res: Response;
  try {
    res = await fetch(GAME_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify({
        kind: "game",
        name: name.trim().slice(0, NAME_MAX),
        score: Math.max(0, Math.floor(score)),
      }),
    });
  } catch {
    /* Never left, or never came back. The row may still have landed. */
    return {
      ok: false,
      certain: false,
      error: "We couldn't reach the scoreboard — your connection may have dropped.",
    };
  }

  const data = (await res.json().catch(() => null)) as
    | { ok?: boolean; error?: string }
    | null;

  /* The script's own answer. The only thing here that settles anything. */
  if (data && typeof data.ok === "boolean") {
    if (data.ok) return { ok: true };
    return {
      ok: false,
      certain: true,
      error: data.error || "The scoreboard turned that one down.",
    };
  }

  return {
    ok: false,
    certain: false,
    error: `The scoreboard answered with ${res.status} and nothing we could read.`,
  };
}

/* ---------------------------------------------------------------
   Reading the board back
   --------------------------------------------------------------- */

export type TopScore = { name: string; score: number };

export type BoardResult =
  | { ok: true; top: TopScore[] }
  | { ok: false; error: string };

/**
 * The last board the server gave us, kept for as long as the tab is open.
 *
 * It is what makes the fetch a background job rather than a wait. The game
 * asks for the board when it mounts — long before anybody presses Top 10 — so
 * by the time the panel opens the answer is usually already here and it opens
 * on a list instead of a spinner. The HUD reads the same copy for the name it
 * shows under the score.
 *
 * Module-level rather than React state because it outlives the components that
 * use it: the panel is mounted and thrown away every time it is opened, and
 * the game is remade on every run.
 */
let board: TopScore[] | null = null;

/** Whatever we last heard, or null if we have not heard yet. */
export function cachedTop(): TopScore[] | null {
  return board;
}

/** The one name worth putting on screen during a run. */
export function cachedLeader(): TopScore | null {
  return board && board.length > 0 ? board[0] : null;
}

/**
 * The ten best, for the board the "Top 10" button opens.
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
  if (!GAME_ENDPOINT) return { ok: false, error: "No leaderboard is set up yet." };

  try {
    const res = await fetch(`${GAME_ENDPOINT}?board=game`);
    const data = (await res.json().catch(() => null)) as
      | { ok?: boolean; error?: string; top?: unknown }
      | null;

    if (!data?.ok || !Array.isArray(data.top)) {
      return {
        ok: false,
        error: data?.error || "The scoreboard didn't answer with a board.",
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
      error: "We couldn't reach the scoreboard — your connection may have dropped.",
    };
  }
}
