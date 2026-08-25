"use client";

/* Hover scramble on every link, site-wide. This used to live inside Bugs.tsx,
   which only mounts on the homepage — so the effect was missing on About,
   Eventually, Contact and Different Thinkers. Mounted from the root layout so
   it applies everywhere.

   Delegated from one document-level listener, so it costs nothing per link and
   picks up links that appear later (the dossier overlay, spawned popups).
   Text-only targets: the scramble writes textContent, which would otherwise
   destroy an anchor's child elements permanently. */
import { useEffect } from "react";
import { scrambleText } from "./scramble";

export default function LinkScramble() {
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const timers = new Set<number>();
    const schedule = (fn: () => void, ms: number) => {
      const t = window.setTimeout(() => {
        timers.delete(t);
        fn();
      }, ms);
      timers.add(t);
    };

    const onOver = (e: Event) => {
      const el = (e.target as HTMLElement | null)?.closest?.("a, .dt-cmd") as HTMLElement | null;
      if (el && el.children.length === 0) scrambleText(el, 240, schedule);
    };
    document.addEventListener("mouseover", onOver, { passive: true });
    return () => {
      document.removeEventListener("mouseover", onOver);
      timers.forEach((t) => window.clearTimeout(t));
    };
  }, []);

  return null;
}
