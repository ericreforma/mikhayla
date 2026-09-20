"use client";

import { createContext, useContext } from "react";

/**
 * Whether the slide (or rail panel) a component sits inside is the one on
 * screen right now.
 *
 * Every slide and every panel is mounted from the start — that's what makes
 * the swipe instant — so entrance animations and timers key off this rather
 * than off mounting.
 *
 * It lives in its own module because two different things provide it: the
 * deck, for the five sections, and the timeline rail, for its fourteen
 * panels. The rail nests inside the deck and ANDs the two together, so a
 * month panel only counts as active when its section is on screen too.
 */
export const SlideActiveContext = createContext(true);

export const useSlideIsActive = () => useContext(SlideActiveContext);
