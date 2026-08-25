"use client";

/* A team portrait in the site's window language — filename header + ✕, drag
   anywhere on it to move, grab raises it above the others. The photo inside is
   still PixelPortrait, so it resolves out of hard pixels as it scrolls in.

   Scattered on md+ (absolute, placed by `left`/`top` against the section);
   stacked with its own person's text on mobile. */
import { useRef, useState } from "react";
import PixelPortrait from "./PixelPortrait";

/* module-level so grabbing any window raises it above every other one */
let zTop = 10;

export default function TeamWindow({
  label,
  photo,
  alt,
  w,
  h,
  left,
  top,
  width,
}: {
  label: string;
  photo: string;
  alt: string;
  /* the source photo's pixel dimensions — drives the canvas and the box ratio */
  w: number;
  h: number;
  left: string;
  top: string;
  width: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const pos = useRef({ x: 0, y: 0 });
  const start = useRef<{ px: number; py: number; x: number; y: number } | null>(null);
  const [open, setOpen] = useState(true);

  if (!open) return null;

  return (
    <div
      ref={ref}
      className="relative mb-6 w-full cursor-grab touch-none select-none bg-paper shadow-[0_10px_44px_rgba(0,0,0,0.08)] md:absolute md:left-[var(--bl)] md:top-[var(--bt)] md:mb-0 md:w-[var(--bw)]"
      /* left/top are applied only from md+ — a relatively-positioned element
         honours them too, which would shove the stacked mobile layout sideways */
      style={{ "--bl": left, "--bt": top, "--bw": width } as React.CSSProperties}
      onPointerDown={(e) => {
        if ((e.target as HTMLElement).closest("[data-close]")) return;
        if (getComputedStyle(e.currentTarget).position !== "absolute") return; // scattered layout only
        start.current = { px: e.clientX, py: e.clientY, x: pos.current.x, y: pos.current.y };
        e.currentTarget.setPointerCapture(e.pointerId);
        e.currentTarget.style.zIndex = String(++zTop);
        e.currentTarget.style.cursor = "grabbing";
        e.preventDefault();
      }}
      onPointerMove={(e) => {
        if (!start.current || !ref.current) return;
        pos.current.x = start.current.x + (e.clientX - start.current.px);
        pos.current.y = start.current.y + (e.clientY - start.current.py);
        ref.current.style.transform = `translate3d(${pos.current.x}px, ${pos.current.y}px, 0)`;
      }}
      onPointerUp={(e) => {
        start.current = null;
        e.currentTarget.style.cursor = "";
      }}
      onPointerCancel={(e) => {
        start.current = null;
        e.currentTarget.style.cursor = "";
      }}
    >
      <div className="flex items-center justify-between px-3 py-2">
        <span className="font-sans text-[8px] tracking-[0.01em] text-[#6E6E6E]">{label}</span>
        <button
          type="button"
          data-close
          aria-label={`Close ${label}`}
          onClick={() => setOpen(false)}
          className="cursor-pointer px-1 text-[11px] leading-none text-[#6E6E6E] hover:text-ink"
        >
          ✕
        </button>
      </div>
      <PixelPortrait src={photo} alt={alt} width={w} height={h} />
    </div>
  );
}
