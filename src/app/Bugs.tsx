"use client";

/* Curated visual-bug episodes, scattered across the page. One episode fires at a
   time (~4-9s apart at rest), runs 100-900ms, and always restores what it touched —
   that's what keeps it feeling art-directed instead of broken. While the glitch is
   OPEN the page is "infected": cadence jumps to ~1.6-4.8s, episodes sometimes
   double-fire, and the onOnly episodes (rgb-split, selection-invert) join the
   rotation. Also here: text links scramble briefly on hover. Ambient (not
   scheduled): the missing_texture.png tile (static, in page.tsx).

   Review API (browser console):
     dtBugs.list          — all episode ids
     dtBugs.run("id")     — trigger one on demand
     dtBugs.mute("id")    — take one out of the rotation
     dtBugs.unmute("id")
   Every scheduled firing logs `[dt-bug] <id>` so you can tell what you just saw.

   NOTE: transforms on parallax-managed layers (logotype/title/intro/codestrip)
   must go through el.dataset.dtBugT — the parallax loop in Hero.tsx composes it
   into the transform it writes every frame. And never touch `filter` on the
   logotype: React owns it for the difference-blend swap. */
import { useEffect } from "react";

const GLYPHS = "▓░█<>/\\#@%&$?";

export default function Bugs() {
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const timers: number[] = [];
    const later = (fn: () => void, ms: number) => {
      const t = window.setTimeout(fn, ms);
      timers.push(t);
      return t;
    };
    const q = (sel: string) => document.querySelector(sel) as HTMLElement | null;
    const qa = (sel: string) => Array.from(document.querySelectorAll<HTMLElement>(sel));
    const pick = <T,>(arr: T[]) => arr[Math.floor(Math.random() * arr.length)];

    /* replace a few characters, twice, then restore */
    const scramble = (el: HTMLElement, dur: number): boolean => {
      const orig = el.textContent || "";
      if (el.dataset.dtOrig !== undefined || orig.trim().length < 4) return false;
      el.dataset.dtOrig = orig;
      const pass = () => {
        const chars = orig.split("");
        const n = 2 + Math.floor(Math.random() * 3);
        for (let i = 0; i < n; i++) {
          const idx = Math.floor(Math.random() * chars.length);
          if (chars[idx] !== " ") chars[idx] = GLYPHS[Math.floor(Math.random() * GLYPHS.length)];
        }
        el.textContent = chars.join("");
      };
      pass();
      later(pass, dur * 0.45);
      later(() => {
        el.textContent = orig;
        delete el.dataset.dtOrig;
      }, dur);
      return true;
    };

    /* swap full text, then restore */
    const swapText = (el: HTMLElement, txt: string, dur: number): boolean => {
      if (el.dataset.dtOrig !== undefined) return false;
      const orig = el.textContent || "";
      el.dataset.dtOrig = orig;
      el.textContent = txt;
      later(() => {
        el.textContent = orig;
        delete el.dataset.dtOrig;
      }, dur);
      return true;
    };

    // onOnly episodes join the rotation only while the glitch is open — the bug
    // "infects" the rest of the page
    const episodes: { id: string; onOnly?: boolean; run: () => boolean }[] = [
      {
        // 1. Unfiltered Textures & Hard-Coded Lighting
        id: "unfiltered-texture",
        run() {
          const hero = q('[data-bug="hero"]');
          const cv = q("section canvas");
          if (!hero || !cv) return false;
          cv.style.imageRendering = "pixelated";
          cv.style.filter = "contrast(1.3) saturate(1.5)";
          const ov = document.createElement("div");
          ov.className = "dt-hard-light";
          hero.appendChild(ov);
          later(() => {
            cv.style.imageRendering = "";
            cv.style.filter = "";
            ov.remove();
          }, 280);
          return true;
        },
      },
      {
        // 2. VRAM Artifacting / Palette Swapping
        id: "palette-swap",
        run() {
          const cv = q("section canvas");
          if (!cv) return false;
          cv.style.filter = "hue-rotate(120deg) saturate(1.9)";
          later(() => (cv.style.filter = ""), 90);
          later(() => (cv.style.filter = "hue-rotate(-110deg) saturate(1.6)"), 160);
          later(() => (cv.style.filter = ""), 250);
          return true;
        },
      },
      {
        // 3. Micro-stuttering / Rubberbanding — a layer jitters and snaps back
        // (article columns removed from the pool — jitter on body copy read badly)
        id: "micro-stutter",
        run() {
          const el = pick(
            [q("section nav"), q('[data-bug="clicklabel"]'), q('[data-bug="src"]')].filter(Boolean) as HTMLElement[],
          );
          if (!el || el.dataset.dtStut) return false;
          el.dataset.dtStut = "1";
          el.style.transform = "translate(4px, -2px)";
          later(() => (el.style.transform = "translate(-5px, 1px)"), 70);
          later(() => (el.style.transform = "translate(2px, 0)"), 130);
          later(() => {
            el.style.transform = "";
            delete el.dataset.dtStut;
          }, 200);
          return true;
        },
      },
      {
        // 4. Unrendered Bitmaps / Missing Files — the bug icon fails to load for a beat
        id: "missing-file",
        run() {
          const mark = q('[data-bug="bugmark"]');
          const svg = mark?.querySelector("svg") as SVGElement | null;
          if (!mark || !svg || mark.dataset.dtMiss) return false;
          mark.dataset.dtMiss = "1";
          mark.style.position = "relative";
          svg.style.visibility = "hidden";
          const box = document.createElement("div");
          box.className = "dt-missing-box";
          box.style.cssText = "position:absolute;inset:0";
          mark.appendChild(box);
          later(() => {
            svg.style.visibility = "";
            box.remove();
            delete mark.dataset.dtMiss;
          }, 420);
          return true;
        },
      },
      {
        // 5. Desynced Audio-Track & Visual Static
        id: "av-desync",
        run() {
          const hero = q('[data-bug="hero"]');
          if (!hero) return false;
          const band = document.createElement("div");
          band.className = "dt-noise-band";
          band.style.top = `${10 + Math.random() * 70}%`;
          band.style.height = `${28 + Math.random() * 40}px`;
          hero.appendChild(band);
          later(() => band.remove(), 170);
          const cap = document.createElement("span");
          cap.className = "t-foot font-mono";
          cap.style.cssText =
            "position:absolute;z-index:6;color:#a3a3a3;left:var(--gutter);bottom:8px;pointer-events:none";
          cap.textContent = "[ ♪ audio +00:00.43 off ]";
          hero.appendChild(cap);
          later(() => cap.remove(), 900);
          return true;
        },
      },
      {
        // page infection (glitch-on only): RGB-split flash on a random text block
        id: "rgb-split",
        onOnly: true,
        run() {
          if (!q("section canvas")) return false;
          const el = pick(
            [q('[data-bug="title"]'), q("section nav"), q('[data-bug="src"]'), ...qa(".article-col")].filter(
              Boolean,
            ) as HTMLElement[],
          );
          if (!el || el.dataset.dtRgb) return false;
          el.dataset.dtRgb = "1";
          el.style.textShadow = "2px 0 rgba(255,0,220,0.8), -2px 0 rgba(0,255,255,0.8)";
          later(() => (el.style.textShadow = "3px 0 rgba(0,255,255,0.7), -3px 0 rgba(255,0,220,0.7)"), 80);
          later(() => {
            el.style.textShadow = "";
            delete el.dataset.dtRgb;
          }, 170);
          return true;
        },
      },
      {
        // page infection (glitch-on only): a text block flashes inverted, like a
        // rogue selection sweep
        id: "selection-invert",
        onOnly: true,
        run() {
          if (!q("section canvas")) return false;
          const el = pick(
            [q('[data-bug="clicklabel"]'), ...qa("nav a"), ...qa('[data-bug="codestrip"] span')].filter(
              Boolean,
            ) as HTMLElement[],
          );
          if (!el || el.dataset.dtInv) return false;
          el.dataset.dtInv = "1";
          el.style.background = "#0a0a0a";
          el.style.color = "#fcfcfc";
          later(() => {
            el.style.background = "";
            el.style.color = "";
            delete el.dataset.dtInv;
          }, 140);
          return true;
        },
      },
      {
        // 7. Font Kerning Error / Character Scrambling
        id: "kerning-scramble",
        run() {
          const el = pick(
            [
              q('[data-bug="title"]'),
              ...qa('[data-bug="codestrip"] span'),
              ...qa("nav a"),
              ...qa(".article-col .wl"),
            ].filter(Boolean) as HTMLElement[],
          );
          if (!el) return false;
          if (Math.random() < 0.45) {
            if (el.dataset.dtKern) return false;
            el.dataset.dtKern = "1";
            el.style.letterSpacing = "0.3em";
            later(() => (el.style.letterSpacing = "-0.04em"), 110);
            later(() => {
              el.style.letterSpacing = "";
              delete el.dataset.dtKern;
            }, 210);
            return true;
          }
          return scramble(el, 380);
        },
      },
      {
        // 8. Floating-Point Errors / Placeholder Value Bugs
        id: "float-error",
        run() {
          const variant = Math.floor(Math.random() * 3);
          if (variant === 0) {
            const m = pick(qa("nav .t-foot"));
            return m ? swapText(m, "[ NaN ]", 520) : false;
          }
          if (variant === 1) {
            const src = q('[data-bug="src"]');
            return src ? swapText(src, '<src: undefined>', 520) : false;
          }
          const mid = qa('[data-bug="codestrip"] span')[1];
          return mid ? swapText(mid, "; @0.30000000000000004}", 520) : false;
        },
      },
      {
        // 9. Infinite Recursion / Freeze Frame — the composition hangs, then resumes
        id: "freeze-frame",
        run() {
          if (!q("section canvas")) return false;
          window.dispatchEvent(new CustomEvent("dt-freeze", { detail: 0.3 }));
          return true;
        },
      },
    ];

    // hover interaction: text links scramble briefly when the cursor lands on them
    const onHover = (e: Event) => {
      const a = (e.target as HTMLElement | null)?.closest?.("nav a, .article-col .wl") as HTMLElement | null;
      if (a) scramble(a, 240);
    };
    document.addEventListener("mouseover", onHover, { passive: true });

    const muted = new Set<string>();
    const runById = (id: string) => {
      const e = episodes.find((x) => x.id === id);
      if (e?.run()) {
        announce(id);
        return true;
      }
      return false;
    };
    const announce = (id: string) => {
      console.log(`[dt-bug] ${id}`);
      window.dispatchEvent(new CustomEvent("dt-log", { detail: `bug :: ${id}` }));
    };
    const fireOne = (pool: typeof episodes) => {
      for (let i = 0; i < 6 && pool.length; i++) {
        const e = pick(pool);
        if (e.run()) {
          announce(e.id);
          return true;
        }
      }
      return false;
    };
    const runRandom = () => {
      const on = !!q("section canvas"); // glitch open = the page is infected
      const pool = episodes.filter((e) => !muted.has(e.id) && (!e.onOnly || on));
      fireOne(pool);
      // while open: much denser cadence, sometimes a rapid second hit
      if (on && Math.random() < 0.35) later(() => fireOne(pool), 300 + Math.random() * 500);
      later(runRandom, on ? 1600 + Math.random() * 3200 : 3800 + Math.random() * 5200);
    };
    later(runRandom, 5000); // let the boot loader finish first

    type DtBugs = { list: string[]; run: (id: string) => boolean; mute: (id: string) => void; unmute: (id: string) => void };
    (window as unknown as { dtBugs?: DtBugs }).dtBugs = {
      list: episodes.map((e) => e.id),
      run: runById,
      mute: (id: string) => void muted.add(id),
      unmute: (id: string) => void muted.delete(id),
    };

    return () => {
      timers.forEach((t) => window.clearTimeout(t));
      document.removeEventListener("mouseover", onHover);
      delete (window as unknown as { dtBugs?: DtBugs }).dtBugs;
    };
  }, []);
  return null;
}
