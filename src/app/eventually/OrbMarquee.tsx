"use client";

/* Orb marquee: a row of gradient orbs (Eventually's identity spheres, CSS
   placeholders until the real renders land) scrolling in an endless loop.
   Track is duplicated once and translated −50% for a seamless wrap. */

const ORBS: string[] = [
  "radial-gradient(circle at 50% 30%, #eafffb 0%, #7ce8d8 32%, #0a6a75 58%, #063b46 78%, #7ce8d8 100%)",
  "radial-gradient(circle at 50% 32%, #f4ffd6 0%, #c8e84a 34%, #4d7a1f 62%, #2c4a0e 82%, #a8d43a 100%)",
  "radial-gradient(circle at 50% 30%, #ffe9e2 0%, #ff7a5c 30%, #e0331f 56%, #7a1408 80%, #ff9a86 100%)",
  "radial-gradient(circle at 50% 34%, #f0f0ff 0%, #b9b9f4 36%, #7d7dd8 62%, #4646a8 84%, #cfcffb 100%)",
  "radial-gradient(circle at 50% 30%, #fff2df 0%, #ffc98e 34%, #ef7d1f 60%, #a34a05 82%, #ffb96e 100%)",
  "radial-gradient(circle at 50% 32%, #ffeef4 0%, #e8aec4 36%, #b06a8a 62%, #6e3a52 84%, #dea0ba 100%)",
];

export default function OrbMarquee() {
  return (
    <div aria-hidden className="relative w-full select-none overflow-hidden py-[clamp(24px,4vh,48px)]">
      <div className="dt-marquee flex w-max items-center gap-[7vw] pr-[7vw]">
        {[...ORBS, ...ORBS].map((bg, i) => (
          <span
            key={i}
            className="block aspect-square w-[clamp(110px,12.5vw,190px)] rounded-full"
            style={{ background: bg }}
          />
        ))}
      </div>
    </div>
  );
}
