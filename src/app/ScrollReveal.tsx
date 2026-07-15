"use client";

/* Scroll-into-view reveal for the article columns: a simple whole-paragraph
   slide on the site's burst ease — one per cell, staggered when several enter
   together. (The scramble that used to accompany this was cut; the hover
   scramble in Bugs.tsx still owns link text.) Skipped under reduced-motion. */
import { useEffect } from "react";

export default function ScrollReveal() {
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

    const reveal = (el: HTMLElement, delay: number) => {
      later(() => {
        const inner = innerOf(el);
        // opacity leads (fast ease-out) so the slide itself stays visible
        inner.style.transition = "transform 850ms cubic-bezier(0, 1, 0, 1), opacity 220ms ease-out";
        inner.style.opacity = "1";
        inner.style.transform = "none";
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
