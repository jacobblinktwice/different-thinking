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
      buildX(); // wipes the X ruler — re-append the mouse marker after
      buildY();
      x.appendChild(mx);
    };
    window.addEventListener("resize", onResize);

    // mouse position indicators (blue line + live coordinate, one per axis)
    const mx = document.createElement("span");
    mx.className = "dt-ruler-mx";
    mx.style.display = "none";
    const my = document.createElement("span");
    my.className = "dt-ruler-my";
    my.style.display = "none";
    const mouse = { x: 0, y: 0, seen: false };
    const onMove = (e: PointerEvent) => {
      mouse.x = e.clientX;
      mouse.y = e.clientY;
      mouse.seen = true;
    };
    const onLeave = () => {
      mouse.seen = false;
    };
    window.addEventListener("pointermove", onMove, { passive: true });
    window.addEventListener("pointerleave", onLeave);

    let raf = 0;
    let frame = 0;
    let on = false;
    const tick = () => {
      if (frame++ % 10 === 0) {
        // keyed on the toggle (not canvas presence) so the rulers leave the
        // moment the bug is switched off, not after the canvas unmounts
        const next = document.documentElement.dataset.dtGlitch === "1";
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
          const vy = doc - s;
          yPool[i].style.top = `${vy}px`;
          yPool[i].textContent = String(doc);
          // corner: hide Y ticks whose labels would collide with the X ruler's "0"
          yPool[i].style.visibility = vy < 20 ? "hidden" : "visible";
        }
        if (mouse.seen) {
          mx.style.display = "";
          my.style.display = "";
          mx.style.left = `${mouse.x}px`;
          mx.textContent = String(Math.round(mouse.x));
          my.style.top = `${mouse.y}px`;
          my.textContent = String(s + Math.round(mouse.y));
        } else {
          mx.style.display = "none";
          my.style.display = "none";
        }
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);

    x.appendChild(mx);
    y.appendChild(my);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", onResize);
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerleave", onLeave);
    };
  }, []);

  return (
    <>
      <div ref={xRef} aria-hidden className="dt-ruler dt-ruler-x hidden md:block" />
      <div ref={yRef} aria-hidden className="dt-ruler dt-ruler-y hidden md:block" />
    </>
  );
}
