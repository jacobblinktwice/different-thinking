import Link from "next/link";
import { Glitch } from "@/components/glitch";

/* Homepage — built to match Figma node 210:4 (Alex Branding / Home Page):
   editorial layout with top labels + nav, a full-width "DifferentThinking" logotype,
   a {reSrch} … <"aiLab"> codestrip, then a 4-column Wikipedia-style article + source.

   The Figma hero is clean white; the glitch effect is a droppable layer. Here it's mounted
   as the hero backdrop (with the wordmark complementary knock-out you've been tuning) — see the
   GLITCH MOUNT POINT below. Set `SHOW_GLITCH = false` for the pure-Figma clean hero. */
const SHOW_GLITCH = true;

const NAV: [string, string][] = [
  ["01", "About"],
  ["02", "Different Thinkers"],
  ["03", "Alex"],
  ["04", "Specimen"],
];

function NavIndex({ className = "" }: { className?: string }) {
  return (
    <nav className={`grid grid-cols-[auto_1fr] gap-x-3 gap-y-[7px] ${className}`}>
      {NAV.map(([n, label]) => {
        const href = label === "Specimen" ? "/lab" : `#${label.toLowerCase().replace(/\s+/g, "-")}`;
        return (
          <div key={n} className="contents">
            <span className="font-mono text-[10px] leading-5 text-neutral-500">[ {n} ]</span>
            <Link href={href} className="text-[15px] leading-5 tracking-tight transition-opacity hover:opacity-50">
              {label}
            </Link>
          </div>
        );
      })}
    </nav>
  );
}

const COLUMNS: { lead?: boolean; html: string }[] = [
  {
    lead: true,
    html: `The neurodiversity paradigm is a framework for understanding human brain function that considers the diversity within <a class="wl" href="#">sensory processing</a>, motor abilities, social comfort, cognition, and focus as neurological differences. This diversity falls on a spectrum of neurocognitive differences. The neurodiversity movement views <a class="wl" href="#">autism</a> and other neurodivergences as a natural part of human neurological diversity — not diseases or disorders, just "differences".`,
  },
  {
    html: `The efficacy of <a class="wl" href="#">accessibility</a> and support programs in career development and higher education differs from individual to individual. Social media has introduced a platform where research, awareness and support has emerged, further promoting the neurodiversity movement. The paradigm has been controversial among disability advocates, especially proponents of the <a class="wl" href="#">medical model of autism</a>, with opponents arguing it risks downplaying the challenges associated with some disabilities.`,
  },
  {
    html: `Blume was an early advocate who predicted the role the Internet would play in fostering the international neurodiversity movement. In a <a class="wl" href="#">New York Times</a> piece in 1997, Blume described the foundation of neurodiversity using the term neurological pluralism. Some researchers, such as Patrick Dwyer, Ari Ne'eman and Sven Bölte, have advocated for mixed, integrative approaches that involve both neurodiversity approaches and biomedical approaches.`,
  },
  {
    html: `More autistic people were appointed to federal advisory boards like the <a class="wl" href="#">Interagency Autism Coordinating Committee</a>. There were various campaigns like the ongoing #StopTheShock. Damian Milton notes that, in 2014, Nick Walker attempted to define neurodiversity, the neurodiversity movement, and the neurodiversity paradigm — arguing that neurodiversity is a biological fact, not a perspective.`,
  },
];

