"use client";

/* Homepage hero: renders the shared <Glitch> using the PUBLISHED composition
   from the server (/api/composition — the single, global store; no local
   copies). The fetch is kicked off at page load via prefetchLiveComposition(),
   and the canvas only mounts once it settles, so a stale variation never
   flashes before the live one. Falls back to the baked default if the server
   has nothing. Optional `tweaks` (the public play-sliders) scale a LOCAL clone
   of the composition — nothing is ever written back, so a refresh resets it. */
import { useEffect, useMemo, useState, type CSSProperties } from "react";
import {
  Glitch,
  clone,
  defaultComposition,
  parseComposition,
  type Composition,
  type EffectParams,
  type GlitchMode,
} from "@/components/glitch";

export type HeroTweaks = { gain: number; slice: number; stretch: number; speed: number }; // 0-100, 50 = neutral

/* one shared fetch for the published composition — call early (Hero mount) so
   it has settled long before the bug is ever clicked */
let livePromise: Promise<Composition | null> | null = null;
export function prefetchLiveComposition(): Promise<Composition | null> {
  if (!livePromise) {
    livePromise = fetch("/api/composition")
      .then((r) => (r.ok ? r.json() : null))
      .then((j) => (j?.comp ? parseComposition(j.comp) : null))
      .catch(() => null);
  }
  return livePromise;
}

export default function HeroGlitch({
  className,
  style,
  mode = "landing",
  background,
  burst,
  intro,
  shown,
  tweaks,
}: {
  className?: string;
  style?: CSSProperties;
  mode?: GlitchMode;
  background?: [number, number, number];
  burst?: number;
  intro?: number;
  shown?: boolean;
  tweaks?: HeroTweaks;
}) {
  const [comp, setComp] = useState<Composition | null>(null);

  useEffect(() => {
    let dead = false;
    prefetchLiveComposition().then((c) => {
      if (!dead) setComp(c ?? defaultComposition());
    });
    return () => {
      dead = true;
    };
  }, []);

  const tweaked = useMemo(() => {
    if (!comp) return null;
    if (!tweaks || (tweaks.slice === 50 && tweaks.stretch === 50 && tweaks.speed === 50)) return comp;
    const t = clone(comp);
    const fs = tweaks.slice / 50;
    const fp = tweaks.stretch / 50;
    const fv = tweaks.speed / 50;
    const scale = (p: EffectParams, key: string, f: number) => {
      p[key] = Number(p[key] || 0) * f;
    };
    for (const b of t.boxes) {
      for (const e of b.effects) {
        if (e.type === "slice") {
          scale(e.params, "shift", fs);
          scale(e.params, "shiftV", fs);
          scale(e.params, "speed", fv);
          scale(e.params, "glitch", fv);
        }
        if (e.type === "pixstretch") scale(e.params, "offset", fp);
        if (e.type === "metal") scale(e.params, "speed", fv);
      }
    }
    for (const s of [t.layer.slice, t.frontLayer.slice]) {
      scale(s, "shift", fs);
      scale(s, "shiftV", fs);
    }
    for (const p of [t.layer.pixstretch, t.frontLayer.pixstretch]) scale(p, "offset", fp);
    return t;
  }, [comp, tweaks]);

  // hold the mount until the published composition has settled — never flash a
  // different variation first
  if (!tweaked) return null;

  return (
    <Glitch
      config={tweaked.boxes}
      layer={tweaked.layer}
      frontLayer={tweaked.frontLayer}
      mode={mode}
      background={background}
      burst={burst}
      intro={intro}
      shown={shown}
      gain={tweaks ? tweaks.gain / 50 : 1}
      className={className}
      style={style}
    />
  );
}
