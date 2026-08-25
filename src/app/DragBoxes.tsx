"use client";

/* Three draggable artefact windows scattered on the grid, plus a large
   [ Click ] text button sitting BEHIND them that spawns endless new popups —
   spam it and the same three artefacts cascade diagonally like a glitchy pile
   of OS dialogs. Scattered on md+; the base three stack statically on mobile.

   Window chrome, dragging and stacking all live in DragWindow. */
import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import DragWindow, { nextZ } from "./DragWindow";

type Win = {
  id: number;
  name: string;
  left: string;
  top: string;
  w: string;
  ratio: string;
  src: string;
  alt: string;
  /* looping clip for a base window. `src` stays the poster still, and the
     spawned pile uses that, so spamming [ Click ] never decodes a dozen videos */
  video?: string;
  z: number;
  spawned?: boolean;
};

/* `name` is the window chrome's filename (part of the design language) and is
   deliberately not the asset path.

   `ratio` matches each source's native aspect so object-cover never crops —
   except the activator, which is now a 720x1280 clip. Kept at the still's
   ratio so the scatter holds its proportions, which crops the clip's white
   bands top and bottom onto the form. */
const BASE: Omit<Win, "z">[] = [
  { id: 0, name: "the-activator.mov", left: "2%", top: "4%", w: "clamp(280px,36vw,540px)", ratio: "1467 / 1731", src: "/images/home/activator.webp", alt: "The activator — a slowly morphing orange form", video: "/images/home/activator.mp4" },
  { id: 1, name: "OOH_final_final.png", left: "52%", top: "16%", w: "clamp(260px,34vw,500px)", ratio: "1389 / 1728", src: "/images/home/ooh-poster.webp", alt: "Eventually poster pasted on a concrete wall" },
  { id: 2, name: "arvo-keychain-ebd6337534b054fbe8.png", left: "14%", top: "56%", w: "clamp(220px,28vw,420px)", ratio: "1176 / 1728", src: "/images/home/keychain.webp", alt: "Hand holding the Eventually keychain" },
];

/* glitchy OS-pile filenames for spawned popups */
const SPAWN_NAMES = [
  (n: number) => `untitled(${n}).png`,
  (n: number) => `err_0x${((n * 2654435761) % 0xfff).toString(16).toUpperCase().padStart(3, "0")}.tmp`,
  (n: number) => `bug_report_${String(n).padStart(3, "0")}.txt`,
  (n: number) => `final_final_v${n}.psd`,
  (n: number) => `new_folder(${n})`,
  (n: number) => `crash_dump_${String(n).padStart(2, "0")}.log`,
  (n: number) => `DO_NOT_OPEN(${n}).zip`,
  (n: number) => `asset_export_${n}.jpg`,
];
const SPAWN_W = [220, 260, 300, 200, 340];

/* code-dialect fragments down the 4th column — pure texture, the windows drag
   right over them */
const TEXTURE = [
  "TRY {\n  HYPERFOCUS();\n} CATCH (HOURS) {\n  RETURN BREAKTHROUGHS;\n}",
  'IF (MIND !== TEMPLATE) {\n  // NOT A BROKEN BRAIN\n  THROW "THE SYSTEM, NOT THE BRAIN";\n}',
  "REFUSE({\n  GUILT_MECHANICS: NULL,\n  BROKEN_STREAKS: NULL,\n  SHAME: NULL,\n});",
  "WHILE (DEBUGGING_YOURSELF) {\n  // YOUR BEST YEARS ON THE WRONG BUG\n  BREAK;\n}\nSHIP_SOMETHING();",
  "CONST GROUP = [SCANNER,\n  OBSESSIVE, DREAMER];\n// RAN UNEXPECTED_BEHAVIOUR\n// SURVIVED TOGETHER",
];

/* Nothing is fetched or decoded until the window is on screen: preload="none"
   plus play/pause on an IntersectionObserver, with the poster standing in until
   then. Stays paused under prefers-reduced-motion, where the poster is all of
   it. Same discipline as the orb marquee. */
function ArtefactVideo({ src, poster }: { src: string; poster: string }) {
  const ref = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const v = ref.current;
    if (!v) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const io = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) {
          v.preload = "auto";
          void v.play().catch(() => {
            /* autoplay refused — the poster stands in */
          });
        } else {
          v.pause();
        }
      },
      { rootMargin: "15% 0px" },
    );
    io.observe(v);
    return () => io.disconnect();
  }, []);

  return (
    <video
      ref={ref}
      src={src}
      poster={poster}
      muted
      loop
      playsInline
      preload="none"
      disablePictureInPicture
      tabIndex={-1}
      className="absolute inset-0 h-full w-full select-none object-cover"
    />
  );
}

export default function DragBoxes() {
  const count = useRef(0);
  const [wins, setWins] = useState<Win[]>(() => BASE.map((b, i) => ({ ...b, z: i + 1 })));

  const spawn = () => {
    const n = ++count.current;
    const i = n - 1;
    // popups are the section's own three artefacts coming back round, each at
    // its native ratio so the pile never crops them
    const art = BASE[i % BASE.length];
    // Windows-dialog cascade: each popup steps down-right from the last,
    // wrapping so the pile keeps building; a little jitter keeps it glitchy
    const left = 16 + ((i * 4.2) % 52) + Math.random() * 3;
    const top = 6 + ((i * 5.5) % 62) + Math.random() * 3;
    setWins((w) => [
      ...w,
      {
        ...art,
        id: 100 + n,
        name: SPAWN_NAMES[i % SPAWN_NAMES.length](n),
        left: `${left.toFixed(1)}%`,
        top: `${top.toFixed(1)}%`,
        w: `${SPAWN_W[i % SPAWN_W.length]}px`,
        z: nextZ(),
        spawned: true,
      },
    ]);
  };

  return (
    <section className="relative z-[1] mx-[var(--gutter)] mb-[clamp(40px,5vw,72px)] md:h-[150vh]">
      <div
        aria-hidden
        className="pointer-events-none absolute bottom-0 left-[60%] top-0 z-0 hidden w-[18%] select-none flex-col justify-between gap-8 md:flex"
      >
        {TEXTURE.map((t, i) => (
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
          /* dt-cmd opts it into the global link sweep; the sweep ends on blue
             so the old hover:text-blue would be fighting it */
          className="dt-cmd pointer-events-auto cursor-pointer [font-family:Exposure,var(--font-sans)] text-[clamp(56px,7.5vw,128px)] leading-none tracking-[-0.1em] text-ink active:scale-[0.98]"
          title="Spawn a popup"
        >
          [ Click ]
        </button>
      </div>

      <div className="pointer-events-none relative z-[1] h-full">
        {wins.map((b) => (
          <DragWindow
            key={b.id}
            label={b.name}
            closable
            onClose={() => setWins((w) => w.filter((x) => x.id !== b.id))}
            left={b.left}
            top={b.top}
            width={b.w}
            z={b.z}
            className={`pointer-events-auto ${b.spawned ? "max-md:hidden" : ""}`}
          >
            <div className="relative w-full overflow-hidden bg-[#ececea]" style={{ aspectRatio: b.ratio }}>
              {b.video && !b.spawned ? (
                <ArtefactVideo src={b.video} poster={b.src} />
              ) : (
                <Image
                  src={b.src}
                  alt={b.alt}
                  fill
                  draggable={false}
                  sizes="(max-width: 768px) 100vw, 36vw"
                  className="select-none object-cover"
                />
              )}
            </div>
          </DragWindow>
        ))}
      </div>
    </section>
  );
}
