/* Different Thinking — brand guidelines glitch lab.
   A copy of the site's WebGL glitch engine with a constrained control set.
   Two builds share this file:
   - the claude.ai guidelines artifact: mount(root, logo) with no api. Sealed: no fetch, no storage,
     nothing is ever written back. The composition is the snapshot embedded at build time.
   - the website (/guidelines, the main lab): mount(root, logo, { api: "/api/composition" }). It opens
     on the LIVE composition, and admins can save versions and push live (see admin.ts). */
import { GlitchEngine } from "./glitch/engine";
import { parseComposition, clone, type BoxConfig, type Composition } from "./glitch/config";
import COMP from "./comp.json";
import type { wireAdmin } from "./admin";

type Num = Record<string, number>;
const $ = <T extends HTMLElement>(s: string, r: ParentNode = document) => r.querySelector(s) as T;

/* piecewise map 0..100 → value with 50 = neutral */
const pw = (v: number, a: number, m: number, b: number) => (v <= 50 ? a + (m - a) * (v / 50) : m + (b - m) * ((v - 50) / 50));

const SLIDERS: { key: string; label: string; group: string; def: number }[] = [
  { key: "size", label: "Box size", group: "Composition", def: 50 },
  { key: "spread", label: "Spread", group: "Composition", def: 50 },
  { key: "gain", label: "Intensity", group: "Distortion", def: 50 },
  { key: "slice", label: "Slice", group: "Distortion", def: 50 },
  { key: "stretch", label: "Stretch", group: "Distortion", def: 50 },
  { key: "refract", label: "Refract", group: "Distortion", def: 50 },
  { key: "grain", label: "Grain", group: "Distortion", def: 50 },
  { key: "spectrum", label: "Spectrum", group: "Distortion", def: 50 },
  { key: "echo", label: "Echo", group: "Distortion", def: 50 },
  { key: "flow", label: "Flow", group: "Distortion", def: 50 },
];
const LAYOUTS = ["Live", "Spread", "Pulled in", "Nudged", "Shuffle"] as const;
/* the preview canvas overscans the frame by OS on every side; a mask clips it to the frame at rest and
   feathers open as the hero scrolls, so the glitch can spill past the frame without a hard edge */
const OS = 0.35;
const overscan = (c: Composition): Composition => {
  const k = 1 + 2 * OS, o = clone(c);
  for (const b of o.boxes) b.layout = { x: (OS + b.layout.x) / k, y: (OS + b.layout.y) / k, w: b.layout.w / k, h: b.layout.h / k };
  o.layer.offsetX /= k; o.layer.offsetY /= k;
  for (const p of [o.layer.slice, o.frontLayer.slice] as Num[]) { p.shift /= k; p.shiftV /= k; }
  for (const p of [o.layer.pixstretch, o.frontLayer.pixstretch] as Num[]) p.offset /= k;
  return o;
};
const EXF = ["png", "jpg", "webp", "mp4", "webm"];
const MP4_TYPES = ["video/mp4;codecs=avc1.640028", "video/mp4;codecs=avc1.42E01F", "video/mp4;codecs=avc1", "video/mp4"];
const WEBM_TYPES = ["video/webm;codecs=vp9", "video/webm;codecs=vp8", "video/webm"];
const pickType = (list: string[]) => (typeof MediaRecorder === "undefined" ? "" : list.find((t) => MediaRecorder.isTypeSupported(t)) || "");
const EXL = [1080, 1920, 2560, 3840];
const EXSEC = [4, 6, 10];
const FRAMES: [string, number][] = [["16:9", 16 / 9], ["1:1", 1], ["4:5", 4 / 5], ["9:16", 9 / 16]];
const GROUNDS: [string, string][] = [["Paper", "#FCFCFC"], ["Ghost", "#F2F2EF"], ["Ink", "#000000"], ["Clear", "clear"]];

const FROZEN = parseComposition(COMP) as Composition; // the guidelines' own snapshot (colourways, Motion)
let BASE = clone(FROZEN);

interface State {
  v: Num;
  layout: string;
  seed: number;
  on: boolean[];
  order: number[];
  pos: [number, number][];
  frame: number;
  ground: number;
  logo: boolean;
  paused: boolean;
  echoOff: boolean;
  frontOff: boolean;
  fmt: number;
  exf: number;
  exs: number;
  exl: number;
  res: number;
}
const fresh = (): State => ({
  v: Object.fromEntries(SLIDERS.map((s) => [s.key, s.def])),
  layout: "Live",
  seed: 1,
  on: BASE.boxes.map(() => true),
  order: BASE.boxes.map((_, i) => i),
  pos: BASE.boxes.map(() => [0, 0] as [number, number]),
  frame: 0,
  ground: 0,
  logo: false,
  paused: false,
  res: 0,
  echoOff: false,
  frontOff: false,
  fmt: 0,
  exf: 0,
  exs: 3,
  exl: 1,
});

function rng(seed: number) {
  let s = seed >>> 0 || 1;
  return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296);
}

function layoutFor(name: string, seed: number) {
  const L = BASE.boxes.map((b) => ({ ...b.layout }));
  const cx = 0.5, cy = 0.48;
  const about = (k: number, s: number) =>
    L.forEach((l) => {
      const mx = l.x + l.w / 2, my = l.y + l.h / 2;
      l.w *= s; l.h *= s;
      l.x = cx + (mx - cx) * k - l.w / 2; l.y = cy + (my - cy) * k - l.h / 2;
    });
  if (name === "Spread") about(1.35, 0.9);
  if (name === "Pulled in") about(0.7, 1.12);
  if (name === "Nudged") {
    const r = rng(7);
    L.forEach((l) => { l.x += (r() - 0.5) * 0.06; l.y += (r() - 0.5) * 0.06; l.w *= 0.92 + r() * 0.16; l.h *= 0.92 + r() * 0.16; });
  }
  if (name === "Shuffle") {
    const r = rng(seed * 977 + 13);
    L.forEach((l) => {
      l.w = 0.22 + r() * 0.24; l.h = 0.26 + r() * 0.24;
      l.x = 0.1 + r() * (0.8 - l.w); l.y = 0.06 + r() * (0.82 - l.h);
    });
  }
  return L;
}

