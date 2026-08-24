import Link from "next/link";
import NavIndex from "../NavIndex";
import Footer from "../Footer";
import Thinkers from "./Thinkers";

export const metadata = {
  title: "Different Thinkers — Different Thinking",
  description: "Great neurodivergent minds, filed under features.",
};

/* Different Thinkers — the gallery of great neurodivergent minds on the same
   5-column grid as the homepage: page chrome up top, the codestrip markers,
   the portrait grid (client), then the shared footer. */
export default function DifferentThinkersPage() {
  return (
    <main className="relative flex flex-1 flex-col bg-white text-ink">
      {/* vertical guides, same tiers as the homepage */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-y-0 left-[var(--gutter)] right-[var(--gutter)] z-[1]"
      >
        {[0, 100].map((p) => (
          <span key={p} className="absolute inset-y-0 w-px bg-[var(--guide)]" style={{ left: `${p}%` }} />
        ))}
        {[33.3333, 66.6667].map((p) => (
          <span
            key={p}
            className="absolute inset-y-0 hidden w-px bg-[var(--guide)] md:block lg:hidden"
            style={{ left: `${p}%` }}
          />
        ))}
        {[20, 40, 60, 80].map((p) => (
          <span
            key={p}
            className="absolute inset-y-0 hidden w-px bg-[var(--guide)] lg:block"
            style={{ left: `${p}%` }}
          />
        ))}
      </div>

      {/* page chrome */}
      <header className="relative z-[2] px-[var(--gutter)] pt-[clamp(20px,4vh,44px)]">
        <div className="grid grid-cols-1 gap-y-6 md:grid-cols-3 lg:grid-cols-5">
          <Link href="/" className="t-title w-fit font-medium tracking-[-0.02em]">
            Your Bugs are Cool.
          </Link>
          <p className="t-body hidden text-balance leading-[1.4] tracking-[0] md:col-start-2 md:block lg:col-start-4">
            An AI research lab building products for people who think differently.
          </p>
          {/* max-md:hidden keeps NavIndex's own grid display intact on md+ */}
          <NavIndex className="max-md:hidden md:col-start-3 lg:col-start-5" />
        </div>
        {/* codestrip markers over the grid — three self-contained dialect bits
            on the first three columns */}
        <div className="relative mt-[clamp(120px,22vh,240px)] hidden h-5 font-sans text-[8px] tracking-[0.01em] text-[#B2B2B2] lg:block">
          <span className="absolute left-0">{"RUN DIFFERENT_THINKERS();"}</span>
          <span className="absolute left-[20%]">{"// DEVIATIONS FROM SPEC"}</span>
          <span className="absolute left-[40%]">{"// WORKING AS INTENDED"}</span>
        </div>
      </header>

      {/* the minds */}
      <section className="relative z-[2] px-[var(--gutter)] pb-[clamp(64px,10vh,140px)] pt-6">
        <Thinkers />
      </section>

      <Footer />
    </main>
  );
}