export default function Home() {
  return (
    <main className="flex flex-1 flex-col bg-white text-ink">
      {/* ===================== HERO ===================== */}
      <section className="relative h-[68svh] min-h-[440px] w-full overflow-hidden sm:h-[80svh] lg:h-[min(92vh,900px)]">
        {SHOW_GLITCH && (
          <>
            {/* ===== GLITCH MOUNT POINT — shared component, same source as /lab ===== */}
            <Glitch className="absolute inset-0 z-0" mode="landing" background={[1, 1, 1]} />
            {/* wordmark — complementary knock-out over the effect (difference blend) */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/logotype.svg"
              alt="Different Thinking"
              aria-hidden
              className="pointer-events-none absolute bottom-[12%] left-[2.5%] right-[2.5%] z-[2] w-[95%]"
              style={{ filter: "invert(1)", mixBlendMode: "difference" }}
            />
          </>
        )}
        {!SHOW_GLITCH && (
          /* Pure-Figma clean hero: black logotype on white */
          /* eslint-disable-next-line @next/next/no-img-element */
          <img
            src="/logotype.svg"
            alt="Different Thinking"
            className="pointer-events-none absolute bottom-[12%] left-[2.5%] right-[2.5%] z-[2] w-[95%]"
          />
        )}

        {/* top chrome */}
        <div className="pointer-events-none absolute inset-0 z-[3]">
          <div className="absolute left-[clamp(20px,4.9vw,86px)] top-[clamp(20px,4vh,44px)] text-[clamp(20px,1.9vw,31px)] font-medium tracking-[-0.02em]">
            Your Bugs are Cool.
          </div>
          <p className="absolute left-1/2 top-[clamp(16px,3.5vh,52px)] hidden w-[min(240px,26vw)] -translate-x-1/4 text-[13px] leading-[1.35] tracking-tight lg:block">
            An AI research lab building products for people who think differently.
          </p>
          <NavIndex className="pointer-events-auto absolute right-[clamp(20px,3vw,54px)] top-[clamp(20px,4vh,52px)] scale-90 sm:scale-100" />
          <div className="pointer-events-auto absolute right-[clamp(60px,13vw,205px)] top-[clamp(150px,24vh,290px)] hidden items-end gap-2 md:flex">
            <BugMark />
            <span className="text-[14px] tracking-tight">Click Click</span>
          </div>
          {/* codestrip */}
          <div className="absolute inset-x-0 bottom-[clamp(14px,3vh,40px)] grid grid-cols-3 px-[clamp(20px,4.9vw,86px)] font-mono text-[11px] sm:text-[15px]">
            <span>{"{reSrch}"}</span>
            <span>; @{"}"}</span>
            <span>&lt;&quot;aiLab&quot;&gt;</span>
          </div>
        </div>
      </section>

      {/* ===================== ARTICLE (Figma editorial layout) ===================== */}
      <section
        id="about"
        className="relative border-t border-hair px-[clamp(20px,4.9vw,86px)] py-[clamp(40px,5vw,72px)]"
      >
        <div className="grid grid-cols-1 gap-x-[28px] gap-y-10 md:grid-cols-2 xl:grid-cols-[repeat(4,1fr)_180px]">
          {COLUMNS.map((c, i) => (
            <div
              key={i}
              className={`article-col text-[11px] leading-[1.55] tracking-[0.005em] text-neutral-800 [&_.wl]:underline [&_.wl]:decoration-neutral-400 ${
                c.lead ? "[&>*:first-child]:text-[13px]" : ""
              }`}
              dangerouslySetInnerHTML={{ __html: `<p>${c.html}</p>` }}
            />
          ))}
          {/* nav sidebar (repeats in the article, per Figma) */}
          <div className="hidden xl:block">
            <NavIndex />
          </div>
        </div>
        <div className="mt-16 text-right font-mono text-[13px] text-neutral-500">
          &lt;src: &quot;Wikipedia&quot;&gt;
        </div>
      </section>
    </main>
  );
}

function BugMark() {
  return (
    <svg viewBox="0 0 52 66" className="h-[52px] w-[41px]" aria-label="bug">
      <path
        fill="#0A0A0A"
        d="M26 5c1.4 3 1 5.7-1 7.7 2.9-1 4.8 1 5.7 3.8-1.9 0-3.8 1-4.8 2.9 3.8 0 6.7 1.9 7.7 5.7-2.9-1-5.7-1-7.7 1 4.8 1 8.6 3.8 9.6 8.6-3.8-1.9-7.7-2.9-10.5-1 3.8 1.9 6.7 4.8 6.7 9.6-2.9-2.9-6.7-4.8-10.5-3.8 1 3.8 0 7.7-2.9 10.5-1-3.8-1-7.7-2.9-10.5-3.8-1-7.7 1-10.5 3.8 0-4.8 2.9-7.7 6.7-9.6-2.9-1.9-6.7-1-10.5 1 1-4.8 4.8-7.7 9.6-8.6-1.9-1.9-4.8-1.9-7.7-1 1-3.8 3.8-5.7 7.7-5.7-1-1.9-2.9-2.9-4.8-2.9 1-2.9 2.9-4.8 5.7-3.8-1.9-1.9-2.4-4.8-1-7.7 1.4 2.4 2.9 3.8 5.7 3.8 2.9 0 4.3-1.4 5.7-3.8z"
      />
      <circle cx="22" cy="28" r="1.9" fill="#fff" />
      <circle cx="31" cy="28" r="1.9" fill="#fff" />
    </svg>
  );
}
