"use client";

/* Reusable, prop-driven glitch effect. Single source of truth for both /lab and the homepage.
   Pass a `config` (array of boxes) to drive it; omit to use the baked default composition. */
import { useEffect, useRef, type CSSProperties } from "react";
import { GlitchEngine, type GlitchMode } from "./engine";
import { defaultBoxes, defaultLayer, defaultFrontLayer, type BoxConfig, type LayerConfig, type FrontLayerConfig } from "./config";

export interface GlitchProps {
  /** Box composition to render. Defaults to the baked-in tuned config. */
  config?: BoxConfig[];
  /** In "landing" mode, the whole-layer duplicate behind the boxes. Defaults to the baked layer.
      Pass `null` to disable the duplicate. Ignored in "grid" mode. */
  layer?: LayerConfig | null;
  /** In "landing" mode, a group slice + pixel-stretch over the FRONT boxes. Ignored in "grid" mode. */
  frontLayer?: FrontLayerConfig | null;
  /** "landing" (default) draws the duplicated layer behind; "grid" renders boxes only. */
  mode?: GlitchMode;
  /** Animate the effect (metal drift, slice/glitch movement). Default true. */
  running?: boolean;
  /** Canvas clear colour as 0..1 RGB. Defaults to paper. */
  background?: [number, number, number];
  /** Increment this counter to fire a short glitch-intensity spike (decays over ~1s).
      Used by the homepage power-on/off toggle. */
  burst?: number;
  /** Appear/disappear: when provided, each box and layer grows from (or shrinks to)
      its own centre with a fast-out/slow-settle ease. Mounting with shown=true plays
      the grow-in; omit the prop to render at full size immediately (the /lab). */
  shown?: boolean;
  /** Increment this counter to play the intro sweep: a decaying oscillation on the
      global drive (the same value mouse position feeds), hinting that the effect
      reacts to movement. Fired on power-on only. */
  intro?: number;
  className?: string;
  style?: CSSProperties;
}

