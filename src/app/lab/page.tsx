"use client";

/* Effect lab — renders the shared <Glitch> component in isolation with live controls.
   Tuning here maps 1:1 onto the same component the homepage uses. */
import { useMemo, useRef, useState } from "react";
import Link from "next/link";
import { Glitch } from "@/components/glitch";
import {
  defaultBoxes,
  defaultLayer,
  serialize,
  instantiate,
  SCHEMA,
  type BoxConfig,
  type LayerConfig,
  type GlitchMode,
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

export default function LabPage() {
  const [boxes, setBoxes] = useState<BoxConfig[]>(() => defaultBoxes());
  const [active, setActive] = useState(0);
  const [mode, setMode] = useState<GlitchMode>("grid");
  const [running, setRunning] = useState(true);
  const [addOpen, setAddOpen] = useState(false);
  const [layer, setLayer] = useState<LayerConfig>(() => defaultLayer());
  const dragIndex = useRef<number | null>(null);

  const commit = () => setBoxes((b) => b.slice());
  const commitLayer = () => setLayer((l) => ({ ...l }));
  const box = boxes[active];

  const addEffect = (type: string) => {
    box.effects.unshift(instantiate({ type }));
    setAddOpen(false);
    commit();
  };
  const removeEffect = (id?: number) => {
    box.effects = box.effects.filter((e) => e.id !== id);
    commit();
  };
  const reorder = (from: number | null, to: number) => {
    if (from == null || from === to) return;
    const moved = box.effects.splice(from, 1)[0];
    box.effects.splice(to, 0, moved);
    commit();
  };

  const fxCount = useMemo(
    () => `${box.effects.filter((e) => e.on).length}/${box.effects.length}`,
    [box]
  );

  const exportJson = () => {
    const json = JSON.stringify(serialize(boxes), null, 2);
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "glitch-config.json";
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex h-screen flex-col bg-[#f1f1f0] text-ink">
      {/* top bar */}
      <header className="flex h-13 flex-none items-center gap-4 border-b border-hair bg-paper px-5 py-3">
        <Link href="/" className="text-sm font-medium tracking-tight transition-opacity hover:opacity-60" title="Back to home">
          Different <span className="text-blue">Thinking</span>
        </Link>
        <Link href="/" className="font-mono text-[11px] text-neutral-500 transition-opacity hover:opacity-60" title="Back to home">
          ← glitch lab
        </Link>
        <div className="flex-1" />
        <button
          onClick={() => setRunning((r) => !r)}
          className="rounded-md border border-hair px-3 py-1.5 text-xs hover:bg-black/5"
        >
          {running ? "Pause" : "Play"}
        </button>
        <div className="flex overflow-hidden rounded-lg border border-hair">
          {(["grid", "landing"] as GlitchMode[]).map((m) => (
            <button
              key={m}
              onClick={() => setMode(m)}
              className={`px-3 py-1.5 text-xs capitalize ${
                mode === m ? "bg-ink text-paper" : "bg-paper text-neutral-600 hover:bg-black/5"
              }`}
            >
              {m}
            </button>
          ))}
        </div>
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
              mode={mode}
              running={running}
              background={mode === "landing" ? [0.988, 0.988, 0.988] : [0.945, 0.945, 0.941]}
            />
          </div>
        </div>

        {/* controls */}
        <aside className="flex max-h-[52vh] w-full flex-none flex-col border-t border-hair bg-paper lg:max-h-none lg:w-[380px] lg:border-l lg:border-t-0">
          <div className="relative border-b border-hair p-4">
            <div className="flex items-center gap-2">
              <span className="text-neutral-500">≈</span>
              <h2 className="flex-1 font-mono text-[11px] uppercase tracking-[0.14em]">Effects</h2>
              <span className="font-mono text-[11px] text-neutral-400">[{fxCount}]</span>
              <button
                onClick={() => setAddOpen((o) => !o)}
                className="grid h-6 w-6 place-items-center rounded border border-hair text-[15px] leading-none text-neutral-600 hover:border-ink hover:text-ink"
                title="Add effect"
              >
                +
              </button>
            </div>
            {addOpen && (
              <div className="absolute right-4 top-12 z-30 min-w-[180px] rounded-lg border border-hair bg-paper p-1.5 shadow-[0_10px_34px_rgba(0,0,0,0.14)]">
                {Object.keys(S).map((type) => (
                  <button
                    key={type}
                    onClick={() => addEffect(type)}
                    className="flex w-full items-center gap-2 rounded-md px-2.5 py-2 text-left text-[13px] hover:bg-black/5"
                  >
                    <span className="text-neutral-500">≈</span> {S[type].name}
                  </button>
                ))}
              </div>
            )}
            <div className="mt-3 flex gap-1.5">
              {boxes.map((_, i) => (
                <button
                  key={i}
                  onClick={() => setActive(i)}
                  className={`h-8 w-8 rounded-md border text-[12px] ${
                    i === active
                      ? "border-ink font-semibold shadow-[inset_0_0_0_1px_var(--ink)]"
                      : "border-hair text-neutral-500 hover:border-neutral-400"
                  }`}
                  title={BOX_NAMES[i]}
                >
                  {i + 1}
                </button>
              ))}
            </div>
          </div>

          <div className="flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto p-2.5">
            {/* duplicate-layer card (global; visible in Landing mode) */}
            <div className={`rounded-[10px] border border-hair bg-paper transition-opacity ${layer.enabled ? "" : "opacity-50"}`}>
              <div className="flex items-center gap-2 px-3 py-2.5">
                <span className="text-neutral-500">≈</span>
                <span className="flex-1 text-[13px] tracking-tight">
                  Duplicate layer <span className="font-mono text-[10px] text-neutral-400">· landing</span>
                </span>
                <input
                  type="checkbox"
                  checked={layer.enabled}
                  onChange={(e) => {
                    layer.enabled = e.target.checked;
                    commitLayer();
                  }}
                  className="accent-blue"
                  title="Enable duplicate layer"
                />
              </div>
              <div className="flex flex-col gap-2 px-3.5 pb-3.5">
                <Slider label="Opacity" min={0} max={100} step={1} unit="%" value={layer.opacity * 100} onChange={(v) => { layer.opacity = v / 100; commitLayer(); }} />
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
              </div>
            </div>

            {/* layout card */}
            <Card title="Layout & size">
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

            {/* effect cards — drag to reorder, eye to hide, – to remove, + to add */}
            {box.effects.map((e, idx) => {
              const def = S[e.type];
              if (!def) return null;
              return (
                <div
                  key={e.id}
                  onDragOver={(ev) => ev.preventDefault()}
                  onDrop={(ev) => {
                    ev.preventDefault();
                    reorder(dragIndex.current, idx);
                    dragIndex.current = null;
                  }}
                  className={`rounded-[10px] border border-hair bg-paper transition-opacity ${e.on ? "" : "opacity-50"}`}
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
                    <span className="w-3 font-mono text-[10px] text-neutral-400">{idx + 1}</span>
                    <span className="text-neutral-500">≈</span>
                    <span className="flex-1 text-[13px] tracking-tight">{def.name}</span>
                    <button
                      onClick={() => {
                        e.on = !e.on;
                        commit();
                      }}
                      title={e.on ? "Hide" : "Show"}
                      className="grid h-6 w-6 place-items-center rounded text-neutral-600 hover:bg-black/5"
                    >
                      {e.on ? EyeIcon : EyeOffIcon}
                    </button>
                    <button
                      onClick={() => removeEffect(e.id)}
                      title="Remove"
                      className="grid h-6 w-6 place-items-center rounded font-mono text-[15px] leading-none text-neutral-500 hover:bg-black/5"
                    >
                      –
                    </button>
                  </div>
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
                            className="w-full rounded-md border border-hair bg-paper px-2 py-1 text-xs"
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
                            className="accent-blue"
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
                            className="h-6 w-10 rounded border border-hair"
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
                </div>
              );
            })}
          </div>

          <div className="grid grid-cols-2 gap-2 border-t border-hair p-2.5">
            <button
              onClick={() => {
                setBoxes(defaultBoxes());
                setActive(0);
              }}
              className="rounded-md border border-ink px-2 py-2 font-mono text-[10.5px] uppercase tracking-wide hover:bg-ink hover:text-paper"
            >
              Reset all
            </button>
            <button
              onClick={exportJson}
              className="rounded-md border border-ink px-2 py-2 font-mono text-[10.5px] uppercase tracking-wide hover:bg-ink hover:text-paper"
            >
              Export JSON
            </button>
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
  dim,
  action,
}: {
  title: string;
  children: React.ReactNode;
  dim?: boolean;
  action?: React.ReactNode;
}) {
  return (
    <div
      className={`rounded-[10px] border border-hair bg-paper transition-opacity ${
        dim ? "opacity-50" : ""
      }`}
    >
      <div className="flex items-center gap-2 px-3 py-2.5">
        <span className="text-sm text-neutral-600">≈</span>
        <span className="flex-1 text-[13.5px] tracking-tight">{title}</span>
        {action}
      </div>
      <div className="flex flex-col gap-2 px-3.5 pb-3.5">{children}</div>
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
        className="accent-ink"
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
      <div
        className="h-5 rounded border border-hair"
        style={{ background: `linear-gradient(90deg, ${css})` }}
      />
      <div className="mt-1.5 flex gap-1.5">
        {grad.map((s, i) => (
          <input
            key={i}
            type="color"
            value={s.c}
            onChange={(e) => {
              s.c = e.target.value;
              onChange();
            }}
            className="h-5 w-6 rounded border border-hair"
          />
        ))}
      </div>
    </div>
  );
}
