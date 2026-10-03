"use client";

import { useEffect, useState } from "react";

/**
 * Working out whether the invitation has been opened inside someone else's
 * app, and what can be done about it if it has.
 *
 * ---------------------------------------------------------------------------
 * Why this exists
 * ---------------------------------------------------------------------------
 * The invitation is shared in chat threads, and a link tapped in Messenger
 * does not open a browser — it opens Messenger's own, a webview wearing a
 * browser's clothes. Most of the site survives that perfectly well, but the
 * two things it loses are the two it was built around: there is no element
 * fullscreen in a webview, so "Open the gates" cannot take the screen (see
 * `fullscreen.ts`), and there is no Add to Home Screen, so the installed
 * iPhone experience `layout.tsx` sets up can never be reached.
 *
 * So a guest in a webview is asked, once, to open the invitation properly.
 *
 * ---------------------------------------------------------------------------
 * Detect the app, never "a webview"
 * ---------------------------------------------------------------------------
 * The patterns below name specific apps, and that restraint is the whole
 * design. Asking the general question — *am I inside some webview?* — cannot
 * be done honestly: iOS WKWebView stamps nothing into the user agent at all,
 * so every answer is a guess assembled from absences, and the usual guess
 * ("no `Safari` in the string") is true of an installed iOS web app too. That
 * guess would put this gate in front of precisely the guests who took the
 * trouble to install the invitation.
 *
 * A named app is a fact. The cost of narrowing to facts is that an app nobody
 * listed slips through ungated — and a guest seeing the invitation one notch
 * less immersive than intended is not a failure worth risking a locked door
 * for. Everything here fails open.
 */

/** Which app was found. Not shown to a guest — see `OpenInBrowser`. */
export type InAppName = "Messenger" | "Facebook" | "Instagram" | "Viber" | "Line" | "TikTok";

/**
 * The named in-app browsers, most specific first.
 *
 * Messenger and Facebook share the `FBAN`/`FB_IAB` family, so the two precise
 * spellings are tested before the loose Meta catch-all underneath them — a
 * guest in Messenger should be told "Messenger", not "Facebook".
 */
const APPS: ReadonlyArray<{ re: RegExp; name: InAppName }> = [
  { re: /FBAN\/MessengerForiOS|FB_IAB\/MESSENGER|MessengerLiteForiOS/i, name: "Messenger" },
  { re: /FBAN\/FBIOS|FB_IAB\/FB4A|FB4A|FBAN|FBAV|FB_IAB/i, name: "Facebook" },
  { re: /Instagram/i, name: "Instagram" },
  { re: /Viber/i, name: "Viber" },
  /* The slash matters. Bare "Line" turns up inside ordinary words in some
     user agents; LINE's own token is always `Line/<version>`, and LIFF is
     the in-app browser it opens mini-apps with. */
  { re: /\bLine\/[\d.]+|LIFF/i, name: "Line" },
  { re: /BytedanceWebview|musical_ly|TikTok/i, name: "TikTok" },
];

/** How a guest gets out, which is not the same question on both phones. */
export type Exit =
  /** Android hands off for real: one tap and Chrome has the page. */
  | { kind: "android"; intent: string }
  /** An iPhone has no such door. Only the menu, and the guest's own hand. */
  | { kind: "ios" }
  /** Neither — a tablet or a desktop webview. Instructions and a copied link. */
  | { kind: "other" };

export type Verdict =
  /** Before the first effect runs. The page is prerendered; see below. */
  | { state: "unknown" }
  /** A real browser, or an app nobody listed. Let the invitation open. */
  | { state: "clear" }
  | { state: "gated"; app: InAppName; exit: Exit };

/**
 * The `intent://` URL that moves the page into Chrome.
 *
 * Android's webviews, Meta's included, still hand unresolved schemes to the
 * system, and this is the one escape on either platform that actually works
 * without the guest doing anything but press a button. It has to be fired
 * from a real tap.
 *
 * Two details that are easy to get wrong:
 *
 *   - The scheme is stripped from the front and declared inside the fragment
 *     instead. `intent://` carries the bare host and path.
 *   - Any `#hash` the page itself is wearing has to come off, because the
 *     fragment is where the intent's own parameters live and the two cannot
 *     both be there.
 *
 * `S.browser_fallback_url` is what a guest without Chrome gets: their own
 * browser, or failing that the same page where it already is. It is why this
 * button can never leave anyone worse off than pressing nothing — though see
 * the escape in `OpenInBrowser`, which exists because "no worse off" still
 * looks exactly like a button that did nothing.
 */
function chromeIntent(): string {
  const { host, pathname, search, href } = window.location;
  const fallback = encodeURIComponent(href);
  return (
    `intent://${host}${pathname}${search}` +
    `#Intent;scheme=https;package=com.android.chrome;` +
    `S.browser_fallback_url=${fallback};end`
  );
}

/** An iPhone or an iPad. An iPad has called itself a Mac since iPadOS 13. */
function isApple(ua: string): boolean {
  return (
    /iPhone|iPad|iPod/.test(ua) ||
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1)
  );
}

/**
 * Already running as an installed app, in which case there is nothing to
 * escape from and the gate must stay out of the way.
 *
 * Nothing in `APPS` can match an installed web app today, so strictly this
 * changes no answer. It is here because the day somebody loosens one of those
 * patterns is the day it starts to, and the guests it would shut out are the
 * ones who liked the invitation enough to keep it.
 */
function isInstalled(): boolean {
  const standalone = (navigator as Navigator & { standalone?: boolean }).standalone;
  return standalone === true || window.matchMedia("(display-mode: standalone)").matches;
}

/**
 * Where the invitation is being read, decided once after mount.
 *
 * After mount and not during the render, for the same reason `useIsApplePhone`
 * in `Directions` waits: the page is prerendered at build time, where there is
 * no `navigator` to ask. Answering "clear" in that HTML and something else on
 * the client is a hydration mismatch; answering `unknown` in both and then
 * settling it is not.
 *
 * The cost is one frame before the answer arrives, which is why `unknown` is a
 * state of its own rather than an optimistic "clear" — the caller holds the
 * ground blank for that frame instead of starting fifteen megabytes of
 * download in a browser the guest may be about to walk out of.
 */
export function useInAppBrowser(): Verdict {
  const [verdict, setVerdict] = useState<Verdict>({ state: "unknown" });

  useEffect(() => {
    const ua = navigator.userAgent;
    const hit = isInstalled() ? undefined : APPS.find((a) => a.re.test(ua));
    if (!hit) {
      setVerdict({ state: "clear" });
      return;
    }

    const exit: Exit = isApple(ua)
      ? { kind: "ios" }
      : /Android/i.test(ua)
        ? { kind: "android", intent: chromeIntent() }
        : { kind: "other" };

    setVerdict({ state: "gated", app: hit.name, exit });
  }, []);

  return verdict;
}
