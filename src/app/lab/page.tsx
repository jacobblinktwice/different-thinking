"use client";

/* Effect lab — renders the shared <Glitch> component in isolation with live controls.
   Tuning here maps 1:1 onto the same component the homepage uses.

   Persistence: the server is the ONLY store (no local copies anywhere).
   SAVE writes the lab's working state + a version-history entry; PUBLISH
   pushes it live for every visitor. UI follows the live site's console
   language: sharp solid blocks, mono labels, no outlines. */
import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { Glitch } from "@/components/glitch";
import {
  defaultBoxes,
  defaultLayer,
  defaultFrontLayer,
  serialize,
  instantiate,
  parseComposition,
  snapshotComposition,
  SCHEMA,
  type BoxConfig,
  type Composition,
  type LayerConfig,
  type FrontLayerConfig,
  type GlitchMode,
  type VersionEntry,
} from "@/components/glitch";

type Schema = Record<
  string,
  {
    name: string;
    hasGrad?: string;
    params: Record<string, ParamDef>;
  }
>;
type NumDef = { label: string; min: number; max: number; step: number; unit?: string };
type ParamDef =
  | string // "__t" transform divider carries its title as the value
  | { label: string; min: number; max: number; step: number; val: number; unit?: string }
  | { type: "select"; options: string[]; val: number }
  | { type: "toggle"; val: boolean; label: string }
  | { type: "color"; val: string; label: string };

const S = SCHEMA as unknown as Schema;
const BOX_NAMES = ["Red", "Teal", "Blue", "Purple"];
const SELECT_LABELS: Record<string, string> = {
  pattern: "Pattern",
  repeatType: "Repeat type",
  mixSpace: "Mix space",
  edge: "Edge wrap",
  style: "Style",
};

const EyeIcon = (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
    <path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7S1 12 1 12z" />
    <circle cx="12" cy="12" r="3" />
  </svg>
);
const EyeOffIcon = (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
    <path d="M2 12s4-7 11-7c2 0 3.8.5 5.3 1.3M22 12s-4 7-11 7c-2 0-3.8-.5-5.3-1.3" />
    <path d="M3 3l18 18" />
  </svg>
);

/* The lab is not linked publicly and sits behind an access code held in
   LAB_KEY on the server. The code is never compiled into this bundle — the
   typed value is checked by the API and then kept for the session so the
   publish calls can present it. */
const LAB_STORE = "dt-lab-key";

export default function LabGate() {
  const [key, setKey] = useState<string | null>(null);
  const [text, setText] = useState("");
  const [denied, setDenied] = useState(false);
  const [checking, setChecking] = useState(false);

  useEffect(() => {
    try {
      const saved = sessionStorage.getItem(LAB_STORE);
      if (saved) setKey(saved);
    } catch {
      /* storage unavailable */
    }
  }, []);

  if (key) return <LabPage labKey={key} />;

  const submit = async () => {
    const candidate = text.trim();
    if (!candidate || checking) return;
    setChecking(true);
    let ok = false;
    try {
      const res = await fetch("/api/composition", { method: "POST", headers: { "x-lab-key": candidate } });
      ok = res.ok;
    } catch {
      ok = false; // offline or route unreachable — treat as denied
    }
    setChecking(false);
    if (ok) {
      try {
        sessionStorage.setItem(LAB_STORE, candidate);
      } catch {
        /* storage unavailable */
      }
      setKey(candidate);
    } else {
      setDenied(true);
      setText("");
      window.setTimeout(() => setDenied(false), 1200);
    }
  };

  return (
    <main className="flex min-h-svh flex-col items-center justify-center bg-ink font-mono text-[13px] text-paper">
      <p className="mb-6 text-neutral-500">[ restricted ] specimen lab</p>
      <div className="flex items-center gap-2">
        <span>access ::</span>
        <input
          autoFocus
          value={text}
          spellCheck={false}
          autoComplete="off"
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") void submit();
          }}
          className="w-40 border-b border-neutral-600 bg-transparent px-1 py-0.5 text-paper outline-none focus:border-paper"
        />
        <button
          type="button"
          onClick={() => void submit()}
          disabled={checking}
          className="cursor-pointer px-2 py-0.5 text-neutral-400 hover:text-paper disabled:opacity-50"
        >
          [ enter ]
        </button>
      </div>
      <p className={`mt-4 h-4 text-[11px] ${denied ? "text-[#f9432f]" : "text-transparent"}`}>
        err :: access denied
      </p>
    </main>
  );
}

/* shared block styles — the live site's console look */
const BLOCK = "bg-[#f2f2ef]";
const BTN =
  "cursor-pointer bg-[#f2f2ef] px-3 py-1.5 font-mono text-[10.5px] uppercase tracking-wide text-neutral-600 hover:bg-ink hover:text-paper";
