"use client";

/* Reusable, prop-driven glitch effect. Single source of truth for both /lab and the homepage.
   Pass a `config` (array of boxes) to drive it; omit to use the baked default composition. */
import { useEffect, useRef, type CSSProperties } from "react";
import { GlitchEngine, type GlitchMode } from "./engine";
import { defaultBoxes, defaultLayer, type BoxConfig, type LayerConfig } from "./config";

export interface GlitchProps {
  /** Box composition to render. Defaults to the baked-in tuned config. */
  config?: BoxConfig[];
  /** In "landing" mode, the whole-layer duplicate behind the boxes. Defaults to the baked layer.
      Pass `null` to disable the duplicate. Ignored in "grid" mode. */
  layer?: LayerConfig | null;
  /** "landing" (default) draws the duplicated layer behind; "grid" renders boxes only. */
  mode?: GlitchMode;
  /** Animate the effect (metal drift, slice/glitch movement). Default true. */
  running?: boolean;
  /** Canvas clear colour as 0..1 RGB. Defaults to paper. */
  background?: [number, number, number];
  className?: string;
  style?: CSSProperties;
}

export function Glitch({
  config,
  layer,
  mode = "landing",
  running = true,
  background,
  className,
  style,
}: GlitchProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<GlitchEngine | null>(null);

  // live refs so the rAF loop always reads current props without re-initialising GL
  const cfgRef = useRef<BoxConfig[]>(config ?? defaultBoxes());
  const layerRef = useRef<LayerConfig | null>(layer === undefined ? defaultLayer() : layer);
  const modeRef = useRef<GlitchMode>(mode);
  const runRef = useRef<boolean>(running);
  if (config) cfgRef.current = config;
  if (layer !== undefined) layerRef.current = layer;
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

    // mouse parallax: track a smoothed pointer offset (-1..1 from canvas centre)
    const mouse = { x: 0, y: 0 };
    const target = { x: 0, y: 0 };
    const onMove = (e: PointerEvent) => {
      const r = canvas.getBoundingClientRect();
      if (r.width === 0 || r.height === 0) return;
      target.x = ((e.clientX - r.left) / r.width) * 2 - 1;
      target.y = ((e.clientY - r.top) / r.height) * 2 - 1;
    };
    const onLeave = () => {
      target.x = 0;
      target.y = 0;
    };
    window.addEventListener("pointermove", onMove, { passive: true });
    window.addEventListener("pointerleave", onLeave);

    let raf = 0;
    let elapsed = 0;
    let tPrev = 0;
    let disposed = false;

    const loop = (now: number) => {
      if (disposed) return;
      now /= 1000;
      if (!tPrev) tPrev = now;
      const dt = Math.min(now - tPrev, 0.05);
      tPrev = now;
      if (runRef.current) elapsed += dt;
      mouse.x += (target.x - mouse.x) * 0.08;
      mouse.y += (target.y - mouse.y) * 0.08;
      engine.resize();
      engine.render(cfgRef.current, modeRef.current, elapsed, layerRef.current, mouse);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);

    return () => {
      disposed = true;
      cancelAnimationFrame(raf);
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerleave", onLeave);
      engine.dispose();
      engineRef.current = null;
    };
    // init once; props are read live via refs
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (engineRef.current && background) engineRef.current.bg = background;
  }, [background]);

  return (
    <canvas
      ref={canvasRef}
      className={className}
      style={{ display: "block", width: "100%", height: "100%", ...style }}
    />
  );
}

export default Glitch;
