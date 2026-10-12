"use client";

import { useEffect, useRef } from "react";

/**
 * A handful of paper thrown at the screen, once.
 *
 * ---------------------------------------------------------------------------
 * Why canvas rather than a hundred divs
 * ---------------------------------------------------------------------------
 * Confetti is the one effect where the piece count *is* the effect — a dozen
 * squares is litter, a hundred and fifty is a celebration. A hundred and fifty
 * animated DOM nodes is a hundred and fifty elements for the compositor to lay
 * out and paint every frame, on a phone that is already carrying a photograph
 * slideshow underneath. One canvas is one node and one draw call per frame.
 *
 * ---------------------------------------------------------------------------
 * It ends
 * ---------------------------------------------------------------------------
 * This is a burst, not weather. Every piece is given a life, the loop stops
 * itself the moment the last one is spent, and the canvas is left blank — so
 * the cost after a few seconds is exactly nothing. Nobody has to remember to
 * turn it off.
 */

/** Her colours: the invitation's gold and berry, with paper white between. */
const COLOURS = ["#D4AF37", "#E8CB63", "#C2185B", "#F48FB1", "#FFF8F0", "#8A94A1"];

/** How many pieces. Enough to read as a celebration, few enough to stay cheap. */
const PIECES = 150;

/** Seconds before the last of it is gone. */
const LIFE = 4.2;

type Piece = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  /** Half-width and half-height of the scrap, in device pixels. */
  w: number;
  h: number;
  spin: number;
  turn: number;
  colour: string;
  born: number;
};

export function Confetti({ run }: { run: boolean }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!run) return;
    const canvas = canvasRef.current;
    if (!canvas) return;

    /* Somebody who has asked their phone to stop animating things has asked
       for this too. The pop-up still arrives; it simply arrives quietly. */
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = Math.min(2, window.devicePixelRatio || 1);
    let w = 0;
    let h = 0;

    const size = () => {
      w = window.innerWidth;
      h = window.innerHeight;
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      canvas.style.width = `${w}px`;
      canvas.style.height = `${h}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    size();

    /*
     * Thrown from above the top edge, across the whole width, with a stagger.
     *
     * Not from a point: a single burst reads as a party popper, which is a
     * thing somebody fired, and this is meant to be the page itself
     * celebrating. Falling from off-screen also means the first frame is
     * empty, so there is no pop of a hundred squares appearing at once.
     */
    const pieces: Piece[] = Array.from({ length: PIECES }, () => ({
      x: Math.random() * w,
      y: -20 - Math.random() * h * 0.6,
      vx: (Math.random() - 0.5) * 90,
      vy: 120 + Math.random() * 190,
      w: 3 + Math.random() * 4,
      h: 5 + Math.random() * 7,
      spin: Math.random() * Math.PI * 2,
      turn: (Math.random() - 0.5) * 7,
      colour: COLOURS[(Math.random() * COLOURS.length) | 0],
      born: Math.random() * 0.9,
    }));

    let raf = 0;
    let last = performance.now();
    let t = 0;

    const frame = (now: number) => {
      /* Clamped, so a tab that was in the background for a minute does not
         advance the whole burst in one step and finish before it is seen. */
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      t += dt;

      ctx.clearRect(0, 0, w, h);

      let alive = 0;
      for (const p of pieces) {
        const age = t - p.born;
        if (age <= 0) {
          alive += 1;
          continue;
        }
        if (age > LIFE) continue;

        p.vy += 220 * dt; // gravity
        p.vx *= 0.995; // air
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.spin += p.turn * dt;

        if (p.y - p.h > h) continue;
        alive += 1;

        /* The last fifth of a life is spent fading, so nothing blinks out. */
        const left = 1 - age / LIFE;
        ctx.globalAlpha = left < 0.2 ? left / 0.2 : 1;
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.spin);
        /* Squashed by its own spin: a flat scrap seen edge-on is a line, and
           that one cheap `cos` is most of what makes it read as paper rather
           than as falling confetti-coloured bricks. */
        ctx.fillStyle = p.colour;
        ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h * Math.abs(Math.cos(p.spin * 1.6)));
        ctx.restore();
      }
      ctx.globalAlpha = 1;

      if (alive === 0) {
        ctx.clearRect(0, 0, w, h);
        return; // spent: stop asking for frames at all
      }
      raf = window.requestAnimationFrame(frame);
    };

    raf = window.requestAnimationFrame(frame);
    window.addEventListener("resize", size);

    return () => {
      window.cancelAnimationFrame(raf);
      window.removeEventListener("resize", size);
    };
  }, [run]);

  if (!run) return null;
  return (
    <canvas
      ref={canvasRef}
      aria-hidden
      className="pointer-events-none fixed inset-0 z-[60]"
    />
  );
}
