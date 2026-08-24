"use client";

/* Large display typography UNDER the manifesto columns: the sentence
   "For all kinds of people with all kinds of minds." broken into fragments
   staggered diagonally down the article, set in Exposure 96px −10% tracking.
   Each fragment chases the scroll at its own rate (the logotype's style of
   parallax) so the layer drifts against the text above it. Desktop only. */
import { useEffect, useRef } from "react";

/* super-subtle drift: a few px of separation across a full scroll, nothing more */
const FRAGMENTS: { text: string; left: string; top: string; f: number; rate: number }[] = [
  { text: "For all kinds", left: "8%", top: "10%", f: -0.015, rate: 6 },
  { text: "with", left: "16%", top: "40%", f: -0.03, rate: 6 },
  { text: "of people", left: "44%", top: "28%", f: -0.02, rate: 6 },
  { text: "all kinds", left: "40%", top: "58%", f: -0.035, rate: 6 },
  { text: "of minds", left: "58%", top: "80%", f: -0.025, rate: 6 },
];

export default function ArticleType() {
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const wrap = wrapRef.current;
    if (!wrap || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const els = Array.from(wrap.children) as HTMLElement[];
    const cur = els.map(() => 0);
    let raf = 0;
    let last = 0;
    const tick = (now: number) => {
      if (!last) last = now;
      const dt = Math.min((now - last) / 1000, 0.05);
      last = now;
      const y = Math.min(window.scrollY, window.innerHeight * 4);
      for (let i = 0; i < els.length; i++) {
        const b = FRAGMENTS[i];
        cur[i] += (y * b.f - cur[i]) * Math.min(1, 1 - Math.exp(-dt * b.rate));
        els[i].style.transform = `translate3d(0, ${cur[i].toFixed(2)}px, 0)`;
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  return (
    <div ref={wrapRef} aria-hidden className="pointer-events-none absolute inset-0 z-0 hidden select-none lg:block">
      {FRAGMENTS.map((b, i) => (
        <span key={i} className="dt-display absolute text-ink" style={{ left: b.left, top: b.top }}>
          {b.text}
        </span>
      ))}
    </div>
  );
}
