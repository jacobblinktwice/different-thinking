/* Guidelines lab — website connection + admin tools.
   Only active when the page is served by the website (mount opts.api is set). The claude.ai
   artifact build never passes an api, so nothing here runs there.

   Everyone: the lab opens on the composition that is LIVE on the website, and can edit and export.
   Admins (LAB_KEY, checked server-side by /api/composition): version history, Save (a new history
   entry) and Push live, plus the Advanced panel — the full per-box/per-layer effect editor that the
   old /lab page had. The key is never in this bundle; it is typed, verified by the API, then kept
   for the browser session only. */
import { SCHEMA, instantiate, parseComposition, snapshotComposition, type Composition, type Effect, type EffectParams } from "./glitch/config";

type Num = Record<string, number>;
type ParamDef =
  | string
  | { label: string; min: number; max: number; step: number; val: number; unit?: string }
  | { type: "select"; options: string[]; val: number }
  | { type: "toggle"; val: boolean; label: string }
  | { type: "color"; val: string; label: string };
const S = SCHEMA as unknown as Record<string, { name: string; hasGrad?: string; params: Record<string, ParamDef> }>;
type Version = { t: number; n?: number; snap: unknown; live?: boolean };

export interface LabCtx {
  /** the composition as seen right now with every control baked in (what Save / Push live writes) */
  current(): Composition;
  /** fold the simple controls into the base composition and reset them to neutral */
  bake(): void;
  /** replace the base composition (load a version / the live one) */
  setBase(c: Composition): void;
  /** the editable base composition (Advanced panel edits it in place) */
  base(): Composition;
  /** re-render after an in-place edit of base() */
  refresh(): void;
  /** controls that change only the preview/export and cannot be saved (non-neutral ones listed) */
  viewOnly(): string[];
  say(t: string, ms?: number): void;
}

const KEY = "dt-lab-key";
const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]!);
const EYE = '<svg class="eye" viewBox="0 0 16 16" aria-hidden="true"><path class="eye-o" d="M1.5 8s2.5-4.5 6.5-4.5S14.5 8 14.5 8 12 12.5 8 12.5 1.5 8 1.5 8z" fill="none" stroke="currentColor"/><circle class="eye-o" cx="8" cy="8" r="2" fill="currentColor"/><path class="eye-c" d="M2 9.5c1.6 1.4 3.6 2.2 6 2.2s4.4-.8 6-2.2M4 11.3 3 13m4.2-1-.4 2m4.2-2.6 1 1.8" fill="none" stroke="currentColor"/></svg>';

