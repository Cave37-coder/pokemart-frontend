import type { Metadata, Viewport } from "next";
import { Barlow_Semi_Condensed } from "next/font/google";

// Poke-Trade (2026-11-07): its own installable phone app living at /trade.
// This layout swaps in Poke-Trade's own manifest + home-screen name/icon, so
// "Add to Home Screen" from /trade installs Poke-Trade, separate from the
// main PokeBulk app (manifest in public/trade/, iPhone icon in ./apple-icon.png).
const display = Barlow_Semi_Condensed({ subsets: ["latin"], weight: ["500", "600", "700"], variable: "--pt-display" });

export const metadata: Metadata = {
  title: "Poke-Trade by PokeBulk SA",
  description: "Build both sides of a Pokémon card trade and see who's up, valued at today's TCG market price in Rand.",
  manifest: "/trade/manifest.webmanifest",
  appleWebApp: { capable: true, title: "Poke-Trade", statusBarStyle: "black" },
};

export const viewport: Viewport = {
  themeColor: "#15151f",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function TradeLayout({ children }: { children: React.ReactNode }) {
  return <div className={display.variable}>{children}</div>;
}
