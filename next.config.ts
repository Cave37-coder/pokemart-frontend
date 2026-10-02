import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // 2026-10-02: the push-notification service worker (public/sw.js) must
  // never be cached by the browser or the CDN -- otherwise a fix to it
  // could take days to reach phones that already have the app installed.
  async headers() {
    return [
      {
        source: "/sw.js",
        headers: [
          { key: "Content-Type", value: "application/javascript; charset=utf-8" },
          { key: "Cache-Control", value: "no-cache, no-store, must-revalidate" },
        ],
      },
    ];
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "images.pokebulk.co.za",
        pathname: "/cards/**",
      },
      {
        protocol: "https",
        hostname: "pub-77a8c30ac1fc4f4fbe1f2a7a0f15f174.r2.dev",
        pathname: "/cards/**",
      },
      {
        protocol: "https",
        hostname: "tcgplayer-cdn.tcgplayer.com",
      },
    ],
  },
};

export default nextConfig;
