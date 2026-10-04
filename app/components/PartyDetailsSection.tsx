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
  VENUE_VIDEO_EMBED,
  VENUE_VIDEO_VERTICAL,
  VENUE_MAP_IMAGE,
  VENUE_MAP_EMBED,
  COLUMN_SEPARATOR,
} from "@/app/config";
import { Crown, Sparkle, MapPinIcon, PlayIcon, PalmIcon, ExpandIcon } from "./Ornaments";
import { ImageLightbox } from "./ImageLightbox";
import { MapLightbox } from "./MapLightbox";
import { VideoLightbox } from "./VideoLightbox";
import { Directions } from "./Directions";
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

/**
 * The gilt upright between the two columns, drawn out from its middle — the
 * same gesture as a hairline, turned on its side, and the same one the
 * dedication page uses. Slower, because it is longer, and last, because it is
 * the thing that says the two halves are one plate.
 */
const UPRIGHT: Variants = {
  out: { opacity: 0, scaleY: 0, transition: { duration: 0.3, ease: EASE } },
  in: { opacity: 1, scaleY: 1, transition: { duration: 0.7, delay: 0.1, ease: EASE } },
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
  "flex min-h-[3rem] items-center justify-center rounded-full bg-gold px-8 font-display text-base font-semibold text-night shadow-lg shadow-gold/20 transition active:scale-[0.98] hover:bg-goldSoft sm:px-9 sm:text-lg wide:min-h-[3.25rem] wide:text-xl";

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
 * Whether there is room to stand the two venue windows side by side.
 *
 * A live query rather than a value read once, because this one really can
 * change under a guest: turning a tablet over is exactly the gesture that
 * takes a 768px screen to a 1024px one, and the answer has to change with it.
 *
 * It starts false and settles on the first effect, which costs one extra
 * render on a tablet and nothing at all on a phone. There is no flash to
 * worry about: this section is four swipes into a deck that is itself built
 * behind a loading screen, so it has been mounted for many seconds before
 * anybody looks at it.
 */
function useSideBySide() {
  const [roomy, setRoomy] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(min-width: 768px)");
    const read = () => setRoomy(mq.matches);
    read();
    mq.addEventListener("change", read);
    return () => mq.removeEventListener("change", read);
  }, []);

  return roomy;
}

/**
 * One of the two windows onto the venue — the walkthrough, or the map.
 *
 * Which arrangement is in use decides what this even is, which is why it
 * takes `sideBySide` rather than being two components.
 *
 * On a phone the two windows are the same window: one frame, shown one at a
 * time, with the tabs above choosing between them. That is not a space-saving
 * compromise so much as the only thing that fits — two 16:9 frames plus the
 * address and the buttons push the RSVP below the fold, and the RSVP is the
 * one thing on this page that has to be seen without a scroll.
 *
 * Given the width for both, the tabs go entirely and these become a pair of
 * framed pictures each with its own name over it. A tablet has room to show
 * the way in and where it is at the same time, and a guest should not have to
 * discover that the second one exists.
 *
 * They sit side by side held upright and one above the other turned sideways,
 * which sounds backwards and is not: laid out in two columns the whole card is
 * already only a half-width column of a landscape page, so each window would
 * be a quarter of the screen across. Stacked, each gets the card's full width.
 *
 * Stacked, though, what they are short of is height — two 16:9 frames one
 * above the other in 768px of landscape leave the card nothing to breathe
 * with. So there they take a shallower shape than 16:9, which is the one way
 * two stacked windows get *bigger* on a page with height to spare and none to
 * give: wider by nearly half, and shorter by enough to pay for it.
 *
 * Declared out here rather than inside the section for the same reason
 * `VenueTab` is: nested in the render it would be a new component type on
 * every state change, and React would throw away the iframe and reload it.
 */
