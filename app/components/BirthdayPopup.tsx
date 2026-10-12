"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import { BABY_NAME, BIRTH_DAY, BIRTH_MONTH, BIRTH_YEAR, PARTY_DATE } from "@/app/config";
import { Crown, Sparkle, CloseIcon } from "./Ornaments";
import { Confetti } from "./Confetti";
import { RsvpDialog } from "./RsvpDialog";

/**
 * On her birthday, and only on her birthday.
 *
 * ---------------------------------------------------------------------------
 * Whose clock
 * ---------------------------------------------------------------------------
 * The guest's. `new Date()` here reads the device's own calendar, so it is her
 * birthday when it is the fourteenth of October *where the guest is standing* —
 * which is the only answer that makes sense for a party in one timezone and
 * relatives in several.
 *
 * It deliberately matches the day and month rather than the whole date, so it
 * comes round every year rather than being a thing that happened once in 2026
 * and never again.
 *
 * None of it is evaluated during the build. The check runs in an effect, after
 * mount, because a static export is rendered on a machine in some other
 * country weeks beforehand — a date compared at build time would be answering
 * about the wrong day in the wrong place, and would be baked into the HTML.
 */
function isHerBirthday(now = new Date()): boolean {
  return now.getMonth() + 1 === BIRTH_MONTH && now.getDate() === BIRTH_DAY;
}

/** How old she is today, in years, if today is a birthday of hers. */
function turning(now = new Date()): number {
  return now.getFullYear() - BIRTH_YEAR;
}

/**
 * Shown once a visit rather than once ever.
 *
 * `sessionStorage`, not `localStorage`, and the difference is the whole of the
 * behaviour. Once-ever would mean a guest who dismissed it by accident could
 * never get it back and would never find the wish box at all. Once-a-visit
 * means it does not nag while somebody reads the invitation, and a reload
 * brings it back for anyone who wants it.
 */
const SEEN_KEY = "mikhayla-birthday-seen";

function seen(where: string): boolean {
  try {
    return window.sessionStorage.getItem(`${SEEN_KEY}-${where}`) === "1";
  } catch {
    return false;
  }
}

function markSeen(where: string) {
  try {
    window.sessionStorage.setItem(`${SEEN_KEY}-${where}`, "1");
  } catch {
    /* Private mode. It shows again, which is the harmless way to be wrong. */
  }
}

/**
 * `where` is which screen is asking, and it keeps a counter per screen.
 *
 * The invitation and the hidden game are two different places a guest can be
 * standing, and each should say it once. Shared, the greeting shown on the
 * hero would silently use up the game's turn — so a child who went straight
 * from the balloon into the game would be told nothing at all.
 */
