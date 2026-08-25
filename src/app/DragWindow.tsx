"use client";

/* The site's window language, shared by every panel that uses it: a chrome bar
   carrying a filename (and optionally a right-hand note or a ✕), the content
   below, a soft drop shadow. Grabbing a window raises it above the others.

   `handle` picks what you drag by. Artefact windows are "window" — grab them
   anywhere and throw them around — and only drag in the md+ scattered layout,
   where they are absolutely positioned; stacked on mobile they stay put.
   Panels being typed into are "header", so dragging never fights selecting or
   editing the text inside them.

   Placement comes in as CSS variables and is applied from md+ only. Setting
   left/top inline would also offset the stacked mobile layout, since a
   relatively-positioned element honours them too. */
import { useRef, useState, type PointerEvent as ReactPointerEvent, type ReactNode } from "react";

/* module-level: one rising stack shared by every window on the page */
let zTop = 10;
export const nextZ = () => ++zTop;

export default function DragWindow({
  label,
  meta,
  closable = false,
  onClose,
  handle = "window",
  left,
  top,
  width,
  z,
  className = "",
  children,
}: {
  label: string;
  meta?: string;
  closable?: boolean;
  onClose?: () => void;
  handle?: "window" | "header";
  left?: string;
  top?: string;
  width?: string;
  z?: number;
  className?: string;
  children: ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const pos = useRef({ x: 0, y: 0 });
  const start = useRef<{ px: number; py: number; x: number; y: number } | null>(null);
  const [open, setOpen] = useState(true);

  if (!open) return null;

  const onPointerDown = (e: ReactPointerEvent<HTMLElement>) => {
    if ((e.target as HTMLElement).closest("[data-close]")) return;
    const el = ref.current;
    if (!el) return;
    // artefact windows only drag where they are scattered, not stacked
    if (handle === "window" && getComputedStyle(el).position !== "absolute") return;
    start.current = { px: e.clientX, py: e.clientY, x: pos.current.x, y: pos.current.y };
    e.currentTarget.setPointerCapture(e.pointerId);
    el.style.zIndex = String(nextZ());
    e.currentTarget.style.cursor = "grabbing";
    e.preventDefault();
  };

  const onPointerMove = (e: ReactPointerEvent<HTMLElement>) => {
    if (!start.current || !ref.current) return;
    pos.current.x = start.current.x + (e.clientX - start.current.px);
    pos.current.y = start.current.y + (e.clientY - start.current.py);
    ref.current.style.transform = `translate3d(${pos.current.x}px, ${pos.current.y}px, 0)`;
  };

  const release = (e: ReactPointerEvent<HTMLElement>) => {
    start.current = null;
    e.currentTarget.style.cursor = "";
  };

  const dragProps = { onPointerDown, onPointerMove, onPointerUp: release, onPointerCancel: release };
  const placed = left !== undefined || top !== undefined;
  const byWindow = handle === "window";
  /* touch-none and select-none belong to whatever you actually drag. On the
     whole window they would block touch-scrolling over the panel and stop the
     visitor selecting the text inside it — fine for an artefact, wrong for a
     form. */
  const grab = "cursor-grab touch-none select-none";

  return (
    <div
      ref={ref}
      className={`relative w-full bg-paper shadow-[0_10px_44px_rgba(0,0,0,0.08)] ${byWindow ? grab : ""} ${
        placed ? "mb-6 md:absolute md:left-[var(--bl)] md:top-[var(--bt)] md:mb-0 md:w-[var(--bw)]" : ""
      } ${className}`}
      style={{ "--bl": left, "--bt": top, "--bw": width, zIndex: z } as React.CSSProperties}
      {...(byWindow ? dragProps : {})}
    >
      <div
        className={`flex items-center justify-between px-3 py-2 ${byWindow ? "" : grab}`}
        {...(byWindow ? {} : dragProps)}
      >
        <span className="font-sans text-[8px] tracking-[0.01em] text-[#6E6E6E]">{label}</span>
        {meta ? <span className="font-sans text-[8px] tracking-[0.01em] text-[#B2B2B2]">{meta}</span> : null}
        {closable ? (
          <button
            type="button"
            data-close
            aria-label={`Close ${label}`}
            onClick={() => (onClose ? onClose() : setOpen(false))}
            className="cursor-pointer px-1 text-[11px] leading-none text-[#6E6E6E] hover:text-ink"
          >
            ✕
          </button>
        ) : null}
      </div>
      {children}
    </div>
  );
}
