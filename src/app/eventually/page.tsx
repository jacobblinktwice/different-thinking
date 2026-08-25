import Footer from "../Footer";
import OrbMarquee from "./OrbMarquee";
import EventuallyBoxes from "./EventuallyBoxes";
import PageGuides from "../PageGuides";
import PageChrome from "../PageChrome";

export const metadata = {
  title: "Eventually — Different Thinking",
  description: "An AI coach for people with ADHD, built to work with any kind of mind.",
};

/* Eventually — the first product's page: chrome up top, the Exposure title,
   intro copy (placeholder) + the credits in the brand dialect, the orb
   marquee, then the centre stack of draggable artefact windows. */
export default function EventuallyPage() {
  return (
    <main className="relative flex flex-1 flex-col bg-white text-ink">
      <PageGuides z="z-[1]" />

      {/* page chrome */}
      <header className="relative z-[2] px-[var(--gutter)] pt-[clamp(20px,4vh,44px)]">
        <PageChrome />

        {/* title + intro + credits on the grid */}
        <div className="mt-[clamp(48px,9vh,110px)] grid grid-cols-1 gap-y-8 md:grid-cols-3 lg:grid-cols-5">
          <div className="md:col-span-2 lg:col-span-2">
            <h1 className="text-ink [font-family:Exposure,var(--font-sans)] text-[clamp(34px,3.4vw,54px)] leading-[1] tracking-[-0.06em]">
              Eventually
            </h1>
            {/* placeholder copy until the product intro lands */}
            <p className="t-body mt-10 leading-[1.4] tracking-[0] text-[#6E6E6E] md:pr-8">
              Lorem Ipsum is simply dummy text of the printing and typesetting industry. Lorem Ipsum has been the
              industry&apos;s standard dummy text ever since 1966, when designers at Letraset and James Mosley, the
              librarian at St Bride Printing Library in London, took a 1914 Cicero translation and Lorem Ipsum is
              simply dummy text of the printing and typesetting industry. Lorem Ipsum has been the industry&apos;s
              standard dummy text ever since 1966, when designers at Letraset and James Mosley, the librarian at St
              Bride Printing Library in London, took a 1914 Cicero translation and
            </p>
          </div>
          {/* credits, in the brand dialect */}
          <div className="self-end md:col-start-3 lg:col-start-4">
            <pre className="font-sans text-[8px] leading-[1.7] tracking-[0.01em] text-[#6E6E6E]">
              {'CONST PARTNER = "DIFFERENT_THINKING";\nCONST RESEARCHER = "XXX";\nCONST VISUAL_DESIGN = "BLINKTWICE";'}
            </pre>
            {/* INSERT LINK HERE — swap the href when the product URL exists */}
            <a
              href="#"
              className="mt-6 block w-fit font-sans text-[8px] tracking-[0.01em] text-[#6E6E6E] underline hover:text-ink"
            >
              VISIT(&quot;INSERT_LINK_HERE&quot;);
            </a>
          </div>
        </div>
      </header>

      {/* orb marquee */}
      <div className="relative z-[2] mt-[clamp(40px,7vh,90px)]">
        <OrbMarquee />
      </div>

      {/* centre stack of draggable artefacts */}
      <div className="relative z-[2] mt-[clamp(40px,7vh,90px)]">
        <EventuallyBoxes />
      </div>

      <Footer />
    </main>
  );
}
