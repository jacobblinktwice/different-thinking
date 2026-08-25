"use client";

/* Data-texture layer: THREE deliberate sections (no scatter), each a single
   column of stacked brand code-dialect snippets (all-caps JS bones —
   CONST/TRY/IF/WHILE, // comments) at its own column + height. The layer
   scrolls natively with the page; each section adds the logotype's style of
   chase-parallax on top (slightly stronger). Neue Montreal 8px #B2B2B2,
   pointer-events-none: pure texture, never UI. Hidden on mobile.

   The WHOLE texture is glitch-gated: every block reveals with a staggered snap
   wipe while the glitch is open and vanishes when it closes. Nothing sits in
   the top-right nav corner. */
import { useEffect, useRef } from "react";

/* the brand code dialect (see Misc/brand-code-snippets.md) */
const RECLAIM = 'CONST BUG = "FEATURE";\n// WE TAKE THE JOKE SERIOUSLY';
const INTENDED = "FUNCTION WORKING_AS_INTENDED() {\n  RETURN TRUE; // WE ARE THE BUGS\n}";
const HYPERFOCUS = "TRY {\n  HYPERFOCUS();\n} CATCH (HOURS) {\n  RETURN BREAKTHROUGHS;\n}";
const MISMATCH = 'IF (MIND !== TEMPLATE) {\n  // NOT A BROKEN BRAIN\n  THROW "THE SYSTEM, NOT THE BRAIN";\n}';
const DEBUGGING = "WHILE (DEBUGGING_YOURSELF) {\n  // YOUR BEST YEARS ON THE WRONG BUG\n  BREAK;\n}\nSHIP_SOMETHING();";
const DEPLOY = "STOP_APOLOGISING();\nDEPLOY(MIND);";
const PATCH = "DELETE DEFICIT_MODEL;\n// KEPT: THE MINDS";
const REFUSE = "REFUSE({\n  GUILT_MECHANICS: NULL,\n  BROKEN_STREAKS: NULL,\n  SHAME: NULL,\n});";
const GROUP = "CONST GROUP = [SCANNER,\n  OBSESSIVE, DREAMER];\n// SURVIVED TOGETHER";

/* three sections, ALL within the hero viewport: a few snippets stacked per
   column, three columns at three height bands. The layer scrolls natively with
   the page; f adds the logotype's kind of chase-parallax on top (the logo runs
   f −0.06 @ rate 6 — these push a touch harder, all at the same rate so the
   smoothness matches). */
const BLOCKS: { text: string; left: string; top: string; f: number; rate: number }[] = [
  // ——— section 1 · left column, high ———
  { text: RECLAIM, left: "10%", top: "24vh", f: -0.08, rate: 6 },
  { text: HYPERFOCUS, left: "10%", top: "38vh", f: -0.08, rate: 6 },
  { text: PATCH, left: "10%", top: "60vh", f: -0.08, rate: 6 },
  // ——— section 2 · centre column, lower band ———
  { text: MISMATCH, left: "45%", top: "58vh", f: -0.1, rate: 6 },
  { text: DEBUGGING, left: "45%", top: "74vh", f: -0.1, rate: 6 },
  { text: GROUP, left: "45%", top: "94vh", f: -0.1, rate: 6 },
  // ——— section 3 · right column, upper band (below the nav) ———
  { text: REFUSE, left: "75%", top: "30vh", f: -0.12, rate: 6 },
  { text: INTENDED, left: "75%", top: "48vh", f: -0.12, rate: 6 },
  { text: DEPLOY, left: "75%", top: "62vh", f: -0.12, rate: 6 },
];

export default function DataTexture() {
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const wrap = wrapRef.current;
    if (!wrap || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const els = Array.from(wrap.children) as HTMLElement[];
    const cur = els.map(() => 0);
    let raf = 0;
    let last = 0;
    let frame = 0;
    const tick = (now: number) => {
      if (!last) last = now;
      const dt = Math.min((now - last) / 1000, 0.05);
      last = now;
      // every ~5 frames: the whole texture exists only while the glitch is open.
      // Keyed on the toggle state (not canvas presence) so the OUT starts the
      // moment the glitch is switched off, not after the canvas unmounts.
      if (frame++ % 5 === 0) {
        const on = document.documentElement.dataset.dtGlitch === "1";
        for (let i = 0; i < els.length; i++) els[i].classList.toggle("dt-tex-on", on);
      }
      const y = Math.min(window.scrollY, window.innerHeight * 1.5);
      for (let i = 0; i < els.length; i++) {
        const b = BLOCKS[i];
        // the layer scrolls natively; this adds the logotype-style drift on top
        cur[i] += (y * b.f - cur[i]) * Math.min(1, 1 - Math.exp(-dt * b.rate));
        els[i].style.transform = `translate3d(0, ${cur[i].toFixed(2)}px, 0)`;
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  return (
    /* outer = absolute layer IN the page (scrolls natively, like the hero
       chrome); inner = the gutter-to-gutter frame the column lefts resolve
       against, so sections land on the grid */
    <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 z-[6] hidden h-svh select-none md:block">
      <div ref={wrapRef} className="relative h-full mx-[var(--gutter)]">
        {BLOCKS.map((b, i) => (
          <pre
            key={i}
            className="dt-tex-g absolute font-sans text-[8px] leading-[1.7] tracking-[0.01em] text-[#B2B2B2]"
            style={{ left: b.left, top: b.top, animationDelay: `${i * 35}ms`, transitionDelay: `${i * 18}ms` }}
          >
            {b.text}
          </pre>
        ))}
      </div>
    </div>
  );
}
