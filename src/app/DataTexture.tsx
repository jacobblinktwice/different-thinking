"use client";

/* Overlapping data-texture layer (Bendito art-direction reference), rewritten
   on-brand: effect specimens, neurodivergent traits, training telemetry. Small
   mono fragments scattered across the page as a fixed overlay whose blocks drift
   at their own chase rates as you scroll. Light grey, pointer-events-none: pure
   texture, never UI. Hidden on mobile.

   The WHOLE texture is glitch-gated: every block reveals with a staggered snap
   wipe while the glitch is open and vanishes when it closes — the overlap (incl.
   the blocks invading the nav corner, and the corrupted nav echo) only ever
   exists in glitch mode. */
import { useEffect, useRef } from "react";

const BLOCKS: { text: string; left: string; top: string; f: number; rate: number; dim?: boolean }[] = [
  {
    text: "01  slice_shift\n02  pixel_stretch\n03  gradient_map\n04  refraction\n05  dither\n06  chromatic",
    left: "9%",
    top: "16vh",
    f: 0.34,
    rate: 9,
  },
  { text: "PERCEIVE PROCESS\nPATTERN PLAY", left: "24%", top: "8vh", f: 0.5, rate: 14, dim: true },
  { text: "A2-§   TRAITS", left: "6%", top: "33vh", f: 0.28, rate: 6 },
  {
    text: "hyperfocus\npattern sense\nlateral logic\ndeep dive\nloop thinking\nRE:WIRED\nRE:WIRED\nRE:WIRED",
    left: "11%",
    top: "40vh",
    f: 0.45,
    rate: 11,
  },
  { text: "__%  TO  __%", left: "31%", top: "76vh", f: 0.62, rate: 16, dim: true },
  { text: "A3-§   EPOCHS", left: "46%", top: "12vh", f: 0.32, rate: 8 },
  {
    text: "ep 01   0.4231\nep 02   0.3910\nep 03   0.3542\nep 04   0.3187\nep 05   0.2954\nep 06   0.2731\nep 07   0.2518\nep 08   0.2402\nep 09   0.2311\nep 10   NaN",
    left: "78%",
    top: "55vh",
    f: 0.5,
    rate: 12,
  },
  { text: "NOISE\nTO SIGNAL°", left: "47%", top: "26vh", f: 0.4, rate: 10, dim: true },
  { text: "END\nLOG", left: "70%", top: "92vh", f: 0.55, rate: 15 },
  { text: "in__ → out__", left: "87%", top: "108vh", f: 0.66, rate: 18, dim: true },
  { text: "SPECIMEN\n0x0001", left: "4%", top: "118vh", f: 0.42, rate: 7 },
  { text: "RE:SRCH", left: "46%", top: "132vh", f: 0.52, rate: 13, dim: true },
  // — the texture spreads into the nav corner —
  { text: "ERR 0x00F\nERR 0x010\nRETRY?", left: "74%", top: "9vh", f: 0.38, rate: 12 },
  { text: "[ ?? ]  About\n[ ?? ]  ██████\n[ ?? ]  Alex", left: "81%", top: "22vh", f: 0.3, rate: 9 },
  { text: "sys :: infected", left: "86%", top: "5vh", f: 0.45, rate: 14, dim: true },
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
      // every ~15 frames: the whole texture exists only while the glitch is open.
      // Keyed on the toggle state (not canvas presence) so the OUT starts the
      // moment the glitch is switched off, not after the canvas unmounts.
      if (frame++ % 5 === 0) {
        const on = document.querySelector("button[aria-pressed]")?.getAttribute("aria-pressed") === "true";
        for (let i = 0; i < els.length; i++) els[i].classList.toggle("dt-tex-on", on);
      }
      const y = window.scrollY;
      for (let i = 0; i < els.length; i++) {
        const b = BLOCKS[i];
        cur[i] += (-y * b.f - cur[i]) * Math.min(1, 1 - Math.exp(-dt * b.rate));
        els[i].style.transform = `translate3d(0, ${cur[i].toFixed(2)}px, 0)`;
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  return (
    <div ref={wrapRef} aria-hidden className="pointer-events-none fixed inset-0 z-[6] hidden select-none md:block">
      {BLOCKS.map((b, i) => (
        <pre
          key={i}
          className={`t-foot dt-tex-g absolute font-mono leading-[1.6] ${b.dim ? "text-neutral-300" : "text-neutral-400"}`}
          style={{ left: b.left, top: b.top, animationDelay: `${i * 35}ms`, transitionDelay: `${i * 18}ms` }}
        >
          {b.text}
        </pre>
      ))}
    </div>
  );
}
