"use client";

/* Three draggable image "windows" scattered on the grid (finder-style: filename
   header + close button, image below), plus a large [ Click ] text button
   sitting BEHIND them that spawns endless new popups — spam it and they
   cascade diagonally like a glitchy pile of OS dialogs. Drag anywhere on a
   window to move it; pointerdown brings it to the front; ✕ closes it.
   Scattered layout on md+; the base three stack statically on mobile. */
import Image from "next/image";
import { useRef, useState } from "react";

type Win = {
  id: number;
  name: string;
  left: string;
  top: string;
  w: string;
  ratio: string;
  label: string;
  z: number;
  /* real artefact; spawned popups stay empty placeholders */
  src?: string;
  alt?: string;
  spawned?: boolean;
};

/* `name` is the window chrome's filename (part of the design language) and is
   deliberately not the asset path. `ratio` matches each source's native aspect
   so object-cover never crops. */
const BASE: Omit<Win, "z">[] = [
  { id: 0, name: "the-activator.jpg", left: "2%", top: "4%", w: "clamp(280px,36vw,540px)", ratio: "489 / 577", label: "IMG_01", src: "/images/home/activator.png", alt: "The activator — soft teal orb form" },
  { id: 1, name: "OOH_final_final.png", left: "52%", top: "16%", w: "clamp(260px,34vw,500px)", ratio: "463 / 576", label: "IMG_02", src: "/images/home/ooh-poster.png", alt: "Eventually poster pasted on a concrete wall" },
  { id: 2, name: "arvo-keychain-ebd6337534b054fbe8.png", left: "14%", top: "56%", w: "clamp(220px,28vw,420px)", ratio: "392 / 576", label: "IMG_03", src: "/images/home/keychain.png", alt: "Hand holding the Eventually keychain" },
];

/* glitchy OS-pile filenames for spawned popups */
const SPAWN_NAMES = [
  (n: number) => `untitled(${n}).png`,
  (n: number) => `err_0x${(n * 2654435761 % 0xfff).toString(16).toUpperCase().padStart(3, "0")}.tmp`,
  (n: number) => `bug_report_${String(n).padStart(3, "0")}.txt`,
  (n: number) => `final_final_v${n}.psd`,
  (n: number) => `new_folder(${n})`,
  (n: number) => `crash_dump_${String(n).padStart(2, "0")}.log`,
  (n: number) => `DO_NOT_OPEN(${n}).zip`,
  (n: number) => `asset_export_${n}.jpg`,
];
const SPAWN_W = [220, 260, 300, 200, 340];
const SPAWN_RATIOS = ["4 / 5", "1 / 1", "3 / 4", "16 / 10", "2 / 3"];

