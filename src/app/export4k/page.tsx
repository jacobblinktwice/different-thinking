"use client";

/* TEMPORARY dev-only page: renders a saved composition (optionally a zoomed crop) at high
   resolution and POSTs the PNG to /api/save-export. Query params:
     variant = key in /export-comps.json ("live" | "custom" | "zoomC" | …) or version index
     w,h     = output px; cx,cy,cw,ch = crop rect (0..1 fractions; omit for full frame)
     g       = glitch multiplier (1 = calm baseline; the live site reaches ~2.6 on interaction)
     t, name
   Delete after use. */
import { useEffect, useState } from "react";
import { GlitchEngine, parseComposition } from "@/components/glitch";

export default function Export4K() {
  const [status, setStatus] = useState("starting");

  useEffect(() => {
    (async () => {
      try {
        const q = new URLSearchParams(window.location.search);
        const variant = q.get("variant") || "live";
        const w = Number(q.get("w") || 3840);
        const h = Number(q.get("h") || 2160);
        const t = Number(q.get("t") || 6);
        const g = Number(q.get("g") || 1);
        const ref = Number(q.get("ref") || 900); // logical res for grain (900 = site look)
        const cx = Number(q.get("cx") || 0);
        const cy = Number(q.get("cy") || 0);
        const cw = Number(q.get("cw") || 1);
        const ch = Number(q.get("ch") || 1);
        const name = q.get("name") || `glitch-${variant}-${w}x${h}`;

        setStatus("loading comps…");
        const data = await fetch("/export-comps.json").then((r) => r.json());
        const snap =
          variant in data && variant !== "versions" ? data[variant] : data.versions?.[Number(variant)]?.snap;
        if (!snap) throw new Error(`variant "${variant}" not found`);
        const comp = parseComposition(snap);
        if (!comp) throw new Error("parseComposition returned null");

        const fullW = Math.round(w / cw);
        const fullH = Math.round(h / ch);
        setStatus(`rendering virtual ${fullW}×${fullH}, out ${w}×${h}, g=${g}, t=${t}…`);

        const canvas = document.createElement("canvas");
        canvas.style.width = `${fullW}px`;
        canvas.style.height = `${fullH}px`;
        canvas.style.position = "absolute";
        canvas.style.left = "0";
        canvas.style.top = "0";
        document.body.appendChild(canvas);

        const engine = new GlitchEngine(canvas);
        const maxTex = engine.gl.getParameter(engine.gl.MAX_TEXTURE_SIZE);
        if (fullW > maxTex || fullH > maxTex) throw new Error(`virtual ${fullW}×${fullH} > GL max ${maxTex}`);
        engine.dprCap = 1;
        engine.refRes = ref;
        engine.bg = [1, 1, 1];
        if (!engine.resize()) throw new Error("resize failed");
        if (canvas.width !== fullW) throw new Error(`buffer ${canvas.width} != ${fullW}`);

        engine.render(comp.boxes, "landing", t, comp.layer, g, comp.frontLayer, 1, true);

        const out = document.createElement("canvas");
        out.width = w;
        out.height = h;
        const ctx = out.getContext("2d")!;
        ctx.imageSmoothingEnabled = false;
        ctx.drawImage(canvas, Math.round(cx * fullW), Math.round(cy * fullH), w, h, 0, 0, w, h);

        // guard against silent GL memory failures (all-white output)
        const probe = ctx.getImageData(0, 0, Math.min(w, 512), Math.min(h, 512)).data;
        let nonWhite = 0;
        for (let i = 0; i < probe.length; i += 4) if (probe[i] < 250 || probe[i + 1] < 250 || probe[i + 2] < 250) nonWhite++;

        const blob: Blob = await new Promise((res, rej) =>
          out.toBlob((b) => (b ? res(b) : rej(new Error("toBlob failed"))), "image/png")
        );
        setStatus(`uploading ${(blob.size / 1e6).toFixed(1)} MB…`);
        const resp = await fetch(`/api/save-export?name=${encodeURIComponent(name)}`, {
          method: "POST",
          body: blob,
        }).then((r) => r.json());

        engine.dispose();
        canvas.remove();
        setStatus(
          resp.ok
            ? `DONE ${resp.file} (${resp.bytes} bytes, probeNonWhite=${nonWhite})`
            : `SAVE FAILED: ${JSON.stringify(resp)}`
        );
      } catch (err) {
        setStatus(`ERROR: ${err instanceof Error ? err.message : String(err)}`);
      }
    })();
  }, []);

  return (
    <div style={{ position: "fixed", zIndex: 10, background: "#fff", padding: 12, fontFamily: "monospace", fontSize: 14 }}>
      export4k status: {status}
    </div>
  );
}