const BTN_ON = "cursor-pointer bg-ink px-3 py-1.5 font-mono text-[10.5px] uppercase tracking-wide text-paper";

function LabPage({ labKey }: { labKey: string }) {
  const [boxes, setBoxes] = useState<BoxConfig[]>(() => defaultBoxes());
  const [active, setActive] = useState<number | "layer" | "front">(0);
  const [mode, setMode] = useState<GlitchMode>("grid");
  const [running, setRunning] = useState(true);
  const [addOpen, setAddOpen] = useState(false);
  const [layer, setLayer] = useState<LayerConfig>(() => defaultLayer());
  const [frontLayer, setFrontLayer] = useState<FrontLayerConfig>(() => defaultFrontLayer());
  const dragIndex = useRef<number | null>(null);

  // save/publish state — the server is the ONLY store (no local copies)
  const [dirtySaved, setDirtySaved] = useState(false);
  const [dirtyLive, setDirtyLive] = useState(false);
  const [flash, setFlash] = useState<"saved" | "published" | null>(null);
  const [versions, setVersions] = useState<VersionEntry[]>([]);
  const [historyOpen, setHistoryOpen] = useState(false);
  /* which history entry the editor is currently showing.
     curSnap is the working composition serialized; the selection is then DERIVED
     by matching it against each entry, rather than remembered when you click a
     row. Remembering would go stale the moment you touched a slider and the
     header would keep claiming you were on a version you had already edited
     away from. Matching also means the panel is right on first load, where
     nothing was clicked at all but the composition does equal an entry.
     pickedT (the entry's timestamp, which is its identity — the vN number is
     for reading, and predates most entries) is only the fallback: it remembers
     where you STARTED, so an edited composition can still show "v12*". */
  const [curSnap, setCurSnap] = useState<string | null>(null);
  const [pickedT, setPickedT] = useState<number | null>(null);
  const savedSnap = useRef<string | null>(null);
  const liveSnap = useRef<string | null>(null);

  // collapsed/open state of the individual effect + section cards (by effect id / key)
  const [openCards, setOpenCards] = useState<Set<number | string>>(() => new Set(["layout"]));
  const toggleCard = (key: number | string) =>
    setOpenCards((s) => {
      const n = new Set(s);
      if (n.has(key)) n.delete(key);
      else n.add(key);
      return n;
    });

  const isLayer = active === "layer";
  const isFront = active === "front";
  const isBoxTab = typeof active === "number";
  const activeBox = typeof active === "number" ? active : 0;
  const commit = () => setBoxes((b) => b.slice());
  const commitLayer = () => setLayer((l) => ({ ...l }));
  const commitFront = () => setFrontLayer((f) => ({ ...f }));
  const box = boxes[activeBox];
  const curStack = box.effects;

  // load the lab's SAVED composition (falling back to live, then the baked
  // default) on mount. The server is the single source of truth — nothing is
  // read from or written to this browser.
  const loaded = useRef(false);
  useEffect(() => {
    (async () => {
      let comp: Composition | null = null;
      let vers: VersionEntry[] = [];
      try {
        const r = await fetch("/api/composition");
        if (r.ok) {
          const j = (await r.json()) as { comp?: unknown; saved?: unknown; versions?: VersionEntry[] };
          if (j.comp) liveSnap.current = JSON.stringify(j.comp);
          if (j.saved) savedSnap.current = JSON.stringify(j.saved);
          comp = (j.saved ? parseComposition(j.saved) : null) ?? (j.comp ? parseComposition(j.comp) : null);
          if (Array.isArray(j.versions)) vers = j.versions;
        }
      } catch {
        /* offline — the baked default stays */
      }
      if (comp) {
        setBoxes(comp.boxes);
        setLayer(comp.layer);
        setFrontLayer(comp.frontLayer);
      }
      setVersions(vers);
      loaded.current = true;
      const cur = comp ?? { boxes: defaultBoxes(), layer: defaultLayer(), frontLayer: defaultFrontLayer() };
      const s = JSON.stringify(snapshotComposition(cur.boxes, cur.layer, cur.frontLayer));
      setDirtySaved(s !== savedSnap.current);
      setDirtyLive(s !== liveSnap.current);
      setCurSnap(s);
      setPickedT(vers.find((v) => JSON.stringify(v.snap) === s)?.t ?? null);
    })();
  }, []);
  // recompute the dirty flags on every change (debounced) — no local writes
  useEffect(() => {
    if (!loaded.current) return;
    const t = setTimeout(() => {
      const s = JSON.stringify(snapshotComposition(boxes, layer, frontLayer));
      setDirtySaved(s !== savedSnap.current);
      setDirtyLive(s !== liveSnap.current);
      setCurSnap(s);
    }, 300);
    return () => clearTimeout(t);
  }, [boxes, layer, frontLayer]);

  /* exact content match = the version you are looking at. liveIdx is matched the
     same way instead of trusting the stored `live` flag alone: that flag is
     stamped on the entry a publish creates, so once that entry ages off the end
     of the 15-deep list the panel stops showing a live marker at all even though
     something is still live. */
  const versionSnaps = useMemo(() => versions.map((v) => JSON.stringify(v.snap)), [versions]);
  const pickedIdx = pickedT == null ? -1 : versions.findIndex((v) => v.t === pickedT);
  /* Identical compositions can sit at several places in the list — restoring an
     entry and saving it leaves two rows holding the same work — and a plain
     indexOf would then mark the NEWEST of them, so clicking v12 lit up v18
     instead. When the row you actually picked still matches, that row wins;
     indexOf is only for a composition you arrived at some other way (first
     load, or an edit that happens to land back on a stored one). */
  const selectedIdx =
    curSnap == null ? -1 : pickedIdx >= 0 && versionSnaps[pickedIdx] === curSnap ? pickedIdx : versionSnaps.indexOf(curSnap);
  const [liveIdx, setLiveIdx] = useState(-1);
  useEffect(() => {
    setLiveIdx(liveSnap.current == null ? -1 : versionSnaps.indexOf(liveSnap.current));
  }, [versionSnaps, curSnap, flash]);
  // no exact match but we know where it started → that version, plus a * for the edits
  const shownIdx = selectedIdx >= 0 ? selectedIdx : pickedIdx;
  const edited = selectedIdx < 0 && pickedIdx >= 0;
  /* the entry's own stamped number, so a save adds v16 and leaves every other
     label alone. Position is only the fallback for pre-numbering entries, which
     the API backfills the next time anything is written. */
  const vLabel = (i: number) => `v${versions[i]?.n ?? versions.length - i}`;

  const [busy, setBusy] = useState<"save" | "publish" | null>(null);
  const persist = async (action: "save" | "publish") => {
    if (busy) return;
    setBusy(action);
    const snap = snapshotComposition(boxes, layer, frontLayer);
    try {
      const res = await fetch("/api/composition", {
        method: "PUT",
        headers: { "Content-Type": "application/json", "x-lab-key": labKey },
        body: JSON.stringify({ action, snap }),
      });
      const j = (await res.json().catch(() => null)) as { ok?: boolean; error?: string; versions?: VersionEntry[] } | null;
      if (!res.ok || !j?.ok) throw new Error(j?.error || `HTTP ${res.status}`);
      if (Array.isArray(j.versions)) {
        setVersions(j.versions);
        setPickedT(j.versions[0]?.t ?? null);
      }
    } catch (err) {
      setBusy(null);
      alert(`Couldn't ${action}: ${err instanceof Error ? err.message : err}`);
      return;
    }
    const s = JSON.stringify(snap);
    savedSnap.current = s;
    setDirtySaved(false);
    if (action === "publish") {
      liveSnap.current = s;
      setDirtyLive(false);
    }
    setBusy(null);
    setFlash(action === "publish" ? "published" : "saved");
    window.setTimeout(() => setFlash(null), 1600);
  };

  const restoreVersion = (entry: VersionEntry) => {
    const comp = parseComposition(entry.snap);
    if (!comp) return alert("That version predates the current baseline and can't be restored.");
    setBoxes(comp.boxes);
    setLayer(comp.layer);
    setFrontLayer(comp.frontLayer);
    setActive(0);
    setPickedT(entry.t);
    setCurSnap(JSON.stringify(entry.snap));
    setHistoryOpen(false);
  };

  const addEffect = (type: string) => {
    curStack.unshift(instantiate({ type }));
    setAddOpen(false);
    commit();
  };
  const removeEffect = (id?: number) => {
    const i = curStack.findIndex((e) => e.id === id);
    if (i >= 0) curStack.splice(i, 1);
    commit();
  };
  const reorder = (from: number | null, to: number) => {
    if (from == null || from === to) return;
    const moved = curStack.splice(from, 1)[0];
    curStack.splice(to, 0, moved);
    commit();
  };

  const fxCount = `${curStack.filter((e) => e.on).length}/${curStack.length}`;

  const fileInput = useRef<HTMLInputElement>(null);

  const exportJson = () => {
    const json = JSON.stringify({ boxes: serialize(boxes), layer, frontLayer }, null, 2);
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "glitch-config.json";
    a.click();
    URL.revokeObjectURL(url);
  };
  const importJson = (file: File) => {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const comp = parseComposition(JSON.parse(String(reader.result)));
        if (!comp) return alert("Couldn't read that config (wrong format or version).");
        setBoxes(comp.boxes);
        setLayer(comp.layer);
        setFrontLayer(comp.frontLayer);
        setActive(0);
      } catch {
        alert("Invalid JSON file.");
      }
    };
    reader.readAsText(file);
  };

  const stamp = (t: number) =>
    new Date(t)
      .toLocaleString(undefined, { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })
      .toLowerCase();

  return (
    <div className="flex h-screen flex-col bg-[#e9e9e6] text-ink">
      {/* top bar */}
      <header className="relative flex h-13 flex-none items-center gap-4 bg-paper px-5 py-3">
        <Link href="/" className="text-sm font-medium tracking-tight transition-opacity hover:opacity-60" title="Back to home">
          Different <span className="text-blue">Thinking</span>
        </Link>
        <Link href="/" className="font-mono text-[11px] text-neutral-500 transition-opacity hover:opacity-60" title="Back to home">
          ← glitch lab
        </Link>
        <div className="flex-1" />
        <button onClick={() => setRunning((r) => !r)} className={BTN}>
          {running ? "Pause" : "Play"}
        </button>
        <div className="flex">
          {(["grid", "landing"] as GlitchMode[]).map((m) => (
            <button key={m} onClick={() => setMode(m)} className={mode === m ? BTN_ON : BTN}>
              {m}
            </button>
          ))}
        </div>
        <button
          onClick={() => setHistoryOpen((o) => !o)}
          className={historyOpen ? BTN_ON : BTN}
          title={
            shownIdx < 0
              ? "Version history"
              : edited
                ? `Editing ${vLabel(shownIdx)} — changed since you loaded it`
                : `Showing ${vLabel(shownIdx)}`
          }
        >
          History
          {shownIdx >= 0 && (
            <span className={historyOpen ? "ml-1.5 text-neutral-400" : "ml-1.5 text-neutral-500"}>
              {vLabel(shownIdx)}
              {edited && "*"}
            </span>
          )}
        </button>
        <button
          onClick={() => persist("save")}
          disabled={busy !== null || (!dirtySaved && flash !== "saved")}
          className={
            dirtySaved && !busy
              ? "cursor-pointer bg-ink px-3 py-1.5 font-mono text-[10.5px] uppercase tracking-wide text-paper hover:bg-blue"
              : "bg-[#f2f2ef] px-3 py-1.5 font-mono text-[10.5px] uppercase tracking-wide text-neutral-400"
          }
          title="Save to the lab + version history (not live)"
        >
          {busy === "save" ? "saving…" : flash === "saved" ? "saved ✓" : dirtySaved ? "save" : "saved ✓"}
        </button>
        <button
          onClick={() => persist("publish")}
          disabled={busy !== null || (!dirtyLive && flash !== "published")}
          className={
            dirtyLive && !busy
              ? "cursor-pointer bg-blue px-3 py-1.5 font-mono text-[10.5px] uppercase tracking-wide text-white hover:bg-ink"
              : "bg-[#f2f2ef] px-3 py-1.5 font-mono text-[10.5px] uppercase tracking-wide text-neutral-400"
          }
          title="Publish to the live site (all visitors)"
        >
          {busy === "publish" ? "publishing…" : flash === "published" ? "published ✓" : dirtyLive ? "publish" : "live ✓"}
        </button>
        {historyOpen && (
          <div className="absolute right-5 top-12 z-40 w-[280px] bg-paper p-1.5 shadow-[0_14px_40px_rgba(0,0,0,0.16)]">
            <p className="px-2.5 py-2 font-mono text-[10px] uppercase tracking-wider text-neutral-400">
              [ version history ]
              {edited && <span className="normal-case tracking-normal"> — * = edited since loading</span>}
            </p>
            {versions.length === 0 && (
              <p className="px-2.5 pb-2.5 font-mono text-[11px] text-neutral-500">no saves yet</p>
            )}
            {versions.map((v, i) => {
              const here = i === shownIdx;
              return (
                <button
                  key={v.t}
                  onClick={() => restoreVersion(v)}
                  aria-current={here ? "true" : undefined}
                  className={`flex w-full cursor-pointer items-baseline gap-2 py-2 pr-2.5 text-left font-mono text-[11px] hover:bg-[#f2f2ef] ${
                    here ? "bg-[#eaeae6] pl-1.5 font-medium text-ink" : "pl-2.5 text-neutral-700"
                  }`}
                  title={here ? "Already in the editor" : "Load this version into the editor"}
                >
                  {/* the bar carries the highlight at a glance; the row tint alone
                      is too close to the hover tint to read as state */}
                  {here && <span aria-hidden className="-my-0.5 w-1 self-stretch bg-ink" />}
                  <span className={here ? "text-neutral-500" : "text-neutral-400"}>
                    {vLabel(i)}
                    {here && edited && "*"}
                  </span>
                  <span className="flex-1">{stamp(v.t)}</span>
                  {i === liveIdx && <span className="text-blue">live</span>}
                </button>
              );
            })}
          </div>
        )}
      </header>

      <div className="flex min-h-0 flex-1 flex-col lg:flex-row">
        {/* stage */}
        <div className="grid min-h-0 flex-1 place-items-center overflow-hidden p-4 sm:p-6">
          <div
            className="relative w-full shadow-[0_10px_44px_rgba(0,0,0,0.10)]"
            style={{ maxWidth: "calc((100vh - 140px) * 1.7)", aspectRatio: "17 / 10" }}
          >
            <Glitch
              config={boxes}
              layer={layer}
              frontLayer={frontLayer}
              mode={mode}
              running={running}
              background={mode === "landing" ? [0.988, 0.988, 0.988] : [0.945, 0.945, 0.941]}
            />
          </div>
        </div>

        {/* controls — a floating panel, detached from the top bar */}
        <aside className="m-3 flex max-h-[52vh] w-auto flex-none flex-col bg-paper shadow-[0_10px_44px_rgba(0,0,0,0.08)] lg:my-4 lg:ml-0 lg:mr-4 lg:max-h-none lg:w-[380px]">
          <div className="relative p-4 pb-3">
            <div className="flex items-center gap-2">
              <h2 className="flex-1 font-mono text-[11px] uppercase tracking-[0.14em]">
                {isLayer ? "Duplicate layer" : isFront ? "Front boxes layer" : "Effects"}
              </h2>
              {isBoxTab && (
                <>
                  <span className="font-mono text-[11px] text-neutral-400">[{fxCount}]</span>
                  <button
                    onClick={() => setAddOpen((o) => !o)}
                    className="grid h-6 w-6 cursor-pointer place-items-center bg-[#f2f2ef] text-[15px] leading-none text-neutral-600 hover:bg-ink hover:text-paper"
                    title="Add effect"
                  >
                    +
                  </button>
                </>
              )}
            </div>
            {addOpen && isBoxTab && (
              <div className="absolute right-4 top-12 z-30 min-w-[180px] bg-paper p-1.5 shadow-[0_14px_40px_rgba(0,0,0,0.16)]">
                {Object.keys(S).map((type) => (
                  <button
                    key={type}
                    onClick={() => addEffect(type)}
                    className="flex w-full cursor-pointer items-center gap-2 px-2.5 py-2 text-left font-mono text-[12px] hover:bg-[#f2f2ef]"
                  >
                    {S[type].name}
                  </button>
                ))}
              </div>
            )}
            <div className="mt-3 flex flex-wrap gap-1.5">
              {boxes.map((_, i) => (
                <button
                  key={i}
                  onClick={() => setActive(i)}
                  className={`h-8 w-8 cursor-pointer font-mono text-[12px] ${
                    i === active ? "bg-ink text-paper" : "bg-[#f2f2ef] text-neutral-500 hover:bg-[#e4e4e1]"
                  }`}
                  title={BOX_NAMES[i]}
                >
                  {i + 1}
                </button>
              ))}
              <button
                onClick={() => setActive("layer")}
                className={`h-8 cursor-pointer px-2.5 font-mono text-[11px] ${
                  isLayer ? "bg-ink text-paper" : "bg-[#f2f2ef] text-neutral-500 hover:bg-[#e4e4e1]"
                }`}
                title="Duplicate (behind) layer"
              >
                Dup
              </button>
              <button
                onClick={() => setActive("front")}
                className={`h-8 cursor-pointer px-2.5 font-mono text-[11px] ${
                  isFront ? "bg-ink text-paper" : "bg-[#f2f2ef] text-neutral-500 hover:bg-[#e4e4e1]"
                }`}
                title="Front boxes layer (group slice + pixel-stretch)"
              >
                Front
              </button>
            </div>
          </div>

          {/* px-4 matches the header block above so every card lines up with the tabs */}
          <div className="flex min-h-0 flex-1 flex-col gap-1.5 overflow-y-auto px-4 pb-4">
            {/* ===== LAYER TAB: the duplicated layer behind the boxes ===== */}
            {isLayer && (
              <div className="flex flex-col gap-1.5">
                <p className="px-1 font-mono text-[10px] leading-4 text-neutral-500">
                  A duplicate of all boxes, sitting behind them with its own slice + pixel-stretch (offset
                  + dimmed). The whole composition&apos;s glitch reacts to the pointer — &ldquo;Position&rdquo;
                  ties intensity to cursor distance from centre (smooth); &ldquo;Motion&rdquo; spikes on
                  pointer speed + scroll. Reactivity scales the amount.
                </p>
                <Card title="Layer" open={!openCards.has("layer:closed")} onToggle={() => toggleCard("layer:closed")}>
                  <Row label="Enabled">
                    <input
                      type="checkbox"
                      checked={layer.enabled}
                      onChange={(e) => { layer.enabled = e.target.checked; commitLayer(); }}
                      className="accent-ink"
                    />
                  </Row>
                  <Slider label="Opacity" min={0} max={100} step={1} unit="%" value={layer.opacity * 100} onChange={(v) => { layer.opacity = v / 100; commitLayer(); }} />
                  <Slider label="Reactivity" min={0} max={100} step={1} unit="%" value={layer.reactivity} onChange={(v) => { layer.reactivity = v; commitLayer(); }} />
                  <Row label="React to">
                    <select
                      value={layer.reactMode}
                      onChange={(e) => { layer.reactMode = e.target.value as "position" | "velocity"; commitLayer(); }}
                      className="w-full bg-paper px-2 py-1 text-xs"
                    >
                      <option value="position">Mouse position</option>
                      <option value="velocity">Mouse / scroll motion</option>
                    </select>
                  </Row>
                  <Slider label="Offset X" min={-25} max={25} step={0.5} unit="%" value={layer.offsetX} onChange={(v) => { layer.offsetX = v; commitLayer(); }} />
                  <Slider label="Offset Y" min={-25} max={25} step={0.5} unit="%" value={layer.offsetY} onChange={(v) => { layer.offsetY = v; commitLayer(); }} />
                  <div className="mt-1 font-mono text-[9.5px] uppercase tracking-wider text-neutral-400">Slice shift · H + V</div>
                  {(["shift", "shiftV", "soft", "random", "speed", "glitch"] as const).map((k) => {
                    const p = S.slice.params[k] as NumDef;
                    return <Slider key={k} label={p.label} min={p.min} max={p.max} step={p.step} unit={p.unit} value={Number(layer.slice[k] ?? 0)} onChange={(v) => { layer.slice[k] = v; commitLayer(); }} />;
                  })}
                  <div className="mt-1 font-mono text-[9.5px] uppercase tracking-wider text-neutral-400">Pixel stretch</div>
                  {(["offset", "smooth", "falloff", "prot", "pangle"] as const).map((k) => {
                    const p = S.pixstretch.params[k] as NumDef;
                    return <Slider key={k} label={p.label} min={p.min} max={p.max} step={p.step} unit={p.unit} value={Number(layer.pixstretch[k] ?? 0)} onChange={(v) => { layer.pixstretch[k] = v; commitLayer(); }} />;
                  })}
                </Card>
              </div>
            )}

            {/* ===== FRONT LAYER TAB: group slice + pixel-stretch over the front boxes ===== */}
            {isFront && (
              <div className="flex flex-col gap-1.5">
                <p className="px-1 font-mono text-[10px] leading-4 text-neutral-500">
                  Runs a single slice-shift (H + V) + pixel-stretch over ALL the front boxes together
                  (on top of each box&apos;s own effects). While enabled, the front boxes composite as one
                  layer, so per-box z-scatter with the duplicate is flattened.
                </p>
                <Card title="Front layer" open={!openCards.has("front:closed")} onToggle={() => toggleCard("front:closed")}>
                  <Row label="Enabled">
                    <input
                      type="checkbox"
                      checked={frontLayer.enabled}
                      onChange={(e) => { frontLayer.enabled = e.target.checked; commitFront(); }}
                      className="accent-ink"
                    />
                  </Row>
                  <div className="mt-1 font-mono text-[9.5px] uppercase tracking-wider text-neutral-400">Slice shift · H + V</div>
                  {(["shift", "shiftV", "soft", "random", "speed", "glitch"] as const).map((k) => {
                    const p = S.slice.params[k] as NumDef;
                    return <Slider key={k} label={p.label} min={p.min} max={p.max} step={p.step} unit={p.unit} value={Number(frontLayer.slice[k] ?? 0)} onChange={(v) => { frontLayer.slice[k] = v; commitFront(); }} />;
                  })}
                  <div className="mt-1 font-mono text-[9.5px] uppercase tracking-wider text-neutral-400">Pixel stretch</div>
                  {(["offset", "smooth", "falloff", "prot", "pangle"] as const).map((k) => {
                    const p = S.pixstretch.params[k] as NumDef;
                    return <Slider key={k} label={p.label} min={p.min} max={p.max} step={p.step} unit={p.unit} value={Number(frontLayer.pixstretch[k] ?? 0)} onChange={(v) => { frontLayer.pixstretch[k] = v; commitFront(); }} />;
                  })}
                </Card>
              </div>
            )}

            {/* ===== BOX TAB: layout + effect stack ===== */}
            {isBoxTab && (
              <>
                <Card title="Layout & size" open={openCards.has("layout")} onToggle={() => toggleCard("layout")}>
                  {(["x", "y", "w", "h"] as const).map((k) => (
                    <Slider
                      key={k}
                      label={{ x: "X", y: "Y", w: "Width", h: "Height" }[k]}
                      min={k === "w" || k === "h" ? 2 : 0}
                      max={100}
                      step={0.1}
                      unit="%"
                      value={box.layout[k] * 100}
                      onChange={(v) => {
                        box.layout[k] = v / 100;
                        commit();
                      }}
                    />
                  ))}
                </Card>
                {/* divider between the box's layout and its effect stack */}
                <div className="mb-0.5 mt-3 font-mono text-[10px] uppercase tracking-wider text-neutral-400">
                  [ effect stack ]
                </div>
              </>
            )}

            {/* effect cards — click the name to open/collapse, drag to reorder,
                eye to hide, – to remove, + (header) to add */}
            {isBoxTab && curStack.map((e, idx) => {
              const def = S[e.type];
              if (!def) return null;
              const open = openCards.has(e.id ?? -1);
              return (
                <div
                  key={e.id}
                  onDragOver={(ev) => ev.preventDefault()}
                  onDrop={(ev) => {
                    ev.preventDefault();
                    reorder(dragIndex.current, idx);
                    dragIndex.current = null;
                  }}
                  className={`${BLOCK} transition-opacity ${e.on ? "" : "opacity-50"}`}
                >
                  <div className="flex items-center gap-2 px-2.5 py-2.5">
                    <span
                      draggable
                      onDragStart={() => (dragIndex.current = idx)}
                      className="cursor-grab select-none text-[13px] leading-none tracking-[-2px] text-neutral-400 active:cursor-grabbing"
                      title="Drag to reorder"
                    >
                      ⋮⋮
                    </span>
                    <button
                      onClick={() => toggleCard(e.id ?? -1)}
                      className="flex flex-1 cursor-pointer items-center gap-2 text-left"
                      title={open ? "Collapse" : "Open"}
                    >
                      <span className="w-3.5 font-mono text-[13px] leading-none text-neutral-500">{open ? "▾" : "▸"}</span>
                      <span className="flex-1 font-mono text-[12px] tracking-tight">{def.name}</span>
                    </button>
                    <button
                      onClick={() => {
                        e.on = !e.on;
                        commit();
                      }}
                      title={e.on ? "Hide" : "Show"}
                      className="grid h-6 w-6 cursor-pointer place-items-center text-neutral-600 hover:bg-ink hover:text-paper"
                    >
                      {e.on ? EyeIcon : EyeOffIcon}
                    </button>
                    <button
                      onClick={() => removeEffect(e.id)}
                      title="Remove"
                      className="grid h-6 w-6 cursor-pointer place-items-center font-mono text-[15px] leading-none text-neutral-500 hover:bg-ink hover:text-paper"
                    >
                      –
                    </button>
                  </div>
                  {open && (
                  <div className="flex flex-col gap-2 px-3.5 pb-3.5">
                  {def.hasGrad && Array.isArray(e.grad) && (
                    <GradientEditor
                      grad={e.grad}
                      onChange={commit}
                    />
                  )}
                  {Object.entries(def.params).map(([key, p]) => {
                    if (key === "__t")
                      return (
                        <div
                          key={key}
                          className="mt-1 font-mono text-[9.5px] uppercase tracking-wider text-neutral-400"
                        >
                          {p as string}
                        </div>
                      );
                    if (typeof p === "object" && "type" in p && p.type === "select")
                      return (
                        <Row key={key} label={SELECT_LABELS[key] ?? key}>
                          <select
                            value={Number(e.params[key])}
                            onChange={(ev) => {
                              e.params[key] = Number(ev.target.value);
                              commit();
                            }}
                            className="w-full bg-paper px-2 py-1 text-xs"
                          >
                            {p.options.map((o, i) => (
                              <option key={i} value={i}>
                                {o}
                              </option>
                            ))}
                          </select>
                        </Row>
                      );
                    if (typeof p === "object" && "type" in p && p.type === "toggle")
                      return (
                        <Row key={key} label={p.label}>
                          <input
                            type="checkbox"
                            checked={Boolean(e.params[key])}
                            onChange={(ev) => {
                              e.params[key] = ev.target.checked;
                              commit();
                            }}
                            className="accent-ink"
                          />
                        </Row>
                      );
                    if (typeof p === "object" && "type" in p && p.type === "color")
                      return (
                        <Row key={key} label={p.label}>
                          <input
                            type="color"
                            value={String(e.params[key])}
                            onChange={(ev) => {
                              e.params[key] = ev.target.value;
                              commit();
                            }}
                            className="h-6 w-10 cursor-pointer bg-transparent"
                          />
                        </Row>
                      );
                    // numeric slider
                    const np = p as { label: string; min: number; max: number; step: number; unit?: string };
                    return (
                      <Slider
                        key={key}
                        label={np.label}
                        min={np.min}
                        max={np.max}
                        step={np.step}
                        unit={np.unit}
                        value={Number(e.params[key])}
                        onChange={(v) => {
                          e.params[key] = v;
                          commit();
                        }}
                      />
                    );
                  })}
                  </div>
                  )}
                </div>
              );
            })}
          </div>

          <div className="grid grid-cols-3 gap-1.5 p-4 pt-0">
            <button
              onClick={() => {
                setBoxes(defaultBoxes());
                setLayer(defaultLayer());
                setFrontLayer(defaultFrontLayer());
                setActive(0);
              }}
              className={`${BTN} px-2 py-2 text-center`}
            >
              Reset all
            </button>
            <button onClick={() => fileInput.current?.click()} className={`${BTN} px-2 py-2 text-center`}>
              Import JSON
            </button>
            <button onClick={exportJson} className={`${BTN} px-2 py-2 text-center`}>
              Export JSON
            </button>
            <input
              ref={fileInput}
              type="file"
              accept="application/json,.json"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) importJson(f);
                e.target.value = "";
              }}
            />
          </div>
        </aside>
      </div>
    </div>
  );
}

