/* Footer: content on the 5-column grid — everything aligns to the 4th
   column line. Closes with the copyright in the dialect and the build credit. */

export default function Footer() {
  return (
    <footer id="contact" className="relative min-h-svh w-full overflow-hidden">
      {/* content on the grid: cols 4-5 */}
      <div className="relative z-[1] grid min-h-svh grid-cols-1 px-[var(--gutter)] py-[clamp(48px,10vh,110px)] md:grid-cols-5">
        <div className="flex flex-col md:col-span-2 md:col-start-4">
          <p className="t-body leading-[1.4] tracking-[0] text-ink">Say Hello</p>
          <a
            href="mailto:info@differentthinking.ai"
            className="mt-4 w-fit font-sans text-[clamp(22px,2.8vw,44px)] leading-[1.1] tracking-[-0.02em] text-ink"
          >
            info@differentthinking.ai
          </a>

          {/* stacked wordmark (SVG) */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/dt-logotype-stack.svg"
            alt="Different Thinking"
            draggable={false}
            className="mt-auto h-auto w-full max-w-[560px] pt-16"
          />

          {/* copyright, in the dialect */}
          <pre className="mt-[clamp(32px,6vh,64px)] font-sans text-[8px] leading-[1.7] tracking-[0.01em] text-[#B2B2B2]">
            {"©2026\nDIFFERENT_THINKING({\n    // ALL RIGHTS RESERVED;\n})"}
          </pre>

          {/* build credit — deliberately louder than the copyright above it */}
          <p className="t-body mt-4 leading-[1.4] tracking-[0] text-ink">
            DESIGNED BY{" "}
            <a
              href="https://www.blinktwice.studio/"
              target="_blank"
              rel="noreferrer"
              className="underline hover:text-ink"
            >
              BLINKTWICE
            </a>
          </p>
        </div>
      </div>
    </footer>
  );
}
