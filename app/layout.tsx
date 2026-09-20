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

export const metadata: Metadata = {
  title: "Princess Mikhayla Turns One 👑",
  description: "Twelve months, twelve princesses. Join us at the ball as Mikhayla turns one!",
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
