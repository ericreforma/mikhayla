/**
 * Shared royal decoration. Everything here is pure SVG using `currentColor`,
 * so the caller sets size and colour with normal utility classes and they
 * inherit the palette instead of hardcoding gold in a dozen places.
 *
 * Server components — no hooks, no motion — so they cost nothing on the
 * client bundle.
 */

export function Crown({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 46" aria-hidden="true" className={className} fill="none">
      <path
        d="M5 37 L3 11 L18 22 L32 3 L46 22 L61 11 L59 37 Z"
        fill="currentColor"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinejoin="round"
      />
      <rect x="4" y="37" width="56" height="7" rx="3.5" fill="currentColor" />
      <circle cx="32" cy="16" r="2.6" fill="#FFF8F0" opacity="0.75" />
      <circle cx="10" cy="17" r="1.8" fill="#FFF8F0" opacity="0.6" />
      <circle cx="54" cy="17" r="1.8" fill="#FFF8F0" opacity="0.6" />
    </svg>
  );
}

export function Sparkle({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className={className} fill="none">
      {/* Four-point star: long vertical/horizontal spikes pinched at the waist. */}
      <path
        d="M12 0 C12.8 7.4 16.6 11.2 24 12 C16.6 12.8 12.8 16.6 12 24 C11.2 16.6 7.4 12.8 0 12 C7.4 11.2 11.2 7.4 12 0 Z"
        fill="currentColor"
      />
    </svg>
  );
}

/* ---------------------------------------------------------------
   Bottom-bar icons
   ---------------------------------------------------------------
   One visual family: a 24×24 box, 1.6px strokes, round joins. They read
   at 22px on a phone, which is where they actually live.
   --------------------------------------------------------------- */

type IconProps = { className?: string };

const stroke = {
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.6,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
};

/** Home / the invitation itself. A little tiara. */
export function TiaraIcon({ className = "" }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className={className}>
      <path d="M3.5 17 L2.5 7.5 L8 11.5 L12 4.5 L16 11.5 L21.5 7.5 L20.5 17 Z" {...stroke} />
      <path d="M3.4 19.5 H20.6" {...stroke} />
    </svg>
  );
}

/** Her first year — an open storybook. */
export function StorybookIcon({ className = "" }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className={className}>
      <path d="M12 6.8 C10.2 5.2 7.6 4.6 4 4.9 V18 c3.6 -0.3 6.2 0.3 8 1.9" {...stroke} />
      <path d="M12 6.8 C13.8 5.2 16.4 4.6 20 4.9 V18 c-3.6 -0.3 -6.2 0.3 -8 1.9" {...stroke} />
      <path d="M12 6.8 V19.9" {...stroke} />
    </svg>
  );
}

/** Save the date — a calendar leaf. */
export function CalendarIcon({ className = "" }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className={className}>
      <rect x="3.5" y="5" width="17" height="15.5" rx="2.5" {...stroke} />
      <path d="M3.5 9.5 H20.5" {...stroke} />
      <path d="M8 3.5 V6.5 M16 3.5 V6.5" {...stroke} />
      <circle cx="12" cy="14.8" r="1.5" fill="currentColor" />
    </svg>
  );
}

/** The countdown — a clock, hands at the fairytale hour. */
export function ClockIcon({ className = "" }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className={className}>
      <circle cx="12" cy="12.5" r="8.2" {...stroke} />
      <path d="M12 7.6 V12.5 L15.4 14.6" {...stroke} />
    </svg>
  );
}

/** The ball / RSVP — a sealed envelope. */
export function EnvelopeIcon({ className = "" }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className={className}>
      <rect x="2.8" y="5.5" width="18.4" height="13.5" rx="2.4" {...stroke} />
      <path d="M3.4 7.4 L12 13.4 L20.6 7.4" {...stroke} />
    </svg>
  );
}

/** The finale — a castle on the last page. */
export function CastleIcon({ className = "" }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className={className}>
      <path
        d="M3.5 20.5 V9 h2.2 V6.4 h2.2 V9 h1.9 V11 h4.4 V9 h1.9 V6.4 h2.2 V9 h2.2 v11.5 Z"
        {...stroke}
      />
      <path d="M10.2 20.5 v-4.1 a1.8 1.8 0 0 1 3.6 0 v4.1" {...stroke} />
      <path d="M12 6.4 V3.2 l2.6 1.1 -2.6 1.1" {...stroke} />
    </svg>
  );
}

/** The venue's address — a map pin. */
export function MapPinIcon({ className = "" }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className={className}>
      <path d="M12 21.2 C12 21.2 18.6 15.4 18.6 10.3 A6.6 6.6 0 0 0 5.4 10.3 C5.4 15.4 12 21.2 12 21.2 Z" {...stroke} />
      <circle cx="12" cy="10.2" r="2.5" {...stroke} />
    </svg>
  );
}

