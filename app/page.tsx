"use client";

import { Deck, type DeckSlide } from "@/app/components/Deck";
import type { NavSection } from "@/app/components/BottomNav";
import { HeroSection } from "@/app/components/HeroSection";
import { TimelineSlide } from "@/app/components/TimelineSlide";
import { ChristeningSection } from "@/app/components/ChristeningSection";
import { DateTimeSection } from "@/app/components/DateTimeSection";
import { PartyDetailsSection } from "@/app/components/PartyDetailsSection";
import { FinaleSection } from "@/app/components/FinaleSection";
import { LeaveGuard } from "@/app/components/LeaveGuard";
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
  { key: "finale", section: "finale", label: "Happily ever after", node: <FinaleSection /> },
];

export default function Page() {
  return (
    <main>
      <Deck slides={SLIDES} sections={SECTIONS} />
      {/* Asks before a stray Back swipe takes a guest off the invitation. */}
      <LeaveGuard />
    </main>
  );
}