/* build the composition the engine renders from the frozen base + controls */
function build(st: State, full = false, hits = !full): Composition {
  const c = clone(BASE);
  const v = st.v;
  const solo = full ? -1 : soloOf(st);
  const isOn = (i: number) => full || st.on[i] !== false;
  const L = layoutFor(st.layout, st.seed);
  const fs = pw(v.size, 0.55, 1, 1.5), fp = pw(v.spread, 0.4, 1, 1.7);
  const fSlice = pw(v.slice, 0, 1, 3.2), fRef = pw(v.refract, 0, 1, 2.6);
  const dStretch = (v.stretch - 50) * 0.8, fStretchL = pw(v.stretch, 0, 1, 5);
  const fGrain = pw(v.grain, 0.4, 1, 3.2), dSpec = (v.spectrum - 50) * 1.4;
  const fEcho = pw(v.echo, 0, 1, 4), fFlow = pw(v.flow, 0, 1, 2.5);
  const act = L.map((l, i) => ({ l, i })).filter((o) => isOn(o.i));
  const mx = act.reduce((s, o) => s + o.l.x + o.l.w / 2, 0) / Math.max(1, act.length);
  const my = act.reduce((s, o) => s + o.l.y + o.l.h / 2, 0) / Math.max(1, act.length);
  const byIdx: Record<number, BoxConfig> = {};
  const rects: Record<number, { x: number; y: number; w: number; h: number }> = {};
  c.boxes.forEach((b, i) => {
    if (solo >= 0 ? i !== solo : !isOn(i)) return;
    const l = L[i];
    const bx = l.x + l.w / 2, by = l.y + l.h / 2;
    const w = l.w * fs, h = l.h * fs;
    /* texture pages: one layer, full bleed; taller than the frame so the flat tail of the gradient stays out of view */
    /* size and spread scale about the composition's own centre, so neutral controls leave the base exactly as it is */
    b.layout = solo >= 0 ? { x: -0.01, y: -0.01, w: 1.02, h: 1.75 } : { x: mx + (bx - mx) * fp - w / 2 + (st.pos[i]?.[0] || 0), y: my + (by - my) * fp - h / 2 + (st.pos[i]?.[1] || 0), w, h };
    rects[i] = { ...b.layout };
    for (const e of b.effects) {
      const p = e.params as Num;
      if (e.type === "slice") { p.shift *= fSlice; p.shiftV = p.shiftV * fSlice + (fSlice > 1 ? (fSlice - 1) * 3 : 0); p.glitch *= Math.max(fSlice, 0.2); p.speed *= fFlow; }
      if (e.type === "pixstretch") p.offset = Math.max(-100, Math.min(100, p.offset + dStretch));
      if (e.type === "refract") p.strength = Math.max(-100, Math.min(100, p.strength * fRef));
      if (e.type === "dither") p.size = Math.max(1, Math.min(32, Math.round(p.size * fGrain)));
      if (e.type === "gradmap") { p.offset = (((p.offset + dSpec) % 100) + 100) % 100; }
      if (e.type === "metal") p.speed *= fFlow;
    }
    byIdx[i] = b;
  });
  c.boxes = st.order.filter((i) => byIdx[i]).map((i) => byIdx[i]); // back to front, as stacked in Layers
  if (hits) HITS = solo >= 0 ? [] : st.order.filter((i) => rects[i]).reverse().map((i) => ({ i, ...rects[i] })); // front to back
  for (const s of [c.layer.slice, c.frontLayer.slice] as Num[]) { s.shift *= fSlice; s.shiftV *= fSlice; }
  for (const p of [c.layer.pixstretch, c.frontLayer.pixstretch] as Num[]) p.offset *= fStretchL;
  c.layer.offsetX *= fEcho; c.layer.offsetY *= fEcho;
  c.layer.enabled = fEcho > 0.02 && !st.echoOff && solo < 0;
  c.frontLayer.enabled = c.frontLayer.enabled && !st.frontOff;
  return c;
}
let HITS: { i: number; x: number; y: number; w: number; h: number }[] = [];
const soloOf = (st: State) => (/^T\d$/.test(st.layout) ? +st.layout[1] : -1);
const gainOf = (st: State) => pw(st.v.gain, 0.35, 1, 2.8);
const timeScale = (st: State) => pw(st.v.flow, 0, 1, 2.5);
const groundHex = (st: State) => GROUNDS[st.ground][1];
const rgb01 = (h: string): [number, number, number] =>
  h === "clear" ? [0.988, 0.988, 0.988] : [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16) / 255) as [number, number, number];

/* ---------- logotype raster for exports ---------- */
let LOGO_SVG = "";
const logoCache: Record<string, HTMLImageElement> = {};
function logoImg(col: string): Promise<HTMLImageElement> {
  if (logoCache[col]) return Promise.resolve(logoCache[col]);
  return new Promise((res, rej) => {
    const im = new Image();
    im.onload = () => { logoCache[col] = im; res(im); };
    im.onerror = rej;
    im.src = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(LOGO_SVG.replace(/currentColor/g, col));
  });
}
/* same placement as the hero: full width inside the gutter, pinned to the bottom */
function logoRect(W: number, H: number) {
  const g = Math.round(Math.max(W * 0.049, 16));
  const w = W - g * 2, h = (w * 245) / 1603;
  const maxH = H * 0.3;
  const k = h > maxH ? maxH / h : 1;
  return { x: g, y: H - g * 0.8 - h * k, w: w * k, h: h * k };
}

