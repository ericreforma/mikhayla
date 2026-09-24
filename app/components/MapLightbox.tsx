"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import { ChromeButton, ChromeTitle } from "./OverlayChrome";
import { Directions } from "./Directions";
import { useCloseOnBack } from "./backButton";
import { MapPinIcon } from "./Ornaments";

/**
 * The live map, full screen — Google's own embed, with its own panning and
 * zooming, under the same chrome the image viewer wears.
 *
 * The window on the page is deliberately a picture: a map that scrolls inside
 * a card would swallow every swipe meant for the deck. All of that gesturing
 * happens here instead, where nothing is behind it.
 *
 * Two things about where it lives are load-bearing, and are the same two that
 * hold for the image viewer:
 *
 * It renders into `document.body` through a portal. The deck's sections are
 * framer-motion elements with live transforms on them, and a transformed
 * ancestor becomes the containing block for `position: fixed` descendants —
 * so a fixed overlay written inline would be trapped inside its section
 * rather than covering the screen.
 *
 * And while it's open it sets `data-modal="open"` on the body. The deck
 * listens for arrow keys on `window`; without a flag to check, arrowing
 * around the map would also swipe the invitation behind it.
 */
export function MapLightbox({
  src,
  title,
  open,
  onClose,
}: {
  src: string;
  title: string;
  open: boolean;
  onClose: () => void;
}) {
  const [host, setHost] = useState<HTMLElement | null>(null);
  useEffect(() => setHost(document.body), []);

  if (!host) return null;
  return createPortal(
    <AnimatePresence>
      {open && <Viewer src={src} title={title} onClose={onClose} />}
    </AnimatePresence>,
    host
  );
}

function Viewer({
  src,
  title,
  onClose,
}: {
  src: string;
  title: string;
  onClose: () => void;
}) {
  const closeRef = useRef<HTMLButtonElement>(null);

  /* Back closes the map rather than the invitation. */
  useCloseOnBack(onClose);

  /* Flag the deck off the keyboard while we're up, and put the focus
     somewhere inside the overlay so a Tab press doesn't wander off into the
     invitation behind it. */
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    document.body.dataset.modal = "open";
    closeRef.current?.focus();
    return () => {
      delete document.body.dataset.modal;
      previous?.focus?.();
    };
  }, []);

  /* Escape closes. Everything else belongs to the map: once the focus is
     inside the iframe the keys are Google's, which is the point of opening
     it full screen. */
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
      aria-label={title}
      className="fixed inset-0 z-[100] bg-night"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
    >
      {/* The map is only mounted while the overlay is — a second copy of
          Google's embed running behind a closed dialog is a tile fetch and a
          frame's worth of script for something nobody is looking at. */}
      <iframe
        title={title}
        src={src}
        className="absolute inset-0 h-full w-full border-0"
        referrerPolicy="no-referrer-when-downgrade"
        allowFullScreen
      />

      {/* Chrome floats over the map and keeps its own pointer events, so a
          drag that ends on a button doesn't also pan it. */}
      <div className="pointer-events-none absolute inset-x-0 top-0 flex items-start justify-between gap-2 p-3">
        <ChromeTitle>{title}</ChromeTitle>
        <div className="pointer-events-auto">
          <ChromeButton label="Close" onClick={onClose} ref={closeRef}>
            <path d="M7.5 7.5 L16.5 16.5 M16.5 7.5 L7.5 16.5" />
          </ChromeButton>
        </div>
      </div>

      {/* The embed can pan and zoom, but it can't hand anyone to the Maps app
          for turn-by-turn — so the way out sits here too, where a guest
          looking at the map on the day will already be. */}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 flex justify-center p-4">
        <Directions className="pointer-events-auto flex min-h-[2.75rem] items-center gap-2 rounded-full border border-gold/40 bg-night/80 px-5 font-display text-sm text-parchment shadow-lg backdrop-blur-sm transition active:scale-[0.98] hover:bg-night sm:text-base">
          <MapPinIcon className="h-4 w-4 flex-none text-gold" />
          Get directions
        </Directions>
      </div>
    </motion.div>
  );
}
