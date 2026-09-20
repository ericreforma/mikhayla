"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { motion, useReducedMotion, type Variants } from "framer-motion";
import {
  BABY_NAME,
  PARTY_LOCATION,
  PARTY_ADDRESS,
  RSVP_EMAIL,
  RSVP_BY,
  RSVP_ENDPOINT,
  VENUE_VIDEO,
  VENUE_VIDEO_POSTER,
  VENUE_MAP_IMAGE,
  VENUE_MAP_EMBED,
  VENUE_MAP_LINK,
} from "@/app/config";
import { Crown, Sparkle, MapPinIcon, PlayIcon, PalmIcon, ExpandIcon } from "./Ornaments";
import { ImageLightbox } from "./ImageLightbox";
import { RsvpDialog } from "./RsvpDialog";
import { useSlideIsActive } from "./SlideActive";

/** The deck's easing — a quick start settling into place. */
const EASE = [0.22, 1, 0.36, 1];

/* The section assembles itself as the swipe lands and unwinds when it leaves,
   the same cascade the date page uses. */
const GROUP: Variants = {
  out: { transition: { staggerChildren: 0.04, staggerDirection: -1 } },
  in: { transition: { delayChildren: 0.05, staggerChildren: 0.07 } },
};

const LINE: Variants = {
  out: { opacity: 0, y: 16, transition: { duration: 0.25, ease: EASE } },
  in: { opacity: 1, y: 0, transition: { duration: 0.45, ease: EASE } },
};

/** Hairlines are drawn out from the middle rather than faded in. */
const RULE: Variants = {
  out: { opacity: 0, scaleX: 0, transition: { duration: 0.25, ease: EASE } },
  in: { opacity: 1, scaleX: 1, transition: { duration: 0.55, ease: EASE } },
};

const CARD: Variants = {
  out: { opacity: 0, y: 26, scale: 0.97, transition: { duration: 0.3, ease: EASE } },
  in: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.55, ease: EASE } },
};

/** The same cascade with the travel taken out, for `prefers-reduced-motion`. */
const STILL: Variants = {
  out: { opacity: 0, transition: { duration: 0.2 } },
  in: { opacity: 1, transition: { duration: 0.3 } },
};

/** One of the sparkles in the corners, each on its own offset loop. */
function FloatingSparkle({
  className,
  size,
  drift,
  duration,
  delay = 0,
  still,
}: {
  className: string;
  size: string;
  drift: number;
  duration: number;
  delay?: number;
  still: boolean;
}) {
  return (
    <motion.div
      aria-hidden
      className={`pointer-events-none absolute ${className}`}
      animate={still ? undefined : { y: [0, drift, 0] }}
      transition={{ duration, repeat: Infinity, ease: "easeInOut", delay }}
    >
      <Sparkle className={`${size} ${still ? "" : "animate-twinkle"}`} />
    </motion.div>
  );
}

/** The gold call to action, worn by either a button or a link — see below. */
const RSVP_BUTTON =
  "flex min-h-[3rem] items-center justify-center rounded-full bg-gold px-8 font-display text-base font-semibold text-night shadow-lg shadow-gold/20 transition active:scale-[0.98] hover:bg-goldSoft sm:px-9 sm:text-lg";

type Pane = "video" | "map";

/**
 * One of the two tabs over the venue window. Declared out here rather than
 * inside the section: nested in the render it would be a new component type
 * on every state change, and React would remount the button you just tapped —
 * taking the keyboard focus with it.
 */
function VenueTab({
  id,
  label,
  Icon,
  active,
  onSelect,
}: {
  id: Pane;
  label: string;
  Icon: (props: { className?: string }) => JSX.Element;
  active: boolean;
  onSelect: (id: Pane) => void;
}) {
  return (
    <button
      type="button"
      role="tab"
      id={`venue-tab-${id}`}
      aria-selected={active}
      aria-controls={`venue-pane-${id}`}
      onClick={() => onSelect(id)}
      className={`flex min-h-[2.5rem] flex-1 items-center justify-center gap-2 rounded-full px-3 font-display text-sm transition sm:text-base ${
        active ? "bg-gold text-night shadow-sm" : "text-ink/60 active:scale-[0.98] hover:text-ink"
      }`}
    >
      <Icon className="h-4 w-4 flex-none sm:h-[1.1rem] sm:w-[1.1rem]" />
      {label}
    </button>
  );
}