/* ---- small presentational helpers ---- */
function Card({
  title,
  children,
  open,
  onToggle,
}: {
  title: string;
  children: React.ReactNode;
  open: boolean;
  onToggle: () => void;
}) {
  return (
    <div className={BLOCK}>
      <button onClick={onToggle} className="flex w-full cursor-pointer items-center gap-2 px-3 py-2.5 text-left" title={open ? "Collapse" : "Open"}>
        <span className="w-3.5 font-mono text-[13px] leading-none text-neutral-500">{open ? "▾" : "▸"}</span>
        <span className="flex-1 font-mono text-[12px] tracking-tight">{title}</span>
      </button>
      {open && <div className="flex flex-col gap-2 px-3.5 pb-3.5">{children}</div>}
    </div>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-[74px_1fr] items-center gap-2">
      <label className="text-[11.5px] text-neutral-700">{label}</label>
      {children}
    </div>
  );
}

function Slider({
  label,
  min,
  max,
  step,
  unit,
  value,
  onChange,
}: {
  label: string;
  min: number;
  max: number;
  step: number;
  unit?: string;
  value: number;
  onChange: (v: number) => void;
}) {
  const fmt = step < 1 ? value.toFixed(step < 0.05 ? 2 : 1) : String(Math.round(value));
  return (
    <div className="grid grid-cols-[74px_1fr_46px] items-center gap-2">
      <label className="text-[11.5px] text-neutral-700">{label}</label>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className="dt-range"
      />
      <span className="text-right font-mono text-[10.5px] tabular-nums text-neutral-500">
        {fmt}
        {unit}
      </span>
    </div>
  );
}

