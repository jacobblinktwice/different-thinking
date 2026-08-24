"use client";

/* Three draggable image "windows" scattered on the grid (finder-style: filename
   header + close button, image below). Drag anywhere on a window to move it;
   pointerdown brings it to the front; × closes it. Images are placeholders
   until the real assets land. Scattered layout on md+; stacked and static on
   mobile (drag needs room). */
import { useEffect, useRef } from "react";

const BOXES: { name: string; left: string; top: string; w: string; ratio: string }[] = [
  { name: "the-activator.jpg", left: "2%", top: "4%", w: "clamp(280px,36vw,540px)", ratio: "5 / 6" },
  { name: "OOH_final_final.png", left: "52%", top: "16%", w: "clamp(260px,34vw,500px)", ratio: "3 / 4" },
  { name: "arvo-keychain-ebd6337534b054fbe8.png", left: "14%", top: "56%", w: "clamp(220px,28vw,420px)", ratio: "2 / 3" },
];

export default function DragBoxes() {
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
        // only drag in the scattered (md+) layout
        if (getComputedStyle(box).position !== "absolute") return;
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
    <section className="relative mx-[var(--gutter)] mb-[clamp(40px,5vw,72px)] md:h-[150vh]">
      <div ref={wrapRef} className="relative h-full">
        {BOXES.map((b, i) => (
          <div
            key={b.name}
            data-dragbox
            className="relative mb-6 w-full cursor-grab touch-none select-none bg-paper shadow-[0_10px_44px_rgba(0,0,0,0.08)] md:absolute md:mb-0 md:w-[var(--bw)]"
            /* left/top only take effect in the md+ absolute layout */
            style={{ left: b.left, top: b.top, "--bw": b.w } as React.CSSProperties}
          >
            {/* window chrome: filename + close */}
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
            {/* image placeholder until the real assets land */}
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
