/**
 * The repo name. GitHub Pages serves a project site out of a folder named
 * after the repo, so the whole app lives under `ericreforma.github.io/mikhayla`
 * rather than at a domain root. Set this to "" if the site ever moves to one.
 */
const basePath = "/mikhayla";

/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "export",
  images: { unoptimized: true },
  basePath,
  assetPrefix: basePath,
  /**
   * `basePath` prefixes the URLs Next generates itself — the JS bundle, the
   * CSS, the fonts — but not the plain `<img src="/…">` paths written by hand
   * in `app/config.ts`. Handing it to the app lets those prefix themselves
   * from this same single source, so there is only ever one place to change.
   */
  env: { NEXT_PUBLIC_BASE_PATH: basePath },

  /**
   * In development only: send the bare root to where the site actually lives.
   *
   * `basePath` means nothing is served at `/` — the whole app is under
   * `/mikhayla`, and a request to the root gets Next's own 404 page. On a
   * laptop that is a curiosity; on a phone being handed the machine's IP
   * address it is indistinguishable from "the site is not reachable", because
   * nobody types a path after an IP address. This is the single most
   * misleading thing about testing this project on a second device, and it has
   * now cost an afternoon at least once.
   *
   * Development only, and deliberately so. `redirects()` cannot be honoured by
   * `output: "export"` — there is no server on GitHub Pages to honour it — and
   * declaring one unconditionally earns a warning on every production build
   * for a convenience that only ever applies to `next dev`. Defined inside the
   * branch, the export build never sees it.
   *
   * `next dev` still prints that warning, because `output: "export"` is set
   * either way and Next checks the pair rather than the mode. Ignore it: the
   * redirect demonstrably fires in development, which is the only place it
   * exists. It is not a sign that this does not work.
   */
  ...(process.env.NODE_ENV === "development"
    ? {
        async redirects() {
          return [
            /* `basePath: false` because without it Next reads `source` as
               relative to the base path — so "/" would mean "/mikhayla/" and
               the rule would redirect the site to itself. */
            { source: "/", destination: basePath, basePath: false, permanent: false },
          ];
        },
      }
    : {}),
};

export default nextConfig;
