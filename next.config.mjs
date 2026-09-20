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
};

export default nextConfig;
