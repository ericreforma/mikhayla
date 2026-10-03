import type { Metadata, Viewport } from "next";
import { Fraunces, Inter, Caveat } from "next/font/google";
import "./globals.css";

const display = Fraunces({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  style: ["normal", "italic"],
  variable: "--font-display",
  display: "swap",
});

const body = Inter({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-body",
  display: "swap",
});

const hand = Caveat({
  subsets: ["latin"],
  weight: ["500", "600", "700"],
  variable: "--font-hand",
  display: "swap",
});

/** Same source as everything else that has to carry the subfolder. */
const BASE = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

export const metadata: Metadata = {
  title: "Princess Mikhayla Turns One 👑",

  /*
   * Spelled out rather than left to the file convention, and it has to be.
   *
   * `app/manifest.ts` does generate the file at the right URL, and the icons
   * Next links from `app/icon.png` and `app/apple-icon.png` do come out with
   * the `/mikhayla` prefix on them. The `<link rel="manifest">` it writes for
   * that same file does not — it ships as a bare `/manifest.webmanifest`,
   * which on a GitHub Pages project site is a 404 and an install prompt that
   * never appears. Naming it here puts the prefix back.
   */
  manifest: `${BASE}/manifest.webmanifest`,
  description: "Twelve months, twelve princesses. Join us at the ball as Mikhayla turns one!",

  /*
   * Added to the home screen, this opens without a browser around it.
   *
   * It is here for one device in particular. Every other browser is handed the
   * whole screen when a guest presses "Open the gates" — see `enterFullscreen`
   * — but Safari on iOS has no element fullscreen to grant, and an iPhone is
   * the likeliest thing this invitation will ever be opened on. Installed, it
   * gets the same thing by a different road: iOS drops the address bar and the
   * toolbar and runs the page on its own.
   *
   * It costs nothing to anyone who does not install it. These tags do nothing
   * at all in a normal tab.
   *
   * `statusBarStyle` is deliberately `default` rather than `black-translucent`.
   * Translucent would put the clock and the battery *over* the page, and this
   * page reserves no room at its top — the tab bar is at the foot and the hero
   * starts at the very top of the screen, so her crown would come up behind
   * the carrier name. `default` keeps the status bar its own strip, and
   * `themeColor` below paints it parchment so it reads as part of the page.
   */
  appleWebApp: {
    capable: true,
    title: "Mikhayla",
    statusBarStyle: "default",
  },
};

/**
 * Mobile-first viewport. `viewportFit: "cover"` lets the page paint into
 * the notch area, which the `px-gutter` / `pb-safe` utilities then pad
 * back out. No `maximumScale` — pinch-zoom stays available.
 */
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#FFF8F0",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`h-full ${display.variable} ${body.variable} ${hand.variable}`}>
      <body className="h-full font-body antialiased">{children}</body>
    </html>
  );
}
