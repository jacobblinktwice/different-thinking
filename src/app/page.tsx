import Bugs from "./Bugs";
import Hero from "./Hero";
import NavIndex from "./NavIndex";
import SmoothScroll from "./SmoothScroll";

/* Homepage — built to match Figma node 210:4 (Alex Branding / Home Page):
   editorial layout on a 5-column grid (6 hairline guides running the full page),
   top labels + nav, a full-width "DifferentThinking" logotype pinned to the bottom
   of the viewport, a {reSrch} … <"aiLab"> codestrip, then a Wikipedia-style article.

   The hero (Hero.tsx, client) starts as the clean Figma hero; the bug icon toggles
   the glitch composition on/off. */

const COLUMNS: string[] = [
  `The neurodiversity paradigm is a framework for understanding human brain function that considers the diversity within <a class="wl" href="#">sensory processing</a>, motor abilities, social comfort, cognition, and focus as neurological differences. This diversity falls on a spectrum of neurocognitive differences. The neurodiversity movement views <a class="wl" href="#">autism</a> and other neurodivergences as a natural part of human neurological diversity — not diseases or disorders, just "differences".`,
  `The efficacy of <a class="wl" href="#">accessibility</a> and support programs in career development and higher education differs from individual to individual. Social media has introduced a platform where research, awareness and support has emerged, further promoting the neurodiversity movement. The paradigm has been controversial among disability advocates, especially proponents of the <a class="wl" href="#">medical model of autism</a>, with opponents arguing it risks downplaying the challenges associated with some disabilities.`,
  `Blume was an early advocate who predicted the role the Internet would play in fostering the international neurodiversity movement. In a <a class="wl" href="#">New York Times</a> piece in 1997, Blume described the foundation of neurodiversity using the term neurological pluralism. Some researchers, such as Patrick Dwyer, Ari Ne'eman and Sven Bölte, have advocated for mixed, integrative approaches that involve both neurodiversity approaches and biomedical approaches.`,
  `More autistic people were appointed to federal advisory boards like the <a class="wl" href="#">Interagency Autism Coordinating Committee</a>. There were various campaigns like the ongoing #StopTheShock. Damian Milton notes that, in 2014, Nick Walker attempted to define neurodiversity, the neurodiversity movement, and the neurodiversity paradigm — arguing that neurodiversity is a biological fact, not a perspective.`,
];

export default function Home() {
  return (
    <main className="relative flex flex-1 flex-col bg-white text-ink">
      <SmoothScroll />
      <Bugs />
      {/* vertical guides bounding the columns, running the full page height —
          5 columns on desktop (lg), 3 on tablet (md), gutter lines only on mobile */}
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

      {/* ===================== HERO (client: bug-toggled glitch) ===================== */}
      <Hero />

      {/* ===================== ARTICLE (Figma editorial layout) ===================== */}
      <section id="about" className="relative px-[var(--gutter)] py-[clamp(40px,5vw,72px)]">
        <div className="grid grid-cols-1 gap-y-10 md:grid-cols-3 md:gap-x-0 lg:grid-cols-5">
          {COLUMNS.map((html, i) => (
            <div
              key={i}
              className="article-col t-body leading-[1.55] tracking-[0.005em] text-neutral-800 md:pr-8 [&_.wl]:underline [&_.wl]:decoration-neutral-400"
              dangerouslySetInnerHTML={{ __html: `<p>${html}</p>` }}
            />
          ))}
          {/* nav sidebar in the last column (repeats in the article, per Figma) */}
          <div className="hidden md:col-start-3 md:block lg:col-start-auto">
            <NavIndex />
            {/* ambient visual bug: an asset that never loaded */}
            <div aria-hidden className="mt-12">
              <div className="dt-checker h-[46px] w-[46px]" />
              <p className="t-foot mt-1.5 font-mono text-neutral-400">missing_texture.png</p>
            </div>
          </div>
        </div>
        <div data-bug="src" className="t-subhead mt-16 text-right font-mono text-neutral-500">
          &lt;src: &quot;Wikipedia&quot;&gt;
        </div>
      </section>
    </main>
  );
}
