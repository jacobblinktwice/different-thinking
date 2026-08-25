"use client";

/* Infection-mode text effects, site-wide and CHEAP: while the bug is toggled
   on, a random text element (title, nav links, footer contact) periodically
   runs one of three timer-driven treatments — scramble (glyph noise healing
   back), decode (resolves left to right out of noise), or typewriter (retypes
   itself). Pure textContent mutation on a setInterval — no rAF loops, no GPU.

   Every element's clean text is snapshotted once at mount, and every effect
   restores from that snapshot, so text can never be left corrupted. Skipped
   under reduced-motion. */
import { useEffect } from "react";

const GLYPHS = "x#/\\<>+=~kzrtoe01";
const POOL_SELECTORS = [
  '[data-bug="title"] a',
  "section nav a",
  "#about nav a",
  'footer a[href^="mailto:"]',
  "footer p",
  "footer pre",
  ".dt-display", // the big Exposure fragments under the manifesto
  "section p.t-body", // hero intro
  '[data-bug="src"]',
];

type Item = { el: HTMLElement; orig: string; busy: boolean };

export default function TextFx() {
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const timers = new Set<number>();
    const later = (fn: () => void, ms: number) => {
      const t = window.setTimeout(() => {
        timers.delete(t);
        fn();
      }, ms);
      timers.add(t);
      return t;
    };
    const every = (fn: () => void, ms: number) => {
      const t = window.setInterval(fn, ms);
      timers.add(t);
      return t;
    };
    const stop = (t: number) => {
      window.clearInterval(t);
      window.clearTimeout(t);
      timers.delete(t);
    };

    // snapshot the pool once, before any effect can touch it
    const pool: Item[] = [];
    later(() => {
      for (const sel of POOL_SELECTORS) {
        document.querySelectorAll<HTMLElement>(sel).forEach((el) => {
          const orig = el.textContent ?? "";
          if (orig.trim().length > 2 && !pool.some((p) => p.el === el)) pool.push({ el, orig, busy: false });
        });
      }
    }, 1200);

    const rnd = (a: number, b: number) => a + Math.random() * (b - a);
    const glyph = () => GLYPHS[(Math.random() * GLYPHS.length) | 0];
    const isOn = () => document.querySelector("button[aria-pressed]")?.getAttribute("aria-pressed") === "true";

    /* the three treatments — each mutates textContent on an interval and
       always ends by restoring the mount snapshot */
    const scramble = (it: Item, done: () => void) => {
      let pass = 0;
      const t = every(() => {
        pass++;
        if (pass > 9) {
          stop(t);
          it.el.textContent = it.orig;
          done();
          return;
        }
        const frac = 0.45 * (1 - pass / 10);
        const chars = it.orig.split("");
        for (let k = 0; k < Math.max(1, chars.length * frac); k++) {
          const i = (Math.random() * chars.length) | 0;
          if (chars[i] !== " ") chars[i] = glyph();
        }
        it.el.textContent = chars.join("");
      }, 70);
    };
    const decode = (it: Item, done: () => void) => {
      let k = 0;
      const t = every(() => {
        k += Math.ceil(it.orig.length / 18);
        if (k >= it.orig.length) {
          stop(t);
          it.el.textContent = it.orig;
          done();
          return;
        }
        it.el.textContent =
          it.orig.slice(0, k) +
          it.orig
            .slice(k)
            .split("")
            .map((c) => (c === " " ? " " : glyph()))
            .join("");
      }, 45);
    };
    const typewriter = (it: Item, done: () => void) => {
      let k = 0;
      it.el.textContent = "";
      const t = every(() => {
        k++;
        if (k >= it.orig.length) {
          stop(t);
          it.el.textContent = it.orig;
          done();
          return;
        }
        it.el.textContent = it.orig.slice(0, k) + "_";
      }, 38);
    };
    const EFFECTS = [scramble, decode, typewriter];
    const NAMES = ["scramble", "decode", "typewriter"];

    const fire = () => {
      const free = pool.filter((p) => p.busy === false && p.el.isConnected);
      if (!free.length) return;
      const it = free[(Math.random() * free.length) | 0];
      const fi = (Math.random() * EFFECTS.length) | 0;
      it.busy = true;
      window.dispatchEvent(new CustomEvent("dt-log", { detail: `fx :: ${NAMES[fi]}()` }));
      EFFECTS[fi](it, () => (it.busy = false));
    };

    // cadence: dense while the infection is on — often two at once, plus an
    // immediate burst the moment the bug is switched on
    let cancelled = false;
    let wasOn = false;
    const schedule = () => {
      if (cancelled) return;
      later(() => {
        const on = isOn();
        if (on && !wasOn) {
          // activation burst: several effects land right away
          fire();
          later(fire, 180);
          later(fire, 380);
          later(fire, 640);
        } else if (on) {
          fire();
          if (Math.random() < 0.4) later(fire, 150);
        }
        wasOn = on;
        schedule();
      }, rnd(700, 1800));
    };
    schedule();

    return () => {
      cancelled = true;
      timers.forEach((t) => {
        window.clearInterval(t);
        window.clearTimeout(t);
      });
      pool.forEach((p) => {
        if (p.el.isConnected) p.el.textContent = p.orig;
      });
    };
  }, []);
  return null;
}
