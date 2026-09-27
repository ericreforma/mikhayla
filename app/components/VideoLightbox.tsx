"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import { ChromeButton, ChromeTitle } from "./OverlayChrome";
import { useCloseOnBack } from "./backButton";
import { Spinner } from "./Ornaments";
import { useMusicFloor } from "./Music";

/**
 * The walkthrough, full screen — YouTube's own player under the same chrome
 * the map and the image viewer wear.
 *
 * The window on the page is deliberately a still. A player embedded in the
 * card would be a second thing on the screen competing for the swipe, it
 * would fetch a megabyte of YouTube on the way past, and at the size of that
 * card nobody could read the road signs anyway. So the tab is a picture of
 * the video, and the video itself happens here, where it has the screen.
 *
 * The same two things that hold for the map hold here, for the same reasons:
 * it renders into `document.body` through a portal, because the deck's
 * sections carry live transforms and a transformed ancestor would trap a
 * `fixed` overlay inside its section; and while it is open it sets
 * `data-modal="open"` on the body, so the deck's arrow keys stand down
 * rather than paging the invitation behind the player.
 *
 * It also takes the music floor while it is up — see `useMusicFloor`. The
 * bed plays under the whole invitation, and a walkthrough with a voice on it
 * playing over a music box is two things nobody can hear.
 */
export function VideoLightbox({
  src,
  title,
  poster = "",
  vertical = false,
  open,
  onClose,
}: {
  src: string;
  title: string;
  /** The still the tab shows, held under the wait. Optional. */
  poster?: string;
  /** True for a Short and anything else taller than it is wide. */
  vertical?: boolean;
  open: boolean;
  onClose: () => void;
}) {
  const [host, setHost] = useState<HTMLElement | null>(null);
  useEffect(() => setHost(document.body), []);

  if (!host) return null;
  return createPortal(
    <AnimatePresence>
      {open && (
        <Viewer
          src={src}
          title={title}
          poster={poster}
          vertical={vertical}
          onClose={onClose}
        />
      )}
    </AnimatePresence>,
    host
  );
}

function Viewer({
  src,
  title,
  poster,
  vertical,
  onClose,
}: {
  src: string;
  title: string;
  poster: string;
  vertical: boolean;
  onClose: () => void;
}) {
  const closeRef = useRef<HTMLButtonElement>(null);

  /*
   * Whether the player has answered yet.
   *
   * YouTube is a few hundred kilobytes of script fetched at the moment of
   * the tap — the one thing in the invitation that isn't already on the
   * phone — and on the signal a guest is likely to have at the venue that
   * is a second or three of nothing. So the wait is dressed rather than
   * left black: the still from the tab, dimmed, with a spinner over it, so
   * the dialog opens onto the picture that was just tapped and the video
   * arrives in its place.
   *
   * `onLoad` is the frame answering, not the video being ready to play —
   * YouTube buffers behind its own spinner after that — but it is the only
   * signal an embed gives without loading their API on top of it, and it is
   * the part of the wait that is ours.
   */
  const [ready, setReady] = useState(false);

  /* Back closes the video rather than the invitation. */
  useCloseOnBack(onClose);

  /* And the bed stands down while it plays, the same way it does for one of
     her months. Released on unmount, so closing brings the music back. */
  useMusicFloor(true);

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

  /* Escape closes. Everything else belongs to the player — space, the arrow
     keys and the rest are YouTube's once the focus is inside the frame. */
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
      className="fixed inset-0 z-[100] flex items-center justify-center bg-night"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
      /* The letterboxing either side of a vertical video is the only part of
         this that isn't the player, and a tap there means "done" — the
         player swallows its own taps, so anything that reaches the backdrop
         really was aimed past it. */
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      {/*
        The frame is cut to the video's own shape rather than left to fill
        the screen: the width is capped against the viewport's *height*, so
        the box is as large as fits and the player's controls sit along the
        bottom edge of the picture instead of stranded at the bottom of a
        black screen. `dvh` rather than `vh` because on a phone `vh` is the
        tall viewport behind the browser's own chrome, and the scrubber would
        be under it.
      */}
      <div
        className={
          vertical
            ? "relative aspect-[9/16] w-full max-w-[calc(100dvh*9/16)]"
            : "relative aspect-video w-full max-w-[calc(100dvh*16/9)]"
        }
      >
        {/* Mounted only while the overlay is. A player parked behind a closed
            dialog is a script and a buffer for something nobody is watching. */}
        <iframe
          title={title}
          src={src}
          onLoad={() => setReady(true)}
          className={`absolute inset-0 h-full w-full border-0 transition-opacity duration-300 ${
            ready ? "opacity-100" : "opacity-0"
          }`}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          referrerPolicy="strict-origin-when-cross-origin"
          allowFullScreen
        />

        {/* The wait, over the player until it answers. It fades rather than
            disappears, so the still hands over to the first frame instead of
            being swapped for it — and it keeps no pointer events on the way
            out, so a tap during the fade already belongs to the video. */}
        <div
          className={`pointer-events-none absolute inset-0 flex flex-col items-center justify-center gap-3 overflow-hidden bg-night transition-opacity duration-500 ${
            ready ? "opacity-0" : "opacity-100"
          }`}
        >
          {poster ? (
            <>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={poster}
                alt=""
                aria-hidden
                decoding="async"
                className="absolute inset-0 h-full w-full scale-105 object-cover blur-sm"
              />
              {/* A heavy veil over it, and not only for looks: the still has
                  the video's own white caption across the middle of it, which
                  is exactly where the spinner and its line of text sit. */}
              <span aria-hidden className="absolute inset-0 bg-night/80" />
            </>
          ) : null}
          <Spinner className="relative h-9 w-9 text-gold sm:h-10 sm:w-10" />
          <p role="status" className="relative font-display text-sm text-parchment/90 sm:text-base">
            Loading the walkthrough…
          </p>
        </div>
      </div>

      {/* Chrome floats over the player and keeps its own pointer events, so a
          tap that lands on the close button doesn't also reach the video. */}
      <div className="pointer-events-none absolute inset-x-0 top-0 flex items-start justify-between gap-2 p-3">
        <ChromeTitle>{title}</ChromeTitle>
        <div className="pointer-events-auto">
          <ChromeButton ref={closeRef} label="Close" onClick={onClose}>
            <path d="M7.5 7.5 L16.5 16.5 M16.5 7.5 L7.5 16.5" />
          </ChromeButton>
        </div>
      </div>
    </motion.div>
  );
}
