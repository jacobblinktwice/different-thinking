# Brand guidelines + glitch lab

`public/guidelines/` is the built brand guidelines site, served at `/guidelines` (and on the
guidelines subdomain, see `next.config.ts`). Its hero is the glitch lab, which is now the main lab:
`/lab` redirects here.

- Everyone can edit the glitch and export images or video. Nothing they do touches the website.
- Admins unlock with the existing `LAB_KEY` (checked by `/api/composition`, never in the bundle).
  Admins get version history, Save (adds a version), Push live (the homepage glitch), and the
  Advanced panel: the full per-box, Dup layer and Front layer effect editor from the old /lab.

`lab/` holds the lab's TypeScript source. `lab/glitch/` is a copy of `src/components/glitch` with one
addition (`engine.boost`, a resolution multiplier for the scroll zoom), so the glitch renders exactly
as on the site. Build the website bundle with:

    npx esbuild guidelines-src/lab/entry-web.ts --bundle --format=iife --minify --target=es2019 --outfile=lab-web.min.js

The page itself (and the claude.ai artifact version, built from `entry.ts` with no API) is assembled
by the guidelines build in the Different Thinking Claude project; the bundle is inlined in
`public/guidelines/index.html`.
