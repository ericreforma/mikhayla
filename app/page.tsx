"use client";

import { useCallback, useState } from "react";
import { Deck, type DeckSlide } from "@/app/components/Deck";
import { LoadingScreen } from "@/app/components/LoadingScreen";
import { CastleIntro } from "@/app/components/CastleIntro";
import { BackgroundMusic } from "@/app/components/BackgroundMusic";
import { MusicProvider } from "@/app/components/Music";
import type { NavSection } from "@/app/components/BottomNav";
import { HeroSection } from "@/app/components/HeroSection";
import { TimelineSlide } from "@/app/components/TimelineSlide";
import { ChristeningSection } from "@/app/components/ChristeningSection";
import { DateTimeSection } from "@/app/components/DateTimeSection";
import { PartyDetailsSection } from "@/app/components/PartyDetailsSection";
import { FinaleSection } from "@/app/components/FinaleSection";
import { LeaveGuard } from "@/app/components/LeaveGuard";
import { useInAppBrowser } from "@/app/components/inAppBrowser";
import { OpenInBrowser } from "@/app/components/OpenInBrowser";
import { useBackgroundFetch } from "@/app/components/useAssetPreload";
import { DEFERRED_ASSETS } from "@/app/components/preloadManifest";
import {
  TiaraIcon,
  StorybookIcon,
  CalendarIcon,
  EnvelopeIcon,
  CastleIcon,
  CrossIcon,
} from "@/app/components/Ornaments";

/** The tabs in the bottom bar, in deck order — one per section. */
const SECTIONS: NavSection[] = [
  { id: "invite", label: "Invite", Icon: TiaraIcon },
  { id: "story", label: "Her Year", Icon: StorybookIcon },
  { id: "blessing", label: "Blessing", Icon: CrossIcon },
  { id: "date", label: "Date", Icon: CalendarIcon },
  { id: "rsvp", label: "RSVP", Icon: EnvelopeIcon },
  { id: "finale", label: "Finale", Icon: CastleIcon },
];

/**
 * Six full-screen sections, swiped up and down.
 *
 * The story section is a single slide here on purpose: its title page and
 * twelve months live on a horizontal rail inside it (TimelineSlide), so the
 * timeline is the one place the page moves sideways. Splitting the axes this
 * way is what lets both gestures coexist — vertical always changes section,
 * horizontal only ever turns a page of her year.
 */
const SLIDES: DeckSlide[] = [
  { key: "hero", section: "invite", label: "By royal invitation", node: <HeroSection /> },
  { key: "story", section: "story", label: "Once Upon a Year", node: <TimelineSlide /> },
  { key: "blessing", section: "blessing", label: "Her dedication", node: <ChristeningSection /> },
  { key: "date", section: "date", label: "Save the date", node: <DateTimeSection /> },
  { key: "rsvp", section: "rsvp", label: "The royal ball", node: <PartyDetailsSection /> },
  /* The way out. Arriving here hands the screen back; every other section
     takes it. See `windowed` on DeckSlide — there is no close button on the
     site, because this page is one. */
  {
    key: "finale",
    section: "finale",
    label: "Happily ever after",
    windowed: true,
    node: <FinaleSection />,
  },
];

export default function Page() {
  /*
   * Three things in sequence, each handing over while it still covers the
   * one behind it — the curtain, the castle, the invitation.
   *
   *   LoadingScreen  fetches her photographs and her twelve songs, then
   *                  raises the castle behind itself and dissolves onto it.
   *   CastleIntro    stands the castle on the dawn, rushes the gate, opens
   *                  it, and floods the window with light.
   *   Deck           the invitation itself, built during that flood.
   *
   * The two flags are kept apart rather than rolled into one phase because
   * the last handoff needs both true at once: the deck has to exist *under*
   * the castle's light for a beat before the castle goes, or the hero's
   * entrance plays against a blank page.
   *
   * That entrance is the reason the order is what it is. It is a CSS
   * animation that starts the instant its markup exists, so a deck mounted
   * too early spends its opening somewhere nobody can see it and arrives
   * already finished. Mounted under the flash, her crown and her name rise
   * out of the light as it lifts.
   */
  const [open, setOpen] = useState(false);
  const [intro, setIntro] = useState(false);

  const raise = useCallback(() => setIntro(true), []);
  const enter = useCallback(() => setOpen(true), []);
  const settle = useCallback(() => setIntro(false), []);

  /*
   * When the music is allowed to start: with the castle, and on into the
   * invitation behind it. The two flags overlap — the deck is built while
   * the castle's light still covers it — so this never goes false in
   * between, and the bed is never cut off half a bar in.
   *
   * It is a prop rather than a mount, because the player is mounted from the
   * first paint and needs to be: it is the loading screen a guest is most
   * likely to touch, and a touch is the only thing that will ever unlock the
   * speakers. See BackgroundMusic.
   */
  const started = intro || open;

  /*
   * Whether a guest is in a real browser or inside a chat app's webview.
   *
   * Asked up here, above the preload, because the answer decides whether the
   * download should begin at all — see the gate below.
   */
  const where = useInAppBrowser();

  /*
   * Her twelve months' songs, fetched quietly from the moment the castle goes
   * up — fifteen megabytes that used to sit in front of the door and now ride
   * along behind it. See `preloadManifest.ts` for the split.
   *
   * It starts with the castle rather than with the deck because the castle is
   * several seconds of animation a guest can only watch, which is the one
   * stretch of the visit with a connection going spare and nothing else
   * asking for it.
   */
  useBackgroundFetch(DEFERRED_ASSETS, started);

  /*
   * Before the curtain, one question: where is this being read?
   *
   * Both branches below return *instead of* the invitation rather than over
   * the top of it, and that is the point of putting them here. `LoadingScreen`
   * starts pulling her photographs the instant it mounts, so anything that
   * renders it has already spent the guest's data — on a connection that, in a
   * webview, is about to be walked away from. Not mounting it is the only way
   * to not spend it.
   *
   * `unknown` is the single frame before the effect in `useInAppBrowser` has
   * run. It paints the same dawn every other screen stands on, so the wait
   * reads as the page's own ground rather than a flash of white.
   */
  if (where.state === "unknown") {
    return <main className="royal-dawn fixed inset-0" aria-busy="true" />;
  }

  if (where.state === "gated") {
    return (
      <main>
        <OpenInBrowser exit={where.exit} />
      </main>
    );
  }

  return (
    <main>
      {/* Wraps both players: the bed below and her months, deep inside the
          deck, share one preference and one floor. See Music.tsx. */}
      <MusicProvider>
        {open && (
          <>
            <Deck slides={SLIDES} sections={SECTIONS} />
            {/* Asks before a stray Back swipe takes a guest off the invitation. */}
            <LeaveGuard />
          </>
        )}

        <BackgroundMusic playing={started} />

        {intro && <CastleIntro onOpen={enter} onDone={settle} />}
      </MusicProvider>

      <LoadingScreen onReady={raise} />
    </main>
  );
}
