"use client";

/* Full-viewport hero on the 5-column grid: logotype pinned to the bottom of the
   viewport with the codestrip below it (columns 1-3). Starts as the clean Figma
   hero; clicking the bug powers the glitch composition on/off — the composition
   stutters out from the centre (stepped scale, see globals.css) with an intensity
   burst on the boxes, and on power-on the `intro` counter plays a decaying sweep
   on the glitch drive so the effect moves on its own and invites mouse interaction.

   Also owns: the boot loader (logotype starts centered on a paper overlay with the
   photosensitivity warning, then FLIPs into its hero position), the bug (slowly
   pursues the cursor, turning to face its heading; rests while hovered), and
   haptics (vibrate on toggle + pulses on pointer movement while the glitch is
   live — Android/Chrome; iOS has no vibrate API). */
import { useEffect, useRef, useState } from "react";
import HeroGlitch from "./HeroGlitch";
import NavIndex from "./NavIndex";

const OFF_UNMOUNT_MS = 650; // keep the canvas alive through the shrink-out animation (0.6s)
const LOGO_TEXT = "DifferentThinking";
const LOGO_MID = (LOGO_TEXT.length - 1) / 2;
/* logotype effect — swap here:
   "exposure" = real 205TF Exposure variable font (EXPO axis; licensed trial)
   "melt"     = free Baskervville + fake-exposure blow-out (stroke+blur+threshold) */
const LOGO_MODE: "exposure" | "melt" = "exposure";

const buzz = (pattern: number | number[]) => {
  try {
    navigator.vibrate?.(pattern);
  } catch {
    /* unsupported */
  }
};