/* ---------- main ---------- */
export function mount(root: HTMLElement, logoSvg: string, opts: { api?: string; wire?: typeof wireAdmin } = {}) {
  LOGO_SVG = logoSvg;
  let ADMIN: ReturnType<typeof wireAdmin> | null = null;
  const st = fresh();
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (reduce) st.paused = true;
  const area = $<HTMLDivElement>(".lab-canvas", root);
  const frameEl = $<HTMLDivElement>(".lab-frame", root);
  const canvas = $<HTMLCanvasElement>("canvas", frameEl);
  const stage = area;
  const toast = $<HTMLDivElement>(".lab-toast", root);
  let engine: GlitchEngine | null = null;
  try { engine = new GlitchEngine(canvas); engine.dprCap = 2; engine.refRes = 900; } catch (e) { root.classList.add("lab-nogl"); }
  let comp = build(st);
  const say = (t: string, ms = 2600) => { toast.textContent = t; toast.classList.add("on"); clearTimeout((say as any).t); (say as any).t = setTimeout(() => toast.classList.remove("on"), ms); };
  const syncers: (() => void)[] = [];
  const syncAll = () => { syncers.forEach((f) => f()); comp = build(st); brkComp = null; layoutFrame(); };
  const all = <T extends HTMLElement>(sel: string) => Array.from(root.querySelectorAll<T>(sel));
  const on = (sel: string, fn: (b: HTMLElement, e: Event) => void) => all(sel).forEach((b) => b.addEventListener("click", (e) => fn(b, e)));

  /* pages: the full glitch, or one layer as a full-bleed texture */
  on("[data-page]", (b) => { st.layout = b.dataset.page!; syncAll(); });
  syncers.push(() => all("[data-page]").forEach((b) => b.setAttribute("aria-current", String(b.dataset.page === st.layout))));
  /* layers */
  /* Layers: drag a box row to restack it (top of the list draws in front); Alt + arrow keys do the same */
  const layerList = root.querySelector<HTMLUListElement>(".lp-layers")!;
  const boxLis = () => Array.from(layerList.querySelectorAll<HTMLLIElement>("li[data-boxli]"));
  const restack = () => {
    const anchor = layerList.querySelector('li[data-echoli]');
    st.order.slice().reverse().forEach((i) => { const li = layerList.querySelector(`li[data-boxli="${i}"]`); if (li) layerList.insertBefore(li, anchor); });
    // Echo's children mirror the boxes, in the same stacking order
    let after: Element | null = anchor;
    st.order.slice().reverse().forEach((i) => { const li = layerList.querySelector(`li[data-echochild="${i}"]`); if (li && after) { after.after(li); after = li; } });
  };
  /* groups (Front layer, Echo) open and close like Figma's */
  on("[data-caret]", (b) => {
    const open = b.getAttribute("aria-expanded") !== "true";
    b.setAttribute("aria-expanded", String(open));
    all(`li[data-parent="${b.dataset.caret}"]`).forEach((li) => (li.hidden = !open));
  });
  const moveTo = (i: number, frontIdx: number) => {
    const front = st.order.slice().reverse().filter((x) => x !== i);
    front.splice(Math.max(0, Math.min(front.length, frontIdx)), 0, i);
    st.order = front.reverse(); syncAll();
  };
  let dragI = -1;
  boxLis().forEach((li) => {
    const i = +li.dataset.boxli!;
    li.draggable = true;
    li.addEventListener("dragstart", (e) => { dragI = i; li.classList.add("dragging"); e.dataTransfer!.effectAllowed = "move"; e.dataTransfer!.setData("text/plain", String(i)); });
    li.addEventListener("dragend", () => { dragI = -1; boxLis().forEach((x) => x.classList.remove("dragging", "drop-above", "drop-below")); });
    li.addEventListener("dragover", (e) => {
      if (dragI < 0 || dragI === i) return;
      e.preventDefault();
      const r = li.getBoundingClientRect(), above = e.clientY < r.top + r.height / 2;
      boxLis().forEach((x) => x.classList.remove("drop-above", "drop-below"));
      li.classList.add(above ? "drop-above" : "drop-below");
    });
    li.addEventListener("drop", (e) => {
      e.preventDefault(); if (dragI < 0 || dragI === i) return;
      const r = li.getBoundingClientRect(), above = e.clientY < r.top + r.height / 2;
      const front = st.order.slice().reverse().filter((x) => x !== dragI);
      const at = front.indexOf(i) + (above ? 0 : 1);
      const mover = dragI; dragI = -1;
      boxLis().forEach((x) => x.classList.remove("dragging", "drop-above", "drop-below"));
      moveTo(mover, at); say(`Box ${mover + 1} moved`);
    });
    li.addEventListener("mouseenter", () => showSel(i)); li.addEventListener("mouseleave", () => showSel(-1));
    li.querySelector("button")!.addEventListener("keydown", (e) => {
      const arrows: Record<string, [number, number]> = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] };
      if (!e.altKey && arrows[e.key] && soloOf(st) < 0) {
        e.preventDefault(); const k = e.shiftKey ? 0.05 : 0.01, d = arrows[e.key];
        st.pos[i] = [st.pos[i][0] + d[0] * k, st.pos[i][1] + d[1] * k]; clampPos(i); comp = build(st); brkComp = null; showSel(i); return;
      }
      if (!e.altKey || (e.key !== "ArrowUp" && e.key !== "ArrowDown")) return;
      e.preventDefault();
      const front = st.order.slice().reverse(), at = front.indexOf(i);
      moveTo(i, at + (e.key === "ArrowUp" ? -1 : 1));
      (li.querySelector("button") as HTMLButtonElement).focus();
    });
  });
  syncers.push(restack);
  on("[data-box]", (b) => {
    const i = +b.dataset.box!;
    if (soloOf(st) >= 0) { st.layout = "T" + i; syncAll(); return; }
    if (st.on[i] && st.on.filter(Boolean).length === 1) { say("Keep at least one box visible"); return; }
    st.on[i] = !st.on[i]; syncAll();
  });
  on('[data-layer="logo"]', () => { st.logo = !st.logo; syncAll(); });
  on('[data-layer="echo"]', () => { st.echoOff = !st.echoOff; syncAll(); });
  on('[data-layer="front"]', () => { st.frontOff = !st.frontOff; syncAll(); });
  /* clicking a layer SELECTS it (only the eye hides it). A selected box stays outlined in the frame,
     and on the website admins get that layer's full editor in Advanced. */
  let selKey = "";
  const selectLayer = (key: string) => {
    selKey = key;
    all(".ll-row[data-sel]").forEach((r) => r.setAttribute("aria-current", String(r.dataset.sel === key)));
    pinned = key.startsWith("box:") ? +key.slice(4) : -1; showSel(-1);
    ADMIN?.focus(key);
  };
  on("[data-selbtn]", (b) => { const k = (b.closest(".ll-row") as HTMLElement).dataset.sel!; selectLayer(selKey === k && !ADMIN ? "" : k); });
  syncers.push(() => {
    const so = soloOf(st);
    all("[data-box]").forEach((b) => b.setAttribute("aria-pressed", String(so >= 0 ? +b.dataset.box! === so : st.on[+b.dataset.box!])));
    all('[data-layer="front"]').forEach((b) => b.setAttribute("aria-pressed", String(!st.frontOff)));
    all(".ll-eye").forEach((b) => b.closest(".ll-row")?.classList.toggle("is-off", b.getAttribute("aria-pressed") === "false"));
    root.classList.toggle("lab-solo", so >= 0);
    all('[data-layer="logo"]').forEach((b) => b.setAttribute("aria-pressed", String(st.logo)));
    all('[data-layer="echo"]').forEach((b) => b.setAttribute("aria-pressed", String(!st.echoOff)));
    all(".ll-eye").forEach((b) => b.closest(".ll-row")?.classList.toggle("is-off", b.getAttribute("aria-pressed") === "false"));
  });
  /* frame + fill */
  on("[data-frame]", (b) => { st.frame = +b.dataset.frame!; syncAll(); });
  on("[data-ground]", (b) => { st.ground = +b.dataset.ground!; syncAll(); });
  syncers.push(() => {
    all("[data-frame]").forEach((b) => b.setAttribute("aria-pressed", String(+b.dataset.frame! === st.frame)));
    all("[data-ground]").forEach((b) => b.setAttribute("aria-pressed", String(+b.dataset.ground! === st.ground)));
    all(".lab-fillhex").forEach((el) => (el.textContent = groundHex(st) === "clear" ? "Transparent" : groundHex(st).slice(1)));
  });
  /* sliders with number fields */
  all<HTMLInputElement>("input[type=range][data-k]").forEach((inp) => {
    const k = inp.dataset.k!, num = root.querySelector<HTMLInputElement>(`input[type=number][data-k="${k}"]`)!;
    const paint = () => { inp.value = num.value = String(st.v[k]); inp.style.setProperty("--p", st.v[k] + "%"); };
    inp.addEventListener("input", () => { st.v[k] = +inp.value; paint(); comp = build(st); brkComp = null; });
    num.addEventListener("change", () => { st.v[k] = Math.max(0, Math.min(100, Math.round(+num.value || 0))); paint(); comp = build(st); brkComp = null; });
    inp.addEventListener("dblclick", () => { st.v[k] = 50; paint(); comp = build(st); brkComp = null; });
    syncers.push(paint);
  });
  on('[data-a="reset"]', () => { const p = st.paused; Object.assign(st, fresh()); st.paused = p; syncAll(); say("Back to the live composition"); });
  on('[data-a="pause"]', () => { st.paused = !st.paused; syncAll(); });
  syncers.push(() => all('[data-a="pause"]').forEach((b) => { b.setAttribute("aria-label", st.paused ? "Play" : "Pause"); b.dataset.state = st.paused ? "paused" : "playing"; }));
  /* export: floating bar under the frame */
  const exF = root.querySelector<HTMLSelectElement>('select[name="exf"]')!, exS = root.querySelector<HTMLSelectElement>('select[name="exs"]')!, exL = root.querySelector<HTMLSelectElement>('select[name="exl"]')!;
  exF.addEventListener("change", () => { st.exf = +exF.value; syncAll(); });
  [[3, MP4_TYPES], [4, WEBM_TYPES]].forEach(([i, l]) => { if (!pickType(l as string[])) { const o = exF.options[i as number]; o.disabled = true; o.textContent += " (not in this browser)"; } });
  exS.addEventListener("change", () => { st.exs = +exS.value; syncAll(); });
  exL.addEventListener("change", () => { st.exl = +exL.value; syncAll(); });
  syncers.push(() => {
    exF.value = String(st.exf); exS.value = String(st.exs); exL.value = String(st.exl);
    root.classList.toggle("lab-exvideo", st.exf >= 3);
    Array.from(exS.options).forEach((o, i) => (o.disabled = st.exf >= 3 && EXL[i] > 1920));
    if (st.exf >= 3 && EXL[st.exs] > 1920) { st.exs = 1; exS.value = "1"; }
  });
  on('[data-a="export"]', (b) => doExport(EXF[st.exf], b));

  /* the board is fixed (no panning); the zoom readout re-centres */
  const pan = { x: 0, y: 0 };
  const applyPan = () => { frameEl.style.setProperty("--px", pan.x + "px"); frameEl.style.setProperty("--py", pan.y + "px"); };
  let drag: { x: number; y: number; px: number; py: number; id: number } | null = null;
  /* boxes: grab one in the frame and drag it to reposition */
  const sel = document.createElement("div"); sel.className = "lab-sel"; sel.setAttribute("aria-hidden", "true"); frameEl.appendChild(sel);
  const hitAt = (e: PointerEvent) => {
    const r = frameEl.getBoundingClientRect(), u = (e.clientX - r.left) / r.width, v = (e.clientY - r.top) / r.height;
    if (u < 0 || v < 0 || u > 1 || v > 1) return null;
    return HITS.find((b) => u >= b.x && u <= b.x + b.w && v >= b.y && v <= b.y + b.h) || null;
  };
  let pinned = -1; // admin Advanced: the box being edited stays outlined
  const showSel = (i: number) => {
    if (i < 0 && pinned >= 0) i = pinned;
    const b = HITS.find((x) => x.i === i);
    if (!b) { sel.classList.remove("on"); all("li[data-boxli]").forEach((li) => li.classList.remove("is-sel")); return; }
    Object.assign(sel.style, { left: b.x * 100 + "%", top: b.y * 100 + "%", width: b.w * 100 + "%", height: b.h * 100 + "%" });
    sel.dataset.name = "Box " + (i + 1); sel.classList.add("on");
    all("li[data-boxli]").forEach((li) => li.classList.toggle("is-sel", +li.dataset.boxli! === i));
  };
  syncers.push(() => showSel(-1));
  const clampPos = (i: number) => { const p = st.pos[i]; p[0] = Math.max(-0.6, Math.min(0.6, p[0])); p[1] = Math.max(-0.6, Math.min(0.6, p[1])); };
  let bdrag: { i: number; x: number; y: number; p: [number, number]; id: number } | null = null;
  area.addEventListener("pointerdown", (e) => {
    if (e.button !== 0 || (e.target as HTMLElement).closest("button,select,input,a,.h,.lab-export")) return;
    const hit = hitAt(e);
    if (!hit) return;
    e.stopImmediatePropagation();
    bdrag = { i: hit.i, x: e.clientX, y: e.clientY, p: [st.pos[hit.i][0], st.pos[hit.i][1]], id: e.pointerId };
    area.setPointerCapture(e.pointerId); root.classList.add("lab-moving"); selectLayer("box:" + hit.i);
  }, true);
  area.addEventListener("pointermove", (e) => {
    if (bdrag && e.pointerId === bdrag.id) {
      const r = frameEl.getBoundingClientRect();
      st.pos[bdrag.i] = [bdrag.p[0] + (e.clientX - bdrag.x) / r.width, bdrag.p[1] + (e.clientY - bdrag.y) / r.height];
      clampPos(bdrag.i); comp = build(st); brkComp = null; showSel(bdrag.i);
      e.stopImmediatePropagation(); return;
    }
    if (drag || e.pointerType !== "mouse") return;
    const h = hitAt(e); root.classList.toggle("lab-overbox", !!h); showSel(h ? h.i : -1);
  }, true);
  const endBox = (e: PointerEvent) => {
    if (!bdrag || e.pointerId !== bdrag.id) return;
    const i = bdrag.i; bdrag = null; root.classList.remove("lab-moving"); e.stopImmediatePropagation();
    if (ADMIN && root.classList.contains("lab-advtab")) { bakeNow(); ADMIN.changed(); }
    say(`Box ${i + 1} moved`, 1400);
  };
  area.addEventListener("pointerup", endBox, true); area.addEventListener("pointercancel", endBox, true);
  area.addEventListener("pointerleave", () => { if (!bdrag) { showSel(-1); root.classList.remove("lab-overbox"); } });
  const recentre = () => { pan.x = pan.y = 0; root.classList.add("lab-recentre"); applyPan(); setTimeout(() => root.classList.remove("lab-recentre"), 450); };
  on('[data-a="fit"]', recentre);

  /* resize from any corner: the frame snaps to the nearest preset, never in between */
  all(".lab-frame .h").forEach((h) => {
    h.addEventListener("pointerdown", (e) => {
      e.stopPropagation(); e.preventDefault();
      h.setPointerCapture(e.pointerId); root.classList.add("lab-resizing");
      const move = (ev: PointerEvent) => {
        const r = frameEl.getBoundingClientRect();
        const cx = r.left + r.width / 2, cy = r.top + r.height / 2;
        const w = Math.max(8, Math.abs(ev.clientX - cx) * 2), hh = Math.max(8, Math.abs(ev.clientY - cy) * 2);
        const want = Math.log(w / hh);
        let best = st.frame, d = 1e9;
        FRAMES.forEach((f, i) => { const k = Math.abs(Math.log(f[1]) - want); if (k < d) { d = k; best = i; } });
        if (best !== st.frame) { st.frame = best; syncAll(); }
      };
      const up = () => { h.removeEventListener("pointermove", move); h.removeEventListener("pointerup", up); h.removeEventListener("pointercancel", up); root.classList.remove("lab-resizing"); };
      h.addEventListener("pointermove", move); h.addEventListener("pointerup", up); h.addEventListener("pointercancel", up);
    });
    h.addEventListener("keydown", (e: Event) => {
      const k = (e as KeyboardEvent).key;
      if (k === "ArrowRight" || k === "ArrowUp") { st.frame = (st.frame + FRAMES.length - 1) % FRAMES.length; syncAll(); e.preventDefault(); }
      if (k === "ArrowLeft" || k === "ArrowDown") { st.frame = (st.frame + 1) % FRAMES.length; syncAll(); e.preventDefault(); }
    });
  });

  function layoutFrame() {
    const ar = FRAMES[st.frame][1];
    const cs = getComputedStyle(area);
    const sw = area.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight);
    const sh = area.clientHeight - parseFloat(cs.paddingTop) - parseFloat(cs.paddingBottom);
    root.style.setProperty("--lab-ground", groundHex(st) === "clear" ? "#FCFCFC" : groundHex(st));
    root.classList.toggle("lab-ink", groundHex(st) === "#000000");
    root.classList.toggle("lab-clear", groundHex(st) === "clear");
    root.classList.toggle("lab-nologo", !st.logo);
    let w = sw, h = w / ar;
    if (h > sh) { h = Math.max(60, sh); w = h * ar; }
    Object.assign(frameEl.style, { width: Math.round(w) + "px", height: Math.round(h) + "px" });
    const o = outSize(st.exf >= 3 ? Math.min(1920, EXL[st.exs]) : EXL[st.exs]);
    all(".lab-dim").forEach((el) => (el.textContent = `${o.W} × ${o.H}`));
    all(".lab-fname").forEach((el) => (el.textContent = `glitch-${FRAMES[st.frame][0].replace(":", "x")}`));
    all(".lab-zoom").forEach((el) => (el.textContent = Math.round((w / o.W) * 100) + "%"));
  }
  addEventListener("resize", layoutFrame);
  new ResizeObserver(layoutFrame).observe(area);

  const pos = { x: 0.5, y: 0.5, in: false };
  /* the pointer is read against the frame (not the overscanned canvas), so top, bottom and both sides all count */
  area.addEventListener("pointermove", (e) => { const r = frameEl.getBoundingClientRect(); pos.x = (e.clientX - r.left) / r.width; pos.y = (e.clientY - r.top) / r.height; pos.in = pos.x > -0.15 && pos.x < 1.15 && pos.y > -0.15 && pos.y < 1.15; }, { passive: true });
  area.addEventListener("pointerleave", () => (pos.in = false));
  const lean = { x: 0, y: 0 }; // smoothed pointer direction, -1..1 on each axis
  let leanBase: { src: Composition; ox: number; oy: number; fs: number; ls: number; fpx: number; lpx: number; fty: number; lty: number; fsv: number; lsv: number } | null = null;
  let drive = 0, elapsed = 3, tPrev = 0, visible = true, busy = false;
  /* scroll progress through the hero breaks the composition apart: tied to position, not speed, so it
     scrubs both ways and settles exactly where you stop. Exports always use the controls, never this. */
  const BREAK: Num = { slice: 100, stretch: 88, grain: 78, echo: 92, spread: 82, refract: 80 };
  let brk = 0, brkComp: Composition | null = null, brkAt = -1, viewBase: Composition | null = null, viewSrc: Composition | null = null;
  /* PERF: the canvas only overscans the frame (2.9× the pixels) while the hero is being scrolled and the glitch
     can spill past the frame. At rest it is exactly the frame: identical picture, a third of the GPU work. */
  let osOn = false;
  const setOS = (on: boolean) => {
    if (on === osOn || !engine) return;
    osOn = on; frameEl.classList.toggle("lab-os", on);
    engine.refRes = on ? Math.round(900 * (1 + 2 * OS)) : 900; // same grain per frame pixel either way
    viewSrc = null; leanBase = null; sizeDirty = true; maskKey = "";
  };
  const viewComp = (k: number) => { const src = brokenComp(k); if (src !== viewSrc) { viewSrc = src; viewBase = osOn ? overscan(src) : clone(src); } return viewBase!; };
  /* PERF: read the canvas size from a ResizeObserver instead of forcing layout every frame */
  let cw = canvas.clientWidth, sizeDirty = true, maskKey = "";
  new ResizeObserver(() => { cw = canvas.clientWidth; sizeDirty = true; }).observe(canvas);
  const brokenComp = (k: number) => {
    if (k <= 0.001) return comp;
    if (brkComp && Math.abs(k - brkAt) < 0.004) return brkComp;
    const v = { ...st.v };
    for (const key in BREAK) v[key] = v[key] + (Math.max(v[key], BREAK[key]) - v[key]) * k;
    brkComp = build({ ...st, v }); brkAt = k;
    return brkComp;
  };
  new IntersectionObserver((es) => (visible = es[0].isIntersecting)).observe(area);
  const loop = (now: number) => {
    requestAnimationFrame(loop);
    now /= 1000;
    const dt = Math.min(now - (tPrev || now), 0.05); tPrev = now;
    if (!engine || !visible || busy) return;
    if (!st.paused) elapsed += dt * timeScale(st);
    const dx = pos.in ? Math.max(-1, Math.min(1, (pos.x - 0.5) * 2)) : 0, dy = pos.in ? Math.max(-1, Math.min(1, (pos.y - 0.5) * 2)) : 0;
    /* intensity: distance to the nearest edge, so moving up, down or sideways all build it equally */
    const target = Math.max(Math.abs(dx), Math.abs(dy));
    drive += (target - drive) * 0.08;
    lean.x += (dx - lean.x) * 0.08; lean.y += (dy - lean.y) * 0.08;
    const p = reduce ? 0 : parseFloat(root.style.getPropertyValue("--p")) || 0; // raw scroll progress through the hero
    const target2 = p < 0.04 ? 0 : Math.min(1, (p - 0.04) / 0.8);
    brk += (target2 * target2 * (3 - 2 * target2) - brk) * 0.18; // smoothstep, eased toward the scroll position
    if (brk > 0.003) setOS(true); else if (brk < 0.002) setOS(false);
    engine.bg = rgb01(groundHex(st));
    /* render at the size it is shown: device pixels × the scroll transition's CSS scale, in steps, capped */
    const fs = parseFloat(frameEl.style.getPropertyValue("--fs")) || 1;
    const base = Math.min(devicePixelRatio || 1, 2) * cw;
    const want = Math.max(1, Math.min(fs, 3600 / Math.max(1, base)));
    const step = Math.max(1, Math.floor(want * 4) / 4);
    if (Math.abs(step - engine.boost) > 0.01) { engine.boost = step; sizeDirty = true; }
    if (sizeDirty) { engine.resize(); sizeDirty = false; }
    const c = viewComp(brk);
    /* direction: the echo leans toward the pointer, slices tear the way you move side to side, and
       height stretches the pixels up or down. Applied to the view only, never to exports. */
    if (!leanBase || leanBase.src !== c) leanBase = { src: c, ox: c.layer.offsetX, oy: c.layer.offsetY, fs: (c.frontLayer.slice as Num).shift, ls: (c.layer.slice as Num).shift, fpx: (c.frontLayer.pixstretch as Num).offset, lpx: (c.layer.pixstretch as Num).offset, fty: (c.frontLayer.pixstretch as Num).ty ?? 50, lty: (c.layer.pixstretch as Num).ty ?? 50, fsv: (c.frontLayer.slice as Num).shiftV || 0, lsv: (c.layer.slice as Num).shiftV || 0 };
    c.layer.offsetX = leanBase.ox + lean.x * 2.2; c.layer.offsetY = leanBase.oy + lean.y * 2.2;
    (c.frontLayer.slice as Num).shift = leanBase.fs * (1 + lean.x * 1.8); // flips direction smoothly as you cross to the left
    (c.layer.slice as Num).shift = leanBase.ls * (1 + lean.x * 1.5);
    /* vertical: never cross the stretch offset through zero (the shader flips which side it stretches
       at 0, which read as a jump at the halfway mark). The amount grows with distance from the middle,
       and the stretch line itself slides up and down with the pointer, so it is continuous end to end. */
    const fsg = leanBase.fpx < 0 ? -1 : 1, lsg = leanBase.lpx < 0 ? -1 : 1, ay = Math.abs(lean.y);
    (c.frontLayer.pixstretch as Num).offset = fsg * (Math.abs(leanBase.fpx) + ay * 5);
    (c.layer.pixstretch as Num).offset = lsg * (Math.abs(leanBase.lpx) + ay * 3.5);
    (c.frontLayer.pixstretch as Num).ty = leanBase.fty + lean.y * 32;
    (c.layer.pixstretch as Num).ty = leanBase.lty + lean.y * 24;
    (c.frontLayer.slice as Num).shiftV = leanBase.fsv + ay * 2.5;
    (c.layer.slice as Num).shiftV = leanBase.lsv + ay * 2;
    if (osOn) {
      const edge = (OS / (1 + 2 * OS)) * 100, open = Math.min(1, brk * 1.4);
      const ma = (edge * (1 - open)).toFixed(2), mb = (edge * (1 - open) + 14 * open).toFixed(2);
      if (ma + mb !== maskKey) { maskKey = ma + mb; frameEl.style.setProperty("--ma", ma + "%"); frameEl.style.setProperty("--mb", mb + "%"); } // PERF: no style recalc when unchanged
    }
    engine.render(c.boxes, "landing", elapsed + brk * 2.5, c.layer, gainOf(st) * (1 + drive * 0.6) * (1 + brk * 1.6), c.frontLayer, 1, true);
  };
  requestAnimationFrame(loop);
  syncAll();

  /* --- website build: live composition, admin save / push live / Advanced (admin.ts) --- */
  /* fold every control into the base so the base IS what you see, then put the controls back to neutral.
     Intensity is a pure preview multiplier (the website has no equivalent), so it is kept as it is. */
  function bakeNow() {
    const g = st.v.gain, on = st.order.map((i) => st.on[i]);
    BASE = build(st, true);
    st.v = Object.fromEntries(SLIDERS.map((x) => [x.key, x.def])); st.v.gain = g;
    st.order = BASE.boxes.map((_, i) => i); st.on = on; st.pos = BASE.boxes.map(() => [0, 0] as [number, number]); st.echoOff = false;
    syncAll();
  }
  if (opts.api && opts.wire) {
    ADMIN = opts.wire(root, opts.api, {
      current: () => build(st, true),
      bake: bakeNow,
      setBase: (c) => {
        BASE = c;
        const keep = { frame: st.frame, ground: st.ground, logo: st.logo, paused: st.paused, exf: st.exf, exs: st.exs, exl: st.exl, layout: st.layout };
        Object.assign(st, fresh(), keep);
        syncAll();
        ADMIN?.changed();
      },
      base: () => BASE,
      refresh: () => { comp = build(st); brkComp = null; },
      viewOnly: () => {
        const n: string[] = [];
        if (st.v.gain !== 50) n.push("Intensity");
        if (st.v.flow !== 50) n.push("Flow speed");
        if (st.on.some((x) => !x)) n.push("hidden boxes stay in the saved composition");
        return n;
      },
      say,
    });
  }

  /* --- exports (render offscreen at the chosen frame; same time + controls as the preview) --- */
  let dlp: Promise<any> | null = null;
  const getDl = () => (dlp ??= (window as any).claude?.use ? (window as any).claude.use("downloads") : Promise.resolve(null));
  async function save(filename: string, blob: Blob) {
    const dl = await getDl();
    if (dl) {
      try { await dl.save({ filename, data: blob }); }
      catch (err: any) {
        if (err?.code === "declined") return;
        say(err?.code === "rate_limited" ? "A download is already waiting for you to confirm." : "That download didn’t work. Try again in a moment.");
      }
      return;
    }
    try {
      const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = filename;
      document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 4000);
    } catch { say("Downloads aren’t available in this view. Open the guidelines in Claude to save files."); }
  }
  function outSize(long: number) {
    const ar = FRAMES[st.frame][1];
    return ar >= 1 ? { W: long, H: Math.round(long / ar / 2) * 2 } : { W: Math.round((long * ar) / 2) * 2, H: long };
  }
  function offscreen(W: number, H: number) {
    const host = document.createElement("div");
    Object.assign(host.style, { position: "fixed", left: "-100000px", top: "0", width: W + "px", height: H + "px", pointerEvents: "none" });
    const c = document.createElement("canvas");
    Object.assign(c.style, { width: W + "px", height: H + "px", display: "block" });
    host.appendChild(c); document.body.appendChild(host);
    const e = new GlitchEngine(c); e.dprCap = 1; e.refRes = Math.max(900, Math.round(900 * Math.max(W, H) / 1920)); e.resize();
    if (Math.max(c.width, c.height) > e.gl.getParameter(e.gl.MAX_TEXTURE_SIZE)) throw new Error("too big");
    return { e, c, host };
  }
  const stamp = () => { const d = new Date(); return `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}${String(d.getDate()).padStart(2, "0")}-${String(d.getHours()).padStart(2, "0")}${String(d.getMinutes()).padStart(2, "0")}`; };
  const fname = (ext: string, W: number, H: number) => `different-thinking-${soloOf(st) >= 0 ? "texture-0" + (soloOf(st) + 1) : "glitch"}-${W}x${H}-${stamp()}.${ext}`;

  async function doExport(kind: string, btn: HTMLElement) {
    if (busy) return;
    busy = true; btn.classList.add("busy"); root.classList.add("lab-busy");
    let off: ReturnType<typeof offscreen> | null = null;
    try {
      const hex = groundHex(st), clear = hex === "clear" && kind !== "jpg" && kind !== "mp4" && kind !== "webm";
      const logoCol = hex === "#000000" ? "#FCFCFC" : "#000000";
      const g = gainOf(st);
      if (kind !== "mp4" && kind !== "webm") {
        const { W, H } = outSize(EXL[st.exs]);
        say(`Exporting ${W} × ${H} ${kind.toUpperCase()}`, 9000);
        off = offscreen(W, H);
        const out = document.createElement("canvas"); out.width = W; out.height = H;
        const ctx = out.getContext("2d")!;
        const draw = (bg: [number, number, number]) => { off!.e.bg = bg; off!.e.render(comp.boxes, "landing", elapsed, comp.layer, g, comp.frontLayer, 1, true); };
        if (!clear) { draw(rgb01(hex)); ctx.drawImage(off.c, 0, 0); }
        else {
          // difference matte: render on white and on black, recover straight alpha
          draw([1, 1, 1]); ctx.drawImage(off.c, 0, 0); const A = ctx.getImageData(0, 0, W, H);
          draw([0, 0, 0]); ctx.clearRect(0, 0, W, H); ctx.drawImage(off.c, 0, 0); const B = ctx.getImageData(0, 0, W, H);
          const a = A.data, b = B.data;
          for (let i = 0; i < a.length; i += 4) {
            const al = Math.max(0, Math.min(255, 255 - ((a[i] - b[i]) + (a[i + 1] - b[i + 1]) + (a[i + 2] - b[i + 2])) / 3));
            if (al < 1) { b[i + 3] = 0; continue; }
            const k = 255 / al;
            b[i] = Math.min(255, b[i] * k); b[i + 1] = Math.min(255, b[i + 1] * k); b[i + 2] = Math.min(255, b[i + 2] * k); b[i + 3] = al;
          }
          ctx.putImageData(B, 0, 0);
        }
        if (st.logo) { const im = await logoImg(logoCol); const r = logoRect(W, H); ctx.drawImage(im, r.x, r.y, r.w, r.h); }
        const blob: Blob = await new Promise((res, rej) => out.toBlob((b) => (b ? res(b) : rej(new Error("img"))), kind === "jpg" ? "image/jpeg" : kind === "webp" ? "image/webp" : "image/png", 0.92));
        off.e.dispose(); off.host.remove(); off = null;
        busy = false;
        await save(fname(kind, W, H), blob);
      } else {
        if (typeof MediaRecorder === "undefined") { say("Video export needs Chrome, Edge or Firefox."); return; }
        const { W, H } = outSize(Math.min(1920, EXL[st.exs]));
        const SEC = EXSEC[st.exl], FPS = 30;
        off = offscreen(W, H); off.e.loop = SEC; off.e.bg = rgb01(clear ? "#FCFCFC" : hex);
        const out = document.createElement("canvas"); out.width = W; out.height = H;
        const ctx = out.getContext("2d")!;
        const im = st.logo ? await logoImg(logoCol) : null; const lr = logoRect(W, H);
        const mime = pickType(kind === "mp4" ? MP4_TYPES : WEBM_TYPES);
        if (!mime) { say(kind === "mp4" ? "This browser can’t record MP4. Choose WebM, or use Chrome or Safari." : "This browser can’t record WebM. Choose MP4."); return; }
        const stream = (out as any).captureStream(FPS) as MediaStream;
        const rec = new MediaRecorder(stream, { mimeType: mime || undefined, videoBitsPerSecond: 14e6 });
        const chunks: Blob[] = [];
        rec.ondataavailable = (e) => e.data.size && chunks.push(e.data);
        const done = new Promise<void>((r) => (rec.onstop = () => r()));
        const frame = (t: number) => {
          off!.e.render(comp.boxes, "landing", t, comp.layer, g * (1 + 0.35 * (0.5 - 0.5 * Math.cos((t / SEC) * Math.PI * 2))), comp.frontLayer, 1, true);
          ctx.drawImage(off!.c, 0, 0);
          if (im) ctx.drawImage(im, lr.x, lr.y, lr.w, lr.h);
        };
        frame(0);
        rec.start(250);
        say(`Recording a ${SEC}-second loop`, (SEC + 2) * 1000);
        const t0 = performance.now();
        await new Promise<void>((res) => {
          const step = () => {
            const t = (performance.now() - t0) / 1000;
            if (t >= SEC) { frame(0); res(); return; }
            frame(t); requestAnimationFrame(step);
          };
          requestAnimationFrame(step);
        });
        rec.stop(); await done;
        off.e.dispose(); off.host.remove(); off = null;
        busy = false;
        const ext = mime.includes("mp4") ? "mp4" : "webm";
        await save(fname(ext, W, H), new Blob(chunks, { type: mime || "video/webm" }));
      }
    } catch (err) {
      console.error(err);
      say("Export failed on this device. Try HD, or a desktop browser.");
    } finally {
      if (off) { try { off.e.dispose(); } catch {} off.host.remove(); }
      busy = false; btn.classList.remove("busy"); root.classList.remove("lab-busy");
    }
  }
  (window as any).__dtLab = { state: st, export: doExport, build: () => build(st) };
}

