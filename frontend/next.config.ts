import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  cacheComponents: true,
  partialPrefetching: true,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
  images: {
    // Serve AVIF first, WebP as fallback; one quality level keeps the optimizer cache small.
    formats: ["image/avif", "image/webp"],
    qualities: [75],
  },
};

export default nextConfig;
