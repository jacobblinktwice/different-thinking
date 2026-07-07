"use client";

/* Scroll-into-view reveal for the article columns: a small upward slide on the
   burst ease plus a brief, subtle text scramble that resolves — once per column,
   staggered when several enter together. (Replaces the earlier velocity-driven
   noise-mask scramble, which read as too chaotic.)

   Link text is excluded from the scramble — the hover-scramble in Bugs.tsx owns
   those nodes, and sharing them risks storing a mid-scramble string as an
   "original". Skipped entirely under reduced-motion. */
import { useEffect } from "react";

const GLYPHS = "x#/\\<>+=~kzrtoe";

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
    for (const el of pending) {
      el.style.opacity = "0";
      el.style.transform = "translateY(24px)";
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
      const pass = () => {
        nodes.forEach((t, i) => {
          const chars = orig[i].split("");
          const count = Math.max(1, Math.floor(chars.length * 0.1)); // subtle: ~10% of chars
          for (let k = 0; k < count; k++) {
            const idx = (Math.random() * chars.length) | 0;
            if (chars[idx] !== " ") chars[idx] = GLYPHS[(Math.random() * GLYPHS.length) | 0];
          }
          t.data = chars.join("");
        });
      };
      pass();
      later(pass, 120);
      later(pass, 230);
      later(() => nodes.forEach((t, i) => (t.data = orig[i])), 350);
    };

    const reveal = (el: HTMLElement, delay: number) => {
      later(() => {
        el.style.transition = "transform 600ms cubic-bezier(0, 1, 0, 1), opacity 300ms var(--ease-smooth)";
        el.style.opacity = "1";
        el.style.transform = "none";
        scrambleOnce(el);
        later(() => {
          el.style.transition = "";
          el.style.transform = "";
          el.style.opacity = "";
        }, 700);
      }, delay);
    };

    const io = new IntersectionObserver(
      (entries) => {
        let batch = 0;
        for (const en of entries) {
          if (!en.isIntersecting) continue;
          io.unobserve(en.target);
          reveal(en.target as HTMLElement, batch++ * 70);
        }
      },
      { threshold: 0.15 },
    );
    pending.forEach((el) => io.observe(el));

    return () => {
      io.disconnect();
      timers.forEach((t) => window.clearTimeout(t));
      pending.forEach((el) => {
        el.style.opacity = "";
        el.style.transform = "";
        el.style.transition = "";
      });
    };
  }, []);
  return null;
}
