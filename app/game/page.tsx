"use client";

import { useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import { BABY_NAME } from "@/app/config";
import { exitFullscreen } from "@/app/components/fullscreen";
import { Crown } from "@/app/components/Ornaments";
import { Game } from "./Game";
import { unlockLandscape, useIsLandscape } from "./orientation";
import { RETURN_KEY } from "./entry";

/**
 * The game, at `/game`.
 *
 * Nothing on the invitation links here. It is found by tapping the balloon
 * twice — see `RisingBalloon` — and a guest who never does will never know it
 * exists, which is the point of hiding it. The route is real rather than an
 * overlay so that it can be shared, bookmarked and reloaded like anything
 * else; `app/game/layout.tsx` keeps it out of search results.
 */
export default function GamePage() {
  const router = useRouter();
  const landscape = useIsLandscape();

  /* Taking the orientation lock down on the way out, however the guest leaves —
     back button, a tab close, the button below. The invitation is read
     upright. */
  useEffect(() => unlockLandscape, []);

  /**
   * Back to the invitation.
   *
   * `back()` when the balloon is what sent us here, so the game's entry comes
   * off the history stack and the invitation's own Back behaviour — the leave
   * guard, the panels, all of it in `backButton.ts` — is left exactly as it
   * was found. A guest who arrived at this URL some other way has no such
   * entry behind them, so they are pushed to the invitation instead rather
   * than thrown off the site.
   */
  const leave = useCallback(() => {
    exitFullscreen();
    unlockLandscape();

    let cameFromBalloon = false;
    try {
      cameFromBalloon = window.sessionStorage.getItem(RETURN_KEY) === "1";
      window.sessionStorage.removeItem(RETURN_KEY);
    } catch {
      /* Private mode. Treated as a direct arrival, which is the safe way for
         this to be wrong: a push always lands somewhere. */
    }

    if (cameFromBalloon) router.back();
    else router.push("/");
  }, [router]);

  return (
    <main className="fixed inset-0 overflow-hidden bg-night">
      {/* One frame of nothing, before the measurement — see `useIsLandscape`. */}
      {landscape === null ? null : landscape ? (
        <Game onLeave={leave} />
      ) : (
        <TurnSideways onLeave={leave} />
      )}
    </main>
  );
}

/**
 * The card a guest holding their phone upright gets instead of the game.
 *
 * It is a gate, not a warning: there is no "play anyway" on it. See
 * `orientation.ts` for why portrait is not a worse version of this game but a
 * different and unfair one.
 */
function TurnSideways({ onLeave }: { onLeave: () => void }) {
  return (
    <div className="flex h-full w-full items-center justify-center overflow-y-auto bg-night px-6 py-6">
      <div className="relative w-full max-w-sm overflow-hidden rounded-3xl border border-gold/40 bg-parchment px-6 py-8 text-center shadow-2xl">
        <div aria-hidden className="pointer-events-none absolute inset-0 parchment-texture" />

        <div className="relative">
        <Crown className="mx-auto h-7 w-auto text-gold" />

        {/* A phone, turning. The only thing on the card that explains itself
            without being read, which matters: a guest holding the phone the
            wrong way is looking at this sideways in every sense. */}
        <svg
          viewBox="0 0 64 64"
          aria-hidden
          className="mx-auto mt-4 h-16 w-16 animate-turn text-berry"
          fill="none"
        >
          <rect
            x="22"
            y="10"
            width="20"
            height="34"
            rx="3"
            stroke="currentColor"
            strokeWidth="2.4"
          />
          <rect x="29" y="40" width="6" height="1.6" rx="0.8" fill="currentColor" />
          <path
            d="M14 50 A22 22 0 0 0 50 50"
            stroke="currentColor"
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeDasharray="3 4"
          />
          <path d="M50 50 L47 45 M50 50 L45 52" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
        </svg>

        <h1 className="mt-4 font-display text-2xl italic leading-snug text-ink">
          Turn your phone sideways
        </h1>
        <p className="mx-auto mt-2 max-w-[28ch] text-sm leading-relaxed text-ink/70">
          {BABY_NAME}&apos;s little running game is played in landscape — there&apos;s no room
          to see what&apos;s coming otherwise.
        </p>
        <p className="mt-1 text-xs text-ink/45">On a computer, widen the window.</p>

        <button
          type="button"
          onClick={onLeave}
          className="mt-5 min-h-[2.75rem] rounded-full border border-gold/50 px-6 font-display text-sm text-ink/70 transition active:scale-[0.98] hover:bg-mist hover:text-ink"
        >
          Back to the invitation
        </button>
        </div>
      </div>
    </div>
  );
}
