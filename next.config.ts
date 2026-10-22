import type { NextConfig } from "next";

/* The brand guidelines (with the glitch lab as their hero) are a static site in
   public/guidelines. They are served at /guidelines and at the root of the brand
   subdomain. The subdomain does nothing until it is added as a domain on this
   Vercel project and its DNS points here; GUIDELINES_HOST overrides the name.
   /api stays the site's API on both, so the lab reads and publishes the same
   live composition. */
const GUIDELINES_HOST = process.env.GUIDELINES_HOST || "brand.differentthinking.ai";

const nextConfig: NextConfig = {
  async rewrites() {
    return {
      beforeFiles: [
        { source: "/guidelines", destination: "/guidelines/index.html" },
        ...(GUIDELINES_HOST
          ? [
              { source: "/", has: [{ type: "host" as const, value: GUIDELINES_HOST }], destination: "/guidelines/index.html" },
              {
                source: "/:path((?!api/|guidelines/|_next/).+)",
                has: [{ type: "host" as const, value: GUIDELINES_HOST }],
                destination: "/guidelines/:path",
              },
            ]
          : []),
      ],
      afterFiles: [],
      fallback: [],
    };
  },
};

export default nextConfig;
