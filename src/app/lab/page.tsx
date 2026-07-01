"use client";

/* Effect lab — renders the shared <Glitch> component in isolation with live controls.
   Tuning here maps 1:1 onto the same component the homepage uses. */
import { useMemo, useState } from "react";
import { Glitch } from "@/components/glitch";
import {
  defaultBoxes,
  serialize,
  SCHEMA,
  type BoxConfig,
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

export default function LabPage() {
  const [boxes, setBoxes] = useState<BoxConfig[]>(() => defaultBoxes());
  const [active, setActive] = useState(0);
  const [mode, setMode] = useState<GlitchMode>("grid");
  const [running, setRunning] = useState(true);

  const commit = () => setBoxes((b) => b.slice());
  const box = boxes[active];

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
        <span className="text-sm font-medium tracking-tight">
          Different <span className="text-blue">Thinking</span>
        </span>
        <span className="font-mono text-[11px] text-neutral-500">glitch lab</span>
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

      <div className="flex min-h-0 flex-1">
        {/* stage */}
        <div className="grid min-h-0 flex-1 place-items-center overflow-hidden p-6">
          <div
            className="relative w-full shadow-[0_10px_44px_rgba(0,0,0,0.10)]"
            style={{ maxWidth: "calc((100vh - 140px) * 1.7)", aspectRatio: "17 / 10" }}
          >
            <Glitch
              config={boxes}
              mode={mode}
              running={running}
              background={mode === "landing" ? [0.988, 0.988, 0.988] : [0.945, 0.945, 0.941]}
            />
          </div>
        </div>

        {/* controls */}
        <aside className="flex w-[380px] flex-none flex-col border-l border-hair bg-paper">
          <div className="border-b border-hair p-4">
            <div className="flex items-center gap-2">
              <h2 className="flex-1 text-sm font-semibold">Effects</h2>
              <span className="font-mono text-[11px] text-neutral-400">{fxCount}</span>
            </div>
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

            {/* effect cards */}
            {box.effects.map((e) => {
              const def = S[e.type];
              if (!def) return null;
              return (
                <Card
                  key={e.id}
                  title={def.name}
                  dim={!e.on}
                  action={
                    <button
                      onClick={() => {
                        e.on = !e.on;
                        commit();
                      }}
                      className="rounded px-2 py-0.5 text-[11px] text-neutral-500 hover:bg-black/5"
                    >
                      {e.on ? "hide" : "show"}
                    </button>
                  }
                >
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
                </Card>
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
