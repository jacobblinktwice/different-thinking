"use client";

/* Team portrait that starts heavily PIXELATED and resolves as it scrolls into
   view: the source is drawn tiny and upscaled with smoothing off, and the
   pixel size shrinks with scroll progress (24px blocks → sharp). Redraws only
   on scroll ticks while near the viewport — no persistent loop.

   `src` is the portrait photo, cover-fitted into the 5:6 canvas. Without one
   the source falls back to a procedurally-drawn head-and-shoulders
   silhouette. */
import { useEffect, useRef } from "react";

/* blocks across the portrait at full pixelation, whatever the source size */
const BLOCKS = 24;

function drawSilhouette(ctx: CanvasRenderingContext2D, W: number, H: number) {
  ctx.fillStyle = "#d8d8d4";
  ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = "#3c3c3a";
  // head
  ctx.beginPath();
  ctx.ellipse(W / 2, H * 0.34, W * 0.17, H * 0.17, 0, 0, Math.PI * 2);
  ctx.fill();
  // neck + shoulders
  ctx.fillRect(W * 0.42, H * 0.46, W * 0.16, H * 0.1);
  ctx.beginPath();
  ctx.ellipse(W / 2, H * 0.86, W * 0.34, H * 0.32, 0, Math.PI, 0);
  ctx.fill();
  ctx.fillRect(W * 0.16, H * 0.86, W * 0.68, H * 0.14);
}

/* `width`/`height` are the canvas buffer in pixels — pass the source photo's own
   dimensions to keep the portrait at its native ratio. */
export default function PixelPortrait({
  src,
  alt,
  width = 320,
  height = 384,
}: {
  src?: string;
  alt?: string;
  width?: number;
  height?: number;
}) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const W = width;
    const H = height;
    const canvas = ref.current;
    if (!canvas) return;
    canvas.width = W;
    canvas.height = H;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // source buffer: photo if provided, silhouette placeholder otherwise
    const buf = document.createElement("canvas");
    buf.width = W;
    buf.height = H;
    const bctx = buf.getContext("2d")!;
    let ready = false;
    if (src) {
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.onload = () => {
        const s = Math.max(W / img.width, H / img.height);
        bctx.drawImage(img, (W - img.width * s) / 2, (H - img.height * s) / 2, img.width * s, img.height * s);
        ready = true;
        paint();
      };
      img.src = src;
    } else {
      drawSilhouette(bctx, W, H);
      ready = true;
    }

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let lastPx = -1;
    const paint = () => {
      if (!ready) return;
      const r = canvas.getBoundingClientRect();
      const vh = window.innerHeight;
      /* progress: 0 while the portrait is still below the fold → 1 by the time
         it nears the top of the viewport. Runs over 1.1vh of scroll, so the
         resolve spans most of the portrait's time on screen while still
         finishing before it leaves. */
      const t = reduced ? 1 : Math.min(1, Math.max(0, (vh * 1.25 - r.top) / (vh * 1.1)));
      /* Block COUNT is fixed, not block size: a flat 24px block spans a quarter
         as much of a 1076px source as of a 536px one, so two portraits shot at
         different resolutions pixelated to visibly different coarseness.
         Scaling the block to the buffer makes them match. Stepped, so the
         resolve reads as discrete jumps.

         The 1.3 exponent (was 1.6) keeps the blocks large further into the
         scroll instead of collapsing early, so the effect reads for longer
         rather than only travelling for longer. */
      const px = Math.max(1, Math.round((W / BLOCKS) * (1 - t) ** 1.3));
      if (px === lastPx) return;
      lastPx = px;
      const w = Math.max(1, Math.round(W / px));
      const h = Math.max(1, Math.round(H / px));
      ctx.imageSmoothingEnabled = true;
      ctx.clearRect(0, 0, W, H);
      // downscale…
      ctx.drawImage(buf, 0, 0, w, h);
      // …then upscale the tiny copy with smoothing OFF = hard pixels
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(canvas, 0, 0, w, h, 0, 0, W, H);
    };

    let ticking = false;
    const onScroll = () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        ticking = false;
        paint();
      });
    };
    paint();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, [src, width, height]);

  return (
    <canvas
      ref={ref}
      role="img"
      aria-label={alt ? `Portrait of ${alt}` : undefined}
      aria-hidden={alt ? undefined : true}
      className="block h-auto w-full"
      style={{ imageRendering: "pixelated" }}
    />
  );
}