export default function DragBoxes() {
  const zTop = useRef(10);
  const count = useRef(0);
  const [wins, setWins] = useState<Win[]>(() => BASE.map((b, i) => ({ ...b, z: i + 1 })));

  const spawn = () => {
    const n = ++count.current;
    const i = n - 1;
    // Windows-dialog cascade: each popup steps down-right from the last,
    // wrapping so the pile keeps building; a little jitter keeps it glitchy
    const left = 16 + ((i * 4.2) % 52) + Math.random() * 3;
    const top = 6 + ((i * 5.5) % 62) + Math.random() * 3;
    setWins((w) => [
      ...w,
      {
        id: 100 + n,
        name: SPAWN_NAMES[i % SPAWN_NAMES.length](n),
        left: `${left.toFixed(1)}%`,
        top: `${top.toFixed(1)}%`,
        w: `${SPAWN_W[i % SPAWN_W.length]}px`,
        ratio: SPAWN_RATIOS[i % SPAWN_RATIOS.length],
        label: `POPUP_${String(n).padStart(2, "0")}`,
        z: ++zTop.current,
        spawned: true,
      },
    ]);
  };

  return (
    <section className="relative z-[1] mx-[var(--gutter)] mb-[clamp(40px,5vw,72px)] md:h-[150vh]">
      {/* long code-dialect fragments down the 4th column — pure texture, the
          windows drag right over them */}
      <div
        aria-hidden
        className="pointer-events-none absolute bottom-0 left-[60%] top-0 z-0 hidden w-[18%] select-none flex-col justify-between gap-8 md:flex"
      >
        {[
          "TRY {\n  HYPERFOCUS();\n} CATCH (HOURS) {\n  RETURN BREAKTHROUGHS;\n}",
          'IF (MIND !== TEMPLATE) {\n  // NOT A BROKEN BRAIN\n  THROW "THE SYSTEM, NOT THE BRAIN";\n}',
          "REFUSE({\n  GUILT_MECHANICS: NULL,\n  BROKEN_STREAKS: NULL,\n  SHAME: NULL,\n});",
          "WHILE (DEBUGGING_YOURSELF) {\n  // YOUR BEST YEARS ON THE WRONG BUG\n  BREAK;\n}\nSHIP_SOMETHING();",
          "CONST GROUP = [SCANNER,\n  OBSESSIVE, DREAMER];\n// RAN UNEXPECTED_BEHAVIOUR\n// SURVIVED TOGETHER",
        ].map((t, i) => (
          <pre key={i} className="font-sans text-[8px] leading-[1.7] tracking-[0.01em] text-[#B2B2B2]">
            {t}
          </pre>
        ))}
      </div>

      {/* the spawner — large text button centred ON TOP of the windows */}
      <div className="pointer-events-none absolute inset-0 z-[500] hidden items-center justify-center md:flex">
        <button
          type="button"
          onClick={spawn}
          className="pointer-events-auto cursor-pointer [font-family:Exposure,var(--font-sans)] text-[clamp(56px,7.5vw,128px)] leading-none tracking-[-0.1em] text-ink transition-colors duration-150 ease-[var(--ease-snap)] hover:text-blue active:scale-[0.98]"
          title="Spawn a popup"
        >
          [ Click ]
        </button>
      </div>

      <div className="pointer-events-none relative z-[1] h-full">
        {wins.map((b) => (
          <DragWin key={b.id} box={b} zTop={zTop} onClose={() => setWins((w) => w.filter((x) => x.id !== b.id))} />
        ))}
      </div>
    </section>
  );
}

function DragWin({ box, zTop, onClose }: { box: Win; zTop: React.MutableRefObject<number>; onClose: () => void }) {
  const ref = useRef<HTMLDivElement>(null);
  const pos = useRef({ x: 0, y: 0 });
  const start = useRef<{ px: number; py: number; x: number; y: number } | null>(null);

  return (
    <div
      ref={ref}
      className={`pointer-events-auto relative mb-6 w-full cursor-grab touch-none select-none bg-paper shadow-[0_10px_44px_rgba(0,0,0,0.08)] md:absolute md:left-[var(--bl)] md:top-[var(--bt)] md:mb-0 md:w-[var(--bw)] ${
        box.spawned ? "max-md:hidden" : ""
      }`}
      /* left/top are applied only from md+ — a relatively-positioned element
         honours them too, which would shove the stacked mobile layout sideways */
      style={{ zIndex: box.z, "--bl": box.left, "--bt": box.top, "--bw": box.w } as React.CSSProperties}
      onPointerDown={(e) => {
        if ((e.target as HTMLElement).closest("[data-close]")) return;
        if (getComputedStyle(e.currentTarget).position !== "absolute") return; // scattered layout only
        start.current = { px: e.clientX, py: e.clientY, x: pos.current.x, y: pos.current.y };
        e.currentTarget.setPointerCapture(e.pointerId);
        e.currentTarget.style.zIndex = String(++zTop.current);
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
        <span className="font-sans text-[8px] tracking-[0.01em] text-[#6E6E6E]">{box.name}</span>
        <button
          type="button"
          data-close
          aria-label={`Close ${box.name}`}
          onClick={onClose}
          className="cursor-pointer px-1 text-[11px] leading-none text-[#6E6E6E] hover:text-ink"
        >
          ✕
        </button>
      </div>
      <div className="relative w-full overflow-hidden bg-[#ececea]" style={{ aspectRatio: box.ratio }}>
        {box.src ? (
          <Image
            src={box.src}
            alt={box.alt ?? ""}
            fill
            draggable={false}
            sizes="(max-width: 768px) 100vw, 36vw"
            className="select-none object-cover"
          />
        ) : (
          <span className="absolute bottom-3 left-3 font-sans text-[8px] tracking-[0.01em] text-[#B2B2B2]">
            [ PLACEHOLDER :: {box.label} ]
          </span>
        )}
      </div>
    </div>
  );
}