/* ---------- live renders for the Motion section (read-only: no controls, no storage, no network) ----------
   opts.box: -1 = the full composition, 0–3 = one box as a full-bleed texture.
   opts.cursor: the glitch reacts to the pointer exactly as on the website (distance from centre drives intensity);
   with no pointer a ghost cursor drifts so the reaction is visible on touch screens too.
   opts.loupe: a 2D canvas that shows a pixel-exact zoom of the area around the cursor. */
export function live(canvas: HTMLCanvasElement, opts: { box?: number; cursor?: boolean; loupe?: HTMLCanvasElement; zoom?: number; ghost?: HTMLElement; readout?: HTMLElement; mark?: HTMLElement } = {}) {
  let engine: GlitchEngine;
  try { engine = new GlitchEngine(canvas); engine.dprCap = 1.5; } catch (e) { canvas.parentElement?.classList.add("lab-nogl"); return; } // PERF: demos at 1.5× density
  const keepBase = BASE; BASE = FROZEN; // these always show the guidelines' own composition, never the live one
  const st = fresh();
  if (opts.box != null && opts.box >= 0) st.layout = "T" + opts.box;
  const comp = build(st, false, false);
  BASE = keepBase;
  engine.bg = rgb01("#FCFCFC");
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const host = canvas.parentElement!;
  const pos = { x: 0.5, y: 0.5, in: false, last: -10 };
  if (opts.cursor) {
    host.addEventListener("pointermove", (e) => { if (e.pointerType !== "mouse") return; const r = canvas.getBoundingClientRect(); pos.x = (e.clientX - r.left) / r.width; pos.y = (e.clientY - r.top) / r.height; pos.in = true; }, { passive: true });
    host.addEventListener("pointerleave", () => { pos.in = false; pos.last = performance.now() / 1000; });
  }
  let visible = false, elapsed = 2 + (opts.box ?? 0) * 3, tPrev = 0, drive = 0, lastDraw = 0, sized = false;
  new ResizeObserver(() => (sized = false)).observe(canvas);
  const lean = { x: 0, y: 0 };
  new IntersectionObserver((es) => (visible = es[0].isIntersecting), { rootMargin: "80px" }).observe(canvas);
  const lctx = opts.loupe ? opts.loupe.getContext("2d")! : null;
  const loop = (now: number) => {
    requestAnimationFrame(loop);
    now /= 1000;
    const dt = Math.min(now - (tPrev || now), 0.05); tPrev = now;
    if (!visible) return;
    if (!reduce) elapsed += dt;
    if (now - lastDraw < 1 / 31) return; // PERF: the demos draw at 30 fps; the hero keeps 60
    lastDraw = now;
    let cx = pos.x, cy = pos.y, active = pos.in;
    if (opts.cursor && !pos.in && now - pos.last > 1.2 && !reduce) {
      /* ghost cursor: a slow figure-of-eight from the calm centre out to the corners and back */
      const t = elapsed * 0.32;
      cx = 0.5 + 0.44 * Math.sin(t); cy = 0.5 + 0.4 * Math.sin(t * 2) * Math.cos(t * 0.5);
      active = true;
      if (opts.ghost) { opts.ghost.style.left = cx * 100 + "%"; opts.ghost.style.top = cy * 100 + "%"; opts.ghost.classList.add("on"); }
    } else if (opts.ghost) opts.ghost.classList.remove("on");
    /* same response as the lab hero: intensity builds toward ANY edge, and the direction steers the glitch
       (echo leans toward the pointer, slices tear side to side, the stretch line follows up and down) */
    const dx = opts.cursor && active ? Math.max(-1, Math.min(1, (cx - 0.5) * 2)) : 0, dy = opts.cursor && active ? Math.max(-1, Math.min(1, (cy - 0.5) * 2)) : 0;
    drive += (Math.max(Math.abs(dx), Math.abs(dy)) - drive) * 0.15; // = the website's 8% per frame, at 30 fps
    lean.x += (dx - lean.x) * 0.15; lean.y += (dy - lean.y) * 0.15;
    const mul = opts.cursor ? 1 + drive * (0.4 + 1 * 2.4) : 1; // reactivity 100
    let L = comp.layer, F = comp.frontLayer;
    if (opts.cursor) {
      const ay = Math.abs(lean.y);
      const steer = <T extends { slice: unknown; pixstretch: unknown }>(l: T, k: number): T => {
        const sl = l.slice as Num, px = l.pixstretch as Num, off = px.offset || 0;
        return { ...l, slice: { ...sl, shift: (sl.shift || 0) * (1 + lean.x * 1.6 * k), shiftV: (sl.shiftV || 0) + ay * 3 * k }, pixstretch: { ...px, offset: (off < 0 ? -1 : 1) * (Math.abs(off) + ay * 7 * k), ty: (px.ty ?? 50) + lean.y * 30 * k } } as T;
      };
      L = { ...steer(L, 0.8), offsetX: L.offsetX + lean.x * 3.5, offsetY: L.offsetY + lean.y * 3.5 };
      F = steer(F, 1);
    }
    if (opts.readout) opts.readout.textContent = `X = ${lean.x >= 0 ? " " : ""}${lean.x.toFixed(2)};  Y = ${lean.y >= 0 ? " " : ""}${lean.y.toFixed(2)};  INTENSITY = ${mul.toFixed(2)}×;`;
    if (!sized) { engine.resize(); sized = true; }
    engine.render(comp.boxes, "landing", elapsed, L, gainOf(st) * mul, F, 1, true);
    if (lctx && opts.loupe) {
      const L = opts.loupe, z = opts.zoom || 4;
      const lw = L.clientWidth * Math.min(devicePixelRatio || 1, 2), lh = L.clientHeight * Math.min(devicePixelRatio || 1, 2);
      if (L.width !== Math.round(lw) || L.height !== Math.round(lh)) { L.width = Math.round(lw); L.height = Math.round(lh); }
      const k = canvas.width / Math.max(1, canvas.clientWidth); // device px per css px of the source
      const sw = (L.clientWidth / z) * k, sh = (L.clientHeight / z) * k;
      const fx = Math.max(0, Math.min(canvas.width - sw, cx * canvas.width - sw / 2)), fy = Math.max(0, Math.min(canvas.height - sh, cy * canvas.height - sh / 2));
      lctx.imageSmoothingEnabled = false;
      lctx.fillStyle = "#FCFCFC"; lctx.fillRect(0, 0, L.width, L.height);
      lctx.drawImage(canvas, fx, fy, sw, sh, 0, 0, L.width, L.height);
      if (opts.mark) Object.assign(opts.mark.style, { left: (fx / canvas.width) * 100 + "%", top: (fy / canvas.height) * 100 + "%", width: (sw / canvas.width) * 100 + "%", height: (sh / canvas.height) * 100 + "%" });
    }
  };
  requestAnimationFrame(loop);
}
