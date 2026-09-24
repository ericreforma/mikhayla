"use client";

import { useEffect, useRef } from "react";

/**
 * Everything the Back button means on this site, in one place.
 *
 * It is one page — the deck scrolls, it never navigates — so the history
 * stack above the entry the guest landed on is entirely ours: one entry per
 * open panel, and one standing guard entry underneath them all. That is what
 * lets a single listener decide what any given Back was aimed at.
 *
 * One listener is not a tidiness choice, it is the design. The entry a panel
 * takes back off the stack pops after that panel has gone, so a listener per
 * panel would either be detached by then — leaving the "that pop was ours"
 * count stuck high, swallowing the guest's next real Back — or still attached
 * alongside the next panel's, with both fed the same event and only one of
 * them able to account for it. The leave guard has the same problem from the
 * other side: registered at page load, its listener would run before any
 * panel's and prompt about leaving on a Back that was only closing the map.
 */

/**
 * Every panel currently up, oldest first. Back closes the last one, so two
 * panels would come off in the order they went on — though in practice only
 * ever one is open, since each covers the screen.
 */
const open: { close: () => void }[] = [];

/**
 * How many `popstate` events are ours rather than the guest's.
 *
 * A panel closed some other way takes its own history entry back off the
 * stack on the way out, and that produces a `popstate` exactly like a real
 * Back would. This is how the two are told apart.
 */
let selfPops = 0;

/** What to ask when a Back would take the guest off the site, if anything. */
let askBeforeLeaving: (() => void) | null = null;

/** Set once the guest has said yes — see `leaveSite` below. */
let leaving = false;

let listening = false;

/**
 * Puts one of our own entries on the stack.
 *
 * It has to carry whatever the router left on the entry we're standing on.
 * Next's app router reloads the whole page on any `popstate` whose state has
 * no `__NA` marker — it reads one as an entry from the old pages router — and
 * it copies that marker onto pushed entries itself, but only through a
 * patched `history.pushState` it installs in an effect of its own. Effects
 * run child-first, so the guard below pushes before that patch exists, and
 * every entry stacked on top of one without the marker inherits the gap.
 * Copying the state across ourselves works whichever ran first.
 *
 * Without this, closing the map reloads the page and lands the guest back on
 * the hero — and in development, where React mounts effects twice, the panel
 * is gone before it has finished opening.
 */
function pushEntry(mark: { overlay: true } | { guard: true }) {
  window.history.pushState({ ...window.history.state, ...mark }, "");
}

function onPopState() {
  /*
   * On the way out. Every pop that still reaches us means we are still in
   * this document, so keep going: the last one unloads the page and takes
   * this listener with it. It can't spin — each step consumes an entry, and
   * a `back()` with nothing behind it raises no event at all.
   */
  if (leaving) {
    window.history.back();
    return;
  }

  if (selfPops > 0) {
    selfPops -= 1;
    return;
  }

  const panel = open.pop();
  if (panel) {
    panel.close();
    return;
  }

  if (!askBeforeLeaving) return;
  /*
   * Nothing was open, so this Back was aimed at the site itself. Put the
   * entry straight back — the guest hasn't moved, and doesn't see this
   * happen — and ask. Pressing Back again while the question is up simply
   * asks again, which is the safe way for it to fail.
   */
  pushEntry({ guard: true });
  askBeforeLeaving();
}

function listen() {
  if (listening) return;
  listening = true;
  window.addEventListener("popstate", onPopState);
}

/**
 * Makes Back close the panel you have open, instead of leaving the
 * invitation entirely.
 *
 * On a phone — Android's gesture especially — Back is how people close
 * things. A guest who opens the map, reads it and swipes back expects the map
 * to go away, not the whole page.
 *
 * Call it from the component that exists only while the panel is up. Opening
 * puts one throwaway entry on the history stack, so the next Back pops that
 * instead of the page:
 *
 *   - Back pressed → the panel closes, and its entry is already gone.
 *   - Closed any other way (the X, Escape, a tap on the backdrop, swiping the
 *     section away) → the entry is still there, so it comes off on the way
 *     out. Otherwise the guest's next Back would silently undo the opening of
 *     a panel that has already closed, and look like a dead button.
 */
export function useCloseOnBack(onClose: () => void) {
  /* Held in a ref because the callers write `onClose={() => setOpen(false)}`
     inline: a fresh function every render, which as a dependency would tear
     the history entry down and push a new one on each parent re-render. */
  const close = useRef(onClose);
  useEffect(() => {
    close.current = onClose;
  }, [onClose]);

  useEffect(() => {
    listen();
    const panel = { close: () => close.current() };
    open.push(panel);
    pushEntry({ overlay: true });

    return () => {
      const at = open.indexOf(panel);
      // Gone from the list already means Back is what closed us, and the
      // entry went with it — going back again would take the guest off the
      // page, which is the one thing this file exists to prevent.
      if (at === -1) return;
      open.splice(at, 1);
      selfPops += 1;
      window.history.back();
    };
  }, []);
}

/**
 * Asks before a Back leaves the invitation altogether.
 *
 * Guests read this one-handed, mid-scroll, and Back is a swipe from the edge
 * of the screen on most phones — easy to catch by accident, and there is no
 * way back to an invitation you reached through a message thread days ago.
 * So one entry stands guard above the page from the moment it loads, and the
 * Back that pops it asks the question instead of leaving.
 *
 * `ask` is called with nothing open. It should show the question; answering
 * it means calling `leaveSite` below, or simply doing nothing to stay.
 */
export function useLeaveGuard(ask: () => void) {
  const prompt = useRef(ask);
  useEffect(() => {
    prompt.current = ask;
  }, [ask]);

  useEffect(() => {
    /* A tab with nothing behind it — opened fresh from a message, most often
       — can't be backed out of at all. Nothing to guard, and nowhere for
       `leaveSite` to go if we did. */
    if (window.history.length <= 1) return;

    listen();
    /* A reload brings the page back up on the guard entry it pushed last
       time, and a second one on top of that would take two Backs to get
       through. */
    if (!(window.history.state as { guard?: boolean } | null)?.guard) {
      pushEntry({ guard: true });
    }
    askBeforeLeaving = () => prompt.current();

    return () => {
      askBeforeLeaving = null;
    };
  }, []);
}

/**
 * Yes, leave: walk back out of the page's own history entries and off the
 * site, to wherever the guest was before the invitation.
 *
 * Each step is taken in the listener above as the previous one lands, rather
 * than as one `go(-n)`, because n isn't knowable — a reload can leave old
 * entries of ours on the stack that this page never pushed.
 */
export function leaveSite() {
  leaving = true;
  window.history.back();

  /* Still here a moment later means there was nothing behind us after all.
     Stand the guard back up rather than leave Back dead; if we did leave,
     this page is gone and the timer with it. */
  window.setTimeout(() => {
    if (!leaving) return;
    leaving = false;
    if (askBeforeLeaving) pushEntry({ guard: true });
  }, 900);
}
