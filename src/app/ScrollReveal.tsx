"use client";

/* Scroll-into-view reveal for the manifesto: PER COLUMN, not per paragraph —
   cells are grouped by the multicol column they start in and each column
   slides up together, staggered left to right on the site's burst ease.
   (On mobile, where the article is a single stack, cells reveal one by one as
   they enter instead.) Skipped under reduced-motion. */
import { useEffect } from "react";

const COLUMN_STAGGER = 130;

export default function ScrollReveal() {
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const timers: number[] = [];
    const later = (fn: () => void, ms: number) => {
      const t = window.setTimeout(fn, ms);
      timers.push(t);
    };

    const cells = Array.from(document.querySelectorAll<HTMLElement>(".article-col"));
    if (!cells.length) return;
    const container = cells[0].parentElement as HTMLElement;
    const innerOf = (el: HTMLElement) => el.querySelector<HTMLElement>(".article-inner") ?? el;
    const multicol = cells[0].offsetWidth < container.offsetWidth * 0.9;

    // pre-hide only what's still below the viewport
    const pending = cells.filter((el) => el.getBoundingClientRect().top > window.innerHeight * 0.85 || multicol);
    if (!pending.length) return;
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

    let io: IntersectionObserver;
    if (multicol) {
      // one trigger for the whole article; each cell's delay = the column it
      // starts in, so the columns rise left → right
      const colOf = (el: HTMLElement) => Math.round(el.offsetLeft / Math.max(1, el.offsetWidth));
      io = new IntersectionObserver(
        (entries) => {
          if (!entries.some((en) => en.isIntersecting)) return;
          io.disconnect();
          for (const el of pending) reveal(el, colOf(el) * COLUMN_STAGGER);
        },
        { threshold: 0.05 },
      );
      io.observe(container);
    } else {
      io = new IntersectionObserver(
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
    }

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
