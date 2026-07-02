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
}: {
  className?: string;
  style?: CSSProperties;
  mode?: GlitchMode;
  background?: [number, number, number];
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
      className={className}
      style={style}
    />
  );
}
