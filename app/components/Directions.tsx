"use client";

import { useEffect, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import { PARTY_LOCATION, VENUE_MAP_LINKS } from "@/app/config";
import { MapPinIcon } from "./Ornaments";
import { useCloseOnBack } from "./backButton";

/**
 * Is this an iPhone or an iPad?
 *
 * Only Apple's phones are asked, because they are the only place the answer
 * is genuinely ambiguous: Android always has Google Maps, and a desktop opens
 * either one in a tab. It runs after mount rather than during the render —
 * the page is prerendered at build time, where there is no `navigator` to
 * ask, and a guess there would hydrate into a mismatch.
 *
 * An iPad reports itself as a Mac, and has done since iPadOS 13, so the touch
 * points are what separate it from a real one.
 */
function useIsApplePhone() {
  const [yes, setYes] = useState(false);
  useEffect(() => {
    const ua = navigator.userAgent;
    setYes(
      /iPhone|iPad|iPod/.test(ua) ||
        (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1)
    );
  }, []);
  return yes;
}

/**
 * "Get directions", wearing whatever the surface around it needs.
 *
 * Everywhere but an iPhone it is exactly what it looks like — a link to
 * Google Maps, which opens the app when it's installed and the website when
 * it isn't. On an iPhone it asks which map to use first.
 *
 * There is no way for a web page to find out whether Google Maps is
 * installed, and the trick people reach for — firing `comgooglemaps://` and
 * timing out — puts an iOS error dialog in front of exactly the guests who
 * don't have it. So the question goes to the guest instead, who knows the
 * answer, and both options are real links that work either way.
 */
export function Directions({ className, children }: { className: string; children: ReactNode }) {
  const apple = useIsApplePhone();
  const [choosing, setChoosing] = useState(false);

  if (!apple) {
    return (
      <a href={VENUE_MAP_LINKS.google} target="_blank" rel="noreferrer" className={className}>
        {children}
      </a>
    );
  }

  return (
    <>
      <button
        type="button"
        aria-haspopup="dialog"
        onClick={() => setChoosing(true)}
        className={className}
      >
        {children}
      </button>
      <Chooser open={choosing} onClose={() => setChoosing(false)} />
    </>
  );
}

function Chooser({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [host, setHost] = useState<HTMLElement | null>(null);
  useEffect(() => setHost(document.body), []);

  if (!host) return null;
  return createPortal(
    <AnimatePresence>{open && <Sheet onClose={onClose} />}</AnimatePresence>,
    host
  );
}

function Sheet({ onClose }: { onClose: () => void }) {
  /* Back closes the question, the same as every other panel on the site. */
  useCloseOnBack(onClose);

  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    document.body.dataset.modal = "open";
    return () => {
      delete document.body.dataset.modal;
      previous?.focus?.();
    };
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      e.preventDefault();
      onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <motion.div
      role="dialog"
      aria-modal="true"
      aria-labelledby="directions-heading"
      /* Above the full-screen map, which is where this is often opened from. */
      className="fixed inset-0 z-[120] flex items-end justify-center bg-night/80 px-4 pb-5 backdrop-blur-sm sm:items-center sm:pb-0"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
      onClick={onClose}
    >
      {/* Within thumb's reach at the bottom on a phone, centred once there is
          room — this is tapped standing in a car park, one-handed. */}
      <motion.div
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-sm overflow-hidden rounded-3xl border border-gold/40 bg-parchment p-5 shadow-2xl sm:p-6"
        initial={{ opacity: 0, y: 24, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 16, scale: 0.98 }}
        transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
      >
        <div aria-hidden className="pointer-events-none absolute inset-0 parchment-texture" />

        <div className="relative text-center">
          <MapPinIcon className="mx-auto h-6 w-6 text-goldDeep" />
          <h2
            id="directions-heading"
            className="mt-2 font-display text-xl italic leading-snug text-ink sm:text-2xl"
          >
            Open the map in
          </h2>
          <p className="mx-auto mt-1 max-w-[28ch] text-xs leading-relaxed text-ink/60 sm:text-sm">
            {PARTY_LOCATION}
          </p>

          <div className="mt-4 flex flex-col gap-2.5">
            <Choice href={VENUE_MAP_LINKS.apple} onPick={onClose} primary>
              Apple Maps
            </Choice>
            <Choice href={VENUE_MAP_LINKS.google} onPick={onClose}>
              Google Maps
            </Choice>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="mt-3 min-h-[2.5rem] w-full font-display text-sm text-ink/50 transition hover:text-ink"
          >
            Cancel
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

/**
 * One of the maps on offer. A plain link, so a long press still gives the
 * guest the browser's own "open in…" menu.
 */
function Choice({
  href,
  onPick,
  primary,
  children,
}: {
  href: string;
  onPick: () => void;
  primary?: boolean;
  children: ReactNode;
}) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      /* Closing on the way out: the app takes over the screen, and coming
         back to a question already answered is just something else to dismiss. */
      onClick={onPick}
      className={`flex min-h-[3rem] items-center justify-center rounded-full px-6 font-display text-base transition active:scale-[0.98] ${
        primary
          ? "bg-gold font-semibold text-night shadow-lg shadow-gold/20 hover:bg-goldSoft"
          : "border border-gold/50 bg-parchment/70 text-ink hover:bg-mist"
      }`}
    >
      {children}
    </a>
  );
}
