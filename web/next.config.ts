import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Server-rendered mode (BFF API routes need a running server)
  // For static pages, Next.js still generates them at build time

  images: {
    unoptimized: true,
  },

  // trailingSlash removed — API routes get 308 redirects with it enabled
  skipTrailingSlashRedirect: true,
};

export default nextConfig;