function GradientEditor({
  grad,
  onChange,
}: {
  grad: { p: number; c: string }[];
  onChange: () => void;
}) {
  const css = grad.map((s) => `${s.c} ${Math.round(s.p * 100)}%`).join(",");
  return (
    <div className="mb-1">
      <div className="mb-1 text-[11.5px] text-neutral-700">Gradient</div>
      <div className="h-5" style={{ background: `linear-gradient(90deg, ${css})` }} />
      <div className="mt-1.5 flex gap-1.5">
        {grad.map((s, i) => (
          <GradStopColor key={i} stop={s} onChange={onChange} />
        ))}
      </div>
    </div>
  );
}

/* one gradient stop: colour swatch + editable hex code input. The hex field keeps
   local text so partial/invalid typing doesn't break the picker; it commits to the
   stop only when it's a valid #rgb / #rrggbb. */
function GradStopColor({ stop, onChange }: { stop: { p: number; c: string }; onChange: () => void }) {
  const [text, setText] = useState(stop.c);
  useEffect(() => setText(stop.c), [stop.c]);
  const commit = (raw: string) => {
    let h = raw.trim();
    if (h && !h.startsWith("#")) h = "#" + h;
    if (/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(h)) {
      stop.c = h;
      onChange();
    }
  };
  const pickerVal = /^#[0-9a-fA-F]{6}$/.test(stop.c) ? stop.c : "#000000";
  return (
    <div className="flex flex-col items-center gap-1">
      <input
        type="color"
        value={pickerVal}
        onChange={(e) => {
          stop.c = e.target.value;
          setText(e.target.value);
          onChange();
        }}
        className="h-5 w-6 cursor-pointer bg-transparent"
      />
      <input
        value={text}
        spellCheck={false}
        onChange={(e) => {
          setText(e.target.value);
          commit(e.target.value);
        }}
        onBlur={() => commit(text)}
        className="w-[52px] bg-paper px-1 py-0.5 text-center font-mono text-[10px] uppercase text-neutral-700"
      />
    </div>
  );
}
