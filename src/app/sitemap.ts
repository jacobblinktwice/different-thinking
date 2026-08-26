import type { MetadataRoute } from "next";
import { PUBLIC_PATHS, SITE_URL } from "./site";

/* No lastModified on purpose: a build-time date would change on every deploy
   whether the page did or not, which teaches crawlers to ignore it. */
export default function sitemap(): MetadataRoute.Sitemap {
  return PUBLIC_PATHS.map((path) => ({
    url: `${SITE_URL}${path === "/" ? "" : path}`,
    changeFrequency: "monthly",
    priority: path === "/" ? 1 : 0.8,
  }));
}
