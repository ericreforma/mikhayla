"use client";

import type { CSSProperties } from "react";
import { BABY_FULL_NAME } from "@/app/config";
import type { Exit } from "./inAppBrowser";
import { Crown, Sparkle } from "./Ornaments";

/**
 * The one screen a guest sees before the invitation when they arrive inside
 * a chat app's browser: a request, in the invitation's own voice, to come in
 * by the front door instead.
 *
 * ---------------------------------------------------------------------------
 * Why it is a door and not a banner
 * ---------------------------------------------------------------------------
 * A dismissible strip along the top would be read by nobody. This is the
 * single moment the ask can be made — before the castle, before fifteen
 * megabytes of her photographs and her songs have been pulled down a
 * connection the guest is about to abandon — so it is made once, with the
 * whole screen.
 *
 * ---------------------------------------------------------------------------
 * Why nothing here says "browser"
 * ---------------------------------------------------------------------------
 * The guests are family, and half of them will not know what a webview is or
 * why a link behaves differently in a chat thread. So the page does not
 * explain itself: it says they have come to a side door and points at the
 * grand one, which is the same instruction wearing clothes that match the
 * rest of the invitation.
 *
 * The only plain words left are the ones a guest has to find with their
 * thumb — the dots, and the name of the thing to tap in the menu. Those stay
 * literal on purpose. A royal flourish in the middle of a two-step
 * instruction is a flourish that stops the instruction working.
 *
 * ---------------------------------------------------------------------------
 * There is deliberately no way through
 * ---------------------------------------------------------------------------
 * No "continue anyway", no address to copy. This is a hard gate, chosen
 * knowingly: every guest either arrives in a real browser or does not arrive.
 *
 * What that costs is worth writing down, because it falls on the guests least
 * able to work around it. On Android the button below is a genuine one-tap
 * fix, but when it fails — no Chrome installed, or Meta tightening the
 * webview again — its fallback quietly reloads this very page, which from the
 * guest's side is a button that did nothing. On an iPhone there is no API
 * that opens Safari at all, so the numbered steps are the whole of the route.
 * In both cases the menu hint is the last road in, which is why it is on
 * screen rather than tucked away.
 */
export function OpenInBrowser({ exit }: { exit: Exit }) {
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

      <div className="relative flex w-full max-w-[24rem] flex-col items-center text-center">
        <div className="relative aspect-[32/23] h-11 xs:h-12 sm:h-14">
          <div
            aria-hidden
            className="load-halo absolute -inset-x-16 -inset-y-10 bg-[radial-gradient(closest-side,rgba(212,175,55,0.32),rgba(212,175,55,0))]"
          />
          <Crown className="absolute inset-0 h-full w-full text-gold" />
        </div>

        <p className="mt-4 font-hand text-xl leading-none text-berry xs:text-2xl">
          By royal decree
        </p>

        <h1
          id="oib-title"
          className="mt-2 font-display text-[1.75rem] italic leading-[1.15] text-ink xs:text-[2rem]"
        >
          {BABY_FULL_NAME}
        </h1>

        <div aria-hidden className="gilt-rule mt-4 h-px w-32 xs:w-40" />

        <p className="mt-5 text-[0.9375rem] leading-relaxed text-ink/80">
          You have arrived at a side door, and the Princess receives her guests
          at the grand entrance. Step through, and her invitation will unfold
          in all its splendour.
        </p>

        <Entrance exit={exit} />
      </div>
    </div>
  );
}

/**
 * The way to the grand entrance, which is a different road on each phone.
 *
 * Android gets a door that truly opens. Everyone else gets the two steps,
 * written for the menu they are looking at — plainly, because this is the
 * part a thumb has to follow.
 */
function Entrance({ exit }: { exit: Exit }) {
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
          Open the grand doors
        </a>
        <p className="mt-3.5 text-xs leading-relaxed text-ink/55">
          Should they not stir, tap the <Dots /> above and choose
          &ldquo;Open in browser&rdquo;.
        </p>
      </>
    );
  }

  const steps =
    exit.kind === "ios"
      ? [
          <>
            Tap the <Dots /> in the corner above
          </>,
          <>Choose &ldquo;Open in Safari&rdquo;</>,
        ]
      : [
          <>
            Tap the <Dots /> in the corner above
          </>,
          <>Choose &ldquo;Open in browser&rdquo;</>,
        ];

  return (
    <>
      <p className="mt-6 font-hand text-lg leading-none text-berry">
        Two steps to the ball
      </p>
      <ol className="mt-4 w-full space-y-3 text-left">
        {steps.map((step, i) => (
          <li key={i} className="flex items-center gap-3">
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
    </>
  );
}

/**
 * The overflow dots, as a shape rather than three full stops.
 *
 * Typed as text they set as an ellipsis — tight, baseline-sitting, nothing
 * like the control a guest is hunting for. These are spaced and centred, and
 * read to a screen reader as the word instead.
 */
function Dots() {
  return (
    <span className="whitespace-nowrap font-semibold tracking-[0.18em] text-ink/80">
      <span aria-hidden>•••</span>
      <span className="sr-only">three dots</span>
    </span>
  );
}
