import Footer from "../Footer";
import PageChrome from "../PageChrome";
import PageGuides from "../PageGuides";
import Thinkers from "./Thinkers";

export const metadata = {
  title: "Different Thinkers — Different Thinking",
  description: "Great neurodivergent minds, filed under features.",
};

/* Different Thinkers — the gallery of great minds on the same 5-column grid as
   the homepage: page chrome up top, the codestrip markers, the portrait grid
   (client), then the shared footer.

   This page kept its own copies of the guides and the chrome long after the
   others moved to the shared components, which is why the hover fix on the home
   link never reached it. */
export default function DifferentThinkersPage() {
  return (
    <main className="relative flex flex-1 flex-col bg-white text-ink">
      <PageGuides z="z-[1]" />

      {/* page chrome */}
      <header className="relative z-[2] px-[var(--gutter)] pt-[clamp(20px,4vh,44px)]">
        <PageChrome />
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
