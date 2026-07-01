/* Config types + helpers for the glitch effect.
   The baked default config, effect schema, and gradient presets live in ./schema (ported from the lab). */
import { SCHEMA, SAVED, GRAD_METAL, GR_TEAL, CFG_VERSION } from "./schema";

export type GradStop = { p: number; c: string };
export type EffectParams = Record<string, number | boolean | string>;
export interface Effect {
  id?: number;
  type: string;
  on: boolean;
  params: EffectParams;
  grad?: GradStop[] | null;
}
export interface BoxLayout {
  x: number;
  y: number;
  w: number;
  h: number;
}
export interface BoxConfig {
  layout: BoxLayout;
  effects: Effect[];
}

export { SCHEMA, SAVED, GRAD_METAL, CFG_VERSION };

let uid = 0;
export function clone<T>(o: T): T {
  return JSON.parse(JSON.stringify(o));
}
export function hex2rgb(h: string): [number, number, number] {
  h = h.replace("#", "");
  if (h.length === 3) h = h.split("").map((c) => c + c).join("");
  return [
    parseInt(h.slice(0, 2), 16) / 255,
    parseInt(h.slice(2, 4), 16) / 255,
    parseInt(h.slice(4, 6), 16) / 255,
  ];
}

/** Loose shapes for reading raw/serialized config (e.g. the baked SAVED or a JSON import). */
export type CfgEffect = {
  type: string;
  on?: boolean;
  params?: Record<string, unknown>;
  grad?: GradStop[] | null;
};
export type CfgBox = { layout: BoxLayout; effects?: CfgEffect[] };

/* Build a full Effect from a (possibly partial) config entry, filling any missing
   params from the SCHEMA defaults — so older exports without newer params still work. */
export function instantiate(e: CfgEffect): Effect {
  const def = (
    SCHEMA as unknown as Record<
      string,
      { params: Record<string, { val: number | boolean | string }>; hasGrad?: string }
    >
  )[e.type];
  const params: EffectParams = {};
  for (const k in def.params) {
    if (k === "__t") continue;
    params[k] = def.params[k].val as number | boolean | string;
  }
  Object.assign(params, e.params || {});
  return {
    id: ++uid,
    type: e.type,
    on: e.on !== false,
    params,
    grad: e.grad
      ? clone(e.grad)
      : def.hasGrad
        ? clone(def.hasGrad === "metalGrad" ? GRAD_METAL : GR_TEAL)
        : null,
  };
}

export function boxFromCfg(c: CfgBox): BoxConfig {
  return { layout: { ...c.layout }, effects: (c.effects || []).map(instantiate) };
}

/** The dialed-in default composition, ready to render/edit. */
export function defaultBoxes(): BoxConfig[] {
  return (SAVED as unknown as CfgBox[]).map(boxFromCfg);
}

export function serialize(boxes: BoxConfig[]) {
  return boxes.map((b, i) => ({
    box: i + 1,
    layout: b.layout,
    effects: b.effects.map((e) => ({
      type: e.type,
      on: e.on,
      params: e.params,
      grad: e.grad || undefined,
    })),
  }));
}

export function boxRound(box: BoxConfig): number {
  const m = box.effects.find((e) => e.type === "metal");
  return m ? (Number(m.params.rounding) || 0) / 100 : 0;
}
