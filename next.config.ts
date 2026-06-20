import type { NextConfig } from "next";

const nextConfig: NextConfig = {
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
