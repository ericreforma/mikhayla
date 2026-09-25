"use client";

import { useEffect, useRef, useState } from "react";

/**
 * One file the invitation wants in the browser's cache before a guest is let
 * in — a photograph, or a song.
 *
 * `est` is what we *guess* it weighs, and it is only ever a starting point:
 * the real figure comes off the `Content-Length` header the moment the
 * response opens, which for these files is within the first moments. It
 * exists so the bar has honest proportions from its very first frame rather
 * than treating a 170 KB cut-out and an 8 MB song as the same slice of the
 * journey. Rough is fine; wrong by an order of magnitude is not.
 */
export type PreloadAsset = {
  url: string;
  kind: "image" | "audio";
  est: number;
};

/**
 * How many files are in the air at once.
 *
 * Six rather than "all of them": a phone asked for thirty at once spreads one
 * narrow pipe across thirty half-finished downloads, so everything arrives at
 * the end together and the bar crawls, then lurches. A small pool keeps files
 * *completing* all the way through, which is what makes progress read as
 * progress.
 */
const CONCURRENCY = 6;

/**
 * Every image pulled down, kept alive for as long as the page is open.
 *
 * This array is the whole reason the preload works, and it is not an
 * optimisation — without it the feature quietly does nothing.
 *
 * The obvious design is to fetch each file, throw the bytes away, and trust
 * the HTTP cache to have them when the invitation asks. Measured, that trust
 * is misplaced: this invitation is some seventy megabytes, which is large
 * enough that writing the end of it evicts the beginning. Her hero portrait
 * is the *first* file fetched and so the first evicted, and the hero is the
 * very screen the curtain lifts onto — it was going back to the network at
 * the one moment the whole exercise exists to protect.
 *
 * A live `HTMLImageElement` holding a loaded `src` is a client on that
 * resource, so the browser keeps it whatever the disk cache does, and any
 * later `<img>` with the same URL is served from memory. Holding them costs
 * roughly what the files weigh — which is the price of the promise this
 * screen makes, and a good deal cheaper than downloading them twice.
 */
const held: HTMLImageElement[] = [];

/**
 * Pulls an image into memory and decodes it.
 *
 * Two things, not one. The fetch that ran before this put the bytes within
 * reach; this makes them pixels, because a cached 2 MB PNG is still a few
 * hundred milliseconds of decoding away from being on screen — and holds on
 * to the result, for the reason above.
 *
 * It never rejects. An image that will not decode is an image the guest sees
 * a moment late, which is not a reason to hold the door shut.
 */
function warmDecode(url: string): Promise<void> {
  return new Promise((resolve) => {
    const img = new Image();
    img.decoding = "async";
    held.push(img);
    img.onload = () => resolve();
    img.onerror = () => resolve();
    img.src = url;
    /* Every browser this ships to has `decode`, but guard anyway — `onload`
       above is the floor, and whichever settles first wins. */
    img.decode?.().then(
      () => resolve(),
      () => resolve(),
    );
  });
}

/**
 * Pulls every asset down, reporting a byte-weighted fraction as it goes.
 *
 * Byte-weighted rather than file-counted, on purpose. Counting files would
 * have the bar jump a thirtieth for a 400 KB cut-out and then sit dead still
 * through 8 MB of her song — the two most common complaints about a progress
 * bar, in one component. Reading each response chunk by chunk gives a number
 * that moves at the speed the connection actually moves.
 *
 * `assets` must be a stable reference — a module constant, or a `useMemo` —
 * or the effect tears the whole pool down and starts again on every render.
 */
