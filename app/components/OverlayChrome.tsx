"use client";

import { forwardRef, type ReactNode } from "react";

/**
 * One of the round controls that float over a full-screen viewer. The
 * children are the icon's paths, drawn in the same stroke family as the rest
 * of the ornaments.
 *
 * It lives here rather than in either viewer because both the map and the
 * image overlay wear it, and the two are meant to feel like the same window
 * opening twice.
 *
 * It forwards a ref so a viewer can move focus onto its close button the
 * moment it opens.
 */
export const ChromeButton = forwardRef<
  HTMLButtonElement,
  { label: string; onClick: () => void; disabled?: boolean; children: ReactNode }
>(function ChromeButton({ label, onClick, disabled, children }, ref) {
  return (
    <button
      ref={ref}
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      className="flex h-10 w-10 items-center justify-center rounded-full border border-gold/40 bg-night/70 text-parchment shadow-sm transition active:scale-95 hover:bg-night disabled:opacity-35"
    >
      <svg viewBox="0 0 24 24" aria-hidden className="h-5 w-5" fill="none">
        <g stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
          {children}
        </g>
      </svg>
    </button>
  );
});

/** The label chip in the top-left of a viewer — the name of what you're looking at. */
export function ChromeTitle({ children }: { children: ReactNode }) {
  return (
    <p className="pointer-events-none max-w-[60%] rounded-full bg-night/60 px-3 py-1.5 text-xs text-parchment/80 sm:text-sm">
      {children}
    </p>
  );
}
