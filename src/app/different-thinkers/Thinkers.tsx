"use client";

/* Different Thinkers — a 5-column grid of great neurodivergent minds (portraits
   pulled live from Wikipedia, greyscaled).

   Every `wiki` and `expWiki` must be a page the summary API returns an image
   for, or the window renders an empty placeholder — "Poetry" and "Newton's law
   of universal gravitation" both did, which is what left two dossiers short of
   an artefact. Prefer a page whose lead image is the work itself: several poem
   pages lead with a portrait of the poet, which puts the same face in two
   windows. Check both before adding a title. Clicking a portrait opens a dossier
   overlay of three draggable windows: a glitched render of the person (canvas
   slice-shift treatment of their portrait), an info window (name // field,
   the Wikipedia extract, SRC/EXP links in the code dialect), and an image of
   the breakthrough they gave the world (the EXP page's Wikipedia image). */
import { useEffect, useRef, useState } from "react";

/* No condition field: these are different thinkers, not case notes. Most of the
   old labels were historical guesswork, and none of it is ours to assert.

   `died` is required on purpose — this page is historical figures only, so the
   type refuses a living person rather than leaving it to whoever edits next. */
type Thinker = {
  name: string;
  wiki: string;
  expLabel: string;
  expWiki: string;
  born: number;
  died: number;
  field: string;
};

const THINKERS: Thinker[] = [
  { name: "Albert Einstein", wiki: "Albert Einstein", expLabel: "THEORY OF RELATIVITY", expWiki: "Theory of relativity", born: 1879, died: 1955, field: "PHYSICS" },
  { name: "Isaac Newton", wiki: "Isaac Newton", expLabel: "PRINCIPIA", expWiki: "Philosophiæ Naturalis Principia Mathematica", born: 1643, died: 1727, field: "PHYSICS / MATHEMATICS" },
  { name: "Alan Turing", wiki: "Alan Turing", expLabel: "TURING MACHINE", expWiki: "Turing machine", born: 1912, died: 1954, field: "COMPUTATION" },
  { name: "Thomas Edison", wiki: "Thomas Edison", expLabel: "LIGHT BULB", expWiki: "Incandescent light bulb", born: 1847, died: 1931, field: "INVENTION" },
  { name: "Charles Darwin", wiki: "Charles Darwin", expLabel: "ON THE ORIGIN OF SPECIES", expWiki: "On the Origin of Species", born: 1809, died: 1882, field: "BIOLOGY" },
  { name: "Emily Dickinson", wiki: "Emily Dickinson", expLabel: "HOPE IS THE THING WITH FEATHERS", expWiki: "Hope is the thing with feathers", born: 1830, died: 1886, field: "POETRY" },
  { name: "Hans Christian Andersen", wiki: "Hans Christian Andersen", expLabel: "FAIRY TALES", expWiki: "Fairy tale", born: 1805, died: 1875, field: "LITERATURE" },
  { name: "Wolfgang Amadeus Mozart", wiki: "Wolfgang Amadeus Mozart", expLabel: "THE MAGIC FLUTE", expWiki: "The Magic Flute", born: 1756, died: 1791, field: "MUSIC" },
  { name: "Andy Warhol", wiki: "Andy Warhol", expLabel: "CAMPBELL'S SOUP CANS", expWiki: "Campbell's Soup Cans", born: 1928, died: 1987, field: "ART" },
  { name: "Thomas Jefferson", wiki: "Thomas Jefferson", expLabel: "DECLARATION OF INDEPENDENCE", expWiki: "United States Declaration of Independence", born: 1743, died: 1826, field: "STATECRAFT" },
  { name: "Octavia E. Butler", wiki: "Octavia E. Butler", expLabel: "KINDRED", expWiki: "Kindred (novel)", born: 1947, died: 2006, field: "SPECULATIVE FICTION" },
  { name: "Agatha Christie", wiki: "Agatha Christie", expLabel: "MURDER ON THE ORIENT EXPRESS", expWiki: "Murder on the Orient Express", born: 1890, died: 1976, field: "CRIME FICTION" },
  { name: "Nikola Tesla", wiki: "Nikola Tesla", expLabel: "ALTERNATING CURRENT", expWiki: "Alternating current", born: 1856, died: 1943, field: "ELECTRICITY" },
  { name: "Leonardo da Vinci", wiki: "Leonardo da Vinci", expLabel: "MONA LISA", expWiki: "Mona Lisa", born: 1452, died: 1519, field: "ART / ENGINEERING" },
  /* Cavendish published natural philosophy under her own name in the 1660s, when
     women did not, and wrote what is often called the first science fiction. */
  { name: "Margaret Cavendish", wiki: "Margaret Cavendish", expLabel: "THE BLAZING WORLD", expWiki: "The Blazing World", born: 1623, died: 1673, field: "NATURAL PHILOSOPHY" },
];

