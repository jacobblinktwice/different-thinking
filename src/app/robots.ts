import type { MetadataRoute } from "next";
import { SITE_URL } from "./site";

/* /lab authors the live glitch composition and /export4k renders stills — both
   internal, neither wants indexing. The API has nothing to crawl. */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [{ userAgent: "*", allow: "/", disallow: ["/lab", "/export4k", "/api/"] }],
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
