"use client";

/* Scroll-into-view reveal for the article columns: a per-LINE text slide done
   without gsap — on reveal the cell's words are wrapped in inline-block spans,
   grouped into visual lines by offsetTop, and each line slides up (1em) and
   fades with a short stagger on the site's burst ease. The wrapping is a
   one-time cost per cell and the original markup is restored as soon as the
   reveal settles, so links, hover imagery and the article bugs keep operating
   on clean DOM. Paired with the pronounced progressive scramble.

   Link text is excluded from the scramble — the hover-scramble in Bugs.tsx owns
   those nodes. Skipped entirely under reduced-motion. */
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
const LINE_STAGGER = 60;
const LINE_MS = 700;

export default function ScrollScramble() {
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const timers: number[] = [];
    const later = (fn: () => void, ms: number) => {
      const t = window.setTimeout(fn, ms);
      timers.push(t);
    };

    // pre-hide only the columns still below the viewport; snapshot the clean
    // markup now (before any bug episode could touch it) to restore after
    const pending = Array.from(document.querySelectorAll<HTMLElement>(".article-col")).filter(
      (el) => el.getBoundingClientRect().top > window.innerHeight * 0.85,
    );
    const innerOf = (el: HTMLElement) => el.querySelector<HTMLElement>(".article-inner") ?? el;
    const originals = new Map<HTMLElement, string>();
    for (const el of pending) {
      const inner = innerOf(el);
      originals.set(inner, inner.innerHTML);
      inner.style.opacity = "0";
    }

    // wrap every word in an inline-block span (inside links too — the link
    // element itself stays intact) and return the spans in document order
    const splitWords = (root: HTMLElement): HTMLElement[] => {
      const texts: Text[] = [];
      const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
      let n: Node | null;
      while ((n = walker.nextNode())) if ((n as Text).data.trim()) texts.push(n as Text);
      const spans: HTMLElement[] = [];
      for (const t of texts) {
        const frag = document.createDocumentFragment();
        for (const part of t.data.split(/(\s+)/)) {
          if (!part) continue;
          if (/\s/.test(part)) {
            frag.appendChild(document.createTextNode(part));
          } else {
            const s = document.createElement("span");
            s.style.display = "inline-block";
            s.textContent = part;
            frag.appendChild(s);
            spans.push(s);
          }
        }
        t.parentNode?.replaceChild(frag, t);
      }
      return spans;
    };

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
    };

    const reveal = (el: HTMLElement, delay: number) => {
      later(() => {
        const inner = innerOf(el);
        const spans = splitWords(inner);
        // group into visual lines by offsetTop (one layout read, tolerance 3px)
        const lines: number[] = [];
        let lineTop = -Infinity;
        let line = -1;
        for (const s of spans) {
          const top = s.offsetTop;
          if (Math.abs(top - lineTop) > 3) {
            line++;
            lineTop = top;
          }
          lines.push(line);
        }
        spans.forEach((s, i) => {
          s.style.transform = "translateY(1em)";
          s.style.opacity = "0";
          s.style.transitionDelay = `${lines[i] * LINE_STAGGER}ms`;
        });
        inner.style.opacity = "1";
        requestAnimationFrame(() =>
          requestAnimationFrame(() => {
            for (const s of spans) {
              s.style.transitionProperty = "transform, opacity";
              s.style.transitionDuration = `${LINE_MS}ms, 200ms`;
              s.style.transitionTimingFunction = "cubic-bezier(0, 1, 0, 1), ease-out";
              s.style.transform = "none";
              s.style.opacity = "1";
            }
          }),
        );
        scrambleOnce(inner);
        const total = (lines[lines.length - 1] ?? 0) * LINE_STAGGER + LINE_MS + 100;
        later(() => {
          const orig = originals.get(inner);
          if (orig !== undefined) inner.innerHTML = orig; // clean DOM back (also ends any scramble)
          inner.style.opacity = "";
        }, total);
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
        const orig = originals.get(inner);
        if (orig !== undefined) inner.innerHTML = orig;
        inner.style.opacity = "";
      });
    };
  }, []);
  return null;
}
