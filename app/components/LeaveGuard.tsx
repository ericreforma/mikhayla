"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import { BABY_NAME } from "@/app/config";
import { Crown } from "./Ornaments";
import { leaveSite, useLeaveGuard } from "./backButton";

/**
 * Catches the Back that would leave the invitation and asks first.
 *
 * It sits at the root rather than in a section, because the question isn't
 * about any one of them — and because the deck's sections carry live
 * transforms, which would trap a `position: fixed` overlay inside whichever
 * one rendered it. The history side of this lives in `backButton.ts`, where
 * it shares one listener with the panels, so a Back that is only closing the
 * map never reaches this.
 */
export function LeaveGuard() {
  const [asking, setAsking] = useState(false);
  const [host, setHost] = useState<HTMLElement | null>(null);
  useEffect(() => setHost(document.body), []);

  useLeaveGuard(() => setAsking(true));

  if (!host) return null;
  return createPortal(
    <AnimatePresence>
      {asking && (
        <Ask
          onStay={() => setAsking(false)}
          onLeave={() => {
            setAsking(false);
            leaveSite();
          }}
        />
      )}
    </AnimatePresence>,
    host
  );
}

function Ask({ onStay, onLeave }: { onStay: () => void; onLeave: () => void }) {
  const stayRef = useRef<HTMLButtonElement>(null);

  /* Flag the deck off the keyboard while we're up — it listens for arrow keys
     on `window` — and start on "Stay", so a stray Enter keeps the guest here
     rather than sending them away. */
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    document.body.dataset.modal = "open";
    stayRef.current?.focus();
    return () => {
      delete document.body.dataset.modal;
      previous?.focus?.();
    };
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      e.preventDefault();
      onStay();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onStay]);

  return (
    <motion.div
      role="dialog"
      aria-modal="true"
      aria-labelledby="leave-heading"
      /* Above the panels: they can't be open when this appears, but a guest
         who taps Back while one is still animating away shouldn't see the
         question slide in underneath it. */
      className="fixed inset-0 z-[110] flex items-center justify-center bg-night/80 px-5 backdrop-blur-sm"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
      onClick={onStay}
    >
      <motion.div
        /* A tap anywhere outside means "stay", so the card stops the ones
           that land on it from counting as one. */
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-sm overflow-hidden rounded-3xl border border-gold/40 bg-parchment p-6 text-center shadow-2xl sm:p-7"
        initial={{ opacity: 0, y: 20, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 10, scale: 0.98 }}
        transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
      >
        <div aria-hidden className="pointer-events-none absolute inset-0 parchment-texture" />

        <div className="relative">
          <Crown className="mx-auto h-7 w-auto text-gold sm:h-8" />
          <p className="mt-2 font-hand text-lg text-berry sm:text-xl">Must you go?</p>
          <h2
            id="leave-heading"
            className="mt-0.5 font-display text-xl italic leading-snug text-ink sm:text-2xl"
          >
            Leaving the invitation
          </h2>
          <div aria-hidden className="gilt-rule mx-auto mt-3 h-px w-24 sm:w-32" />
          <p className="mx-auto mt-3 max-w-[30ch] text-sm leading-relaxed text-ink/70">
            Back will take you off {BABY_NAME}&apos;s invitation and return you to wherever you
            came from.
          </p>

          <div className="mt-5 flex flex-col-reverse gap-2.5 sm:flex-row sm:gap-3">
            <button
              type="button"
              onClick={onLeave}
              className="flex min-h-[3rem] flex-1 items-center justify-center rounded-full border border-gold/50 bg-parchment/70 px-5 font-display text-base text-ink/70 transition active:scale-[0.98] hover:bg-mist hover:text-ink"
            >
              Leave
            </button>
            <button
              ref={stayRef}
              type="button"
              onClick={onStay}
              className="flex min-h-[3rem] flex-1 items-center justify-center rounded-full bg-gold px-5 font-display text-base font-semibold text-night shadow-lg shadow-gold/20 transition active:scale-[0.98] hover:bg-goldSoft"
            >
              Stay
            </button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}
