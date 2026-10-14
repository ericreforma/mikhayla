import type { Metadata } from "next";
import { BABY_NAME } from "@/app/config";

/**
 * The ledger's own head.
 *
 * `noindex` matters more here than anywhere else on the site. This page is the
 * one place the standings are printed, it is handed round as a link and
 * nothing else points at it — and a search result for it would undo all three
 * of those at once.
 *
 * A layout rather than the page, because the page is a client component and
 * those cannot export metadata.
 */
export const metadata: Metadata = {
  title: `The Royal Ledger — ${BABY_NAME}'s Royal Dash`,
  description: "The sealed standings.",
  robots: { index: false, follow: false, nocache: true },
};

export default function LedgerLayout({ children }: { children: React.ReactNode }) {
  return children;
}
