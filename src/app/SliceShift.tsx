"use client";

/* Viewport-wide slice shift while the bug is on: an SVG displacement filter
   (banded, quantized noise displacing the X axis only) applied to the page
   sections — everything on screen, imagery included, tears into subtle
   horizontal slices. Purely visual: filters don't affect hit-testing or
   layout, so usability is untouched. Fixed overlays (rulers, console, hover
   imagery) are siblings of the sections, so they stay crisp.

   On with the glitch by default (Hero seeds documentElement.dataset.dtSlice
   from its own state); the lab panel's "slice fx" switch turns it off.

   Anything marked [data-no-slice] stays crisp — the hero wordmark, so the
   logotype never tears. A CSS filter cannot be cancelled on a descendant, so
   a section holding one is filtered child by child instead, skipping the
   branch that contains it.

   Light: the filter is only attached while the glitch is on, and the only
   ongoing work is a seed re-roll every ~800ms (repaint, no layout, no rAF).
   Skipped under reduced-motion. */
import { useEffect, useRef } from "react";

/* 1:1 with the engine's Figma-ported slice shader: every horizontal band
   gets a uniformly-random offset — SHIFT drives the X amplitude, RANDOM the
   vertical shifting of the same bands. One shared displacement scale; each
   axis's amplitude comes from how wide its table spans around 0.5. */
const SCALE = 40; // px at full table spread
const SHIFT_X = 10; // max horizontal band movement (px) — Figma's "shift"
const SHIFT_Y = 20; // max vertical band shifting (px) — Figma's "random"
const levels = (amp: number, n = 9) =>
  Array.from({ length: n }, (_, i) => (0.5 - amp / SCALE + (i * (2 * amp)) / SCALE / (n - 1)).toFixed(3)).join(" ");

export default function SliceShift() {
  const turbRef = useRef<SVGFETurbulenceElement>(null);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const FILTER = "url(#dt-slice)";
    /* The elements the filter actually goes on. Normally one per section, but a
       section containing an opted-out element is filtered child by child so
       that element's branch can be skipped. */
    const units = () => {
      const out: HTMLElement[] = [];
      for (const sec of document.querySelectorAll<HTMLElement>("main section, main footer")) {
        const keep = sec.querySelector("[data-no-slice]");
        if (!keep) {
          out.push(sec);
          continue;
        }
        for (const child of Array.from(sec.children)) {
          if (child instanceof HTMLElement && !child.contains(keep)) out.push(child);
        }
      }
      return out;
    };

    let applied = false;
    let seedTimer: number | undefined;

    /* Re-applied every tick rather than only on change: the hero's canvas mounts
       and unmounts with the toggle, and a child that appears later would
       otherwise never pick the filter up. Writing the same value back is free. */
    const sync = (on: boolean) => {
      for (const el of units()) el.style.filter = on ? FILTER : "";
      if (on === applied) return;
      applied = on;
      window.clearInterval(seedTimer);
      if (on) {
        seedTimer = window.setInterval(() => {
          turbRef.current?.setAttribute("seed", String(1 + Math.floor(Math.random() * 200)));
        }, 800);
      }
    };

    const poll = window.setInterval(() => {
      // needs the glitch ON, and the slice switch not turned off in the panel
      const root = document.documentElement.dataset;
      const on = root.dtGlitch === "1" && root.dtSlice !== "0";
      sync(on);
    }, 250);

    return () => {
      window.clearInterval(poll);
      window.clearInterval(seedTimer);
      units().forEach((el) => (el.style.filter = ""));
    };
  }, []);

  return (
    <svg width="0" height="0" aria-hidden className="absolute">
      <defs>
        {/* banded noise (varies only with Y) → quantized into hard slabs.
            Both channels are UNIFORMLY distributed per band, like the Figma
            slice shader's hash: R = horizontal movement of each band (shift),
            G = vertical shifting of the same band (random) — vertical offsets
            resample content from above/below, giving the repeated texture.
            Alpha is forced to 1 so premultiplication can't skew the map. */}
        <filter id="dt-slice" x="-5%" y="-5%" width="110%" height="110%" colorInterpolationFilters="sRGB">
          <feTurbulence ref={turbRef as never} type="fractalNoise" baseFrequency="0 0.018" numOctaves="1" seed="7" result="noise" />
          <feComponentTransfer in="noise" result="stepped">
            <feFuncR type="discrete" tableValues={levels(SHIFT_X)} />
            <feFuncG type="discrete" tableValues={levels(SHIFT_Y)} />
          </feComponentTransfer>
          <feColorMatrix
            in="stepped"
            type="matrix"
            values="1 0 0 0 0  0 1 0 0 0  0 0 0 0 0.5  0 0 0 0 1"
            result="map"
          />
          <feDisplacementMap in="SourceGraphic" in2="map" scale={SCALE} xChannelSelector="R" yChannelSelector="G" />
        </filter>
      </defs>
    </svg>
  );
}
