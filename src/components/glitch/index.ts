export { Glitch, default } from "./Glitch";
export type { GlitchProps } from "./Glitch";
export { GlitchEngine, type GlitchMode } from "./engine";
export {
  defaultBoxes,
  defaultLayer,
  defaultFrontLayer,
  defaultComposition,
  serialize,
  instantiate,
  boxFromCfg,
  clone,
  boxRound,
  saveComposition,
  loadComposition,
  parseComposition,
  STORAGE_KEY,
  SCHEMA,
  SAVED,
  CFG_VERSION,
  type BoxConfig,
  type LayerConfig,
  type FrontLayerConfig,
  type Composition,
  type Effect,
  type EffectParams,
  type BoxLayout,
  type GradStop,
} from "./config";
