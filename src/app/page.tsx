import Hero from "./Hero";
import NavIndex from "./NavIndex";

/* Homepage — built to match Figma node 210:4 (Alex Branding / Home Page):
   editorial layout with top labels + nav, a full-width "DifferentThinking" logotype,
   a {reSrch} … <"aiLab"> codestrip, then a 4-column Wikipedia-style article + source.

   The hero (Hero.tsx, client) starts as the clean Figma hero; the bug icon toggles
   the glitch composition on/off with a whole-screen flicker transition. */

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
      {/* ===================== HERO (client: bug-toggled glitch) ===================== */}
      <Hero />

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
