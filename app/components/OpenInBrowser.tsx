"use client";

import { useCallback, useEffect, useState, type CSSProperties } from "react";
import { BABY_FULL_NAME } from "@/app/config";
import { rememberStay, type Exit, type InAppName } from "./inAppBrowser";
import { CheckIcon, Crown, Sparkle } from "./Ornaments";

/**
 * The one screen a guest sees before the invitation when they arrive inside
 * a chat app's browser: a request to open it properly, and the shortest road
 * out that their phone actually has.
 *
 * ---------------------------------------------------------------------------
 * Why it is a door and not a banner
 * ---------------------------------------------------------------------------
 * A dismissible strip along the top would be read by nobody. This is the
 * single moment the ask can be made — before the castle, before fifteen
 * megabytes of her photographs and her songs have been pulled down a
 * connection the guest is about to abandon — so it is made once, plainly,
 * with the whole screen, and then never again (see `rememberStay`).
 *
 * ---------------------------------------------------------------------------
 * Why there is always a way through it
 * ---------------------------------------------------------------------------
 * The quiet line at the foot is not a hedge. On an iPhone there is no API
 * that opens Safari — none, at any price — so the only instruction that can
 * be given is one the guest has to carry out by hand, and a guest who will
 * not follow it would otherwise be left holding a locked door instead of a
 * birthday invitation. On Android the Chrome button genuinely works, but when
 * it does not — no Chrome installed, or Meta tightening the webview again —
 * its fallback quietly reloads this very page, which from the guest's side is
 * indistinguishable from a button that did nothing at all.
 *
 * Both roads end somewhere a guest could be stuck, so neither is allowed to
 * be the only one. The invitation itself degrades honestly in a webview — the
 * fullscreen request simply no-ops, see `fullscreen.ts` — so letting someone
 * through costs them the immersion and nothing else.
 */
