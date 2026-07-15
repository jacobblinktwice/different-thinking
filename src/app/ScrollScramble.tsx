"use client";

/* Scroll-into-view reveal for the article columns: a simple whole-paragraph
   slide on the site's burst ease — one per cell, staggered when several enter
   together — paired with the pronounced scramble that resolves progressively
   (heavy at first, healing pass by pass). The earlier per-line word-span
   version read as laggy and was replaced with this.

   Link text is excluded from the scramble — the hover-scramble in Bugs.tsx owns
   those nodes, and sharing them risks storing a mid-scramble string as an
   "original". Skipped entirely under reduced-motion. */
import { useEffect } from "react";

const GLYPHS = "x#/\\<>+=~kzrtoe";
// progressive resolve: fraction of characters scrambled per pass (each pass
// rebuilds from the original string, so earlier glyphs heal as it decays)
const PASSES: [number, number][] = [
  [0, 0.28],
  [110, 0.22],
  [220, 0.16],
  [340, 0.11],
  [470, 0.06],
  [610, 0.025],
];
const RESTORE_MS = 760;

export default function ScrollScramble() {
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const timers: number[] = [];
    const later = (fn: () => void, ms: number) => {
      const t = window.setTimeout(fn, ms);
      timers.push(t);
    };

    // pre-hide only the columns still below the viewport
    const pending = Array.from(document.querySelectorAll<HTMLElement>(".article-col")).filter(
      (el) => el.getBoundingClientRect().top > window.innerHeight * 0.85,
    );
    const innerOf = (el: HTMLElement) => el.querySelector<HTMLElement>(".article-inner") ?? el;
    for (const el of pending) {
      const inner = innerOf(el);
      inner.style.transform = "translateY(36px)";
      inner.style.opacity = "0";
    }

    const scrambleOnce = (el: HTMLElement) => {
      const nodes: Text[] = [];
      const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
      let n: Node | null;
      while ((n = walker.nextNode())) {
        const t = n as Text;
        if (t.data.trim().length > 2 && !t.parentElement?.closest("a")) nodes.push(t);
      }
      const orig = nodes.map((t) => t.data);
      const pass = (fraction: number) => {
        nodes.forEach((t, i) => {
          const chars = orig[i].split("");
          const count = Math.max(1, Math.floor(chars.length * fraction));
          for (let k = 0; k < count; k++) {
            const idx = (Math.random() * chars.length) | 0;
            if (chars[idx] !== " ") chars[idx] = GLYPHS[(Math.random() * GLYPHS.length) | 0];
          }
          t.data = chars.join("");
        });
      };
      for (const [at, fraction] of PASSES) later(() => pass(fraction), at);
      later(() => nodes.forEach((t, i) => (t.data = orig[i])), RESTORE_MS);
    };

    const reveal = (el: HTMLElement, delay: number) => {
      later(() => {
        const inner = innerOf(el);
        // opacity leads (fast ease-out) so the slide itself stays visible
        inner.style.transition = "transform 850ms cubic-bezier(0, 1, 0, 1), opacity 220ms ease-out";
        inner.style.opacity = "1";
        inner.style.transform = "none";
        scrambleOnce(inner);
        later(() => {
          inner.style.transition = "";
          inner.style.transform = "";
          inner.style.opacity = "";
        }, 950);
      }, delay);
    };

    const io = new IntersectionObserver(
      (entries) => {
        let batch = 0;
        for (const en of entries) {
          if (!en.isIntersecting) continue;
          io.unobserve(en.target);
          reveal(en.target as HTMLElement, batch++ * 90);
        }
      },
      { threshold: 0.15 },
    );
    pending.forEach((el) => io.observe(el));

    return () => {
      io.disconnect();
      timers.forEach((t) => window.clearTimeout(t));
      pending.forEach((el) => {
        const inner = innerOf(el);
        inner.style.opacity = "";
        inner.style.transform = "";
        inner.style.transition = "";
      });
    };
  }, []);
  return null;
}