type Summary = { thumb: string | null; original: string | null; extract: string; url: string };
const cache = new Map<string, Summary | null>();
async function fetchSummary(title: string): Promise<Summary | null> {
  if (cache.has(title)) return cache.get(title)!;
  try {
    const r = await fetch(`https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(title.replace(/ /g, "_"))}`);
    const j = r.ok ? await r.json() : null;
    const s: Summary | null = j
      ? {
          thumb: j.thumbnail?.source ?? null,
          original: j.originalimage?.source ?? j.thumbnail?.source ?? null,
          extract: j.extract ?? "",
          url: j.content_urls?.desktop?.page ?? `https://en.wikipedia.org/wiki/${title.replace(/ /g, "_")}`,
        }
      : null;
    cache.set(title, s);
    return s;
  } catch {
    cache.set(title, null);
    return null;
  }
}

const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
const usnake = (s: string) => s.toUpperCase().replace(/'/g, "").replace(/[^A-Z0-9]+/g, "_").replace(/(^_|_$)/g, "");
// stable pseudo-checksum per name, detection-tag flavour
const checksum = (s: string) => {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return (Math.abs(h) % 0xffff).toString(16).toUpperCase().padStart(4, "0");
};

/* the SPECIMEN rail: a long column of separate coded stat fragments about the
   person, written in the brand dialect */
function specimenBlocks(t: Thinker, idx: number): string[] {
  return [
    `[ SPECIMEN :: ${usnake(t.name)} ]`,
    `CONST ID = 0x${String(idx + 1).padStart(4, "0")};\nCONST BORN = ${t.born};\nCONST DIED = ${t.died};\nCONST RUNTIME = ${t.died - t.born}_YEARS;`,
    `CONST FIELD = "${t.field}";\nCONST WIRING = "NON_STANDARD"; // NOT A DIAGNOSIS`,
    `CHECK [MIND / TEMPLATE] {\n    RETURN MISMATCH, NOT DISORDER;\n}`,
    `RUN OUTPUT() {\n    RETURN "${usnake(t.expWiki)}";\n}`,
    `// LOGGED AS SYMPTOMS\n// RAN AS FEATURES\nKEEP_RUNNING = TRUE;`,
    `DELETE DEFICIT_MODEL;\n// KEPT: THE MIND`,
    `STATUS = "WORKING_AS_INTENDED";\nCHECKSUM :: 0x${checksum(t.name)};`,
  ];
}

/* canvas slice-shift treatment of the portrait — a random glitch every open.
   The canvas is sized (which clears it) the moment src changes, so a slow or
   failed portrait shows an empty frame rather than the last person's face, and
   a load that finishes after src moved on is dropped.

   crossOrigin stays: Wikimedia serves the CORS header, and keeping the canvas
   origin-clean means the slice passes can read it back. A load that fails now
   leaves a cleared frame rather than the previous portrait. */
function GlitchedPortrait({ src }: { src: string }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const W = (canvas.width = 640);
    const H = (canvas.height = 760);
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, W, H);
    let dead = false;
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      if (dead) return; // a newer portrait won the race
      // cover-fit the portrait
      const s = Math.max(W / img.width, H / img.height);
      const dw = img.width * s;
      const dh = img.height * s;
      ctx.filter = "grayscale(1)";
      ctx.drawImage(img, (W - dw) / 2, (H - dh) / 2, dw, dh);
      ctx.filter = "none";
      // slice shifts
      const rnd = (a: number, b: number) => a + Math.random() * (b - a);
      const slices = 14 + Math.floor(Math.random() * 8);
      for (let i = 0; i < slices; i++) {
        const y = Math.floor(rnd(0, H));
        const h = Math.floor(rnd(4, 42));
        const dx = Math.floor(rnd(-70, 70));
        ctx.drawImage(canvas, 0, y, W, h, dx, y, W, h);
      }
      // a few hue-shifted echo strips for the brand's chromatic tear
      for (let i = 0; i < 4; i++) {
        const y = Math.floor(rnd(0, H));
        const h = Math.floor(rnd(6, 22));
        const dx = Math.floor(rnd(-40, 40));
        ctx.save();
        ctx.globalAlpha = 0.55;
        ctx.filter = `hue-rotate(${Math.floor(rnd(140, 260))}deg) saturate(4)`;
        ctx.drawImage(canvas, 0, y, W, h, dx, y, W, h);
        ctx.restore();
      }
    };
    img.src = src;
    return () => {
      dead = true;
    };
  }, [src]);
  return <canvas ref={ref} className="block h-auto w-full" />;
}