function VenuePane({
  id,
  label,
  Icon,
  active,
  sideBySide,
  children,
}: {
  id: Pane;
  label: string;
  Icon: (props: { className?: string }) => JSX.Element;
  active: boolean;
  sideBySide: boolean;
  children: ReactNode;
}) {
  if (!sideBySide) {
    return (
      <div
        role="tabpanel"
        id={`venue-pane-${id}`}
        aria-labelledby={`venue-tab-${id}`}
        hidden={!active}
        className="aspect-video w-full"
      >
        {children}
      </div>
    );
  }

  return (
    <section aria-label={label} className="min-w-0">
      <h4 className="flex items-center justify-center gap-1.5 pb-1 font-display text-sm text-ink/75 sm:text-base wide:pb-2 wide:text-lg">
        <Icon className="h-4 w-4 flex-none text-goldDeep sm:h-[1.1rem] sm:w-[1.1rem]" />
        {label}
      </h4>
      <div className="aspect-video w-full overflow-hidden rounded-xl border border-gold/30 bg-mist wide:aspect-[13/5]">
        {children}
      </div>
    </section>
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
  const sideBySide = useSideBySide();
  const [pane, setPane] = useState<Pane>("video");
  const [videoOpen, setVideoOpen] = useState(false);
  const [mapOpen, setMapOpen] = useState(false);
  /*
   * The live map is Google's script and a screenful of tiles, and the tab it
   * sits behind starts closed. This latches the first time a guest opens that
   * tab, so the embed loads when it is asked for and not on the way past.
   */
  const [mapAsked, setMapAsked] = useState(false);
  const [rsvpOpen, setRsvpOpen] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  /* Shown side by side the map is on screen from the start, so there is no
     tap left to wait for — it is asked for as soon as we know that is the
     arrangement. */
  useEffect(() => {
    if (sideBySide || pane === "map") setMapAsked(true);
  }, [sideBySide, pane]);

  /* Nothing plays off-screen: swiping to another section stops the
     walkthrough, and so does switching to the map. Autoplay is muted, which
     is what browsers require of it, and is skipped under reduced motion. */
  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    if (isActive && (sideBySide || pane === "video") && !still) {
      void v.play().catch(() => {});
    } else {
      v.pause();
    }
  }, [isActive, pane, still, sideBySide]);

  /* The full-screen panels go with the section. Swiping away with one open
     would otherwise leave it covering whichever page you landed on. */
  useEffect(() => {
    if (isActive) return;
    setVideoOpen(false);
    setMapOpen(false);
    setRsvpOpen(false);
  }, [isActive]);

  return (
    /* The gutter comes off once the page splits, so the two columns can be a
       true half of the window each and the rule between them lands on its
       centre line — the same arrangement as the dedication page. Each column
       carries its own padding, and its contents are capped and centred inside
       that, so nothing runs to the screen edge. */
    <div className="relative flex min-h-full flex-col items-center overflow-hidden bg-parchment px-gutter pb-nav pt-8 text-center wide:px-0 wide:pt-3">
      <div aria-hidden className="pointer-events-none absolute inset-0 parchment-texture" />

      {/* Tucked into the corners, where the card never reaches — and pulled
          further into them once it does. The venue card is centred in a half of
          the window now rather than held inside a 4xl box, so on a wide screen
          its top corner had grown out under the right-hand sparkle. These are
          decoration; nothing of them may land on the card's own gilt edge. */}
      <FloatingSparkle
        className="left-[4%] top-[6%] text-gold sm:left-[9%] sm:top-[11%] wide:left-[3%] wide:top-[7%]"
        size="h-5 w-5 xs:h-6 xs:w-6 sm:h-8 sm:w-8"
        drift={20}
        duration={6.5}
        still={still}
      />
      <FloatingSparkle
        className="right-[5%] top-[9%] text-roseDeep sm:right-[10%] sm:top-[14%] wide:right-[3%] wide:top-[7%]"
        size="h-4 w-4 xs:h-5 xs:w-5 sm:h-7 sm:w-7"
        drift={-18}
        duration={5.5}
        delay={0.6}
        still={still}
      />
      <FloatingSparkle
        className="bottom-[8%] left-[5%] text-roseDeep sm:bottom-[13%] sm:left-[12%] wide:bottom-[6%] wide:left-[3%]"
        size="h-4 w-4 xs:h-5 xs:w-5 sm:h-7 sm:w-7"
        drift={16}
        duration={6}
        delay={1.1}
        still={still}
      />
      <FloatingSparkle
        className="bottom-[6%] right-[5%] text-gold sm:bottom-[11%] sm:right-[11%] wide:bottom-[6%] wide:right-[3%]"
        size="h-5 w-5 xs:h-6 xs:w-6 sm:h-8 sm:w-8"
        drift={-20}
        duration={7}
        delay={0.3}
        still={still}
      />

      {/*
        One column while the screen is taller than it is wide; two once it
        is not, laid out as a grid rather than a row.

        A grid because the three pieces do not read top to bottom in the same
        order in both. Stacked it is the words, then the venue, then the RSVP
        — the card in the middle, where a thumb meets it. Split, the card
        stands on the right as a single tall object and the words and the RSVP
        share the left, which means the third piece has to jump back up
        alongside the first. Explicit rows and columns say that in two
        classes; a flex row could not say it at all without moving the markup
        and changing the stacked order with it.

        Sideways is where it is needed: the section overflowed an iPad held
        that way, and the RSVP button — the one thing on the page that has to
        be seen — sat below the fold behind a scroll nobody would guess was
        there. Held upright the single column fits, so it stays.
      */}
      <motion.div
        className="relative my-auto flex w-full max-w-md flex-col items-center sm:max-w-lg wide:grid wide:max-w-none wide:grid-cols-2 wide:items-center wide:gap-x-0 wide:gap-y-6"
        initial={false}
        animate={state}
        variants={GROUP}
      >
      {/*
        The gilt upright down the middle, and only once there is a middle for it
        to be down: stacked, the two halves are one column with a seam, and a
        rule across that seam would cut the page in half rather than divide it.

        Positioned rather than placed in a track, which is the one difference
        from the dedication page's. That section lays its columns out with flex
        and can afford a wrapper of no width between them; a two-track grid has
        no such slot, and giving the rule a track of its own would take the
        width out of the halves and stop them being halves. Hung off the
        container's centre line instead, it costs the tracks nothing and lands
        exactly on the boundary between them.

        `contain` keeps the filigree square: the box is stretched to the taller
        column and the drawing fitted inside it at its own proportions, so it
        runs the full height of the plate and works out its own width from
        that. `w-14` is a ceiling on that, for a column tall enough to want
        more — and it is what the columns' padding is set to clear.
      */}
      <div aria-hidden className="pointer-events-none absolute inset-y-0 left-1/2 hidden w-14 -translate-x-1/2 wide:block">
        {/* The half-width shift is on the wrapper rather than here, because the
            variants animate `scaleY` and Motion composes the whole of
            `transform` itself — a Tailwind translate on this element would be
            written over the moment the animation ran. */}
        <motion.div
          variants={still ? STILL : UPRIGHT}
          className="absolute inset-0 bg-contain bg-center bg-no-repeat"
          style={{ backgroundImage: `url(${COLUMN_SEPARATOR})` }}
        />
      </div>

      <motion.div
        className="flex w-full flex-col items-center wide:col-start-1 wide:row-start-1 wide:px-[calc(var(--stage-w)*0.05)]"
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
          className="mt-3 font-hand text-lg text-berry xs:text-xl sm:text-2xl wide:text-3xl"
        >
          The royal ball
        </motion.p>

        <motion.h2
          variants={line}
          className="mt-1 font-display text-2xl italic leading-snug text-ink xs:text-3xl sm:text-4xl wide:text-5xl"
        >
          Her castle for a day
        </motion.h2>

        <motion.div
          aria-hidden
          variants={rule}
          className="gilt-rule mt-3 h-px w-28 xs:w-36 sm:mt-4 sm:w-48 wide:w-40 wide-lg:w-48"
        />

        <motion.p
          variants={line}
          className="mt-3 max-w-[34ch] text-pretty text-sm leading-relaxed text-ink/70 sm:mt-4 sm:max-w-[46ch] sm:text-base wide:text-lg"
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
      </motion.div>

        <motion.div
          variants={still ? STILL : CARD}
          /* Capped and centred once the column is a half of the window rather
             than a share of a 4xl box: left at `w-full` the card would stretch
             to the best part of a thousand pixels, and the walkthrough inside
             it with it.

             `md` and not the `lg` the dedication's plate gets, and the reason
             is height rather than taste. This card holds two aspect-ratio
             boxes stacked — the walkthrough and the map — so every pixel of
             width it gains it gains twice over in height. At `lg` the section
             ran 48px past the foot of the shortest desktop window the layout
             supports; this is the widest it can be and still land inside it. */
          className="order-2 mt-4 w-full rounded-2xl border border-gold/40 bg-parchment/70 p-3 shadow-sm sm:mt-5 sm:p-4 md:order-none wide:col-start-2 wide:row-span-2 wide:row-start-1 wide:mx-auto wide:mt-0 wide:max-w-md wide:self-center wide:p-5"
        >
          <p className="flex items-center justify-center gap-2 font-display text-lg leading-snug text-ink xs:text-xl sm:text-2xl wide:text-xl">
            <PalmIcon className="h-5 w-5 flex-none text-goldDeep sm:h-6 sm:w-6" />
            <span>{PARTY_LOCATION}</span>
          </p>
          <p className="mt-1.5 flex items-start justify-center gap-2 text-xs leading-relaxed text-ink/70 sm:text-sm">
            <MapPinIcon className="mt-px h-4 w-4 flex-none text-goldDeep" />
            <span className="max-w-[34ch] text-left">{PARTY_ADDRESS}</span>
          </p>

          {/* Only where the two windows have to share one frame. Given room
              for both there is nothing left to choose between, and a pair of
              tabs that never change anything is just furniture. */}
          {!sideBySide && (
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
          )}

          <div
            className={
              sideBySide
                ? "mt-3 grid grid-cols-2 gap-3 sm:gap-4 wide:mt-4 wide:grid-cols-1 wide:gap-5"
                : "mt-3 overflow-hidden rounded-xl border border-gold/30 bg-mist"
            }
          >
            <VenuePane
              id="video"
              label="Walkthrough"
              Icon={PlayIcon}
              active={pane === "video"}
              sideBySide={sideBySide}
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
              ) : VENUE_VIDEO_EMBED ? (
                /*
                 * The hosted walkthrough, as a still with the player one tap
                 * away — the same bargain the map tab makes, and for the same
                 * reason: what fits in this window is a thumbnail either way,
                 * and the tap is what turns it into something you can read
                 * the road signs off.
                 *
                 * Nothing of YouTube's is fetched until that tap. The frame
                 * is our own still out of `public/`, which came down with the
                 * rest of the invitation at the door.
                 *
                 * The still is portrait — it is a Short — and this window is
                 * 16:9, so a band of it is all that shows. It is taken low
                 * rather than through the middle: low is the road up to the
                 * gate with the turn drawn across it, and the middle is the
                 * caption the video writes over that — and a play button
                 * sitting on a half-covered sentence is neither one thing
                 * nor the other.
                 */
                <button
                  type="button"
                  onClick={() => setVideoOpen(true)}
                  aria-label={`Play the walkthrough to ${PARTY_LOCATION}`}
                  className="group relative block h-full w-full bg-night"
                >
                  {VENUE_VIDEO_POSTER ? (
                    <>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={VENUE_VIDEO_POSTER}
                        alt=""
                        loading="lazy"
                        decoding="async"
                        className="h-full w-full object-cover object-[50%_72%] transition duration-300 group-hover:scale-[1.03]"
                      />
                      {/* A breath of night over the picture, so the gold
                          reads against a bright road at noon. */}
                      <span
                        aria-hidden
                        className="absolute inset-0 bg-night/10 transition group-hover:bg-night/20"
                      />
                    </>
                  ) : null}
                  <span aria-hidden className="absolute inset-0 flex items-center justify-center">
                    <span className="flex h-12 w-12 items-center justify-center rounded-full border border-goldSoft bg-gold/95 text-night shadow-lg transition group-active:scale-95 sm:h-14 sm:w-14">
                      <svg
                        viewBox="0 0 24 24"
                        aria-hidden
                        fill="currentColor"
                        className="h-5 w-5 translate-x-px sm:h-6 sm:w-6"
                      >
                        <path d="M9 7 L17.5 12 L9 17 Z" />
                      </svg>
                    </span>
                  </span>
                  <span className="pointer-events-none absolute bottom-1.5 right-1.5 flex items-center gap-1 rounded-full bg-night/75 px-2.5 py-1 text-[10px] font-medium text-parchment backdrop-blur-sm sm:text-xs">
                    <ExpandIcon className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
                    Tap to watch
                  </span>
                </button>
              ) : (
                <Placeholder
                  icon={<PlayIcon className="h-5 w-5 sm:h-6 sm:w-6" />}
                  title="A walk through the grounds"
                  note="The venue video goes here — pool, hall and all."
                />
              )}
            </VenuePane>

            <VenuePane
              id="map"
              label="Map"
              Icon={MapPinIcon}
              active={pane === "map"}
              sideBySide={sideBySide}
            >
              {VENUE_VIDEO_EMBED ? (
        <VideoLightbox
          src={VENUE_VIDEO_EMBED}
          title={`The way to ${PARTY_LOCATION}`}
          poster={VENUE_VIDEO_POSTER}
          vertical={VENUE_VIDEO_VERTICAL}
          open={videoOpen}
          onClose={() => setVideoOpen(false)}
        />
      ) : null}

      {VENUE_MAP_EMBED ? (
                /*
                 * A live map, but a still one: the iframe takes no pointer
                 * events, so a swipe across it still pages the deck instead
                 * of dragging Google's tiles. The button over it is the whole
                 * window, and it opens the map full screen — which is where
                 * panning and zooming belong, with nothing behind it to
                 * fight over the gesture.
                 */
                <div className="relative h-full w-full bg-mist">
                  {mapAsked ? (
                    <iframe
                      src={VENUE_MAP_EMBED}
                      title="Map preview"
                      aria-hidden
                      tabIndex={-1}
                      loading="lazy"
                      referrerPolicy="no-referrer-when-downgrade"
                      className="pointer-events-none absolute inset-0 h-full w-full border-0"
                    />
                  ) : null}
                  <button
                    type="button"
                    onClick={() => setMapOpen(true)}
                    aria-label={`Open the full map to ${PARTY_LOCATION}`}
                    className="group absolute inset-0 flex items-end justify-end p-1.5 transition hover:bg-night/5"
                  >
                    <span className="flex items-center gap-1 rounded-full bg-night/75 px-2.5 py-1 text-[10px] font-medium text-parchment backdrop-blur-sm transition group-hover:bg-night sm:text-xs">
                      <ExpandIcon className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
                      Tap for full map
                    </span>
                  </button>
                </div>
              ) : VENUE_MAP_IMAGE ? (
                /*
                 * The drawn sheet, if one is configured in place of the live
                 * map. It is portrait and the window is 16:9, so the
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
              ) : (
                <Placeholder
                  icon={<MapPinIcon className="h-5 w-5 sm:h-6 sm:w-6" />}
                  title="Poblacion, San Jose del Monte"
                  note="The map drops in here. Directions already work — the button below opens them."
                />
              )}
            </VenuePane>
          </div>
        </motion.div>

        {/* Both full-width thumb targets on a phone, side by side once there
            is room. The gold one is the ask; directions are what a guest
            comes back for on the day. */}
        <motion.div
          variants={line}
          /*
            On a phone the two buttons come up above the venue card — see the
            `order` on the card itself.

            Reordered rather than moved, because the source order is the one
            every other size wants: a tablet reads down the page to the venue
            and then to what to do about it, and the landscape grid places
            both by name anyway (`col-start` / `row-start`), where `order`
            counts for nothing. `md:order-none` hands all three back to the
            order they are written in.

            A phone is the one place the question is the other way round. The
            card is tall — a title, a map and a walkthrough stacked — and
            below it "RSVP" sat under a fold that nothing on screen suggested
            was there. The invitation's one ask should not need scrolling to.
          */
          className="order-1 mt-5 flex w-full flex-col items-stretch gap-2.5 sm:flex-row sm:justify-center sm:gap-3 md:order-none wide:col-start-1 wide:row-start-2 wide:mt-0 wide:flex-wrap wide:justify-center wide:px-[calc(var(--stage-w)*0.05)]"
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
          <Directions className="flex min-h-[3rem] items-center justify-center gap-2 rounded-full border border-gold/60 bg-parchment/70 px-8 font-display text-base text-ink shadow-sm transition active:scale-[0.98] hover:bg-goldSoft/40 sm:px-9 sm:text-lg wide:min-h-[3.25rem] wide:text-xl">
            <MapPinIcon className="h-4 w-4 flex-none text-goldDeep sm:h-5 sm:w-5" />
            Get directions
          </Directions>
        </motion.div>
      </motion.div>

      {VENUE_MAP_EMBED ? (
        <MapLightbox
          src={VENUE_MAP_EMBED}
          title={`Map to ${PARTY_LOCATION}`}
          open={mapOpen}
          onClose={() => setMapOpen(false)}
        />
      ) : (
        <ImageLightbox
          src={VENUE_MAP_IMAGE}
          alt={`Map to ${PARTY_LOCATION}`}
          open={mapOpen}
          onClose={() => setMapOpen(false)}
        />
      )}

      <RsvpDialog open={rsvpOpen} onClose={() => setRsvpOpen(false)} />
    </div>
  );
}