export function BirthdayPopup({
  where = "hero",
  compact = false,
}: {
  where?: string;
  /**
   * The flat, wide shape, for a screen that is wider than it is tall.
   *
   * The game is landscape-only and about 400px high, and the menu already
   * fills it — so the standing card lands squarely on top of the title and the
   * play button and reads as something broken rather than as something added.
   * Laid along the top instead it says the same words, takes a sixth of the
   * height, and leaves the game visible underneath it.
   */
  compact?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [years, setYears] = useState(1);
  const [wishing, setWishing] = useState(false);

  /* `document` only exists once mounted; during the static export there is
     nothing to portal into. */
  const [host, setHost] = useState<HTMLElement | null>(null);
  useEffect(() => setHost(document.body), []);

  useEffect(() => {
    /*
     * `?birthday` forces it, which is the only way to look at this before the
     * day itself — and the day itself is the one day it cannot be fixed on.
     * It skips the once-a-visit guard too, so it can be opened repeatedly
     * while something about it is being adjusted.
     */
    const forced = new URLSearchParams(window.location.search).has("birthday");
    if (!forced && (!isHerBirthday() || seen(where))) return;
    setYears(turning());
    /*
     * A beat before it arrives. The hero is still settling when this mounts —
     * the portrait is fading up and the headline is writing itself on — and a
     * card that lands in the middle of that reads as an interruption rather
     * than as a surprise.
     */
    const id = window.setTimeout(() => {
      setOpen(true);
      if (!forced) markSeen(where);
    }, 1100);
    return () => window.clearTimeout(id);
  }, [where]);

  const close = () => setOpen(false);
  const wish = () => {
    setWishing(true);
    setOpen(false);
  };

  /*
   * Out of the hero and onto the body, through a portal.
   *
   * The invitation is a deck of snap-scrolling slides, and this component is
   * mounted inside the first of them — so left where it was written, the card
   * scrolled away with the hero the moment anybody swiped. It has to outlast
   * that: a guest who starts reading the venue should still be able to send
   * the wish.
   *
   * A portal rather than simply `fixed`, and the difference is not academic.
   * `position: fixed` is quietly relative to the nearest ancestor with a
   * transform, a filter or `contain` on it rather than to the viewport, and
   * the hero is a stack of animated, `overflow-hidden` layers — so a fixed
   * child there is one `motion` wrapper away from being trapped and clipped
   * at any point in the future. On `document.body` there is nothing to trap
   * it. It is the same escape `RsvpDialog` makes, for the same reason.
   */
  if (!host) return null;

  return (
    <>
      {createPortal(
        <>
          {/* The paper flies whether or not the card is still up: dismissing
              it quickly should not sweep the confetti off the screen. It sits
              under the wish form's own z-[100], so it falls behind the form
              rather than over what somebody is typing. */}
          <Confetti run={open || wishing} />

          <AnimatePresence>
            {open && (
              <motion.div
                className={
                  "pointer-events-none fixed inset-x-0 top-0 z-50 flex justify-center " +
                  "px-[max(0.75rem,env(safe-area-inset-left))] pt-[max(0.6rem,env(safe-area-inset-top))]"
                }
                initial={{ opacity: 0, y: -28 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -28 }}
                transition={{ type: "spring", stiffness: 220, damping: 24 }}
              >
                {compact ? (
                  <BirthdayBanner years={years} onWish={wish} onClose={close} />
                ) : (
                  <BirthdayCard years={years} onWish={wish} onClose={close} />
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </>,
        host
      )}

      {/* The RSVP's own form, asked differently — see `Mode` in RsvpDialog.
          It portals itself, so it stays outside this one. */}
      <RsvpDialog mode="greeting" open={wishing} onClose={() => setWishing(false)} />
    </>
  );
}

/**
 * The card itself, with no opinion about when it appears.
 *
 * Split from the shell above so the thing that decides *whether* it is her
 * birthday and the thing that draws the card are separable — which is mostly
 * worth it because the card can then be put on screen and looked at without
 * waiting for the fourteenth of October.
 */
export function BirthdayCard({
  years,
  onWish,
  onClose,
}: {
  years: number;
  onWish: () => void;
  onClose: () => void;
}) {
  return (
  <div
    role="status"
    className="pointer-events-auto relative w-full max-w-sm overflow-hidden rounded-3xl border border-gold/40 bg-parchment px-5 py-4 text-center shadow-2xl"
  >
    <div aria-hidden className="pointer-events-none absolute inset-0 parchment-texture" />

    <button
      type="button"
      onClick={onClose}
      aria-label="Close"
      className="absolute right-2 top-2 z-10 flex h-8 w-8 items-center justify-center rounded-full text-ink/45 transition active:scale-95 hover:bg-mist hover:text-ink"
    >
      <CloseIcon className="h-4 w-4" />
    </button>

    <div className="relative">
      <Crown className="mx-auto h-7 w-auto text-gold" />
      <p className="mt-1.5 font-hand text-lg text-berry">It&apos;s her birthday!</p>
      <h2 className="mt-0.5 font-display text-xl italic leading-snug text-ink sm:text-2xl">
        {BABY_NAME} is {years} today
      </h2>

      {/*
        The one thing this card has to prevent somebody doing.

        Her birthday and her party are three days apart, and a card that only
        announced the birthday would have relatives checking the address and
        setting off today. So the date of the ball is said here, on the one
        screen where the two could be confused — and said as *still*, which is
        the word that tells a reader nothing has moved.
      */}
      <p className="mx-auto mt-1.5 max-w-[30ch] text-xs leading-relaxed text-ink/65 sm:text-sm">
        The celebration is still on{" "}
        <span className="font-semibold text-ink/85">{PARTY_DATE}</span> — we will see you
        at the ball.
      </p>

      <button
        type="button"
        onClick={onWish}
        className="mt-3.5 inline-flex min-h-[2.75rem] items-center justify-center gap-2 rounded-full bg-gold px-6 font-display text-base font-semibold text-night shadow-lg shadow-gold/20 transition active:scale-[0.98] hover:bg-goldSoft"
      >
        <Sparkle className="h-4 w-4" />
        Send a birthday wish
      </button>
    </div>
  </div>
  );
}

/**
 * The same news, laid along the top of a landscape screen.
 *
 * One row rather than a stack: the crown, the two lines of text, and the
 * button side by side, so it costs height instead of spending it. Everything
 * it says is what the card says — on a screen 400px tall, said in 70.
 */
function BirthdayBanner({
  years,
  onWish,
  onClose,
}: {
  years: number;
  onWish: () => void;
  onClose: () => void;
}) {
  return (
    <div
      role="status"
      className="pointer-events-auto relative flex w-full max-w-2xl items-center gap-3 overflow-hidden rounded-2xl border border-gold/40 bg-parchment py-2 pl-3.5 pr-11 shadow-2xl sm:gap-4 sm:pl-4"
    >
      <div aria-hidden className="pointer-events-none absolute inset-0 parchment-texture" />

      <Crown className="relative h-6 w-auto flex-none text-gold" />

      <div className="relative min-w-0 flex-1 text-left">
        <p className="font-hand text-sm leading-tight text-berry sm:text-base">
          It&apos;s her birthday! {BABY_NAME} is {years} today
        </p>
        <p className="mt-0.5 text-[11px] leading-snug text-ink/65 sm:text-xs">
          The celebration is still on{" "}
          <span className="font-semibold text-ink/85">{PARTY_DATE}</span>.
        </p>
      </div>

      <button
        type="button"
        onClick={onWish}
        className="relative inline-flex min-h-[2.25rem] flex-none items-center justify-center gap-1.5 rounded-full bg-gold px-4 font-display text-sm font-semibold text-night shadow-lg shadow-gold/20 transition active:scale-[0.98] hover:bg-goldSoft"
      >
        <Sparkle className="h-3.5 w-3.5" />
        Send a wish
      </button>

      <button
        type="button"
        onClick={onClose}
        aria-label="Close"
        className="absolute right-1.5 top-1/2 z-10 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full text-ink/45 transition active:scale-95 hover:bg-mist hover:text-ink"
      >
        <CloseIcon className="h-4 w-4" />
      </button>
    </div>
  );
}
