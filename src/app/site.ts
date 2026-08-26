/* Where the site lives, for anything that has to be an absolute URL: OG images,
   robots, sitemap.

   Resolution order matters because the custom domain does not exist yet:
     1. NEXT_PUBLIC_SITE_URL — set this once the real domain is live, and it wins
        everywhere. This is the only thing to change at launch.
     2. The Vercel-assigned production URL, so production is correct before the
        domain is attached.
     3. The per-deployment URL, so preview builds describe themselves rather
        than pointing previews at production.
     4. localhost for dev.

   Defaulting to the intended domain instead would make every social preview and
   sitemap entry point at a name that does not resolve yet. */
function resolve(): string {
  if (process.env.NEXT_PUBLIC_SITE_URL) return process.env.NEXT_PUBLIC_SITE_URL;
  if (process.env.VERCEL_ENV === "production" && process.env.VERCEL_PROJECT_PRODUCTION_URL) {
    return `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`;
  }
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  return "http://localhost:3000";
}

/* no trailing slash, so `${SITE_URL}${path}` is always well formed */
export const SITE_URL = resolve().replace(/\/$/, "");

/* the public pages, in nav order — the sitemap's source of truth. /lab and
   /export4k are internal and deliberately absent; robots disallows them. */
export const PUBLIC_PATHS = ["/", "/about", "/different-thinkers", "/eventually", "/contact"] as const;