/**
 * What stands in for a pane whose asset hasn't been dropped in yet. It fills
 * the frame exactly, so filling in `VENUE_VIDEO` or `VENUE_MAP_EMBED` later
 * changes what is inside the window and nothing about the layout around it.
 */
function Placeholder({ icon, title, note }: { icon: ReactNode; title: string; note: string }) {
  return (
    <div className="flex h-full w-full flex-col items-center justify-center gap-2 bg-gradient-to-br from-mist via-parchment to-rose/30 px-6 text-center">
      <span className="flex h-11 w-11 items-center justify-center rounded-full border border-gold/50 bg-parchment/80 text-goldDeep shadow-sm sm:h-12 sm:w-12">
        {icon}
      </span>
      <p className="font-display text-sm text-ink xs:text-base">{title}</p>
      <p className="max-w-[32ch] text-xs leading-relaxed text-ink/60 sm:text-sm">{note}</p>
    </div>
  );
}

export function PartyDetailsSection() {
  const isActive = useSlideIsActive();
  const reduce = useReducedMotion();
  const still = Boolean(reduce);
  const state = isActive ? "in" : "out";

  const line = still ? STILL : LINE;
  const rule = still ? STILL : RULE;

  /*
   * The walkthrough and the map share one window instead of stacking. Two
   * 16:9 frames plus the address and the buttons would push the RSVP below
   * the fold on a phone, and the RSVP is the one thing on this page that has
   * to be seen without a scroll.
   */
  const [pane, setPane] = useState<Pane>("video");
  const [mapOpen, setMapOpen] = useState(false);
  const [rsvpOpen, setRsvpOpen] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  /* Nothing plays off-screen: swiping to another section stops the
     walkthrough, and so does switching to the map. Autoplay is muted, which
     is what browsers require of it, and is skipped under reduced motion. */
  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    if (isActive && pane === "video" && !still) {
      void v.play().catch(() => {});
    } else {
      v.pause();
    }
  }, [isActive, pane, still]);

  /* The full-screen panels go with the section. Swiping away with one open
     would otherwise leave it covering whichever page you landed on. */
  useEffect(() => {
    if (isActive) return;
    setMapOpen(false);
    setRsvpOpen(false);
  }, [isActive]);

  return (
    <div className="relative flex min-h-full flex-col items-center overflow-hidden bg-parchment px-gutter pb-nav pt-8 text-center">
      <div aria-hidden className="pointer-events-none absolute inset-0 parchment-texture" />

      {/* Tucked into the corners, where the card never reaches. */}
      <FloatingSparkle
        className="left-[4%] top-[6%] text-gold sm:left-[9%] sm:top-[11%]"
        size="h-5 w-5 xs:h-6 xs:w-6 sm:h-8 sm:w-8"
        drift={20}
        duration={6.5}
        still={still}
      />
      <FloatingSparkle
        className="right-[5%] top-[9%] text-roseDeep sm:right-[10%] sm:top-[14%]"
        size="h-4 w-4 xs:h-5 xs:w-5 sm:h-7 sm:w-7"
        drift={-18}
        duration={5.5}
        delay={0.6}
        still={still}
      />
      <FloatingSparkle
        className="bottom-[8%] left-[5%] text-roseDeep sm:bottom-[13%] sm:left-[12%]"
        size="h-4 w-4 xs:h-5 xs:w-5 sm:h-7 sm:w-7"
        drift={16}
        duration={6}
        delay={1.1}
        still={still}
      />
      <FloatingSparkle
        className="bottom-[6%] right-[5%] text-gold sm:bottom-[11%] sm:right-[11%]"
        size="h-5 w-5 xs:h-6 xs:w-6 sm:h-8 sm:w-8"
        drift={-20}
        duration={7}
        delay={0.3}
        still={still}
      />

      <motion.div
        className="relative my-auto flex w-full max-w-md flex-col items-center sm:max-w-lg"
        initial={false}
        animate={state}
        variants={GROUP}
      >
        {/* The crown keeps breathing after it has arrived, so the page is
            never completely still while you read it. */}
        <motion.div variants={line}>
          <motion.div
            animate={still ? undefined : { y: [0, -6, 0] }}
            transition={{ duration: 4.5, repeat: Infinity, ease: "easeInOut" }}
          >
            <Crown className="h-7 w-auto text-gold drop-shadow-sm xs:h-8 sm:h-10" />
          </motion.div>
        </motion.div>

        <motion.p
          variants={line}
          className="mt-3 font-hand text-lg text-berry xs:text-xl sm:text-2xl"
        >
          The royal ball
        </motion.p>

        <motion.h2
          variants={line}
          className="mt-1 font-display text-2xl italic leading-snug text-ink xs:text-3xl sm:text-4xl"
        >
          Her castle for a day
        </motion.h2>

        <motion.div
          aria-hidden
          variants={rule}
          className="gilt-rule mt-3 h-px w-28 xs:w-36 sm:mt-4 sm:w-48"
        />

        <motion.p
          variants={line}
          className="mt-3 max-w-[34ch] text-sm leading-relaxed text-ink/70 sm:mt-4 sm:max-w-[46ch] sm:text-base"
        >
          Every princess needs a castle. Hers has palms at the gate, a pool the colour of
          Ariel&apos;s ocean, and room for the whole kingdom.
        </motion.p>

        {/*
          The venue as one gilt-framed card: its name, its address, and a
          window onto it that switches between the walkthrough and the map.
          Keeping all three in one card rather than stacking two is what keeps
          the RSVP above the fold on a phone.
        */}
        <motion.div
          variants={still ? STILL : CARD}
          className="mt-4 w-full rounded-2xl border border-gold/40 bg-parchment/70 p-3 shadow-sm sm:mt-5 sm:p-4"
        >
          <p className="flex items-center justify-center gap-2 font-display text-lg leading-snug text-ink xs:text-xl sm:text-2xl">
            <PalmIcon className="h-5 w-5 flex-none text-goldDeep sm:h-6 sm:w-6" />
            <span>{PARTY_LOCATION}</span>
          </p>
          <p className="mt-1.5 flex items-start justify-center gap-2 text-xs leading-relaxed text-ink/70 sm:text-sm">
            <MapPinIcon className="mt-px h-4 w-4 flex-none text-goldDeep" />
            <span className="max-w-[34ch] text-left">{PARTY_ADDRESS}</span>
          </p>

          <div
            role="tablist"
            aria-label="Look around the venue"
            className="mx-auto mt-3 flex max-w-xs items-center gap-1 rounded-full border border-gold/30 bg-mist/60 p-1"
          >
            <VenueTab
              id="video"
              label="Walkthrough"
              Icon={PlayIcon}
              active={pane === "video"}
              onSelect={setPane}
            />
            <VenueTab
              id="map"
              label="Map"
              Icon={MapPinIcon}
              active={pane === "map"}
              onSelect={setPane}
            />
          </div>

          <div className="mt-3 overflow-hidden rounded-xl border border-gold/30 bg-mist">
            <div
              role="tabpanel"
              id="venue-pane-video"
              aria-labelledby="venue-tab-video"
              hidden={pane !== "video"}
              className="aspect-video w-full"
            >
              {VENUE_VIDEO ? (
                <video
                  ref={videoRef}
                  className="h-full w-full object-cover"
                  src={VENUE_VIDEO}
                  poster={VENUE_VIDEO_POSTER || undefined}
                  controls
                  muted
                  loop
                  playsInline
                  preload="metadata"
                />
              ) : (
                <Placeholder
                  icon={<PlayIcon className="h-5 w-5 sm:h-6 sm:w-6" />}
                  title="A walk through the grounds"
                  note="The venue video goes here — pool, hall and all."
                />
              )}
            </div>

            <div
              role="tabpanel"
              id="venue-pane-map"
              aria-labelledby="venue-tab-map"
              hidden={pane !== "map"}
              className="aspect-video w-full"
            >
              {VENUE_MAP_IMAGE ? (
                /*
                 * The sheet is portrait and the window is 16:9, so the
                 * thumbnail is cropped from the top — which is where the
                 * Casa Maria sign and the main road are, so it still reads
                 * as their map rather than as a band of unnamed streets.
                 * The whole thing is one tap away.
                 */
                <button
                  type="button"
                  onClick={() => setMapOpen(true)}
                  aria-label={`Open the full map to ${PARTY_LOCATION}`}
                  className="group relative block h-full w-full bg-white"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={VENUE_MAP_IMAGE}
                    alt=""
                    loading="lazy"
                    decoding="async"
                    className="h-full w-full object-cover object-top transition duration-300 group-hover:scale-[1.03]"
                  />
                  <span className="pointer-events-none absolute bottom-1.5 right-1.5 flex items-center gap-1 rounded-full bg-night/75 px-2.5 py-1 text-[10px] font-medium text-parchment backdrop-blur-sm sm:text-xs">
                    <ExpandIcon className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
                    Tap for full map
                  </span>
                </button>
              ) : VENUE_MAP_EMBED ? (
                <iframe
                  title={`Map to ${PARTY_LOCATION}`}
                  src={VENUE_MAP_EMBED}
                  className="h-full w-full border-0"
                  loading="lazy"
                  referrerPolicy="no-referrer-when-downgrade"
                  allowFullScreen
                />
              ) : (
                <Placeholder
                  icon={<MapPinIcon className="h-5 w-5 sm:h-6 sm:w-6" />}
                  title="Poblacion, San Jose del Monte"
                  note="The map drops in here. Directions already work — the button below opens them."
                />
              )}
            </div>
          </div>
        </motion.div>

        {/* Both full-width thumb targets on a phone, side by side once there
            is room. The gold one is the ask; directions are what a guest
            comes back for on the day. */}
        <motion.div
          variants={line}
          className="mt-5 flex w-full flex-col items-stretch gap-2.5 sm:flex-row sm:justify-center sm:gap-3"
        >
          {/*
            The same button either way. With an endpoint configured it opens
            the form; without one it falls back to the email link the
            invitation shipped with, so the page is never broken while the
            sheet is still being set up.
          */}
          {RSVP_ENDPOINT ? (
            <button
              type="button"
              onClick={() => setRsvpOpen(true)}
              className={RSVP_BUTTON}
            >
              RSVP by {RSVP_BY}
            </button>
          ) : (
            <a
              href={`mailto:${RSVP_EMAIL}?subject=${encodeURIComponent(
                `RSVP — ${BABY_NAME}'s First Birthday`
              )}`}
              className={RSVP_BUTTON}
            >
              RSVP by {RSVP_BY}
            </a>
          )}
          <a
            href={VENUE_MAP_LINK}
            target="_blank"
            rel="noreferrer"
            className="flex min-h-[3rem] items-center justify-center gap-2 rounded-full border border-gold/60 bg-parchment/70 px-8 font-display text-base text-ink shadow-sm transition active:scale-[0.98] hover:bg-goldSoft/40 sm:px-9 sm:text-lg"
          >
            <MapPinIcon className="h-4 w-4 flex-none text-goldDeep sm:h-5 sm:w-5" />
            Get directions
          </a>
        </motion.div>
      </motion.div>

      <ImageLightbox
        src={VENUE_MAP_IMAGE}
        alt={`Map to ${PARTY_LOCATION}`}
        open={mapOpen}
        onClose={() => setMapOpen(false)}
      />

      <RsvpDialog open={rsvpOpen} onClose={() => setRsvpOpen(false)} />
    </div>
  );
}
