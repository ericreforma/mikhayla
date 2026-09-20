"use client";

import { forwardRef, useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";

const MIN_SCALE = 1;
const MAX_SCALE = 6;
/** What a double-tap jumps to, and what each button press multiplies by. */
const TAP_SCALE = 2.5;
const STEP = 1.5;

type View = { scale: number; x: number; y: number };

/**
 * A full-screen viewer for one image, with pinch, wheel, double-tap and
 * button zoom, and drag to pan.
 *
 * Two things about where it lives are load-bearing:
 *
 * It renders into `document.body` through a portal. The deck's sections are
 * framer-motion elements with live transforms on them, and a transformed
 * ancestor becomes the containing block for `position: fixed` descendants —
 * so a fixed overlay written inline would be trapped inside its section
 * rather than covering the screen.
 *
 * And while it's open it sets `data-modal="open"` on the body. The deck
 * listens for arrow keys on `window`; without a flag to check, paging the
 * map with the keyboard would also swipe the invitation behind it.
 */
export function ImageLightbox({
  src,
  alt,
  open,
  onClose,
}: {
  src: string;
  alt: string;
  open: boolean;
  onClose: () => void;
}) {
  const [host, setHost] = useState<HTMLElement | null>(null);
  useEffect(() => setHost(document.body), []);

  if (!host) return null;
  return createPortal(
    <AnimatePresence>{open && <Viewer src={src} alt={alt} onClose={onClose} />}</AnimatePresence>,
    host
  );
}

function Viewer({ src, alt, onClose }: { src: string; alt: string; onClose: () => void }) {
  const stageRef = useRef<HTMLDivElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);

  /* The live transform lives in a ref and is written straight to the node.
     Routing every pointermove through React state would re-render the whole
     overlay sixty times a second for something CSS can do on its own. */
  const view = useRef<View>({ scale: 1, x: 0, y: 0 });
  /** Mirrors `view.scale > 1`, purely so the chrome can re-render. */
  const [zoomed, setZoomed] = useState(false);

  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const pinch = useRef<{ dist: number; scale: number; cx: number; cy: number } | null>(null);
  /** Distinguishes a tap from the end of a drag. */
  const moved = useRef(false);
  const lastTap = useRef(0);
  /*
   * What the gesture actually started on. Capturing the pointer retargets
   * every later event to the stage, so by pointerup `e.target` is the stage
   * whether the tap landed on the image or on the dark margin beside it —
   * and those two have to do different things.
   */
  const downTarget = useRef<EventTarget | null>(null);

  const apply = useCallback(() => {
    const img = imgRef.current;
    if (!img) return;
    const { scale, x, y } = view.current;
    img.style.transform = `translate3d(${x}px, ${y}px, 0) scale(${scale})`;
  }, []);

  /** Keeps the image from being dragged off the edge of the screen. */
  const clampPan = useCallback(() => {
    const img = imgRef.current;
    const stage = stageRef.current;
    if (!img || !stage) return;
    const s = view.current.scale;
    // offsetWidth/Height are the untransformed contain-fit box, which is what
    // the scale multiplies — reading the rect back would include the scale.
    const maxX = Math.max(0, (img.offsetWidth * s - stage.clientWidth) / 2);
    const maxY = Math.max(0, (img.offsetHeight * s - stage.clientHeight) / 2);
    view.current.x = Math.min(maxX, Math.max(-maxX, view.current.x));
    view.current.y = Math.min(maxY, Math.max(-maxY, view.current.y));
  }, []);

  /** A point in client coordinates, relative to the middle of the stage. */
  const toStage = useCallback((clientX: number, clientY: number) => {
    const r = stageRef.current?.getBoundingClientRect();
    if (!r) return { px: 0, py: 0 };
    return { px: clientX - (r.left + r.width / 2), py: clientY - (r.top + r.height / 2) };
  }, []);

  /**
   * Scale to `next`, holding the point under (px, py) still.
   *
   * With `transform: translate(x) scale(s)` about the centre, a screen point
   * p sits over image point u = (p − x) / s. Solving that for the x that
   * keeps u fixed at the new scale is the line below — which is what makes
   * the map zoom into the junction you pinched rather than into its middle.
   */
  const zoomTo = useCallback(
    (next: number, px: number, py: number) => {
      const v = view.current;
      const s = Math.min(MAX_SCALE, Math.max(MIN_SCALE, next));
      if (Math.abs(s - v.scale) < 0.001) return;
      v.x = px - ((px - v.x) * s) / v.scale;
      v.y = py - ((py - v.y) * s) / v.scale;
      v.scale = s;
      // Fully zoomed out always means dead centre, whatever the pan was.
      if (s === MIN_SCALE) {
        v.x = 0;
        v.y = 0;
      }
      clampPan();
      apply();
      setZoomed(s > MIN_SCALE + 0.01);
    },
    [apply, clampPan]
  );

  /** Zoom from the buttons, about the middle of the screen. */
  const step = useCallback((factor: number) => zoomTo(view.current.scale * factor, 0, 0), [zoomTo]);

  /* Escape closes; +/− zoom; 0 resets. The deck is inert behind us — see the
     body flag below — so these keys are ours alone while the map is open. */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      else if (e.key === "+" || e.key === "=") step(STEP);
      else if (e.key === "-" || e.key === "_") step(1 / STEP);
      else if (e.key === "0") zoomTo(MIN_SCALE, 0, 0);
      else return;
      e.preventDefault();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose, step, zoomTo]);

  /* Tell the deck to keep its hands off the keyboard, and put the focus
     somewhere inside the overlay so a Tab press doesn't wander off into the
     invitation behind it. */
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    document.body.dataset.modal = "open";
    closeRef.current?.focus();
    return () => {
      delete document.body.dataset.modal;
      previous?.focus?.();
    };
  }, []);

  /* Wheel has to be bound by hand: React's synthetic listener is passive, and
     a passive listener can't preventDefault, which here means the page zooms
     behind the overlay instead of the map zooming inside it. */
  useEffect(() => {
    const el = stageRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const { px, py } = toStage(e.clientX, e.clientY);
      zoomTo(view.current.scale * (e.deltaY < 0 ? 1.18 : 1 / 1.18), px, py);
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, [toStage, zoomTo]);

  const onPointerDown = (e: React.PointerEvent) => {
    downTarget.current = e.target;
    stageRef.current?.setPointerCapture(e.pointerId);
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    moved.current = false;
    if (pointers.current.size === 2) {
      const [a, b] = [...pointers.current.values()];
      const { px, py } = toStage((a.x + b.x) / 2, (a.y + b.y) / 2);
      pinch.current = {
        dist: Math.hypot(a.x - b.x, a.y - b.y),
        scale: view.current.scale,
        cx: px,
        cy: py,
      };
    }
  };

  const onPointerMove = (e: React.PointerEvent) => {
    const prev = pointers.current.get(e.pointerId);
    if (!prev) return;
    const next = { x: e.clientX, y: e.clientY };
    pointers.current.set(e.pointerId, next);
    if (Math.hypot(next.x - prev.x, next.y - prev.y) > 2) moved.current = true;

    const gesture = pinch.current;
    if (pointers.current.size >= 2 && gesture && gesture.dist > 0) {
      const [a, b] = [...pointers.current.values()];
      const dist = Math.hypot(a.x - b.x, a.y - b.y);
      zoomTo((gesture.scale * dist) / gesture.dist, gesture.cx, gesture.cy);
      return;
    }

    if (view.current.scale <= MIN_SCALE) return;
    view.current.x += next.x - prev.x;
    view.current.y += next.y - prev.y;
    clampPan();
    apply();
  };

  const onPointerUp = (e: React.PointerEvent) => {
    const wasAlone = pointers.current.size === 1;
    pointers.current.delete(e.pointerId);
    if (pointers.current.size < 2) pinch.current = null;
    if (!wasAlone || moved.current) return;

    // A tap on the dark margin around the image closes the viewer.
    if (downTarget.current === stageRef.current) {
      onClose();
      return;
    }

    // Double-tap on the image itself toggles between fit and zoomed.
    const now = performance.now();
    if (now - lastTap.current < 300) {
      lastTap.current = 0;
      const { px, py } = toStage(e.clientX, e.clientY);
      zoomTo(view.current.scale > MIN_SCALE + 0.01 ? MIN_SCALE : TAP_SCALE, px, py);
    } else {
      lastTap.current = now;
    }
  };

  return (
    <motion.div
      role="dialog"
      aria-modal="true"
      aria-label={alt}
      className="fixed inset-0 z-[100] bg-night/95 backdrop-blur-sm"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
    >
      {/*
        The stage sits under the chrome and owns every gesture. `touch-none`
        is what hands pinch and drag to us instead of to the browser's own
        page zoom, and it's why the wheel listener above can preventDefault.
      */}
      <div
        ref={stageRef}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        className={`absolute inset-0 flex touch-none select-none items-center justify-center overflow-hidden p-3 pb-14 pt-16 ${
          zoomed ? "cursor-grab active:cursor-grabbing" : "cursor-zoom-in"
        }`}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          ref={imgRef}
          src={src}
          alt={alt}
          draggable={false}
          decoding="async"
          className="max-h-full max-w-full object-contain will-change-transform"
        />
      </div>

      {/* Chrome sits above the stage and keeps its own pointer events, so a
          drag that ends on a button doesn't also pan the map. */}
      <div className="pointer-events-none absolute inset-x-0 top-0 flex items-start justify-between gap-2 p-3">
        <p className="pointer-events-none max-w-[60%] rounded-full bg-night/60 px-3 py-1.5 text-xs text-parchment/80 sm:text-sm">
          {alt}
        </p>
        <div className="pointer-events-auto flex items-center gap-1.5">
          <ChromeButton label="Zoom out" onClick={() => step(1 / STEP)} disabled={!zoomed}>
            <path d="M8 12 h8" />
          </ChromeButton>
          <ChromeButton label="Zoom in" onClick={() => step(STEP)}>
            <path d="M12 8 v8 M8 12 h8" />
          </ChromeButton>
          <ChromeButton label="Close" onClick={onClose} ref={closeRef}>
            <path d="M7.5 7.5 L16.5 16.5 M16.5 7.5 L7.5 16.5" />
          </ChromeButton>
        </div>
      </div>

      <p className="pointer-events-none absolute inset-x-0 bottom-4 text-center text-[11px] text-parchment/60 sm:text-xs">
        Pinch, scroll or double-tap to zoom · drag to move
      </p>
    </motion.div>
  );
}

/**
 * One of the round controls in the top bar. The children are the icon's
 * paths, drawn in the same stroke family as the rest of the ornaments.
 *
 * It forwards a ref so the overlay can move focus onto the close button the
 * moment it opens.
 */
const ChromeButton = forwardRef<
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
