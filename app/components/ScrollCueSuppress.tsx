"use client";

import { createContext, useContext, useEffect } from "react";

/**
 * A way for a section to hold the deck's onward arrow back while it is busy.
 *
 * The arrow means "there is another section under this one, and here is the
 * way to it" — see `ScrollCue`. That is true of every section, but it is not
 * always the thing a guest should be doing next.
 *
 * Her year is the case it exists for. That section is a rail of fourteen
 * pages read *sideways*, and for thirteen of them the next thing is the next
 * month, not the next section. A downward arrow sitting under her photograph
 * the whole way along is pointing away from the page a guest is in the middle
 * of. It comes back on the last month, where down really is the only way on.
 *
 * Lifted to the deck rather than solved inside the section, because the arrow
 * is mounted out there — it has to be, or a section that scrolls inside
 * itself would carry it off screen. This is the one wire back.
 */
export const ScrollCueSuppressContext = createContext<(on: boolean) => void>(() => {});

/**
 * Hold the arrow back while `suppressed` is true.
 *
 * Safe to call from a section that is off screen: pass `false` then, and say
 * nothing about the arrow at all. The release on teardown is what makes that
 * work — a section that is suppressing and then unmounts, or stops being
 * active, must not leave the arrow switched off behind it.
 */
export function useSuppressScrollCue(suppressed: boolean) {
  const set = useContext(ScrollCueSuppressContext);
  useEffect(() => {
    set(suppressed);
    return () => set(false);
  }, [set, suppressed]);
}
