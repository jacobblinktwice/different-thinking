"use client";

/* Imagery on article-link hover: a borderless image layer with an
   object-identifier-style label (no box outline) that chases the cursor
   smoothly while the link stays hovered. Images come from the article's source
   automatically — each link's term is looked up against the Wikipedia REST
   summary API and its page thumbnail is used (cached per term; label-only when
   a term has no image). Prefetched shortly after boot so hovers feel instant. */
import { useEffect, useRef } from "react";

const thumbs = new Map<string, string | null>();
const fetchThumb = async (term: string): Promise<string | null> => {
  if (thumbs.has(term)) return thumbs.get(term)!;
  try {
    const r = await fetch(
      `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(term.replace(/ /g, "_"))}`,
    );
    const j = r.ok ? await r.json() : null;
    const url: string | null = j?.thumbnail?.source ?? null;
    thumbs.set(term, url);
    return url;
  } catch {
    thumbs.set(term, null);
    return null;
  }
};

// stable pseudo-confidence per term, detection-tag flavour
const conf = (term: string) => {
  let h = 0;
  for (let i = 0; i < term.length; i++) h = (h * 31 + term.charCodeAt(i)) | 0;
  return (0.62 + (Math.abs(h) % 36) / 100).toFixed(2);
};

export default function HoverImages() {
  const layerRef = useRef<HTMLDivElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  const tagRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const layer = layerRef.current;
    const img = imgRef.current;
    const tag = tagRef.current;
    if (
      !layer ||
      !img ||
      !tag ||
      !window.matchMedia("(hover: hover)").matches || // hover-capable devices only
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    )
      return;

    const terms = () =>
      Array.from(
        new Set(
          Array.from(document.querySelectorAll<HTMLElement>(".article-col .wl"), (a) => a.dataset.term || a.textContent || ""),
        ),
      );
    // prefetch after boot so first hovers are instant
    const pre = window.setTimeout(() => terms().forEach((t) => void fetchThumb(t)), 4000);

    let active: HTMLElement | null = null;
    let session = 0;
    const mouse = { x: 0, y: 0 };
    const cur = { x: 0, y: 0 };
    let raf = 0;
    let last = 0;

    const tick = (now: number) => {
      if (!last) last = now;
      const dt = Math.min((now - last) / 1000, 0.05);
      last = now;
      const k = Math.min(1, 1 - Math.exp(-dt * 12));
      cur.x += (mouse.x - cur.x) * k;
      cur.y += (mouse.y - cur.y) * k;
      const x = Math.min(cur.x + 18, window.innerWidth - 236);
      layer.style.transform = `translate3d(${x.toFixed(1)}px, ${(cur.y + 20).toFixed(1)}px, 0)`;
      raf = requestAnimationFrame(tick);
    };

    const show = async (link: HTMLElement) => {
      active = link;
      const id = ++session;
      // data-term overrides the display text (e.g. "bug" → "software bug");
      // otherwise the hover-scramble may have glyphed the text — its stored original wins
      const term = (link.dataset.term || link.dataset.dtOrig || link.textContent || "").trim();
      if (!term) return;
      tag.textContent = `${term.toLowerCase().replace(/ /g, "_")} :: ${conf(term)}`;
      img.style.display = "none";
      img.removeAttribute("src");
      cur.x = mouse.x;
      cur.y = mouse.y;
      layer.style.display = "block";
      layer.classList.remove("dt-on");
      void layer.offsetWidth; // restart the wipe-in
      layer.classList.add("dt-on");
      cancelAnimationFrame(raf);
      last = 0;
      raf = requestAnimationFrame(tick);
      const url = await fetchThumb(term);
      if (id !== session || !url) return; // hover moved on, or label-only term
      img.onload = () => {
        if (id === session) img.style.display = "block";
      };
      img.src = url;
    };
    const hide = () => {
      active = null;
      session++;
      layer.style.display = "none";
      cancelAnimationFrame(raf);
    };

    const onOver = (e: Event) => {
      const link = (e.target as HTMLElement | null)?.closest?.(".article-col .wl") as HTMLElement | null;
      if (link && link !== active) void show(link);
      else if (!link && active) hide();
    };
    const onMove = (e: PointerEvent) => {
      mouse.x = e.clientX;
      mouse.y = e.clientY;
    };
    document.addEventListener("mouseover", onOver, { passive: true });
    window.addEventListener("pointermove", onMove, { passive: true });

    return () => {
      window.clearTimeout(pre);
      cancelAnimationFrame(raf);
      document.removeEventListener("mouseover", onOver);
      window.removeEventListener("pointermove", onMove);
    };
  }, []);

  return (
    <div ref={layerRef} className="dt-hoverimg" style={{ display: "none" }} aria-hidden>
      <span ref={tagRef} className="dt-hoverimg-tag" />
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img ref={imgRef} alt="" />
    </div>
  );
}
