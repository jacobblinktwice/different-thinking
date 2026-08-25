"use client";

/* Orb marquee: Eventually's identity spheres scrolling in an endless loop. The
   track is duplicated once and translated −50% for a seamless wrap, so each orb
   appears twice — the browser serves the second copy from cache, so it costs
   one download per orb, not two.

   These are 3.5MB webm clips, so nothing is fetched or decoded until the
   marquee is actually on screen: preload="none" plus play/pause driven by an
   IntersectionObserver. Under prefers-reduced-motion they stay paused and only
   metadata loads, which is enough to paint a still first frame. */
import { useEffect, useRef } from "react";

const ORBS = [
  "accelerator-4018219242",
  "activator-1603526000",
  "builder-773617298",
  "focuser-918601696",
  "guide-3286213711",
  "igniter-3913934245",
  "launcher-927752544",
  "mapper-1684130811",
  "mentor-3262742251",
  "spark-3222868263",
  "visionary-3605701399",
  "weaver-607266789",
];

export default function OrbMarquee() {
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const wrap = wrapRef.current;
    if (!wrap) return;
    const vids = Array.from(wrap.querySelectorAll("video"));
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    if (reduced) {
      // load just enough to show a frame, never play
      for (const v of vids) v.preload = "metadata";
      return;
    }

    const io = new IntersectionObserver(
      ([e]) => {
        for (const v of vids) {
          if (e.isIntersecting) {
            v.preload = "auto";
            void v.play().catch(() => {
              /* autoplay refused — the still frame stands in */
            });
          } else {
            v.pause();
          }
        }
      },
      { rootMargin: "15% 0px" },
    );
    io.observe(wrap);
    return () => io.disconnect();
  }, []);

  return (
    <div ref={wrapRef} aria-hidden className="relative w-full select-none overflow-hidden py-[clamp(24px,4vh,48px)]">
      <div className="dt-marquee flex w-max items-center gap-[7vw] pr-[7vw]">
        {[...ORBS, ...ORBS].map((name, i) => (
          <video
            key={i}
            src={`/orbs/orb-${name}.webm`}
            muted
            loop
            playsInline
            preload="none"
            disablePictureInPicture
            tabIndex={-1}
            className="block aspect-square w-[clamp(110px,12.5vw,190px)] rounded-full object-cover"
          />
        ))}
      </div>
    </div>
  );
}
