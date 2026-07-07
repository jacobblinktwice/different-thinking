"use client";

/* Figma-style canvas rulers along the top (X) and left (Y) edges — glitch mode
   only, revealed with the snap wipe. Ticks every 100px with tiny mono labels:
   X in viewport coordinates (static), Y in DOCUMENT coordinates, so the numbers
   track the page as you scroll, exactly like panning a Figma canvas. */
import { useEffect, useRef } from "react";

export default function Rulers() {
  const xRef = useRef<HTMLDivElement>(null);
  const yRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const x = xRef.current;
    const y = yRef.current;
    if (!x || !y || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const buildX = () => {
      x.innerHTML = "";
      for (let px = 0; px <= window.innerWidth; px += 100) {
        const t = document.createElement("span");
        t.className = "dt-ruler-tick-x";
        t.style.left = `${px}px`;
        t.textContent = String(px);
        x.appendChild(t);
      }
    };
    const yPool: HTMLSpanElement[] = [];
    const buildY = () => {
      const n = Math.ceil(window.innerHeight / 100) + 2;
      while (yPool.length < n) {
        const t = document.createElement("span");
        t.className = "dt-ruler-tick-y";
        y.appendChild(t);
        yPool.push(t);
      }
    };
    buildX();
    buildY();
    const onResize = () => {
      buildX();
      buildY();
    };
    window.addEventListener("resize", onResize);

    let raf = 0;
    let frame = 0;
    let on = false;
    const tick = () => {
      if (frame++ % 10 === 0) {
        const next = !!document.querySelector("section canvas");
        if (next !== on) {
          on = next;
          x.classList.toggle("dt-ruler-on", on);
          y.classList.toggle("dt-ruler-on", on);
        }
      }
      if (on) {
        const s = Math.round(window.scrollY);
        const base = s - (s % 100);
        for (let i = 0; i < yPool.length; i++) {
          const doc = base + i * 100;
          yPool[i].style.top = `${doc - s}px`;
          yPool[i].textContent = String(doc);
        }
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", onResize);
    };
  }, []);

  return (
    <>
      <div ref={xRef} aria-hidden className="dt-ruler dt-ruler-x hidden md:block" />
      <div ref={yRef} aria-hidden className="dt-ruler dt-ruler-y hidden md:block" />
    </>
  );
}