export function useAssetPreload(assets: PreloadAsset[]) {
  const [done, setDone] = useState(false);

  /*
   * How far along we are, 0 to 1 — and deliberately a ref rather than state.
   *
   * `publish` below runs on every chunk of every stream, several hundred
   * times a second across six of them. Putting that through `setState` would
   * be a re-render per network packet, to move a bar the DOM can be told
   * about directly. So the value lives here and the loading screen reads it
   * once a frame on its own animation clock — the same division TimelineMusic
   * makes with its volume ramps, and for the same reason.
   *
   * The only thing worth waking React for is `done`, which happens once.
   */
  const ratioRef = useRef(0);

  useEffect(() => {
    let cancelled = false;
    const controller = new AbortController();

    /** What each file weighs: the estimate, then the real figure. */
    const size = new Map(assets.map((a) => [a.url, Math.max(1, a.est)]));
    /** How much of each has arrived. Never more than its own `size`. */
    const got = new Map(assets.map((a) => [a.url, 0]));

    const publish = () => {
      if (cancelled) return;
      let total = 0;
      let loaded = 0;
      for (const a of assets) {
        total += size.get(a.url) ?? 1;
        loaded += got.get(a.url) ?? 0;
      }
      ratioRef.current = total > 0 ? Math.min(1, loaded / total) : 1;
    };

    const pull = async (asset: PreloadAsset) => {
      try {
        const res = await fetch(asset.url, {
          signal: controller.signal,
          credentials: "same-origin",
        });
        if (!res.ok) throw new Error(String(res.status));

        /*
         * The real weight, replacing the estimate. Read before a single byte
         * of the body, so the bar's proportions are corrected while it is
         * still near the start and the correction is invisible.
         *
         * These are PNGs and MP3s, which no sane server re-compresses, so the
         * header and the stream agree on what a byte is. Where there is no
         * header at all the estimate stands and the file lands whole — see
         * the else branch.
         */
        const declared = Number(res.headers.get("content-length"));
        const measured = Number.isFinite(declared) && declared > 0 ? declared : 0;
        if (measured) size.set(asset.url, measured);

        if (res.body && measured) {
          const reader = res.body.getReader();
          let seen = 0;
          for (;;) {
            const { done: end, value } = await reader.read();
            if (end) break;
            if (cancelled) {
              await reader.cancel();
              return;
            }
            seen += value?.byteLength ?? 0;
            /* Clamped, so a stream that outruns its own header can never push
               this file — and with it the whole bar — past full. */
            got.set(asset.url, Math.min(seen, measured));
            publish();
          }
        } else {
          /*
           * Nothing to count against, so there is nothing honest to report
           * part-way. Rather than invent a crawling number, this file stays
           * at nothing until it lands and then counts for its estimate: one
           * clean step, instead of a fiction.
           */
          await res.arrayBuffer();
        }

        if (asset.kind === "image") await warmDecode(asset.url);
      } catch {
        /*
         * A file that 404s, or a connection that drops one, is not worth
         * holding a guest at the door for: the invitation renders perfectly
         * well with a photograph missing, and the alternative is a bar frozen
         * at 94% with no way past it. It counts as arrived.
         */
      } finally {
        if (!cancelled) {
          got.set(asset.url, size.get(asset.url) ?? 1);
          publish();
        }
      }
    };

    /* A queue drained by a fixed number of workers — see CONCURRENCY. */
    const queue = [...assets];
    const worker = async () => {
      for (;;) {
        const next = queue.shift();
        if (!next || cancelled) return;
        await pull(next);
      }
    };
    const pool = Array.from({ length: Math.min(CONCURRENCY, queue.length) || 1 }, worker);

    /*
     * The fonts are in the gate too, and cost nothing to wait for: they are
     * already downloading for the loading screen's own headline. Without
     * this, the curtain can lift on a hero set in Times for a beat while
     * Fraunces lands — the one flash of unstyled text a guest would actually
     * notice, on the one screen that is meant to be perfect.
     */
    const fonts = document.fonts?.ready ?? Promise.resolve();

    void Promise.all([...pool, fonts]).then(() => {
      if (cancelled) return;
      ratioRef.current = 1;
      setDone(true);
    });

    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [assets]);

  return { ratioRef, done };
}
