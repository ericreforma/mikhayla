import type { Metadata } from "next";
import { BABY_NAME } from "@/app/config";

/**
 * The guestbook's own head.
 *
 * `noindex` for the same reason the game has it: this is a screen for a
 * television in one room on one afternoon, showing other people's messages. It
 * is not a page anybody should arrive at from a search result.
 */
export const metadata: Metadata = {
  title: `${BABY_NAME}'s Guestbook`,
  description: `Messages for ${BABY_NAME}, from everyone who came.`,
  robots: { index: false, follow: false },
};

export default function GuestbookLayout({ children }: { children: React.ReactNode }) {
  return children;
}