export function OpenInBrowser({ app, exit }: { app: InAppName; exit: Exit }) {
  const [copied, setCopied] = useState(false);
  /*
   * The escape is held back for a breath on Android.
   *
   * Not to trap anyone — three seconds is nothing — but because the Chrome
   * button is a real one-tap fix there, and an equally present "no thanks"
   * beside it invites the shrug instead of the tap. On an iPhone the ask is
   * four manual steps and the escape is there from the first frame, which is
   * the honest weighting of the two.
   */
  const [escapable, setEscapable] = useState(exit.kind !== "android");

  useEffect(() => {
    if (escapable) return;
    const t = window.setTimeout(() => setEscapable(true), 3000);
    return () => window.clearTimeout(t);
  }, [escapable]);

  const url = typeof window === "undefined" ? "" : window.location.href;

  const copy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2200);
    } catch {
      /* Blocked, or no clipboard at all. The address is on screen below and
         can be held and copied by hand, which is why it is shown. */
    }
  }, [url]);

  const stay = useCallback(() => {
    rememberStay();
    /* A reload rather than a state flag, so the invitation begins from its
       own first frame — the curtain, the castle, the hero in order — instead
       of mounting halfway into a sequence that assumes it started clean. */
    window.location.reload();
  }, []);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="oib-title"
      className="royal-dawn fixed inset-0 z-[110] flex flex-col items-center justify-center overflow-y-auto px-gutter py-10 pb-safe"
    >
      <div aria-hidden className="pointer-events-none absolute inset-0 parchment-texture" />

      {/* The same four sparkles as the curtain, so this reads as the same
          place rather than a system page bolted on in front of it. */}
      <div aria-hidden className="pointer-events-none absolute inset-0">
        <span
          className="load-float absolute left-[8%] top-[14%] text-gold"
          style={{ "--float": "5s", "--rise": "-18px" } as CSSProperties}
        >
          <Sparkle className="h-5 w-5 animate-twinkle sm:h-8 sm:w-8" />
        </span>
        <span
          className="load-float absolute right-[10%] top-[21%] text-roseDeep"
          style={{ "--float": "6.5s", "--rise": "20px" } as CSSProperties}
        >
          <Sparkle className="h-4 w-4 animate-twinkle sm:h-6 sm:w-6" />
        </span>
        <span
          className="load-float absolute bottom-[17%] left-[13%] text-roseDeep"
          style={{ "--float": "5.8s", "--rise": "14px" } as CSSProperties}
        >
          <Sparkle className="h-3.5 w-3.5 animate-twinkle sm:h-5 sm:w-5" />
        </span>
        <span
          className="load-float absolute bottom-[22%] right-[14%] text-gold"
          style={{ "--float": "4.6s", "--rise": "-15px" } as CSSProperties}
        >
          <Sparkle className="h-4 w-4 animate-twinkle sm:h-6 sm:w-6" />
        </span>
      </div>

      <div className="relative flex w-full max-w-[26rem] flex-col items-center text-center">
        <div className="relative aspect-[32/23] h-11 xs:h-12 sm:h-14">
          <div
            aria-hidden
            className="load-halo absolute -inset-x-16 -inset-y-10 bg-[radial-gradient(closest-side,rgba(212,175,55,0.32),rgba(212,175,55,0))]"
          />
          <Crown className="absolute inset-0 h-full w-full text-gold" />
        </div>

        <p className="mt-4 font-hand text-xl leading-none text-berry xs:text-2xl">
          By royal invitation
        </p>

        <h1
          id="oib-title"
          className="mt-2 font-display text-[1.75rem] italic leading-[1.15] text-ink xs:text-[2rem]"
        >
          {BABY_FULL_NAME}
        </h1>

        <div aria-hidden className="gilt-rule mt-4 h-px w-32 xs:w-40" />

        <p className="mt-5 text-[0.9375rem] leading-relaxed text-ink/80">
          {/* Named, because "your in-app browser" means nothing to a guest and
              "Messenger" is the thing they can see around the page. */}
          You&rsquo;re viewing this inside {app}, which can&rsquo;t show the
          invitation the way it was made.
        </p>

        <Instructions exit={exit} />

        {/* The address, always visible and always selectable. It is the floor
            under every other route here: a guest who cannot tap, cannot copy,
            and cannot find the menu can still read it to someone. */}
        <div className="mt-6 w-full">
          <label
            htmlFor="oib-url"
            className="block text-[0.6875rem] uppercase tracking-[0.2em] text-goldDeep"
          >
            Or go to
          </label>
          <div className="mt-2 flex items-stretch gap-2">
            <input
              id="oib-url"
              readOnly
              value={url}
              onFocus={(e) => e.currentTarget.select()}
              className="min-w-0 flex-1 rounded-l-full rounded-r-full border border-gold/40 bg-parchment/60 px-4 py-2.5 text-center text-xs text-ink/70 focus:outline-none focus-visible:ring-2 focus-visible:ring-goldDeep/60"
            />
            <button
              type="button"
              onClick={copy}
              className="flex shrink-0 items-center gap-1.5 rounded-full border border-gold/60 bg-parchment/70 px-4 text-sm text-ink transition hover:bg-goldSoft/40 focus:outline-none focus-visible:ring-2 focus-visible:ring-goldDeep/60 active:scale-[0.98]"
            >
              {copied ? <CheckIcon className="h-4 w-4 text-goldDeep" /> : null}
              {copied ? "Copied" : "Copy"}
            </button>
          </div>
          {/* Announced rather than only coloured, since the icon swap alone
              tells a screen reader nothing. */}
          <span role="status" aria-live="polite" className="sr-only">
            {copied ? "Link copied" : ""}
          </span>
        </div>

        {/*
          The way through, kept deliberately quiet — a line of text, not a
          second button competing with the one above it. Reserved space so
          the composition does not jump when it arrives on Android.
        */}
        <div className="mt-7 flex h-6 items-center">
          {escapable && (
            <button
              type="button"
              onClick={stay}
              className="hero-rise text-xs text-ink/45 underline decoration-gold/40 underline-offset-4 transition hover:text-ink/70 focus:outline-none focus-visible:ring-2 focus-visible:ring-goldDeep/60 focus-visible:ring-offset-2"
            >
              Continue here anyway
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

/**
 * What to actually do, which is a different thing on each phone.
 *
 * Android gets a button that works. Everyone else gets the steps, written for
 * the menu they are looking at rather than in the abstract — the overflow
 * control is at the top right in Messenger on iOS, and the wording below
 * matches what is printed in it.
 */
function Instructions({ exit }: { exit: Exit }) {
  if (exit.kind === "android") {
    return (
      <>
        <a
          href={exit.intent}
          /* Autofocus for the same reason "Open the gates" has it: it is the
             one thing on the screen to do, and the gilt ring says so. */
          autoFocus
          className="hero-rise mt-6 flex min-h-[3rem] w-full items-center justify-center rounded-full border border-gold/60 bg-parchment/70 px-8 font-display text-base text-ink shadow-sm transition hover:bg-goldSoft/40 focus:outline-none focus-visible:ring-2 focus-visible:ring-goldDeep/60 focus-visible:ring-offset-2 focus-visible:ring-offset-mist active:scale-[0.98] sm:text-lg"
        >
          Open in Chrome
        </a>
        <p className="mt-3 text-xs leading-relaxed text-ink/55">
          If nothing happens, tap the menu at the top right and choose
          &ldquo;Open in browser&rdquo;.
        </p>
      </>
    );
  }

  const steps =
    exit.kind === "ios"
      ? ["Tap the ••• menu, top right", "Choose “Open in Safari”"]
      : ["Open your browser’s menu", "Choose “Open in browser”"];

  return (
    <ol className="mt-6 w-full space-y-2.5 text-left">
      {steps.map((step, i) => (
        <li key={step} className="flex items-center gap-3">
          <span
            aria-hidden
            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-gold/50 bg-parchment/70 font-display text-sm text-goldDeep"
          >
            {i + 1}
          </span>
          <span className="text-[0.9375rem] leading-snug text-ink/85">{step}</span>
        </li>
      ))}
    </ol>
  );
}
