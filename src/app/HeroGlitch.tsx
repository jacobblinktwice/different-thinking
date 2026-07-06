"use client";

/* Homepage hero: renders the shared <Glitch> using the composition saved from /lab
   (localStorage), falling back to the baked default. Live-updates across tabs via `storage`. */
import { useEffect, useState, type CSSProperties } from "react";
import {
  Glitch,
  defaultComposition,
  loadComposition,
  parseComposition,
  STORAGE_KEY,
  type Composition,
  type GlitchMode,
} from "@/components/glitch";

export default function HeroGlitch({
  className,
  style,
  mode = "landing",
  background,
  burst,
  intro,
  shown,
}: {
  className?: string;
  style?: CSSProperties;
  mode?: GlitchMode;
  background?: [number, number, number];
  burst?: number;
  intro?: number;
  shown?: boolean;
}) {
  const [comp, setComp] = useState<Composition>(() => defaultComposition());

  useEffect(() => {
    const saved = loadComposition();
    if (saved) setComp(saved);
    const onStorage = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY && e.newValue) {
        try {
          const p = parseComposition(JSON.parse(e.newValue));
          if (p) setComp(p);
        } catch {
          /* ignore */
        }
      }
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  return (
    <Glitch
      config={comp.boxes}
      layer={comp.layer}
      frontLayer={comp.frontLayer}
      mode={mode}
      background={background}
      burst={burst}
      intro={intro}
      shown={shown}
      className={className}
      style={style}
    />
  );
}
