"use client";

/* Eventually — the centre stack of draggable artefact windows (placeholders
   until the campaign assets land). Same window language as the homepage:
   filename header + ✕, drag anywhere, grab raises. Scattered down a tall
   centre band on md+; stacked and static on mobile. */
import { useEffect, useRef } from "react";

const BOXES: { name: string; left: string; top: string; w: string; ratio: string }[] = [
  { name: "eventually-campaign-hero.png", left: "6%", top: "0%", w: "clamp(300px,38vw,600px)", ratio: "4 / 5" },
  { name: "eventually-mark.svg", left: "32%", top: "26%", w: "clamp(240px,27vw,440px)", ratio: "1 / 1" },
  { name: "eventually-ooh-poster.png", left: "62%", top: "32%", w: "clamp(240px,26vw,420px)", ratio: "3 / 4" },
  { name: "eventually-app-preview.png", left: "10%", top: "50%", w: "clamp(200px,21vw,340px)", ratio: "2 / 3" },
  { name: "eve-packaging.png", left: "38%", top: "66%", w: "clamp(220px,24vw,400px)", ratio: "4 / 5" },
];

export default function EventuallyBoxes() {
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const wrap = wrapRef.current;
    if (!wrap) return;
    const boxes = Array.from(wrap.querySelectorAll<HTMLElement>("[data-dragbox]"));
    let zTop = 10;
    const cleanups: (() => void)[] = [];

    for (const box of boxes) {
      const pos = { x: 0, y: 0 };
      let start: { px: number; py: number; x: number; y: number } | null = null;

      const onDown = (e: PointerEvent) => {
        if ((e.target as HTMLElement).closest("[data-close]")) return;
        if (getComputedStyle(box).position !== "absolute") return; // scattered layout only
        start = { px: e.clientX, py: e.clientY, x: pos.x, y: pos.y };
        box.style.zIndex = String(++zTop);
        box.setPointerCapture(e.pointerId);
        box.style.cursor = "grabbing";
        e.preventDefault();
      };
      const onMove = (e: PointerEvent) => {
        if (!start) return;
        pos.x = start.x + (e.clientX - start.px);
        pos.y = start.y + (e.clientY - start.py);
        box.style.transform = `translate3d(${pos.x}px, ${pos.y}px, 0)`;
      };
      const onUp = () => {
        start = null;
        box.style.cursor = "";
      };
      box.addEventListener("pointerdown", onDown);
      box.addEventListener("pointermove", onMove);
      box.addEventListener("pointerup", onUp);
      box.addEventListener("pointercancel", onUp);
      cleanups.push(() => {
        box.removeEventListener("pointerdown", onDown);
        box.removeEventListener("pointermove", onMove);
        box.removeEventListener("pointerup", onUp);
        box.removeEventListener("pointercancel", onUp);
      });
    }
    return () => cleanups.forEach((fn) => fn());
  }, []);

  return (
    <section className="relative mx-[var(--gutter)] mb-[clamp(40px,5vw,72px)] md:h-[230vh]">
      <div ref={wrapRef} className="relative h-full">
        {BOXES.map((b, i) => (
          <div
            key={b.name}
            data-dragbox
            className="relative mb-6 w-full cursor-grab touch-none select-none bg-paper shadow-[0_10px_44px_rgba(0,0,0,0.08)] md:absolute md:mb-0 md:w-[var(--bw)]"
            /* left/top only take effect in the md+ absolute layout */
            style={{ left: b.left, top: b.top, "--bw": b.w } as React.CSSProperties}
          >
            <div className="flex items-center justify-between px-3 py-2">
              <span className="font-sans text-[8px] tracking-[0.01em] text-[#6E6E6E]">{b.name}</span>
              <button
                type="button"
                data-close
                aria-label={`Close ${b.name}`}
                onClick={(e) => {
                  (e.currentTarget.closest("[data-dragbox]") as HTMLElement).style.display = "none";
                }}
                className="cursor-pointer px-1 text-[11px] leading-none text-[#6E6E6E] hover:text-ink"
              >
                ✕
              </button>
            </div>
            <div className="relative w-full bg-[#ececea]" style={{ aspectRatio: b.ratio }}>
              <span className="absolute bottom-3 left-3 font-sans text-[8px] tracking-[0.01em] text-[#B2B2B2]">
                [ PLACEHOLDER :: IMG_0{i + 1} ]
              </span>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
