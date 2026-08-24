"use client";

/* Raw console-style overlay at the left side — no container, just overlapping
   mono text logging the site's life in real time: real events (glitch toggles
   via Hero, bug episodes via Bugs — both dispatch `dt-log` CustomEvents) mixed
   with ambient research telemetry. New lines slide in while their characters
   resolve from glyph noise. Capped at 4 visible lines, and every line expires
   (slides back out) a couple of seconds after arriving — the log is a passing
   murmur, not a fixture. */
import { useEffect, useRef } from "react";

const GLYPHS = "▓░█<>/\\#@%&$?";
const hex = (n: number) => Math.floor(Math.random() * 16 ** n).toString(16).toUpperCase().padStart(n, "0");
const TEMPLATES: (() => string)[] = [
  () => `loss ${(0.1 + Math.random() * 0.4).toFixed(4)} ↘`,
  () => `attn head ${String(1 + Math.floor(Math.random() * 12)).padStart(2, "0")} drift +${(Math.random() * 2).toFixed(1)}%`,
  () => `seed 0x${hex(4)}`,
  () => `signal/noise ${(0.8 + Math.random() * 0.19).toFixed(2)}`,
  () => `epoch ${String(1 + Math.floor(Math.random() * 99)).padStart(2, "0")} :: diverging nicely`,
  () => `mem ${(128 + Math.random() * 512).toFixed(1)}MB ok`,
  () => `token/s ${(10 + Math.random() * 90).toFixed(1)}`,
  () => "pattern found in noise",
  () => "reroute: lateral path taken",
  () => "hyperfocus: engaged",
  () => `checksum ${hex(6)} :: mismatch ignored`,
  () => "thought loop closed (3 passes)",
  // the brand code dialect, drifting through the telemetry
  () => 'CONST BUG = "FEATURE";',
  () => "KEEP_RUNNING = TRUE;",
  () => "DELETE DEFICIT_MODEL;",
  () => "TRY { HYPERFOCUS(); }",
  () => "DEPLOY(MIND);",
];

export default function LiveLog() {
  const boxRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const box = boxRef.current;
    if (!box || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const timers: number[] = [];
    const later = (fn: () => void, ms: number) => {
      const t = window.setTimeout(fn, ms);
      timers.push(t);
    };
    const t0 = performance.now();

    const retire = (el: Element) => {
      if (!el.isConnected || el.classList.contains("dt-log-out")) return;
      el.classList.add("dt-log-out");
      later(() => el.remove(), 220);
    };
    const push = (text: string) => {
      const line = `[+${((performance.now() - t0) / 1000).toFixed(1)}s]  ${text}`;
      const el = document.createElement("span");
      el.className = "dt-log-line";
      // characters resolve from glyph noise as the line slides in
      el.textContent = line.replace(/[^ ]/g, () => GLYPHS[Math.floor(Math.random() * GLYPHS.length)]);
      box.appendChild(el);
      later(() => (el.textContent = line), 110);
      later(() => retire(el), 2600 + Math.random() * 900); // lines are transient
      // trim: at most 4 visible lines
      const alive = Array.from(box.children).filter((c) => !c.classList.contains("dt-log-out"));
      for (let i = 0; i < alive.length - 4; i++) retire(alive[i]);
    };

    const onLog = (e: Event) => push(String((e as CustomEvent).detail));
    window.addEventListener("dt-log", onLog);
    let tick: number;
    const loop = () => {
      push(TEMPLATES[Math.floor(Math.random() * TEMPLATES.length)]());
      tick = window.setTimeout(loop, 2500 + Math.random() * 3500);
      timers.push(tick);
    };
    later(loop, 3200);

    return () => {
      timers.forEach((t) => window.clearTimeout(t));
      window.removeEventListener("dt-log", onLog);
    };
  }, []);

  return (
    <div
      ref={boxRef}
      aria-hidden
      className="pointer-events-none fixed left-[var(--gutter)] top-1/2 z-[6] hidden -translate-y-1/2 select-none font-sans text-[8px] leading-[1.7] tracking-[0.01em] text-[#B2B2B2] md:block"
    />
  );
}
