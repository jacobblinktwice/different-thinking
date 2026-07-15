import { Fragment } from "react";
import Bugs from "./Bugs";
import DataTexture from "./DataTexture";
import Hero from "./Hero";
import HoverImages from "./HoverImages";
import LiveLog from "./LiveLog";
import NavIndex from "./NavIndex";
import Rulers from "./Rulers";
import ScrollScramble from "./ScrollScramble";
import SmoothScroll from "./SmoothScroll";

/* Homepage — built to match Figma node 210:4 (Alex Branding / Home Page):
   editorial layout on a 5-column grid (6 hairline guides running the full page),
   top labels + nav, a full-width "DifferentThinking" logotype pinned to the bottom
   of the viewport, a {reSrch} … <"aiLab"> codestrip, then the manifesto.

   The hero (Hero.tsx, client) starts as the clean Figma hero; the bug icon toggles
   the glitch composition on/off.

   Link keywords carry data-term when the best Wikipedia page (for the hover
   imagery) differs from the display text. */

const COLUMNS: string[] = [
  `In software, a <a class="wl" href="#" data-term="software bug">bug</a> is the thing you hunt down and kill. It is the deviation from spec, the behaviour nobody asked for, the reason the system does something unexpected. Every engineer knows the oldest joke in the industry: it's not a bug, it's a feature. We are the company that takes the joke seriously.`,
  `Somewhere between 15 and 20 percent of people are <a class="wl" href="#">neurodivergent</a>. For a century the world has filed those minds under bugs. Deviations from spec. Behaviour nobody asked for. Disorders to be patched, medicated, and managed back towards the default build. We think the world has misread its own codebase.`,
  `Cognitive diversity is not a bug. It is a group-level feature shaped by <a class="wl" href="#" data-term="human evolution">evolutionary pressures</a>. Groups with different thinking styles adapted more effectively: the restless scanner who noticed the <a class="wl" href="#">predator</a> first, the obsessive who perfected the tool, the dreamer who imagined a better valley over the hill. Evolution did not keep these minds around by accident. It kept them because groups that ran unexpected behaviour, together, survived. What looks like a glitch at the level of the individual is a function at the level of the species.`,
  `Then we built a modern world on a single template. One way to sit in a classroom, one way to progress through a career, one way to pay <a class="wl" href="#">attention</a>, be motivated, be organised. The template compiles cleanly for most people. For everyone else, it throws errors all day long. We call the result disorder. We should call it what it is: a mismatch between the mind and the environment it is asked to run on. The friction a neurodivergent person feels is not evidence of a broken brain. It is evidence of a system that was never designed for their architecture.`,
  `Here is what that mismatch costs. Hundreds of millions of people spend their most productive years debugging themselves instead of shipping. They measure their lives against a neurotypical spec they will never match, live permanently in the gap, and conclude the fault is theirs. Meanwhile the abilities are real and running in the background the whole time. <a class="wl" href="#" data-term="pattern">Pattern recognition</a> that leaps across domains. <a class="wl" href="#">Hyperfocus</a> that turns hours into breakthroughs. Rapid activation that ships while others deliberate. Emotional resonance that binds people and moves them. These get logged as symptoms, suppressed, or never discovered at all.`,
  `This is a quiet but significant waste of human potential. Quiet, because it does not make headlines. Significant, because it compounds across a lifetime and across a fifth of humanity. Ending that waste is our mission, stated plainly: end the waste of neurodiverse potential.`,
  `Two things make this the moment. First, the science has caught up. The <a class="wl" href="#" data-term="neurodiversity">neurodiversity paradigm</a> and a generation of clinical research now support what neurodivergent people always knew: the deficit model is wrong, and strengths-based support works. Second, <a class="wl" href="#" data-term="generative artificial intelligence">AI</a> has arrived, and it favours exactly the minds the old world sidelined. Non-linear thinking, pattern synthesis, and creative leaps are becoming the highest-value human skills, while the machine absorbs the linear admin that different minds were punished for struggling with. The traits that made someone a bug in the industrial era are precisely what make them exceptional in this one.`,
  `So we wear the bug on purpose. It is in our name, our brand, and our sense of humour, because reclaiming the word is the whole point. Different Thinking builds products designed around different styles of thinking, not retrofitted for them. We start from strengths, always: our first job with anyone we serve is to help them find the specific way their mind creates value, name it, and build a life around it. We refuse the productivity trap, so no guilt mechanics, no broken streaks, no to-do list that becomes a monument to shame. Progress is measured against your own baseline, not a neurotypical ideal. And beneath the warmth sits a clinical spine, because rigour is what makes the warmth trustworthy.`,
  `Our first product is Alex, an AI coach for people with <a class="wl" href="#" data-term="Attention deficit hyperactivity disorder">ADHD</a>. It will not be the last. Wherever the template fails different minds, we intend to build. We want a world where a fifth of humanity stops apologising for their minds and starts deploying them. Where different thinking is understood as what it always was: not a bug in the human design, but one of its best features. We are the bugs. We are working as intended.`,
];

export default function Home() {
  return (
    <main className="relative flex flex-1 flex-col bg-white text-ink">
      <SmoothScroll />
      <Bugs />
      <DataTexture />
      <LiveLog />
      <Rulers />
      <ScrollScramble />
      <HoverImages />
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
        {/* mobile: stacked; tablet: THREE long CSS columns (column-major flow,
            paragraphs whole via break-inside-avoid); desktop: the 5-track grid */}
        <div className="md:columns-3 md:gap-x-0 lg:grid lg:grid-cols-5 lg:gap-y-10">
          {COLUMNS.map((html, i) => (
            <Fragment key={i}>
              <div className="article-col mb-10 md:break-inside-avoid lg:mb-0 t-body leading-[1.55] tracking-[0.005em] text-neutral-800 md:pr-8 [&_.wl]:underline [&_.wl]:decoration-neutral-400">
                {/* inner wrapper = the reveal target */}
                <div className="article-inner" dangerouslySetInnerHTML={{ __html: `<p>${html}</p>` }} />
              </div>
              {i === 3 && (
                /* nav sidebar after the first row of columns (repeats in the article, per Figma) */
                <div className="hidden lg:block">
                  <NavIndex />
                </div>
              )}
            </Fragment>
          ))}
        </div>
        <div data-bug="src" className="t-body mt-16 font-mono text-neutral-500">
          &lt;src: &quot;manifesto.md&quot;&gt;
        </div>
        {/* tablet/mobile: the repeated menu sits after the paragraphs + src line */}
        <div className="mt-16 lg:hidden">
          <NavIndex />
        </div>
      </section>
    </main>
  );
}
