/* Glyph-noise scramble, shared by the site-wide link hover (LinkScramble) and
   the homepage's episodic bugs (Bugs.tsx).

   Two claim markers keep the effects off each other's text: `dtOrig` is this
   scramble mid-run, `dtFx` is TextFx running one of its longer treatments.
   Either means textContent is not the clean string and must not be snapshotted
   as if it were. */
/* the block/shade set the hover scramble has always used — distinct from
   TextFx's lighter glyph noise, which is its own look */
export const GLYPHS = "▓░█<>/\\#@%&$?";

/* Replace a few characters, twice, then restore. `schedule` is the caller's own
   timer wrapper so it can cancel outstanding work on unmount. */
export function scrambleText(
  el: HTMLElement,
  dur: number,
  schedule: (fn: () => void, ms: number) => void,
): boolean {
  const orig = el.textContent || "";
  if (el.dataset.dtOrig !== undefined || el.dataset.dtFx !== undefined) return false;
  if (orig.trim().length < 2) return false;
  el.dataset.dtOrig = orig;

  /* substitutions scale with length: a fixed 2-4 erased short labels like
     "bug" or "[ Click ]" outright instead of glitching them */
  const n = Math.max(1, Math.min(4, Math.round(orig.length / 4)));
  const pass = () => {
    const chars = orig.split("");
    for (let i = 0; i < n; i++) {
      const idx = Math.floor(Math.random() * chars.length);
      if (chars[idx] !== " ") chars[idx] = GLYPHS[Math.floor(Math.random() * GLYPHS.length)];
    }
    el.textContent = chars.join("");
  };

  pass();
  schedule(pass, dur * 0.45);
  schedule(() => {
    el.textContent = orig;
    delete el.dataset.dtOrig;
  }, dur);
  return true;
}
