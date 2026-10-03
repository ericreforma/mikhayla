/**
 * The web app manifest — the same "open it without a browser around it" that
 * `appleWebApp` in layout.tsx asks iOS for, asked of everyone else. Android
 * mainly, where Chrome offers to install the page and then runs it chrome-less.
 *
 * Android already gets the whole screen the moment a guest presses "Open the
 * gates", so this is a convenience there rather than the only way in.
 *
 * ---------------------------------------------------------------------------
 * Why this is a route handler and not `app/manifest.ts`
 * ---------------------------------------------------------------------------
 * Next has a metadata convention for exactly this file, and it was used first.
 * It generates the manifest at the right URL and it writes the
 * `<link rel="manifest">` for you — but that link ships without the
 * `basePath`, as a bare `/manifest.webmanifest`. This site is served from
 * `ericreforma.github.io/mikhayla`, where that is somebody else's 404, and
 * setting `metadata.manifest` does not override it: the convention wins.
 *
 * Served as an ordinary route instead, no link is written for it, and
 * layout.tsx declares one with the prefix on. The URLs below are built from
 * the same `basePath` every other hand-written path on the site reads, so
 * there is still only one place to change if this ever moves to a domain root.
 */
const BASE = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

/** `output: export` has no server to run this at request time. */
export const dynamic = "force-static";

export function GET() {
  const manifest = {
    name: "Princess Mikhayla Turns One",
    short_name: "Mikhayla",
    description:
      "Twelve months, twelve princesses. Join us at the ball as Mikhayla turns one!",
    start_url: `${BASE}/`,
    scope: `${BASE}/`,
    display: "standalone",
    orientation: "any",
    /* Parchment, the colour the page opens on, so the splash does not flash
       white before the castle arrives. */
    background_color: "#FFF8F0",
    theme_color: "#FFF8F0",
    icons: [
      { src: `${BASE}/icon-192.png`, sizes: "192x192", type: "image/png" },
      { src: `${BASE}/icon-512.png`, sizes: "512x512", type: "image/png" },
      {
        src: `${BASE}/icon-512.png`,
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };

  return new Response(JSON.stringify(manifest), {
    headers: { "content-type": "application/manifest+json" },
  });
}