/**
 * The walkthrough. A rounded play triangle rather than a filled one, so it
 * sits in the same 1.6px stroke family as the rest of the set.
 */
export function PlayIcon({ className = "" }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className={className}>
      <circle cx="12" cy="12" r="8.6" {...stroke} />
      <path d="M10.2 8.6 L16 12 L10.2 15.4 Z" {...stroke} />
    </svg>
  );
}

/**
 * A palm, for the resort. Fronds drawn as four separate arcs meeting at the
 * crown — a single closed blob at this size just reads as a tree, and the
 * whole point is that it reads as a *palm*.
 */
export function PalmIcon({ className = "" }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className={className}>
      <path d="M12 20.4 C12 16 12.4 11.6 13 8.2" {...stroke} />
      <path d="M12.6 7.6 C10.4 5.8 7.6 5.6 5.6 7.4" {...stroke} />
      <path d="M12.6 7.6 C14.8 5.8 17.6 6 19.2 8.2" {...stroke} />
      <path d="M12.6 7.6 C10.8 8.2 9 10 8.4 12.4" {...stroke} />
      <path d="M12.6 7.6 C15 8.4 16.8 10.4 17.4 13" {...stroke} />
      <path d="M8.8 20.4 h6.4" {...stroke} />
    </svg>
  );
}

/**
 * The dedication — a Latin cross.
 *
 * Deliberately the plainest shape in the set. It is the one icon that has to
 * be read instantly at 22px in the tab bar, and anything more devotional (a
 * dove, a descending flame) turns to mush at that size. The upright is set a
 * little above centre so the cross sits optically level in its box rather
 * than bottom-heavy.
 */
export function CrossIcon({ className = "" }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className={className}>
      <path d="M12 3.4 V20.6" {...stroke} />
      <path d="M6.6 9 H17.4" {...stroke} />
    </svg>
  );
}

/**
 * "This opens bigger" — four corners pulling apart. Drawn as corner brackets
 * rather than the usual arrows-in-a-box: at the 12px this sits at on the map
 * thumbnail, arrowheads are three pixels of mush.
 */
export function ExpandIcon({ className = "" }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className={className}>
      <path d="M9.5 3.5 H3.5 V9.5" {...stroke} />
      <path d="M14.5 3.5 H20.5 V9.5" {...stroke} />
      <path d="M20.5 14.5 V20.5 H14.5" {...stroke} />
      <path d="M9.5 20.5 H3.5 V14.5" {...stroke} />
    </svg>
  );
}

/**
 * The music is on — a speaker with two waves coming off it.
 *
 * Paired with SpeakerOffIcon below, and the two are deliberately the same
 * speaker: only what is to the right of it changes, so the button doesn't
 * appear to become a different control when it is toggled.
 */
export function SpeakerIcon({ className = "" }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className={className}>
      <path d="M4 9.5 H7.2 L12 5.4 V18.6 L7.2 14.5 H4 Z" {...stroke} />
      <path d="M15.4 9.4 A3.6 3.6 0 0 1 15.4 14.6" {...stroke} />
      <path d="M18 6.9 A7.2 7.2 0 0 1 18 17.1" {...stroke} />
    </svg>
  );
}

/** And off — the same speaker, with the waves struck through. */
export function SpeakerOffIcon({ className = "" }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className={className}>
      <path d="M4 9.5 H7.2 L12 5.4 V18.6 L7.2 14.5 H4 Z" {...stroke} />
      <path d="M15.6 10 L20.4 14.8 M20.4 10 L15.6 14.8" {...stroke} />
    </svg>
  );
}

/** Sent, saved, done — a tick. */
export function CheckIcon({ className = "" }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className={className}>
      <path d="M5 12.6 L10 17.4 L19 6.8" {...stroke} strokeWidth={2} />
    </svg>
  );
}

/**
 * Something is happening — a ring with a quarter of it drawn bright, turned
 * by `animate-spin`.
 *
 * Shared rather than kept where it was first needed: the RSVP wears it while
 * the form is in the air, and the walkthrough wears it while YouTube is
 * still on its way, and two waits that look different read as two different
 * kinds of wait.
 */
export function Spinner({ className = "" }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className={`animate-spin ${className}`} fill="none">
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2.5" opacity="0.25" />
      <path
        d="M21 12 a9 9 0 0 0 -9 -9"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

/** Dismiss — a cross, distinct from the dedication's Latin cross. */
export function CloseIcon({ className = "" }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className={className}>
      <path d="M7 7 L17 17 M17 7 L7 17" {...stroke} strokeWidth={1.8} />
    </svg>
  );
}