export default function Hero() {
  const [on, setOn] = useState(false);
  const onRef = useRef(false); // live glitch state for the rAF logotype loop
  onRef.current = on;
  const [canvasMounted, setCanvasMounted] = useState(false);
  const [burst, setBurst] = useState(0);
  const [intro, setIntro] = useState(0);
  const [booting, setBooting] = useState(true);
  const unmountTimer = useRef<number | undefined>(undefined);

  // boot loader + logotype (Exposure variable-font test)
  const logoRef = useRef<HTMLHeadingElement>(null); // real logotype, in the hero
  const overlayRef = useRef<HTMLDivElement>(null);
  const [lettersLive, setLettersLive] = useState(false); // logotype reveal, starts mid-exit
  const bootProgRef = useRef<HTMLParagraphElement>(null); // loading readout in the overlay

  // pursuing bug
  const heroRef = useRef<HTMLElement>(null);
  const bugRef = useRef<HTMLButtonElement>(null);
  const bugBodyRef = useRef<HTMLSpanElement>(null);

  // scroll-parallax layers
  const canvasWrapRef = useRef<HTMLDivElement>(null);
  const titleRef = useRef<HTMLDivElement>(null);
  const introRef = useRef<HTMLParagraphElement>(null);
  const codeRef = useRef<HTMLDivElement>(null);

  const doToggle = () => {
    const next = !on;
    buzz(next ? [25, 40, 20] : 15);
    window.dispatchEvent(
      new CustomEvent("dt-log", { detail: next ? "glitch :: ON — page infected" : "glitch :: OFF — patched" }),
    );
    setOn(next);
    setBurst((b) => b + 1);
    window.clearTimeout(unmountTimer.current);
    if (next) {
      setCanvasMounted(true);
      setIntro((i) => i + 1); // self-moving sweep that hands off to the mouse
    } else {
      unmountTimer.current = window.setTimeout(() => setCanvasMounted(false), OFF_UNMOUNT_MS);
    }
  };

  /* boot loader: hold for the photosensitivity warning, then the bug+warning
     exit upward on cubic-bezier(1,0,1,0) while the still, solid background
     clears via a circular reveal from the centre-bottom (Pixel power-animation
     style — .dt-boot-out in CSS); the logotype letters start rising mid-exit */
  useEffect(() => {
    const overlay = overlayRef.current;
    if (!overlay || window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setBooting(false);
      setLettersLive(true);
      return;
    }
    let tL: number | undefined;
    let t2: number | undefined;
    // loading readout: eased fill across the hold, completing just before exit
    const start = performance.now();
    const prog = window.setInterval(() => {
      const el = bootProgRef.current;
      if (!el) return;
      const t = Math.min(1, (performance.now() - start) / 950);
      const e = 1 - (1 - t) ** 2;
      const blocks = Math.round(e * 12);
      el.textContent = `[${"▓".repeat(blocks)}${"░".repeat(12 - blocks)}] ${Math.floor(e * 100)}%`;
    }, 50);
    const t1 = window.setTimeout(() => {
      window.clearInterval(prog);
      if (bootProgRef.current) bootProgRef.current.textContent = "[▓▓▓▓▓▓▓▓▓▓▓▓] 100%";
      overlay.classList.add("dt-boot-out");
      // bug/warning lift 0-720ms, THEN the bg reveal blooms (600-1350ms);
      // letters start rising as the reveal opens, overlay unmounts once it's done
      tL = window.setTimeout(() => setLettersLive(true), 760);
      t2 = window.setTimeout(() => setBooting(false), 1450);
    }, 1000);
    return () => {
      window.clearInterval(prog);
      window.clearTimeout(t1);
      window.clearTimeout(tL);
      window.clearTimeout(t2);
    };
  }, []);

  /* fit the logotype to the content width (gutter to gutter) once the font is
     ready, and again on resize */
  useEffect(() => {
    const el = logoRef.current;
    if (!el) return;
    const fit = () => {
      const hero = heroRef.current;
      if (!hero) return;
      const gutter = parseFloat(getComputedStyle(el).left) || 0;
      el.style.fontSize = "100px";
      const w = el.scrollWidth;
      if (w > 0) el.style.fontSize = `${(100 * (hero.clientWidth - gutter * 2)) / w}px`;
    };
    document.fonts.ready.then(fit);
    window.addEventListener("resize", fit);
    return () => window.removeEventListener("resize", fit);
  }, []);

  /* scroll + mouse ↔ logotype, two modes (LOGO_MODE):
     • "exposure" — the real variable font's EXPO axis: rests at 0, rides scroll
       up to +100 as the wordmark exits the top, and cursor proximity pulls
       letters toward −100.
     • "melt" — fake exposure on a free serif: near the cursor each letter grows a
       same-colour text-stroke (no advance-width change → no reflow) + blur, and
       the #dt-melt alpha-threshold filter (applied imperatively only while
       melting, so rest stays crisp) re-hardens it into flat rounded blobs. */
  useEffect(() => {
    const el = logoRef.current;
    if (!el || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const spans = Array.from(el.querySelectorAll("span"));
    const cur = spans.map(() => 0); // exposure: EXPO axis value
    const curS = spans.map(() => 0); // melt: stroke px
    const curB = spans.map(() => 0); // melt: blur px
    const mouse = { x: -1e5, y: -1e5 };
    const onMove = (e: PointerEvent) => {
      mouse.x = e.clientX;
      mouse.y = e.clientY;
    };
    const onLeave = () => {
      mouse.x = -1e5;
      mouse.y = -1e5;
    };
    window.addEventListener("pointermove", onMove, { passive: true });
    window.addEventListener("pointerleave", onLeave);
    let raf = 0;
    let last = 0;
    const tick = (now: number) => {
      if (!last) last = now;
      const dt = Math.min((now - last) / 1000, 0.05);
      last = now;
      const fx = !onRef.current; // effects active while the glitch is OFF
      const fs = parseFloat(getComputedStyle(el).fontSize) || 100;
      const restBottom = window.innerHeight - (parseFloat(getComputedStyle(el).bottom) || 0);
      const r0 = el.getBoundingClientRect();
      const prog = Math.min(1, Math.max(0, 1 - r0.bottom / Math.max(1, restBottom)));
      const k = Math.min(1, 1 - Math.exp(-dt * 10));
      const dist = (s: Element) => {
        const r = s.getBoundingClientRect();
        return Math.hypot(mouse.x - (r.left + r.width / 2), mouse.y - (r.top + r.height / 2));
      };
      if (LOGO_MODE === "exposure") {
        const base = fx ? prog * 100 : 0; // scroll 0 → +100 as it exits the top
        for (let i = 0; i < spans.length; i++) {
          const influence = Math.exp(-((dist(spans[i]) / 200) ** 2));
          const target = fx ? base + (-100 - base) * influence : 0; // cursor → −100
          cur[i] += (target - cur[i]) * (k * 0.9);
          spans[i].style.fontVariationSettings = `"EXPO" ${cur[i].toFixed(1)}`;
        }
      } else {
        let maxB = 0;
        for (let i = 0; i < spans.length; i++) {
          const inf = fx ? Math.exp(-((dist(spans[i]) / 240) ** 2)) : 0;
          curS[i] += ((fx ? fs * (0.012 * prog + 0.05 * inf) : 0) - curS[i]) * k;
          curB[i] += ((fx ? fs * (0.02 * prog + 0.06 * inf) : 0) - curB[i]) * k;
          if (curB[i] > maxB) maxB = curB[i];
          spans[i].style.setProperty("-webkit-text-stroke-width", curS[i] > 0.02 ? `${curS[i].toFixed(2)}px` : "0");
          spans[i].style.filter = curB[i] > 0.05 ? `blur(${curB[i].toFixed(2)}px)` : "";
        }
        // threshold melt only while actually blurred — rest = native crisp AA
        el.style.filter = maxB > 0.4 ? "url(#dt-melt)" : "";
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerleave", onLeave);
    };
  }, []);

  /* the bug slowly pursues the cursor: eases off as it closes in, waddles a
     little, turns smoothly to face its heading, and rests while hovered.
     Translate on the button, rotation on the inner body span (hover-scale on the
     svg and the label stay independent). */
  useEffect(() => {
    if (booting) return;
    const hero = heroRef.current;
    const btn = bugRef.current;
    const body = bugBodyRef.current;
    if (!hero || !btn || !body || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let raf = 0;
    let last = 0;
    const pos = { x: 0, y: 0 }; // translate offset from the CSS anchor position
    let anchor: { x: number; y: number } | null = null;
    let angle = 0;
    const mouse = { x: 0, y: 0, seen: false };
    const onMove = (e: PointerEvent) => {
      mouse.x = e.clientX;
      mouse.y = e.clientY;
      mouse.seen = true;
    };
    window.addEventListener("pointermove", onMove, { passive: true });
    btn.style.transition = "none";
    body.style.transition = "none";

    const tick = (now: number) => {
      if (!last) last = now;
      const dt = Math.min((now - last) / 1000, 0.05);
      last = now;
      const hr = hero.getBoundingClientRect();
      const br = btn.getBoundingClientRect();
      if (!anchor) anchor = { x: br.left - hr.left - pos.x, y: br.top - hr.top - pos.y };
      if (mouse.seen) {
        const margin = 24;
        const topMargin = 190; // stay below the title + nav so the bug never blocks links
        const maxX = hr.width - br.width - margin;
        const maxY = hr.height - br.height - margin;
        // caught: rest while the cursor is over (or nearly over) the bug
        const hovered =
          mouse.x >= br.left - 10 && mouse.x <= br.right + 10 && mouse.y >= br.top - 10 && mouse.y <= br.bottom + 10;
        const tx = Math.min(Math.max(mouse.x - hr.left - br.width / 2, margin), maxX) - anchor.x;
        const ty = Math.min(Math.max(mouse.y - hr.top - br.height / 2, topMargin), maxY) - anchor.y;
        const dx = tx - pos.x;
        const dy = ty - pos.y;
        const dist = Math.hypot(dx, dy);
        if (!hovered && dist > 30) {
          const speed = Math.min(55, 12 + dist * 0.22); // saunter; slows on approach
          const heading = Math.atan2(dy, dx) + Math.sin(now / 450) * 0.35; // organic waddle
          pos.x += Math.cos(heading) * speed * dt;
          pos.y += Math.sin(heading) * speed * dt;
          // turn smoothly toward the travel direction (svg faces up)
          const target = (heading * 180) / Math.PI + 90;
          const diff = ((target - angle) % 360 + 540) % 360 - 180;
          angle += diff * Math.min(1, dt * 5);
          btn.style.transform = `translate(${pos.x}px, ${pos.y}px)`;
          body.style.transform = `rotate(${angle}deg)`;
        }
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("pointermove", onMove);
    };
  }, [booting]);

  /* scroll parallax, 2xa.studio reference: each layer CHASES its scroll target
     with its own quick easing rate (not one long smooth tween) — the differential
     catch-up speeds give the page that smooth-jumping, slightly-detached feel.
     Transforms go directly on each element — never on a wrapper around the
     logotype, whose difference blend would isolate inside a transformed stacking
     context and render plain white. */
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    // f = parallax factor, rate = chase speed (per second; higher = snappier)
    const layers: { ref: { current: HTMLElement | null }; f: number; rate: number; cur: number }[] = [
      { ref: canvasWrapRef, f: 0.05, rate: 10, cur: 0 }, // composition trails
      { ref: logoRef, f: -0.06, rate: 6, cur: 0 }, // logotype drifts, laziest
      { ref: titleRef, f: 0.12, rate: 16, cur: 0 }, // title snaps along
      { ref: introRef, f: 0.08, rate: 5, cur: 0 },
      { ref: codeRef, f: -0.28, rate: 12, cur: 0 }, // codestrip rises over the logotype
    ];
    let raf = 0;
    let last = 0;
    const tick = (now: number) => {
      if (!last) last = now;
      const dt = Math.min((now - last) / 1000, 0.05);
      last = now;
      const y = Math.min(window.scrollY, window.innerHeight * 1.5);
      for (const l of layers) {
        const el = l.ref.current;
        if (!el) continue;
        l.cur += (y * l.f - l.cur) * Math.min(1, 1 - Math.exp(-dt * l.rate));
        // compose any episode transform from Bugs.tsx (dataset.dtBugT) so visual
        // bugs can warp parallax-managed layers without being overwritten
        el.style.transform = `translate3d(0, ${l.cur.toFixed(2)}px, 0)${el.dataset.dtBugT || ""}`;
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  // haptic pulses on pointer movement while the glitch is live
  useEffect(() => {
    if (!on) return;
    let last = 0;
    const onMove = () => {
      const now = performance.now();
      if (now - last > 130) {
        last = now;
        buzz(8);
      }
    };
    window.addEventListener("pointermove", onMove, { passive: true });
    return () => window.removeEventListener("pointermove", onMove);
  }, [on]);

  useEffect(() => () => window.clearTimeout(unmountTimer.current), []);

  return (
    <>
      {/* alpha-threshold "melt" filter for the logotype — hardens per-letter blur
          into flat solid blobs (no grey halo). */}
      <svg width="0" height="0" aria-hidden className="absolute">
        <defs>
          <filter id="dt-melt" x="-8%" y="-40%" width="116%" height="180%" colorInterpolationFilters="sRGB">
            <feColorMatrix type="matrix" values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 16 -5" result="t" />
            {/* light re-soften of the hard threshold edges (only active during melt) */}
            <feGaussianBlur in="t" stdDeviation="0.4" />
          </filter>
        </defs>
      </svg>
      <section ref={heroRef} data-bug="hero" className="relative h-svh min-h-[540px] w-full overflow-hidden">
        {canvasMounted && (
          /* ===== GLITCH MOUNT POINT — shared component + saved /lab composition =====
             each box/layer grows from (or shrinks to) its own centre via `shown` */
          <div ref={canvasWrapRef} className="absolute inset-0 z-0">
            <HeroGlitch
              className="absolute inset-0"
              mode="landing"
              background={[1, 1, 1]}
              burst={burst}
              intro={intro}
              shown={on}
            />
          </div>
        )}
        {/* wordmark — Exposure variable-font TEST replacing the SVG logotype.
            Pinned to the bottom of the viewport, gutter-aligned, −10% tracking;
            plain ink when off, difference knock-out over the effect when on.
            Blend + parallax transform live on this same element (a transformed
            wrapper would isolate the blend). */}
        <h1
          ref={logoRef}
          data-bug="logotype"
          aria-label="Different Thinking"
          className={`dt-logotype ${LOGO_MODE === "exposure" ? "dt-logo-exposure" : "dt-logo-melt"} pointer-events-none absolute bottom-[clamp(52px,9svh,96px)] left-[var(--gutter)] z-[2] whitespace-nowrap ${
            lettersLive ? "dt-logo-live" : "invisible"
          }`}
          style={on ? { color: "#fff", mixBlendMode: "difference" as const } : undefined}
        >
          {LOGO_TEXT.split("").map((ch, i) => (
            <span key={i} aria-hidden className="dt-logo-ch" style={{ animationDelay: `${Math.abs(i - LOGO_MID) * 45}ms` }}>
              {ch}
            </span>
          ))}
        </h1>

        {/* top chrome, laid out on the 5-column grid */}
        <div className="pointer-events-none absolute inset-0 z-[3] px-[var(--gutter)]">
          <div className="relative h-full w-full">
            <div
              ref={titleRef}
              data-bug="title"
              className="t-title absolute left-0 top-[clamp(20px,4vh,44px)] font-medium tracking-[-0.02em]"
            >
              Your Bugs are Cool.
            </div>
            <p
              ref={introRef}
              className="t-body absolute top-[clamp(22px,4.2vh,48px)] hidden text-balance leading-[1.35] tracking-tight md:left-[33.3333%] md:block md:w-[28%] lg:left-[60%] lg:w-[18%]"
            >
              An AI research lab building products for people who think differently.
            </p>
            <NavIndex className="pointer-events-auto absolute right-0 top-[clamp(20px,4vh,44px)] md:left-[66.6667%] md:right-auto lg:left-[80%]" />
            <button
              ref={bugRef}
              type="button"
              onClick={doToggle}
              aria-pressed={on}
              aria-label={on ? "Turn the glitch off" : "Turn the glitch on"}
              className="group pointer-events-auto absolute right-[clamp(30px,9vw,170px)] top-[clamp(150px,24vh,290px)] flex cursor-pointer items-end gap-2 will-change-transform"
            >
              <span ref={bugBodyRef} data-bug="bugmark" className="inline-block">
                <BugMark className="h-[64px] w-auto transition-transform duration-200 ease-[var(--ease-snap)] group-hover:scale-110 group-active:scale-95" />
              </span>
              <span data-bug="clicklabel" className="t-body tracking-tight">
                Click Click
              </span>
            </button>
            {/* codestrip — one item per column (first three), mid grey, resting at
                the viewport bottom; its fast parallax slides it up OVER the
                logotype on scroll (chrome z-3 sits above the logotype's z-2) */}
            <div
              ref={codeRef}
              data-bug="codestrip"
              className="t-subhead absolute inset-x-0 bottom-[clamp(16px,3svh,32px)] font-mono text-neutral-400"
            >
              <span className="absolute bottom-0 left-0">{"{reSrch}"}</span>
              <span className="absolute bottom-0 left-[33.3333%] lg:left-[20%]">; @{"}"}</span>
              <span className="absolute bottom-0 left-[66.6667%] lg:left-[40%]">&lt;&quot;aiLab&quot;&gt;</span>
            </div>
          </div>
        </div>
      </section>

      {/* boot loader: centered logotype + photosensitivity warning, then the
          logotype FLIPs into the hero and the overlay fades away */}
      {booting && (
        <div
          ref={overlayRef}
          className="pointer-events-none fixed inset-0 z-[80] flex flex-col items-center justify-center"
        >
          {/* solid, still paper background — clears via a circular reveal from
              the centre-bottom on exit */}
          <div aria-hidden className="dt-boot-bg absolute inset-0" />
          <div className="dt-boot-inner relative flex flex-col items-center">
            <BugMark className="h-[clamp(72px,10vh,110px)] w-auto text-paper" />
            <div className="mt-10 text-center font-mono text-[12px] leading-relaxed">
              <p className="text-paper">[ ! ] PHOTOSENSITIVITY WARNING</p>
              <p className="mt-1.5 text-neutral-500">this site contains flashing imagery and strobe effects</p>
              {/* loading readout — fills through the hold so the dark screen
                  reads as working, not stuck */}
              <p ref={bootProgRef} className="mt-8 text-paper">
                [░░░░░░░░░░░░] 0%
              </p>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

/* DifferentThinkingBug.svg, inlined with currentColor so it inherits ink */
function BugMark({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 153 259" className={className} fill="currentColor" aria-hidden>
      <path d="M56.3932 123.748C56.3932 125.612 57.8783 127.123 59.7104 127.123H92.8829C94.7149 127.123 96.2001 125.612 96.2001 123.748V100.123C96.2001 98.2592 97.6853 96.7482 99.5173 96.7482H112.786C114.618 96.7482 116.104 98.2592 116.104 100.123V123.748C116.104 125.612 114.618 127.123 112.786 127.123H109.469C107.637 127.123 106.152 128.634 106.152 130.498V133.872C106.152 135.736 104.667 137.247 102.835 137.247H99.5173C97.6853 137.247 96.2001 138.758 96.2001 140.622V143.997C96.2001 145.861 94.7149 147.372 92.8829 147.372H89.5656C87.7336 147.372 86.2484 148.883 86.2484 150.747V174.372C86.2484 176.236 87.7336 177.747 89.5656 177.747H93.4357C94.9624 177.747 96.2001 179.006 96.2001 180.559V205.309C96.2001 206.862 94.9624 208.121 93.4357 208.121H89.5656C87.7336 208.121 86.2484 209.632 86.2484 211.496V245.245C86.2484 247.109 87.7336 248.62 89.5656 248.62H92.8829C94.7149 248.62 96.2001 250.131 96.2001 251.995V255.37C96.2001 257.234 94.7149 258.745 92.8829 258.745H59.7104C57.8783 258.745 56.3932 257.234 56.3932 255.37V251.995C56.3932 250.131 57.8783 248.62 59.7104 248.62H63.0277C64.8597 248.62 66.3449 247.109 66.3449 245.245V211.496C66.3449 209.632 64.8597 208.121 63.0277 208.121H59.1575C57.6308 208.121 56.3932 206.862 56.3932 205.309L56.3932 180.559C56.3932 179.006 57.6308 177.747 59.1575 177.747H63.0277C64.8597 177.747 66.3449 176.236 66.3449 174.372V150.747C66.3449 148.883 64.8597 147.372 63.0277 147.372H59.7104C57.8783 147.372 56.3932 145.861 56.3932 143.997V140.622C56.3932 138.758 54.908 137.247 53.0759 137.247H49.7587C47.9266 137.247 46.4414 135.736 46.4414 133.872V130.498C46.4414 128.634 44.9562 127.123 43.1242 127.123H39.8069C37.9749 127.123 36.4897 125.612 36.4897 123.748V100.123C36.4897 98.2592 37.9749 96.7482 39.8069 96.7482H53.0759C54.908 96.7482 56.3932 98.2592 56.3932 100.123V123.748Z" />
      <path d="M36.4897 143.997C36.4897 145.861 37.9749 147.372 39.8069 147.372H43.1242C44.9562 147.372 46.4414 148.883 46.4414 150.747V154.122C46.4414 155.986 47.9266 157.497 49.7587 157.497H53.0759C54.908 157.497 56.3932 159.008 56.3932 160.872V174.372C56.3932 176.236 54.908 177.747 53.0759 177.747H49.7587C47.9266 177.747 46.4414 179.258 46.4414 181.122L46.4414 204.746C46.4414 206.61 47.9266 208.121 49.7587 208.121H53.0759C54.908 208.121 56.3932 209.632 56.3932 211.496V245.808C56.3932 247.361 55.1555 248.62 53.6288 248.62H49.7587C47.9266 248.62 46.4414 247.109 46.4414 245.245V241.87C46.4414 240.006 44.9562 238.495 43.1242 238.495H39.8069C37.9749 238.495 36.4897 236.984 36.4897 235.121L36.4897 191.246C36.4897 189.382 35.0045 187.871 33.1724 187.871H29.8552C28.0231 187.871 26.538 186.36 26.538 184.497L26.538 150.747C26.538 148.883 25.0528 147.372 23.2207 147.372H21.5621C19.73 147.372 18.2448 148.883 18.2448 150.747L18.2448 162.559C18.2448 164.423 16.7597 165.934 14.9276 165.934H13.269C11.4369 165.934 9.95173 167.445 9.95173 169.309V170.997C9.95173 172.861 8.46655 174.372 6.63449 174.372H3.31724C1.48518 174.372 0 172.861 0 170.997L0 167.622C0 165.758 1.48518 164.247 3.31725 164.247H4.97587C6.80793 164.247 8.29311 162.736 8.29311 160.872V149.06C8.29311 147.196 9.77829 145.685 11.6104 145.685H13.269C15.101 145.685 16.5862 144.174 16.5862 142.31V140.622C16.5862 138.758 18.0714 137.247 19.9035 137.247H33.1724C35.0045 137.247 36.4897 138.758 36.4897 140.622V143.997Z" />
      <path d="M136.007 142.31C136.007 144.174 137.492 145.685 139.324 145.685H140.983C142.815 145.685 144.3 147.196 144.3 149.06V160.872C144.3 162.736 145.785 164.247 147.617 164.247H149.276C151.108 164.247 152.593 165.758 152.593 167.622V170.997C152.593 172.861 151.108 174.372 149.276 174.372H145.959C144.127 174.372 142.642 172.861 142.642 170.997V169.309C142.642 167.445 141.156 165.934 139.324 165.934H137.666C135.834 165.934 134.348 164.423 134.348 162.559V150.747C134.348 148.883 132.863 147.372 131.031 147.372H129.373C127.54 147.372 126.055 148.883 126.055 150.747V184.497C126.055 186.36 124.57 187.871 122.738 187.871H119.421C117.589 187.871 116.104 189.382 116.104 191.246V235.121C116.104 236.984 114.618 238.495 112.786 238.495H109.469C107.637 238.495 106.152 240.006 106.152 241.87V245.245C106.152 247.109 104.667 248.62 102.835 248.62H98.9645C97.4378 248.62 96.2001 247.361 96.2001 245.808V211.496C96.2001 209.632 97.6853 208.121 99.5173 208.121H102.835C104.667 208.121 106.152 206.61 106.152 204.746V181.122C106.152 179.258 104.667 177.747 102.835 177.747H99.5173C97.6853 177.747 96.2001 176.236 96.2001 174.372V160.872C96.2001 159.008 97.6853 157.497 99.5173 157.497H102.835C104.667 157.497 106.152 155.986 106.152 154.122V150.747C106.152 148.883 107.637 147.372 109.469 147.372H112.786C114.618 147.372 116.104 145.861 116.104 143.997V140.622C116.104 138.758 117.589 137.247 119.421 137.247H132.69C134.522 137.247 136.007 138.758 136.007 140.622V142.31Z" />
      <path d="M23.7736 187.871C25.3003 187.871 26.538 189.131 26.538 190.684L26.538 224.996C26.538 226.86 25.0528 228.371 23.2207 228.371H22.115C20.2829 228.371 18.7977 229.882 18.7977 231.746V232.871C18.7977 234.735 17.3125 236.246 15.4805 236.246H12.1632C10.3312 236.246 8.84599 234.735 8.84599 232.871V229.496C8.84599 227.632 10.3312 226.121 12.1632 226.121H13.269C15.101 226.121 16.5862 224.61 16.5862 222.746V191.246C16.5862 189.382 18.0714 187.871 19.9035 187.871H23.7736Z" />
      <path d="M133.243 187.871C134.769 187.871 136.007 189.131 136.007 190.684V222.746C136.007 224.61 137.492 226.121 139.324 226.121H140.43C142.262 226.121 143.747 227.632 143.747 229.496V232.871C143.747 234.735 142.262 236.246 140.43 236.246H137.113C135.281 236.246 133.796 234.735 133.796 232.871V231.746C133.796 229.882 132.31 228.371 130.478 228.371H129.373C127.54 228.371 126.055 226.86 126.055 224.996V190.684C126.055 189.131 127.293 187.871 128.82 187.871H133.243Z" />
      <path d="M9.95173 84.9359C9.95173 86.7998 11.4369 88.3108 13.269 88.3108H14.9276C16.7597 88.3108 18.2448 89.8218 18.2448 91.6858V93.3732C18.2448 95.2372 19.73 96.7482 21.5621 96.7482H23.2207C25.0528 96.7482 26.538 98.2592 26.538 100.123V113.623C26.538 115.487 25.0528 116.998 23.2207 116.998H19.9035C18.0714 116.998 16.5862 115.487 16.5862 113.623V101.811C16.5862 99.9466 15.101 98.4356 13.269 98.4356H11.6104C9.77829 98.4356 8.29311 96.9246 8.29311 95.0607V93.3732C8.29311 91.5093 6.80793 89.9983 4.97587 89.9983H3.31724C1.48518 89.9983 0 88.4873 0 86.6234L0 83.2484C0 81.3845 1.48518 79.8735 3.31725 79.8735H6.63449C8.46655 79.8735 9.95173 81.3845 9.95173 83.2484V84.9359Z" />
      <path d="M86.2484 113.623C86.2484 115.487 84.7632 116.998 82.9311 116.998H69.6621C67.8301 116.998 66.3449 115.487 66.3449 113.623V89.9983C66.3449 88.1344 67.8301 86.6234 69.6621 86.6234H82.9311C84.7632 86.6234 86.2484 88.1344 86.2484 89.9983V113.623Z" />
      <path d="M152.593 86.6234C152.593 88.4873 151.108 89.9983 149.276 89.9983H147.617C145.785 89.9983 144.3 91.5093 144.3 93.3732V95.0607C144.3 96.9246 142.815 98.4356 140.983 98.4356H139.324C137.492 98.4356 136.007 99.9466 136.007 101.811V113.623C136.007 115.487 134.522 116.998 132.69 116.998H129.373C127.54 116.998 126.055 115.487 126.055 113.623V100.123C126.055 98.2592 127.54 96.7482 129.373 96.7482H131.031C132.863 96.7482 134.348 95.2372 134.348 93.3732V91.6858C134.348 89.8218 135.834 88.3108 137.666 88.3108H139.324C141.156 88.3108 142.642 86.7998 142.642 84.9359V83.2484C142.642 81.3845 144.127 79.8735 145.959 79.8735H149.276C151.108 79.8735 152.593 81.3845 152.593 83.2484V86.6234Z" />
      <path d="M26.538 6.74987C26.538 8.6138 25.0528 10.1248 23.2207 10.1248H22.115C20.2829 10.1248 18.7977 11.6358 18.7977 13.4997V14.6247C18.7977 16.4886 20.2829 17.9997 22.115 17.9997L35.3839 17.9997C37.216 17.9997 38.7012 19.5107 38.7012 21.3746V24.7495C38.7012 26.6135 37.216 28.1245 35.3839 28.1245H32.0667C30.2346 28.1245 28.7495 29.6355 28.7495 31.4994L28.7495 52.874C28.7495 54.7379 30.2346 56.2489 32.0667 56.2489H43.1242C44.9562 56.2489 46.4414 57.7599 46.4414 59.6239V62.9988C46.4414 64.8627 47.9266 66.3737 49.7587 66.3737H53.0759C54.908 66.3737 56.3932 67.8848 56.3932 69.7487V83.2484C56.3932 85.1123 54.908 86.6234 53.0759 86.6234H49.7587C47.9266 86.6234 46.4414 85.1123 46.4414 83.2484V79.8735C46.4414 78.0096 44.9562 76.4986 43.1242 76.4986H39.8069C37.9749 76.4986 36.4897 74.9875 36.4897 73.1236V69.7487C36.4897 67.8848 35.0045 66.3737 33.1724 66.3737H29.8552C28.0231 66.3737 26.538 64.8627 26.538 62.9988V61.8738C26.538 60.0099 25.0528 58.4989 23.2207 58.4989H22.115C20.2829 58.4989 18.7977 56.9879 18.7977 55.124L18.7977 31.4994C18.7977 29.6355 17.3125 28.1245 15.4805 28.1245H12.1632C10.3312 28.1245 8.84599 26.6135 8.84599 24.7495L8.84599 11.2498C8.84599 9.38586 10.3312 7.87485 12.1632 7.87485H13.269C15.101 7.87485 16.5862 6.36384 16.5862 4.49991V3.37494C16.5862 1.51101 18.0714 0 19.9035 0L23.2207 0C25.0528 0 26.538 1.51101 26.538 3.37494V6.74987Z" />
      <path d="M136.007 4.49991C136.007 6.36384 137.492 7.87485 139.324 7.87485H140.43C142.262 7.87485 143.747 9.38586 143.747 11.2498V24.7495C143.747 26.6135 142.262 28.1245 140.43 28.1245H137.113C135.281 28.1245 133.796 29.6355 133.796 31.4994V55.124C133.796 56.9879 132.31 58.4989 130.478 58.4989H129.373C127.54 58.4989 126.055 60.0099 126.055 61.8738V62.9988C126.055 64.8627 124.57 66.3737 122.738 66.3737H119.421C117.589 66.3737 116.104 67.8848 116.104 69.7487V73.1236C116.104 74.9875 114.618 76.4986 112.786 76.4986H109.469C107.637 76.4986 106.152 78.0096 106.152 79.8735V83.2484C106.152 85.1123 104.667 86.6234 102.835 86.6234H99.5173C97.6853 86.6234 96.2001 85.1123 96.2001 83.2484V69.7487C96.2001 67.8848 97.6853 66.3737 99.5173 66.3737H102.835C104.667 66.3737 106.152 64.8627 106.152 62.9988V59.6239C106.152 57.7599 107.637 56.2489 109.469 56.2489H120.527C122.359 56.2489 123.844 54.7379 123.844 52.874V31.4994C123.844 29.6355 122.359 28.1245 120.527 28.1245H117.209C115.377 28.1245 113.892 26.6135 113.892 24.7495V21.3746C113.892 19.5107 115.377 17.9997 117.209 17.9997H130.478C132.31 17.9997 133.796 16.4886 133.796 14.6247V13.4997C133.796 11.6358 132.31 10.1248 130.478 10.1248H129.373C127.54 10.1248 126.055 8.6138 126.055 6.74987V3.37494C126.055 1.51101 127.54 0 129.373 0L132.69 0C134.522 0 136.007 1.51101 136.007 3.37494V4.49991Z" />
    </svg>
  );
}
