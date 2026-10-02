import type { MetadataRoute } from "next";

// Makes the site installable to a phone's home screen as an app (2026-10-02).
// Next.js serves this at /manifest.webmanifest and links it from every page
// automatically -- nothing to add to layout.tsx for it.
//
// The icons live in /public/icons (same place and same reason as
// /pokebulk-logo.png in the navbar: the phone's installer has to fetch them
// from the site's own address). They are generated from that same logo.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "PokeBulk SA",
    short_name: "PokeBulk",
    description: "South Africa's premier Pokemon card store - Straight outta Kempton Park",
    id: "/",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#12121a",
    theme_color: "#12121a",
    lang: "en-ZA",
    categories: ["shopping"],
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
    // Long-press the home-screen icon on Android to jump straight to these.
    shortcuts: [
      { name: "My Orders", url: "/orders" },
      { name: "Browse Cards", url: "/cards" },
      { name: "My Pile", url: "/pile" },
    ],
  };
}
