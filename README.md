# Different Thinking

Marketing site for Different Thinking — Next.js (App Router) + Tailwind v4, with a
WebGL glitch engine driving the hero and a small internal lab for authoring its
compositions.

```bash
npm install
npm run dev      # http://localhost:3000
npm run build    # production build
npm run lint     # eslint
```

## Environment

| Variable | Required | Purpose |
| --- | --- | --- |
| `LAB_KEY` | yes, to publish | Access code for `/lab`. Gates the write side of `/api/composition`. |
| `BLOB_READ_WRITE_TOKEN` *or* `BLOB_STORE_ID` | production | Vercel Blob storage for the live glitch composition. Without one, `/api/composition` falls back to files under `.data/` in local dev, and refuses to write on Vercel. |

Copy `.env.example` to `.env.local` for local work. **`LAB_KEY` must be set in the
Vercel project** — the composition API fails closed without it, so `/lab` cannot
publish. It is deliberately not baked into the bundle: it used to be a constant
shared with the client, which shipped the secret to every visitor.

## Routes

| Route | Notes |
| --- | --- |
| `/` | Home — hero glitch (bug icon toggles it), manifesto, artefact windows |
| `/about` | Team, research heading, campaign environment |
| `/eventually` | First product |
| `/different-thinkers` | Dossiers, sourced live from Wikipedia |
| `/contact` | `compose.mail` panel — builds a `mailto:`, no endpoint |
| `/lab` | Internal, access-code gated. Authors and publishes the glitch composition |
| `/export4k` | Internal. Renders compositions to 4K stills |

## Layout conventions

Pages share `PageGuides` (the six column hairlines), `PageChrome` (wordmark, strap,
nav), `Credits` and `DragWindow` (the window language: chrome bar, drag, stacking).
The brand code dialect lives in `codeSnippets.ts`, rendered through `CodeNote` —
its rules are in `Misc/brand-code-snippets.md` on the shared drive.

Imagery is WebP under `public/images/{home,about,eventually}`. Each window's
`ratio` is its source's native aspect, so `object-cover` never crops; update it if
you re-export at a different size.

## Notes

- `/api/save-export` is development-only and 404s in production.
- `exports/` is generated output and gitignored.
