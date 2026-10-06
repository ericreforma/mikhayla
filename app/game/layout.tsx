import type { Metadata } from "next";
import { BABY_NAME } from "@/app/config";

/**
 * The game's own head.
 *
 * `robots: noindex` is the half that matters. The game is meant to be found by
 * tapping the balloon, and a search result for it would hand away the one
 * thing it has — nothing else on the site links here, and this is what stops a
 * crawler linking here on the site's behalf.
 *
 * A layout rather than the page, because the page is a client component and
 * those cannot export metadata.
 */
export const metadata: Metadata = {
  title: `${BABY_NAME}'s Royal Dash`,
  description: `A little running game hidden in ${BABY_NAME}'s invitation.`,
  robots: { index: false, follow: false },
};

export default function GameLayout({ children }: { children: React.ReactNode }) {
  return children;
}
