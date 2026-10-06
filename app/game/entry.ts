/**
 * The way in, and the way back — shared by the two files that need to agree
 * about it: the balloon on the invitation, and the game's own page.
 *
 * It is two constants rather than two string literals in two files because
 * they are a protocol: one side writes the flag and navigates, the other reads
 * it to decide whether Back is safe to use. A typo in either would not break a
 * build, it would quietly send a guest off the site.
 */

/**
 * Where the game lives, relative to the site root. `basePath` is added by Next.
 *
 * Deliberately not `/game`. Nothing links here and the route is `noindex`, but
 * a URL is still the one part of a hidden thing that gets read aloud, pasted
 * into a chat and guessed at — and `/game` is the first guess anybody makes.
 * The source stays in `app/game/`; only the address is in disguise.
 */
export const GAME_PATH = "/escaped";

/**
 * Set in `sessionStorage` by the balloon just before it navigates.
 *
 * Its presence is what tells the game that there is an invitation behind it on
 * the history stack, so leaving can be a `back()` — which takes the game's
 * entry with it and hands the invitation's own Back handling back untouched.
 * Without it the game was arrived at directly and leaving has to be a push.
 */
export const RETURN_KEY = "mikhayla-game-return";

/** How many taps on the balloon it takes, and how long they may be apart. */
export const TAPS_TO_OPEN = 2;
export const TAP_WINDOW_MS = 1200;