export function Glitch({
  config,
  layer,
  frontLayer,
  mode = "landing",
  running = true,
  background,
  burst,
  intro,
  shown,
  className,
  style,
}: GlitchProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<GlitchEngine | null>(null);
  const burstRef = useRef(0); // 1 → 0 decaying spike, multiplies the global intensity
  const burstSeen = useRef(burst);
  const introTRef = useRef(Infinity); // seconds since the intro sweep started
  const introSeen = useRef(intro);
  const shownRef = useRef(shown ?? true);
  const appearRef = useRef(shown === undefined ? 1 : 0); // linear 0..1, eased per box in the engine
  shownRef.current = shown ?? true;

  // live refs so the rAF loop always reads current props without re-initialising GL
  const cfgRef = useRef<BoxConfig[]>(config ?? defaultBoxes());
  const layerRef = useRef<LayerConfig | null>(layer === undefined ? defaultLayer() : layer);
  const frontRef = useRef<FrontLayerConfig | null>(frontLayer === undefined ? defaultFrontLayer() : frontLayer);
  const modeRef = useRef<GlitchMode>(mode);
  const runRef = useRef<boolean>(running);
  if (config) cfgRef.current = config;
  if (layer !== undefined) layerRef.current = layer;
  if (frontLayer !== undefined) frontRef.current = frontLayer;
  modeRef.current = mode;
  runRef.current = running;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    let engine: GlitchEngine;
    try {
      engine = new GlitchEngine(canvas);
    } catch (err) {
      console.error("[glitch] WebGL init failed:", err);
      return;
    }
    engineRef.current = engine;
    if (background) engine.bg = background;

    // Two ways to drive the global glitch-intensity multiplier (chosen per composition):
    //  • "position" — cursor distance from the canvas centre (0 centre → 1 corner), smoothed. Steady.
    //  • "velocity" — pointer speed + scroll spike an energy value that decays each frame.
    let energy = 0; // velocity driver
    const pos = { x: 0.5, y: 0.5 }; // normalized cursor within canvas
    let havePointer = false;
    let posSmooth = 0; // smoothed position driver (0..1)
    const onMove = (e: PointerEvent) => {
      const r = canvas.getBoundingClientRect();
      if (r.width > 0 && r.height > 0) {
        pos.x = (e.clientX - r.left) / r.width;
        pos.y = (e.clientY - r.top) / r.height;
        havePointer = true;
      }
      const speed = Math.hypot(e.movementX || 0, e.movementY || 0);
      energy += Math.min(0.6, speed / 45);
    };
    const onWheel = (e: WheelEvent) => {
      energy += Math.min(0.8, Math.abs(e.deltaY) / 140);
    };
    const onLeave = () => {
      havePointer = false; // ease back to calm when the cursor leaves
    };
    window.addEventListener("pointermove", onMove, { passive: true });
    window.addEventListener("wheel", onWheel, { passive: true });
    window.addEventListener("pointerleave", onLeave);
    window.addEventListener("blur", onLeave);

    let raf = 0;
    let elapsed = 0;
    let tPrev = 0;
    let disposed = false;
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const loop = (now: number) => {
      if (disposed) return;
      now /= 1000;
      if (!tPrev) tPrev = now;
      const dt = Math.min(now - tPrev, 0.05);
      tPrev = now;
      if (runRef.current) elapsed += dt;
      // velocity driver: decay toward rest
      energy *= 0.92;
      if (energy > 1) energy = 1;
      // position driver: radial distance from centre (0..1), smoothed toward the target
      let posTarget = 0;
      if (havePointer) {
        const dx = (pos.x - 0.5) * 2;
        const dy = (pos.y - 0.5) * 2;
        posTarget = Math.min(1, Math.hypot(dx, dy) / Math.SQRT2);
      }
      posSmooth += (posTarget - posSmooth) * 0.08;
      const layerNow = layerRef.current;
      const react = (layerNow?.reactivity ?? 50) / 100;
      let drive = layerNow?.reactMode === "velocity" ? energy : posSmooth;
      // intro sweep: decaying oscillation on the drive (~3 pulses over ~6s) so the
      // fresh effect moves on its own and invites mouse interaction to take over
      if (introTRef.current < 12) {
        introTRef.current += dt;
        const t = introTRef.current;
        const sweep = Math.exp(-t * 0.35) * (0.55 + 0.45 * Math.cos(t * 2.4));
        if (sweep > drive) drive = sweep;
      }
      burstRef.current *= Math.exp(-dt * 3.5); // toggle spike, ~gone in a second
      const mul = (1 + drive * (0.4 + react * 2.4)) * (1 + burstRef.current * 3);
      // appear/disappear: linear progress toward shown, eased per box in the engine
      const appearTarget = shownRef.current ? 1 : 0;
      if (appearRef.current !== appearTarget) {
        if (reducedMotion) {
          appearRef.current = appearTarget;
        } else if (appearTarget === 1) {
          appearRef.current = Math.min(1, appearRef.current + dt / 0.55);
        } else {
          appearRef.current = Math.max(0, appearRef.current - dt / 0.35);
        }
      }
      engine.resize();
      engine.render(cfgRef.current, modeRef.current, elapsed, layerNow, mul, frontRef.current, appearRef.current, shownRef.current);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);

    return () => {
      disposed = true;
      cancelAnimationFrame(raf);
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("wheel", onWheel);
      window.removeEventListener("pointerleave", onLeave);
      window.removeEventListener("blur", onLeave);
      engine.dispose();
      engineRef.current = null;
    };
    // init once; props are read live via refs
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (engineRef.current && background) engineRef.current.bg = background;
  }, [background]);

  useEffect(() => {
    if (burst !== undefined && burst !== burstSeen.current) {
      burstSeen.current = burst;
      burstRef.current = 1;
    }
  }, [burst]);

  useEffect(() => {
    if (intro !== undefined && intro !== introSeen.current) {
      introSeen.current = intro;
      introTRef.current = 0;
    }
  }, [intro]);

  return (
    <canvas
      ref={canvasRef}
      className={className}
      style={{ display: "block", width: "100%", height: "100%", ...style }}
    />
  );
}

export default Glitch;
