"use client";

/**
 * The messages the guestbook screen reads.
 *
 * The same Apps Script everything else talks to, asked a different question:
 * `?board=wall` hands back every message a guest marked public *and* somebody
 * in the family has ticked Approved. Both gates live in the script rather than
 * here — see `wallMessages` in `docs/rsvp-setup.md` — because a filter applied
 * in the page is a filter a curious guest can read around in the network tab,
 * and these are other people's words.
 */

import { GAME_ENDPOINT } from "@/app/config";

export type Message = { name: string; message: string };

export type WallResult =
  | { ok: true; messages: Message[] }
  | { ok: false; error: string };

/** Nothing longer than this is shown; the sheet already caps it too. */
const MESSAGE_MAX = 1000;
const NAME_MAX = 100;

export async function fetchMessages(): Promise<WallResult> {
  if (!GAME_ENDPOINT) return { ok: false, error: "No guestbook is set up yet." };

  try {
    const res = await fetch(`${GAME_ENDPOINT}?board=wall`);
    const data = (await res.json().catch(() => null)) as
      | { ok?: boolean; error?: string; messages?: unknown }
      | null;

    if (!data?.ok || !Array.isArray(data.messages)) {
      return {
        ok: false,
        error: data?.error || "The guestbook didn't answer with any messages.",
      };
    }

    /*
     * Rebuilt from scratch rather than trusted. Every one of these is a
     * stranger's typing, fetched from a public URL, and about to be put on a
     * television three metres tall — so anything that is not a string and a
     * string is dropped rather than rendered.
     */
    const messages: Message[] = [];
    for (const row of data.messages) {
      if (!row || typeof row !== "object") continue;
      const { name, message } = row as { name?: unknown; message?: unknown };
      if (typeof name !== "string" || typeof message !== "string") continue;
      const who = name.trim().slice(0, NAME_MAX);
      const says = message.trim().slice(0, MESSAGE_MAX);
      if (!who || !says) continue;
      messages.push({ name: who, message: says });
    }

    return { ok: true, messages };
  } catch {
    return {
      ok: false,
      error: "We couldn't reach the guestbook — check the connection.",
    };
  }
}
