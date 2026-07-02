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
  /** effects applied to the box's MASK (silhouette/alpha) only, not its contents. */
  mask?: Effect[];
  /** 0 = far/back, 1 = near/front. Drives z-order. */
  depth?: number;
}

/** The duplicated layer behind the boxes: the whole composited scene, run through
    layer-level slice-shift (H+V) + pixel-stretch, offset and dimmed. */
export interface LayerConfig {
  enabled: boolean;
  opacity: number; // 0..1
  offsetX: number; // % of canvas
  offsetY: number; // % of canvas
  /** duplicate's z-depth (0 = fully behind boxes, 1 = fully in front). */
  depth: number;
  /** interaction reactivity (0 = static; higher = glitch intensity reacts more to the pointer). */
  reactivity: number;
  /** what drives the glitch multiplier: "position" = cursor distance from centre (smooth),
      "velocity" = pointer speed + scroll (spikes then decays). */
  reactMode: "position" | "velocity";
  slice: EffectParams;
  pixstretch: EffectParams;
}
export function defaultLayer(): LayerConfig {
  return {
    enabled: true,
    opacity: 0.9,
    offsetX: 1.5,
    offsetY: 3,
    depth: 0.12,
    reactivity: 50,
    reactMode: "position",
    slice: { shift: 14, shiftV: 7, soft: 0, random: 40, speed: 0, glitch: 0, tx: 50, ty: 50, srot: 0, sangle: 0 },
    pixstretch: { offset: 38, smooth: 22, falloff: 0, tx: 50, ty: 50, prot: 0, pangle: 0 },
  };
}

/** The FRONT boxes as a group: composite of all boxes, run through a layer-level slice-shift
    (H+V) + pixel-stretch. Disabled by default (boxes draw individually, per-box z-scatter). */
export interface FrontLayerConfig {
  enabled: boolean;
  slice: EffectParams;
  pixstretch: EffectParams;
}
export function defaultFrontLayer(): FrontLayerConfig {
  return {
    enabled: false,
    slice: { shift: 20, shiftV: 0, soft: 0, random: 40, speed: 0, glitch: 0, tx: 50, ty: 50, srot: 0, sangle: 0 },
    pixstretch: { offset: 0, smooth: 20, falloff: 0, tx: 50, ty: 50, prot: 0, pangle: 0 },
  };
}

/** default per-box depths (back → front) so z-order has variation out of the box */
const DEFAULT_DEPTHS = [0.35, 0.55, 0.72, 0.9];

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
export type CfgBox = { layout: BoxLayout; effects?: CfgEffect[]; mask?: CfgEffect[]; depth?: number };

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
  return {
    layout: { ...c.layout },
    effects: (c.effects || []).map(instantiate),
    mask: (c.mask || []).map(instantiate),
    depth: c.depth,
  };
}

/** The dialed-in default composition, ready to render/edit. */
export function defaultBoxes(): BoxConfig[] {
  return (SAVED as unknown as CfgBox[]).map((c, i) => {
    const b = boxFromCfg(c);
    if (b.depth == null) b.depth = DEFAULT_DEPTHS[i] ?? 0.5;
    return b;
  });
}

const serializeFx = (e: Effect) => ({ type: e.type, on: e.on, params: e.params, grad: e.grad || undefined });
export function serialize(boxes: BoxConfig[]) {
  return boxes.map((b, i) => ({
    box: i + 1,
    layout: b.layout,
    depth: b.depth,
    effects: b.effects.map(serializeFx),
    mask: b.mask && b.mask.length ? b.mask.map(serializeFx) : undefined,
  }));
}

export function boxRound(box: BoxConfig): number {
  const m = box.effects.find((e) => e.type === "metal");
  return m ? (Number(m.params.rounding) || 0) / 100 : 0;
}

/* =====================================================================
   Persistence — one composition (boxes + layer) shared across /lab and /.
   Version-stamped so a stale save is ignored after the baked baseline changes.
   ===================================================================== */
export interface Composition {
  boxes: BoxConfig[];
  layer: LayerConfig;
  frontLayer: FrontLayerConfig;
}
export const STORAGE_KEY = "dt-glitch-config";

export function defaultComposition(): Composition {
  return { boxes: defaultBoxes(), layer: defaultLayer(), frontLayer: defaultFrontLayer() };
}

export function saveComposition(boxes: BoxConfig[], layer: LayerConfig, frontLayer: FrontLayerConfig) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ v: CFG_VERSION, boxes: serialize(boxes), layer, frontLayer }));
  } catch {
    /* storage unavailable (e.g. data: URL) — noop */
  }
}

/** Parse a stored/imported blob into a Composition. Accepts the versioned object
    ({v,boxes,layer,frontLayer}) or a bare boxes array (legacy export). Returns null if unusable/stale. */
export function parseComposition(raw: unknown): Composition | null {
  try {
    const obj = raw as
      | { v?: number; boxes?: CfgBox[]; layer?: LayerConfig; frontLayer?: FrontLayerConfig }
      | CfgBox[];
    if (Array.isArray(obj)) {
      return { boxes: obj.map(boxFromCfg), layer: defaultLayer(), frontLayer: defaultFrontLayer() };
    }
    if (obj && Array.isArray(obj.boxes)) {
      if (obj.v != null && obj.v !== CFG_VERSION) return null; // stale baseline
      return {
        boxes: obj.boxes.map(boxFromCfg),
        layer: { ...defaultLayer(), ...(obj.layer || {}) },
        frontLayer: { ...defaultFrontLayer(), ...(obj.frontLayer || {}) },
      };
    }
  } catch {
    /* fall through */
  }
  return null;
}

export function loadComposition(): Composition | null {
  try {
    const s = localStorage.getItem(STORAGE_KEY);
    if (!s) return null;
    return parseComposition(JSON.parse(s));
  } catch {
    return null;
  }
}
