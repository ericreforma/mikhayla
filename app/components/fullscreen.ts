/**
 * Taking the whole screen when the gates open.
 *
 * ---------------------------------------------------------------------------
 * Why it is here and not anywhere else
 * ---------------------------------------------------------------------------
 * A browser will only go fullscreen inside a gesture a hand actually made, and
 * it has to be *this* call stack — not a `setState` that causes a render that
 * fires an effect that asks. By the time the effect runs the gesture is over
 * and the request is refused.
 *
 * "Open the gates" is therefore the one chance the invitation gets. It is also
 * the right one: it is the only deliberate press on the whole site, and what
 * follows it — the castle, the flood of light, six full-screen sections — is
 * the part that wants the screen to itself. The same press already unlocks the
 * audio for the same reason. See `knock` in LoadingScreen.
 *
 * ---------------------------------------------------------------------------
 * What it cannot do
 * ---------------------------------------------------------------------------
 * An iPhone. Safari on iOS has no element fullscreen at all — `<video>` has a
 * private one and nothing else has any — so on the single most likely device a
 * guest will open this on, every branch below is absent and this does nothing.
 * That is not a bug to be found and fixed later; there is no API to call.
 *
 * It is also why nothing here reports failure, and why no part of the
 * invitation is allowed to depend on having succeeded. A request can be
 * refused by policy, by an iframe without `allowfullscreen`, or by a guest who
 * has told their browser never to allow it, and all three are perfectly
 * ordinary. The page is already built to fill whatever box it is given — the
 * deck is `fixed inset-0` and every section is sized against the viewport, not
 * the screen — so going fullscreen only ever makes that box bigger. Failing to
 * is a smaller window, not a broken page.
 */

/** The vendor spellings, which are only Safari's now but still needed there. */
type FullscreenElement = HTMLElement & {
  webkitRequestFullscreen?: () => Promise<void> | void;
  msRequestFullscreen?: () => Promise<void> | void;
};

type FullscreenDocument = Document & {
  webkitFullscreenEnabled?: boolean;
  webkitFullscreenElement?: Element | null;
};

/**
 * Ask for the whole screen, and shrug if the answer is no.
 *
 * Call it synchronously from a click or tap handler — see the note above about
 * why an effect is too late. Safe to call when already fullscreen, on the
 * server, and on a device that has never heard of the API.
 */
export function enterFullscreen(): void {
  if (typeof document === "undefined") return;

  const doc = document as FullscreenDocument;

  /* Already there — a guest who pressed the button, left, and came back. */
  if (doc.fullscreenElement || doc.webkitFullscreenElement) return;

  /* The browser's own answer to "would you even allow this", which is false
     inside an iframe without `allowfullscreen` and wherever a guest has turned
     it off. Asking anyway would only produce a rejected promise. */
  const allowed = doc.fullscreenEnabled ?? doc.webkitFullscreenEnabled ?? false;
  if (!allowed) return;

  const el = document.documentElement as FullscreenElement;
  const request =
    el.requestFullscreen ?? el.webkitRequestFullscreen ?? el.msRequestFullscreen;
  if (!request) return;

  try {
    /*
     * `.call(el)` because the method was pulled off the element above and has
     * lost its receiver; unbound, every one of these throws.
     *
     * The result is a promise in every browser that has the standard spelling
     * and nothing at all in the older prefixed ones, so the rejection is
     * caught through an optional call rather than a bare `.catch`. Both paths
     * end in the same place: do nothing.
     */
    const result = request.call(el) as Promise<void> | undefined;
    result?.catch(() => {});
  } catch {
    /* Refused outright. The invitation plays in a window instead. */
  }
}

/* -------------------------------------------------------------------------
   And the way back out
   -------------------------------------------------------------------------
   Taking the screen without offering it back is the one thing that turns an
   immersive page into a trap. Every browser has its own escape — Escape on a
   desktop, a swipe down from the top edge on a phone — but neither announces
   itself, and a guest who does not know them is stuck with no visible way out.

   The finale is that door. Arriving there hands the screen back and swiping
   away takes it again — see the effects in `Deck`, which is where the rule
   lives now. Nothing on the site has a close button, because the last page is
   one.
   ------------------------------------------------------------------------- */

type ExitableDocument = Document & {
  webkitExitFullscreen?: () => Promise<void> | void;
  msExitFullscreen?: () => Promise<void> | void;
  webkitFullscreenElement?: Element | null;
};

/** Hand the screen back. Safe to call when not fullscreen, and on iOS. */
export function exitFullscreen(): void {
  if (typeof document === "undefined") return;
  const doc = document as ExitableDocument;
  if (!doc.fullscreenElement && !doc.webkitFullscreenElement) return;

  const exit = doc.exitFullscreen ?? doc.webkitExitFullscreen ?? doc.msExitFullscreen;
  if (!exit) return;

  try {
    const result = exit.call(doc) as Promise<void> | undefined;
    result?.catch(() => {});
  } catch {
    /* Nothing to do. The guest still has Escape. */
  }
}

/** Whether the page holds the screen right now. */
export function isFullscreen(): boolean {
  if (typeof document === "undefined") return false;
  const doc = document as ExitableDocument;
  return Boolean(doc.fullscreenElement || doc.webkitFullscreenElement);
}