export function wireAdmin(root: HTMLElement, api: string, ctx: LabCtx) {
  const $ = <T extends HTMLElement>(s: string) => root.querySelector(s) as T;
  root.classList.add("lab-api");
  const pub = $<HTMLDivElement>(".lp-pub");
  const hist = $<HTMLDivElement>(".lp-history");
  const histBtn = $<HTMLButtonElement>('[data-a="history"]');
  const saveBtn = $<HTMLButtonElement>('[data-a="save"]');
  const liveBtn = $<HTMLButtonElement>('[data-a="live"]');
  const unlock = $<HTMLFormElement>(".lp-unlock");
  const adv = $<HTMLDivElement>(".lp-adv");

  let key: string | null = null;
  try { key = sessionStorage.getItem(KEY); } catch { /* storage unavailable */ }
  let versions: Version[] = [];
  let liveSnap: string | null = null, savedSnap: string | null = null, picked: number | null = null;
  let busy = false;

  const snapOf = (c: Composition) => snapshotComposition(c.boxes, c.layer, c.frontLayer);
  const curSnap = () => JSON.stringify(snapOf(ctx.current()));

  /* ---- load the live composition for everyone ---- */
  fetch(api, { cache: "no-store" })
    .then((r) => (r.ok ? r.json() : null))
    .then((j: { comp?: unknown; saved?: unknown; versions?: Version[] } | null) => {
      if (!j) return;
      if (j.comp) liveSnap = JSON.stringify(j.comp);
      if (j.saved) savedSnap = JSON.stringify(j.saved);
      if (Array.isArray(j.versions)) versions = j.versions;
      const c = j.comp ? parseComposition(j.comp) : null;
      if (c) { ctx.setBase(c); ctx.say("Showing the live composition", 1800); }
      paint();
    })
    .catch(() => { /* offline: the built-in composition stays */ });

  const setAdmin = (k: string | null) => {
    key = k;
    try { if (k) sessionStorage.setItem(KEY, k); else sessionStorage.removeItem(KEY); } catch { /* ignore */ }
    root.classList.toggle("lab-admin", !!k);
    if (!k) { showTab("design"); hist.hidden = true; }
    paint(); renderAdv();
  };

  /* ---- unlock ---- */
  /* the admin buttons are always visible; for anyone not unlocked they open the login panel, and once the
     code is accepted the action they clicked carries on (open History, Advanced, Save or Push live) */
  let pending: (() => void) | null = null;
  const openLogin = (then: (() => void) | null) => {
    pending = then; hist.hidden = true;
    unlock.hidden = false; unlock.classList.remove("err");
    (unlock.querySelector("input") as HTMLInputElement).focus();
  };
  const needAdmin = (fn: () => void) => () => { if (key) fn(); else openLogin(fn); };
  unlock.querySelector("[data-close]")?.addEventListener("click", () => { unlock.hidden = true; pending = null; });
  unlock.addEventListener("keydown", (e) => { if (e.key === "Escape") { unlock.hidden = true; pending = null; } });
  $<HTMLButtonElement>('[data-a="admin"]').addEventListener("click", () => {
    if (unlock.hidden) openLogin(null); else unlock.hidden = true;
  });
  unlock.addEventListener("submit", async (e) => {
    e.preventDefault();
    const inp = unlock.querySelector("input") as HTMLInputElement, cand = inp.value.trim();
    if (!cand) return;
    let ok = false;
    try { ok = (await fetch(api, { method: "POST", headers: { "x-lab-key": cand } })).ok; } catch { ok = false; }
    if (ok) {
      inp.value = ""; unlock.hidden = true; setAdmin(cand); ctx.say("Admin unlocked: Save, Push live and Advanced are on");
      const go = pending; pending = null; if (go) setTimeout(go, 0);
    }
    else { inp.value = ""; unlock.classList.add("err"); setTimeout(() => unlock.classList.remove("err"), 1200); }
  });
  $<HTMLButtonElement>('[data-a="lock"]').addEventListener("click", () => {
    if (!key) { if (unlock.hidden) openLogin(null); else unlock.hidden = true; return; }
    setAdmin(null); ctx.say("Locked. Edits and exports still work.");
  });

  /* ---- save / push live ---- */
  const persist = async (action: "save" | "publish") => {
    if (busy || !key) return;
    const notes = ctx.viewOnly();
    const what = action === "publish" ? "Push this composition live for every visitor to the website?" : "Save this composition as a new version?";
    if (!confirm(what + (notes.length ? `\n\nNot saved (preview and export only): ${notes.join(", ")}.` : ""))) return;
    busy = true; paint();
    const snap = snapOf(ctx.current());
    try {
      const res = await fetch(api, { method: "PUT", headers: { "Content-Type": "application/json", "x-lab-key": key }, body: JSON.stringify({ action, snap }) });
      const j = (await res.json().catch(() => null)) as { ok?: boolean; error?: string; versions?: Version[] } | null;
      if (res.status === 401) { busy = false; setAdmin(null); ctx.say("That admin code no longer works. Unlock again."); return; }
      if (!res.ok || !j?.ok) throw new Error(j?.error || `HTTP ${res.status}`);
      if (Array.isArray(j.versions)) { versions = j.versions; picked = versions[0]?.t ?? null; }
      const s = JSON.stringify(snap);
      savedSnap = s;
      if (action === "publish") liveSnap = s;
      ctx.bake(); // what you saved is now the base; the simple controls go back to neutral
      ctx.say(action === "publish" ? `Live on the website as v${versions[0]?.n ?? ""}` : `Saved as v${versions[0]?.n ?? ""}`);
    } catch (err) {
      ctx.say(`Couldn't ${action === "publish" ? "push live" : "save"}: ${err instanceof Error ? err.message : err}`, 4000);
    }
    busy = false; paint(); renderAdv();
  };
  saveBtn.addEventListener("click", needAdmin(() => persist("save")));
  liveBtn.addEventListener("click", needAdmin(() => persist("publish")));

  /* ---- history (admins only) ---- */
  const vLabel = (i: number) => `v${versions[i]?.n ?? versions.length - i}`;
  const stamp = (t: number) => new Date(t).toLocaleString(undefined, { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });
  histBtn.addEventListener("click", needAdmin(() => { hist.hidden = !hist.hidden; paint(); }));
  hist.addEventListener("click", (e) => {
    const b = (e.target as HTMLElement).closest<HTMLButtonElement>("[data-v]");
    if (!b) return;
    const v = versions[+b.dataset.v!];
    const c = v && parseComposition(v.snap);
    if (!c) { ctx.say("That version predates the current baseline and can't be loaded."); return; }
    picked = v.t; ctx.setBase(c); hist.hidden = true; paint(); renderAdv();
    ctx.say(`Loaded ${vLabel(+b.dataset.v!)} into the lab`);
  });
  document.addEventListener("pointerdown", (e) => {
    if (!hist.hidden && !pub.contains(e.target as Node)) { hist.hidden = true; paint(); }
    if (!unlock.hidden && !pub.contains(e.target as Node) && !(e.target as HTMLElement).closest?.('[data-tab="adv"]')) { unlock.hidden = true; pending = null; }
  });

  let lastCur = "";
  function paint() {
    if (!key) {
      histBtn.querySelector("b")!.textContent = "";
      saveBtn.disabled = liveBtn.disabled = false; saveBtn.classList.remove("on"); liveBtn.classList.remove("on");
      saveBtn.textContent = "Save"; liveBtn.textContent = "Push live";
      return;
    }
    const cur = curSnap(); lastCur = cur;
    const snaps = versions.map((v) => JSON.stringify(v.snap));
    const pi = picked == null ? -1 : versions.findIndex((v) => v.t === picked);
    const exact = pi >= 0 && snaps[pi] === cur ? pi : snaps.indexOf(cur);
    const shown = exact >= 0 ? exact : pi, edited = exact < 0 && pi >= 0;
    const liveIdx = liveSnap == null ? -1 : snaps.indexOf(liveSnap);
    histBtn.querySelector("b")!.textContent = shown >= 0 ? vLabel(shown) + (edited ? "*" : "") : "";
    histBtn.setAttribute("aria-expanded", String(!hist.hidden));
    const dirtySaved = cur !== savedSnap, dirtyLive = cur !== liveSnap;
    saveBtn.disabled = busy || !dirtySaved; liveBtn.disabled = busy || !dirtyLive;
    saveBtn.textContent = busy ? "…" : dirtySaved ? "Save" : "Saved";
    liveBtn.innerHTML = busy ? "…" : dirtyLive ? "Push live" : '<i class="lp-dot"></i>Live';
    saveBtn.classList.toggle("on", dirtySaved && !busy); liveBtn.classList.toggle("on", dirtyLive && !busy);
    if (!hist.hidden)
      hist.innerHTML = `<p>Version history${edited ? " · * edited since loading" : ""}</p>` +
        (versions.length ? "" : "<p>No saves yet</p>") +
        versions.map((v, i) => `<button type="button" data-v="${i}" aria-current="${i === shown}"><b>${vLabel(i)}${i === shown && edited ? "*" : ""}</b><span>${esc(stamp(v.t))}</span>${i === liveIdx ? '<em>Live</em>' : ""}</button>`).join("");
  }
  // keep the dirty state honest while anyone edits (cheap: one serialise every 600 ms, admins only)
  setInterval(() => { if (key && document.visibilityState === "visible" && curSnap() !== lastCur) paint(); }, 600);

  /* ---- Design / Advanced tabs ---- */
  const tabs = Array.from(root.querySelectorAll<HTMLButtonElement>("[data-tab]"));
  function showTab(t: string) {
    tabs.forEach((b) => b.setAttribute("aria-selected", String(b.dataset.tab === t)));
    root.classList.toggle("lab-advtab", t === "adv");
    if (t === "adv") { ctx.bake(); renderAdv(); }
  }
  tabs.forEach((b) => b.addEventListener("click", () => (b.dataset.tab === "adv" ? needAdmin(() => showTab("adv"))() : showTab(b.dataset.tab!))));

  /* ---- Advanced: the full editor, generated from the effect schema ---- */
  let target: number | "layer" | "front" | "logo" = 0;
  const open = new Set<string>(["layout"]);
  let addOpen = false;
  const edit = () => { ctx.refresh(); };
  function slider(path: string, label: string, min: number, max: number, step: number, val: number, unit = "") {
    const p = max > min ? ((val - min) / (max - min)) * 100 : 0;
    const dp = step < 1 ? (step < 0.05 ? 2 : 1) : 0;
    return `<label class="lp-row lp-row--adv" title="${esc(label)}${unit ? ` (${esc(unit)})` : ""}"><span>${esc(label)}</span><input type="range" min="${min}" max="${max}" step="${step}" value="${val}" data-p="${path}" style="--p:${p}%"><input type="number" min="${min}" max="${max}" step="${step}" value="${dp ? val.toFixed(dp) : Math.round(val)}" data-p="${path}"></label>`;
  }
  function paramsHtml(prefix: string, defs: Record<string, ParamDef>, params: EffectParams, keys?: string[]) {
    return (keys || Object.keys(defs)).map((k) => {
      const d = defs[k];
      if (typeof d === "string") return `<div class="adv-sub">${esc(d)}</div>`;
      if ("type" in d && d.type === "select") return `<label class="adv-field"><span>${esc(k)}</span><select data-p="${prefix}.${k}" data-num>${d.options.map((o, i) => `<option value="${i}"${Number(params[k]) === i ? " selected" : ""}>${esc(o)}</option>`).join("")}</select></label>`;
      if ("type" in d && d.type === "toggle") return `<label class="adv-field"><span>${esc(d.label)}</span><input type="checkbox" data-p="${prefix}.${k}"${params[k] ? " checked" : ""}></label>`;
      if ("type" in d && d.type === "color") return `<label class="adv-field"><span>${esc(d.label)}</span><input type="color" data-p="${prefix}.${k}" value="${esc(String(params[k]))}"></label>`;
      const n = d as { label: string; min: number; max: number; step: number; unit?: string };
      return slider(`${prefix}.${k}`, n.label, n.min, n.max, n.step, Number(params[k] ?? 0), n.unit);
    }).join("");
  }
  function sec(id: string, title: string, body: string, extra = "") {
    const isOpen = open.has(id);
    return `<div class="adv-sec${extra}"><div class="adv-head"><button type="button" class="adv-name" data-open="${id}"><i>${isOpen ? "▾" : "▸"}</i>${esc(title)}</button></div>${isOpen ? `<div class="adv-body">${body}</div>` : ""}</div>`;
  }
  function renderAdv() {
    if (!adv) return;
    if (!key) { adv.innerHTML = ""; return; }
    const B = ctx.base();
    if (typeof target === "number" && target >= B.boxes.length) target = 0;
    const name = target === "layer" ? "Echo" : target === "front" ? "Front layer" : target === "logo" ? "Logotype" : `Box ${target + 1}`;
    const tabsHtml = `<div class="adv-title"><span>${name}</span><small>Select a layer to edit it</small></div>`;
    let body = "";
    if (target === "logo") {
      body += `<p class="adv-note" style="padding-top:12px">The logotype sits over exports only. It has no effects, so there is nothing to edit here.</p>`;
    } else if (target === "layer") {
      const L = B.layer;
      body += `<p class="adv-note">A duplicate of every box, behind them, with its own slice and pixel stretch. Reactivity scales how much the pointer drives the glitch on the website.</p>`;
      body += sec("layer", "Duplicate layer",
        `<label class="adv-field"><span>Enabled</span><input type="checkbox" data-p="layer.enabled"${L.enabled ? " checked" : ""}></label>` +
        slider("layer.opacity%", "Opacity", 0, 100, 1, L.opacity * 100, "%") +
        slider("layer.reactivity", "Reactivity", 0, 100, 1, L.reactivity, "%") +
        `<label class="adv-field"><span>React to</span><select data-p="layer.reactMode"><option value="position"${L.reactMode === "position" ? " selected" : ""}>Mouse position</option><option value="velocity"${L.reactMode === "velocity" ? " selected" : ""}>Mouse / scroll motion</option></select></label>` +
        slider("layer.offsetX", "Offset X", -25, 25, 0.5, L.offsetX, "%") + slider("layer.offsetY", "Offset Y", -25, 25, 0.5, L.offsetY, "%") +
        `<div class="adv-sub">Slice shift · H + V</div>` + paramsHtml("layer.slice", S.slice.params, L.slice, ["shift", "shiftV", "soft", "random", "speed", "glitch"]) +
        `<div class="adv-sub">Pixel stretch</div>` + paramsHtml("layer.pixstretch", S.pixstretch.params, L.pixstretch, ["offset", "smooth", "falloff", "prot", "pangle"]));
    } else if (target === "front") {
      const F = B.frontLayer;
      body += `<p class="adv-note">One slice shift and pixel stretch over every box together, on top of each box's own effects.</p>`;
      body += sec("front", "Front layer",
        `<label class="adv-field"><span>Enabled</span><input type="checkbox" data-p="front.enabled"${F.enabled ? " checked" : ""}></label>` +
        `<div class="adv-sub">Slice shift · H + V</div>` + paramsHtml("front.slice", S.slice.params, F.slice, ["shift", "shiftV", "soft", "random", "speed", "glitch"]) +
        `<div class="adv-sub">Pixel stretch</div>` + paramsHtml("front.pixstretch", S.pixstretch.params, F.pixstretch, ["offset", "smooth", "falloff", "prot", "pangle"]));
    } else {
      const b = B.boxes[target];
      body += sec("layout", "Layout & size", (["x", "y", "w", "h"] as const).map((k) => slider(`box.layout.${k}%`, { x: "X", y: "Y", w: "Width", h: "Height" }[k], k === "w" || k === "h" ? 2 : 0, 100, 0.1, b.layout[k] * 100, "%")).join(""));
      body += `<div class="adv-stackhead"><span>Effect stack · ${b.effects.filter((e) => e.on).length}/${b.effects.length}</span><button type="button" class="adv-add" data-add aria-expanded="${addOpen}">+</button>${addOpen ? `<div class="adv-addmenu">${Object.keys(S).map((t) => `<button type="button" data-addfx="${t}">${esc(S[t].name)}</button>`).join("")}</div>` : ""}</div>`;
      body += b.effects.map((e, i) => fxHtml(e, i, b.effects.length)).join("");
    }
    adv.innerHTML = tabsHtml + body;
  }
  function fxHtml(e: Effect, i: number, n: number) {
    const def = S[e.type]; if (!def) return "";
    const id = "fx" + e.id, isOpen = open.has(id);
    const grad = def.hasGrad && Array.isArray(e.grad)
      ? `<div class="adv-sub">Gradient</div><div class="adv-grad" style="background:linear-gradient(90deg,${e.grad.map((s) => `${s.c} ${Math.round(s.p * 100)}%`).join(",")})"></div><div class="adv-stops">${e.grad.map((s, k) => `<span><input type="color" data-g="${i}.${k}" value="${/^#[0-9a-f]{6}$/i.test(s.c) ? s.c : "#000000"}"><input type="text" data-g="${i}.${k}" value="${esc(s.c)}" spellcheck="false"></span>`).join("")}</div>`
      : "";
    void n;
    return `<div class="adv-sec${e.on ? "" : " adv-off"}" data-fxi="${i}"><div class="adv-head"><span class="adv-grip" draggable="true" data-grip="${i}" title="Drag to reorder" aria-hidden="true">⋮⋮</span><button type="button" class="adv-name" data-open="${id}"><i>${isOpen ? "▾" : "▸"}</i>${esc(def.name)}</button>` +
      `<button type="button" class="adv-ic" data-fx="eye" data-i="${i}" aria-pressed="${e.on}" title="${e.on ? "Hide" : "Show"}" aria-label="${e.on ? "Hide" : "Show"} ${esc(def.name)}">${EYE}</button><button type="button" class="adv-ic" data-fx="del" data-i="${i}" title="Remove" aria-label="Remove ${esc(def.name)}">–</button></div>` +
      (isOpen ? `<div class="adv-body">${grad}${paramsHtml(`fx.${i}`, def.params, e.params)}</div>` : "") + "</div>";
  }
  /* resolve a data-p path to the object + key it edits; a trailing % means stored 0..1, shown 0..100 */
  function resolve(path: string): { o: Record<string, unknown>; k: string; pct: boolean } | null {
    const B = ctx.base(), pct = path.endsWith("%"), parts = path.replace(/%$/, "").split(".");
    let o: Record<string, unknown>;
    if (parts[0] === "layer") o = B.layer as unknown as Record<string, unknown>;
    else if (parts[0] === "front") o = B.frontLayer as unknown as Record<string, unknown>;
    else if (parts[0] === "box") o = B.boxes[target as number] as unknown as Record<string, unknown>;
    else if (parts[0] === "fx") { o = B.boxes[target as number].effects[+parts[1]].params as Record<string, unknown>; return { o, k: parts[2], pct }; }
    else return null;
    for (const p of parts.slice(1, -1)) o = o[p] as Record<string, unknown>;
    return { o, k: parts[parts.length - 1], pct };
  }
  const apply = (el: HTMLInputElement | HTMLSelectElement) => {
    const r = resolve(el.dataset.p!); if (!r) return;
    if (el instanceof HTMLInputElement && el.type === "checkbox") r.o[r.k] = el.checked;
    else if (el instanceof HTMLInputElement && el.type === "color") r.o[r.k] = el.value;
    else if (el instanceof HTMLSelectElement && !el.hasAttribute("data-num")) r.o[r.k] = el.value;
    else { const v = Number(el.value); if (!Number.isFinite(v)) return; r.o[r.k] = r.pct ? v / 100 : v; }
    edit();
  };
  adv.addEventListener("input", (e) => {
    const el = e.target as HTMLInputElement;
    if (el.dataset.g) { gradEdit(el); return; }
    if (!el.dataset.p) return;
    if (el.type === "range") {
      const twin = el.parentElement!.querySelector<HTMLInputElement>('input[type="number"]');
      if (twin) twin.value = el.value;
      el.style.setProperty("--p", ((+el.value - +el.min) / (+el.max - +el.min)) * 100 + "%");
    }
    if (el.type === "range" || el.type === "color") apply(el);
  });
  adv.addEventListener("change", (e) => {
    const el = e.target as HTMLInputElement;
    if (el.dataset.g) { gradEdit(el); return; }
    if (!el.dataset.p || el.type === "range" || el.type === "color") return;
    if (el.type === "number") { el.value = String(Math.max(+el.min, Math.min(+el.max, +el.value || 0))); const r = el.parentElement!.querySelector<HTMLInputElement>('input[type="range"]'); if (r) { r.value = el.value; r.style.setProperty("--p", ((+el.value - +el.min) / (+el.max - +el.min)) * 100 + "%"); } }
    apply(el);
    if (el.type === "checkbox") renderAdv();
  });
  function gradEdit(el: HTMLInputElement) {
    const [i, k] = el.dataset.g!.split(".").map(Number);
    const stop = ctx.base().boxes[target as number].effects[i].grad?.[k];
    if (!stop) return;
    let h = el.value.trim(); if (h && !h.startsWith("#")) h = "#" + h;
    if (!/^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(h)) return;
    stop.c = h; edit();
    const sec = el.closest(".adv-body")!, bar = sec.querySelector<HTMLElement>(".adv-grad");
    const g = ctx.base().boxes[target as number].effects[i].grad!;
    if (bar) bar.style.background = `linear-gradient(90deg,${g.map((s) => `${s.c} ${Math.round(s.p * 100)}%`).join(",")})`;
    const twin = el.parentElement!.querySelector<HTMLInputElement>(el.type === "color" ? 'input[type="text"]' : 'input[type="color"]');
    if (twin) twin.value = el.type === "color" ? h : (/^#[0-9a-f]{6}$/i.test(h) ? h : twin.value);
  }
  adv.addEventListener("click", (e) => {
    const t = e.target as HTMLElement;
    const ob = t.closest<HTMLButtonElement>("[data-open]");
    if (ob) { const id = ob.dataset.open!; if (open.has(id)) open.delete(id); else open.add(id); renderAdv(); return; }
    if (t.closest("[data-add]")) { addOpen = !addOpen; renderAdv(); return; }
    const af = t.closest<HTMLButtonElement>("[data-addfx]");
    if (af && typeof target === "number") { const fx = instantiate({ type: af.dataset.addfx! }); ctx.base().boxes[target].effects.unshift(fx); open.add("fx" + fx.id); addOpen = false; edit(); renderAdv(); return; }
    const fb = t.closest<HTMLButtonElement>("[data-fx]");
    if (fb && typeof target === "number") {
      const st = ctx.base().boxes[target].effects, i = +fb.dataset.i!;
      if (fb.dataset.fx === "eye") st[i].on = !st[i].on;
      if (fb.dataset.fx === "del") st.splice(i, 1);
      edit(); renderAdv();
    }
  });

  /* effects reorder by drag: grab the grip, drop above or below another effect */
  let dragFx = -1;
  const clearDrop = () => adv.querySelectorAll(".adv-sec").forEach((x) => x.classList.remove("dragging", "drop-above", "drop-below"));
  adv.addEventListener("dragstart", (e) => {
    const g = (e.target as HTMLElement).closest<HTMLElement>("[data-grip]");
    if (!g) return;
    dragFx = +g.dataset.grip!;
    e.dataTransfer!.effectAllowed = "move"; e.dataTransfer!.setData("text/plain", String(dragFx));
    g.closest(".adv-sec")!.classList.add("dragging");
  });
  adv.addEventListener("dragover", (e) => {
    const sec = (e.target as HTMLElement).closest<HTMLElement>("[data-fxi]");
    if (dragFx < 0 || !sec) return;
    e.preventDefault();
    const r = sec.getBoundingClientRect(), above = e.clientY < r.top + r.height / 2;
    adv.querySelectorAll(".adv-sec").forEach((x) => x.classList.remove("drop-above", "drop-below"));
    if (+sec.dataset.fxi! !== dragFx) sec.classList.add(above ? "drop-above" : "drop-below");
  });
  adv.addEventListener("drop", (e) => {
    const sec = (e.target as HTMLElement).closest<HTMLElement>("[data-fxi]");
    if (dragFx < 0 || !sec || typeof target !== "number") return;
    e.preventDefault();
    const r = sec.getBoundingClientRect(), above = e.clientY < r.top + r.height / 2;
    const st = ctx.base().boxes[target].effects, to = +sec.dataset.fxi!;
    if (to !== dragFx) {
      const moved = st.splice(dragFx, 1)[0];
      let at = to + (above ? 0 : 1); if (dragFx < at) at--;
      st.splice(at, 0, moved); edit();
    }
    dragFx = -1; clearDrop(); renderAdv();
  });
  adv.addEventListener("dragend", () => { dragFx = -1; clearDrop(); });

  setAdmin(key); // restore an unlocked session
  return {
    /** a layer was selected (Layers panel or the frame): admins get its editor in Advanced */
    focus(key: string) {
      if (!key) return;
      target = key === "layer" || key === "front" || key === "logo" ? key : +key.slice(4);
      addOpen = false;
      if (!key) return;
      if (root.classList.contains("lab-admin")) { if (!root.classList.contains("lab-advtab")) showTab("adv"); else renderAdv(); }
    },
    /** the base changed from outside (layout drag, version load): redraw the open panel */
    changed() { if (root.classList.contains("lab-advtab")) renderAdv(); paint(); },
  };
}
export type { Num };