/* Wikipedia sometimes hands back an image URL that will not load. Fall back to
   the placeholder block instead of leaving the window empty. */
function ArtefactImage({ src, alt }: { src: string; alt: string }) {
  const [failed, setFailed] = useState(false);
  if (failed) return <div className="aspect-[4/3] w-full bg-[#ececea]" />;
  return (
    /* eslint-disable-next-line @next/next/no-img-element */
    <img
      src={src}
      alt={alt}
      draggable={false}
      onError={() => setFailed(true)}
      className="block h-auto w-full"
    />
  );
}

/* one draggable dossier window (drag anywhere; z-raise on grab) */
function DragWindow({
  name,
  z,
  onFront,
  style,
  children,
}: {
  name: string;
  z: number;
  onFront: () => void;
  style: React.CSSProperties;
  children: React.ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const pos = useRef({ x: 0, y: 0 });
  const start = useRef<{ px: number; py: number; x: number; y: number } | null>(null);
  return (
    <div
      ref={ref}
      className="absolute cursor-grab touch-none select-none bg-paper shadow-[0_14px_60px_rgba(0,0,0,0.12)]"
      style={{ ...style, zIndex: z }}
      onPointerDown={(e) => {
        start.current = { px: e.clientX, py: e.clientY, x: pos.current.x, y: pos.current.y };
        (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
        onFront();
      }}
      onPointerMove={(e) => {
        if (!start.current || !ref.current) return;
        pos.current.x = start.current.x + (e.clientX - start.current.px);
        pos.current.y = start.current.y + (e.clientY - start.current.py);
        ref.current.style.transform = `translate3d(${pos.current.x}px, ${pos.current.y}px, 0)`;
      }}
      onPointerUp={() => (start.current = null)}
      onPointerCancel={() => (start.current = null)}
    >
      <div className="px-3 py-2 font-sans text-[8px] tracking-[0.01em] text-[#6E6E6E]">{name}</div>
      {children}
    </div>
  );
}

export default function Thinkers() {
  const [thumbs, setThumbs] = useState<Record<string, string>>({});
  const [open, setOpen] = useState<Thinker | null>(null);
  /* Tagged with the title each result was fetched for. The reset used to happen
     in the open effect, which runs after paint — so opening a dossier rendered
     one frame with the new name and the PREVIOUS person's portrait, and if the
     new image was slow or failed to load it stayed there. Comparing the tag
     against what is open means stale data can never render under the wrong
     name, whatever the effect timing. */
  const [person, setPerson] = useState<{ for: string; data: Summary | null } | null>(null);
  const [exp, setExp] = useState<{ for: string; data: Summary | null } | null>(null);
  const [zs, setZs] = useState([1, 2, 3]);
  const zTop = useRef(3);
  // window positions, re-randomised within the viewport on every open
  const [wpos, setWpos] = useState([
    { left: 20, top: 10 },
    { left: 38, top: 18 },
    { left: 58, top: 56 },
  ]);

  // prefetch all portraits
  useEffect(() => {
    let dead = false;
    THINKERS.forEach((t) => {
      fetchSummary(t.wiki).then((s) => {
        if (!dead && s?.thumb) setThumbs((m) => ({ ...m, [t.wiki]: s.original && s.original.length < 400 ? s.original : s.thumb! }));
      });
    });
    return () => {
      dead = true;
    };
  }, []);

  /* only treat a fetch result as this dossier's if it was fetched for it.
     `*Settled` distinguishes "still loading" from "Wikipedia returned nothing",
     which previously both read as a permanent "loading :: …". */
  const bioSettled = !!open && person?.for === open.wiki;
  const bio = bioSettled ? person!.data : null;
  const artefact = !!open && exp?.for === open.expWiki ? exp!.data : null;
  const portrait = bio?.original ?? null;

  // open a dossier: load the person + their breakthrough
  useEffect(() => {
    if (!open) return;
    let dead = false;
    setPerson(null);
    setExp(null);
    const rand = (lo: number, hi: number) => lo + Math.random() * (hi - lo);
    /* Three bands across the full width rather than a cluster mid-screen: the
       narrow portrait far left, the wide info panel centre and low, the
       breakthrough far right and high. Windows are ~26vw / ~44vw / ~24vw, so
       the bands are placed to keep each one on screen and let the stagger,
       not the horizontal position, do the overlapping.

       Below lg there is no room for three abreast, so they cascade from the
       left instead, in the OS-pile language used elsewhere. */
    const spread = window.innerWidth >= 1024;
    setWpos(
      spread
        ? [
            { left: rand(3, 10), top: rand(14, 26) },
            /* the info panel is the tall one — its top is capped so its footer
               links stay inside the overlay, which clips rather than scrolls */
            { left: rand(25, 33), top: rand(26, 34) },
            { left: rand(66, 74), top: rand(6, 16) },
          ]
        : [
            { left: rand(2, 6), top: rand(8, 16) },
            { left: rand(5, 9), top: rand(30, 40) },
            { left: rand(8, 12), top: rand(58, 68) },
          ],
    );
    setZs([1, 2, 3]);
    const wiki = open.wiki;
    const expWiki = open.expWiki;
    fetchSummary(wiki).then((s) => !dead && setPerson({ for: wiki, data: s }));
    fetchSummary(expWiki).then((s) => !dead && setExp({ for: expWiki, data: s }));
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(null);
    window.addEventListener("keydown", onKey);
    document.documentElement.style.overflow = "hidden";
    return () => {
      dead = true;
      window.removeEventListener("keydown", onKey);
      document.documentElement.style.overflow = "";
    };
  }, [open]);

  const front = (i: number) =>
    setZs((z) => {
      const n = [...z];
      n[i] = ++zTop.current;
      return n;
    });

  return (
    <>
      {/* the grid of minds — zero column gap + right padding per cell, so every
          image's LEFT edge sits exactly on a grid guide line */}
      <div className="grid grid-cols-2 gap-y-8 md:grid-cols-3 lg:grid-cols-5 lg:gap-y-12">
        {THINKERS.map((t) => (
          <button
            key={t.wiki}
            type="button"
            onClick={() => setOpen(t)}
            title={`${t.name} // ${t.field}`}
            className="group relative mr-3 aspect-square cursor-pointer overflow-hidden bg-[#ececea]"
          >
            {thumbs[t.wiki] && (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img
                src={thumbs[t.wiki]}
                alt={t.name}
                draggable={false}
                className="h-full w-full object-cover grayscale transition-transform duration-300 ease-[var(--ease-snap)] group-hover:scale-[1.03]"
              />
            )}
          </button>
        ))}
      </div>

      {/* dossier overlay — bio/artefact only count when they belong to whoever
          is open, so nothing from the last dossier can leak into this one */}
      {open && (
        <div key={open.wiki} className="fixed inset-0 z-[70] overflow-hidden bg-[#e9e9e6]">
          <button
            type="button"
            onClick={() => setOpen(null)}
            aria-label="Close"
            className="absolute right-[var(--gutter)] top-6 z-[100] cursor-pointer font-sans text-[15px] leading-none text-[#6E6E6E] hover:text-ink"
          >
            ✕
          </button>
          {/* SPECIMEN rail: a full column of coded stats about the person,
              in the brand dialect — pure texture, windows drag over it */}
          <div className="pointer-events-none absolute bottom-6 left-[var(--gutter)] top-6 z-[1] hidden w-[15%] select-none flex-col justify-between gap-4 overflow-hidden md:flex">
            {specimenBlocks(open, THINKERS.indexOf(open)).map((b, i) => (
              <pre key={i} className="font-sans text-[8px] leading-[1.7] tracking-[0.01em] text-[#6E6E6E]">
                {b}
              </pre>
            ))}
          </div>

          {/* window 1: glitched portrait */}
          <DragWindow
            name={`${slug(open.name)}.jpg`}
            z={zs[0]}
            onFront={() => front(0)}
            style={{ left: `${wpos[0].left}%`, top: `${wpos[0].top}%`, width: "clamp(240px,26vw,400px)" }}
          >
            {portrait ? (
              <GlitchedPortrait src={portrait} />
            ) : (
              <div className="aspect-[64/76] w-full bg-[#ececea]" />
            )}
          </DragWindow>

          {/* window 2: info */}
          <DragWindow
            name={`${slug(open.name)}-info.txt`}
            z={zs[1]}
            onFront={() => front(1)}
            style={{ left: `${wpos[1].left}%`, top: `${wpos[1].top}%`, width: "clamp(320px,44vw,740px)" }}
          >
            <div className="flex min-h-[340px] flex-col px-8 pb-8 pt-4">
              <h2 className="font-sans text-[clamp(18px,1.7vw,26px)] font-medium leading-[1.2] tracking-[-0.01em] text-ink">
                {open.name} <span className="font-normal">{"//"}</span> {open.field}
              </h2>
              <p className="mt-8 max-w-[58ch] font-sans text-[clamp(15px,1.4vw,22px)] leading-[1.4] tracking-[0] text-ink">
                {bio ? bio.extract : bioSettled ? 'err :: no record returned' : "loading :: …"}
              </p>
              <div className="mt-auto flex gap-10 pt-10 font-sans text-[8px] tracking-[0.01em] text-[#6E6E6E]">
                {bio && (
                  <a href={bio.url} target="_blank" rel="noreferrer" className="underline hover:text-ink">
                    SRC(&quot;WIKIPEDIA&quot;);
                  </a>
                )}
                {artefact && (
                  <a href={artefact.url} target="_blank" rel="noreferrer" className="underline hover:text-ink">
                    EXP(&quot;{usnake(open.expLabel)}&quot;);
                  </a>
                )}
              </div>
            </div>
          </DragWindow>

          {/* window 3: the breakthrough */}
          <DragWindow
            name={`${slug(open.expWiki)}.png`}
            z={zs[2]}
            onFront={() => front(2)}
            style={{ left: `${wpos[2].left}%`, top: `${wpos[2].top}%`, width: "clamp(220px,24vw,380px)" }}
          >
            {artefact?.original ? (
              <ArtefactImage key={artefact.original} src={artefact.original} alt={open.expLabel} />
            ) : (
              <div className="aspect-[4/3] w-full bg-[#ececea]" />
            )}
          </DragWindow>
        </div>
      )}
    </>
  );
}
