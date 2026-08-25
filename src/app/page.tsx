import ArticleType from "./ArticleType";
import Bugs from "./Bugs";
import DataTexture from "./DataTexture";
import DragBoxes from "./DragBoxes";
import Footer from "./Footer";
import Hero from "./Hero";
import HoverImages from "./HoverImages";
import LiveLog from "./LiveLog";
import NavIndex from "./NavIndex";
import Rulers from "./Rulers";
import ScrollReveal from "./ScrollReveal";
import SliceShift from "./SliceShift";
import SmoothScroll from "./SmoothScroll";
import TextFx from "./TextFx";

/* Homepage — built to match Figma node 210:4 (Alex Branding / Home Page):
   editorial layout on a 5-column grid (6 hairline guides running the full page),
   top labels + nav, a full-width "DifferentThinking" logotype pinned to the bottom
   of the viewport, a {reSrch} … <"aiLab"> codestrip, then the manifesto.

   The hero (Hero.tsx, client) starts as the clean Figma hero; the bug icon toggles
   the glitch composition on/off.

   Link keywords carry data-term when the best Wikipedia page (for the hover
   imagery) differs from the display text. */

const COLUMNS: string[] = [
  `In software, a <a class="wl" href="#" data-term="software bug">bug</a> is the thing you hunt down and kill. It is the deviation from spec, the behaviour nobody asked for, the reason the system does something unexpected. You log it, reproduce it, fix it, close it. The whole discipline assumes unexpected behaviour is a failure, and that removal is the correct response.`,
  `Every engineer also knows the oldest joke in the industry: it's not a bug, it's a feature. It gets said with a shrug, as a way of dodging the work of deciding which it really is. We are the company that takes the joke seriously.`,
  `Somewhere between 15 and 20 percent of people are <a class="wl" href="#">neurodivergent</a>. That is not a fringe. In any other system, one in five would be a core use case rather than an edge case. For a century the world has filed those minds under bugs. Deviations from spec. Behaviour nobody asked for. Conditions to be identified early, patched where possible, medicated where not, and managed back towards the default build.`,
  `The language gives the game away long before anyone gets to the science: deficit, disorder, impairment, dysfunction, intervention. Every one of those words carries the same buried assumption, that there is a single correct output and that some brains simply fail to produce it. We think the world has misread its own codebase.`,
  `Cognitive diversity is not a bug. It is a group-level feature, shaped by <a class="wl" href="#" data-term="human evolution">evolutionary pressures</a> over a very long time. Groups that contained different thinking styles adapted more effectively than groups that did not: the restless scanner whose attention would not settle and who therefore noticed the <a class="wl" href="#">predator</a> first, the obsessive who spent a week on one edge and produced a tool nobody else could have made, the dreamer who could not stop imagining a better valley over the hill and eventually led everyone there.`,
  `Read one at a time, each of those profiles looks like a liability. The scanner cannot concentrate. The obsessive cannot let go. The dreamer is not present. And none of them is optimal alone: a band of scanners never finishes anything, a band of perfectionists never leaves the cave. It is the combination that works. Evolution did not keep these minds around by accident, and not as a rounding error either. It kept them at stable frequencies, generation after generation. What looks like a glitch at the level of the individual is a function at the level of the species.`,
  `Then we built a modern world on a single template. One way to sit in a classroom for six hours a day. One way to progress through a career, in straight lines, at the same pace as everyone who started when you did. One way to pay <a class="wl" href="#">attention</a>, to be motivated, to be organised, to be professional. The template was not drawn up maliciously. It was drawn up for scale, in an era that needed people to be interchangeable and to work to a shared clock, and it did that job well. It compiles cleanly for most people.`,
  `For everyone else, it throws errors all day long. Errors at the start of the task and at the end. Errors in the meeting, in the open-plan office, in the form due by Friday. We call the accumulated result a disorder, as though it lived entirely inside one person's head. We should call it what it is: a mismatch between a mind and the environment it is asked to run on. The friction a neurodivergent person feels is not evidence of a broken brain. It is evidence of a system that was never designed for their architecture, running it anyway, then blaming it for the crash.`,
  `Here is what that mismatch costs. Hundreds of millions of people spend their most productive years debugging themselves instead of shipping. The work is enormous and almost entirely invisible: the scripts rehearsed in the car before a meeting, the private systems built to produce an ordinary-looking output, the energy burned every day forcing a mind into a shape it was never going to hold. None of that effort shows up anywhere. It never appears on a CV. It is simply subtracted from whatever else the person might have done with the same hours.`,
  `They measure their lives against a neurotypical spec they will never match, live permanently in the gap, and conclude that the fault is theirs. Many never get a name for it at all, and spend decades assuming everyone finds this as hard as they do and is simply better at hiding it.`,
  `Meanwhile the abilities are real and running in the background the entire time. <a class="wl" href="#" data-term="pattern">Pattern recognition</a> that leaps across domains and arrives at the answer before the reasoning to explain it. <a class="wl" href="#">Hyperfocus</a> that turns an afternoon into a breakthrough.`,
  `Rapid activation that has already built the thing while everyone else is deciding whether to build it. Emotional resonance that reads a room instantly and moves it. These are not consolation prizes. They are the exact capabilities organisations claim to be desperate for, and they get logged as symptoms, trained out, or never discovered at all.`,
  `This is a quiet but significant waste of human potential. Quiet, because it makes no headlines. It shows up instead as a career that stalled for reasons nobody could name, or a person who decided at nine years old that they were the problem and never went back to check. Significant, because it compounds, across a lifetime and across a fifth of humanity, for as long as the template has been in place. Ending that waste is our mission, stated plainly, because it is not a metaphor: end the waste of neurodiverse potential.`,
  `Two things make this the moment to do it. First, the science has caught up. The <a class="wl" href="#" data-term="neurodiversity">neurodiversity paradigm</a> and a generation of clinical research now support what neurodivergent people had been saying about themselves for decades without being believed: the deficit model does not describe the evidence, and strengths-based support produces better outcomes than deficit-based correction. That is not a hopeful reframe. It is the direction the field itself has moved.`,
  `Second, <a class="wl" href="#" data-term="generative artificial intelligence">AI</a> has arrived, and it favours precisely the minds the old world sidelined. Non-linear thinking, pattern synthesis, taste, and creative leaps are becoming the highest-value human contributions, while the machine absorbs the linear administrative work that different minds were punished their whole lives for struggling with. The traits that made someone a bug in the industrial era are close to what makes someone exceptional in this one. The template is losing its grip for economic reasons rather than moral ones, which is usually how these shifts stick.`,
  `This window will not stay open. The tools that will organise the next few decades of work and learning are being designed now, and their defaults will hold for a generation. Someone should build them for the minds the last set failed. So we wear the bug on purpose. It's in our name, our brand; it's our sense of humour. Because reclaiming the word is not a decoration on the mission. It is the mission, compressed into a single syllable. A label cannot be used against you once you have put it on your own front door.`,
  `Different Thinking builds products designed around different styles of thinking rather than retrofitted for them: no accessibility toggle bolted onto a neurotypical default, no focus mode offered as an apology, no settings page where the real needs go to be hidden. We start from strengths, always. Our job with anyone we serve is not to catalogue what they struggle with. It is to help them find the specific way their own mind creates value, name it, and build a life that points at it deliberately.`,
  `We refuse the productivity trap, so no guilt mechanics, no streaks to break, no notification that performs disappointment, no to-do list that becomes a monument to shame.`,
  `Progress is measured against your own baseline, not a neurotypical ideal you were never racing against. And beneath the warmth sits a clinical spine, because rigour is what makes the warmth trustworthy. Kindness without evidence is just a nicer way of getting it wrong. Nothing we ship gets designed without neurodivergent people in the room, because building for a mind you have never had to run is how the template got written in the first place.`,
  `Our first product is Eventually, an AI coach for people with <a class="wl" href="#" data-term="Attention deficit hyperactivity disorder">ADHD</a>, built to work with any kind of mind rather than nag it into compliance, on the assumption that the person using it is capable and has never been handed tools that fit. It will not be the last.`,
  `ADHD is where we start because that is where the gap between what people can do and what the world lets them do is widest. Wherever else the template fails different minds, we intend to build: in learning, in work, in the ordinary machinery of a day that assumes everyone is running the same operating system.`,
  `We want a world where a fifth of humanity stops apologising for their minds and starts deploying them. Not by asking anyone to lower the bar, but by pointing these minds at problems that deserve them. A world where different thinking is understood as what it always was: one of the best features in human design. We're the bugs. We're working as intended.`,
];

export default function Home() {
  return (
    <main className="relative flex flex-1 flex-col bg-white text-ink">
      <SmoothScroll />
      <Bugs />
      <TextFx />
      <SliceShift />
      <DataTexture />
      <LiveLog />
      <Rulers />
      <ScrollReveal />
      <HoverImages />
      {/* vertical guides bounding the columns, running the full page height —
          5 columns on desktop (lg), 3 on tablet (md), gutter lines only on mobile */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-y-0 left-[var(--gutter)] right-[var(--gutter)] z-0"
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
        {/* mobile: stacked; tablet: THREE long CSS columns; desktop: FOUR long
            columns spanning tracks 1-4 of the grid, with the repeated menu in
            track 5 (paragraphs flow column-major, kept whole via
            break-inside-avoid) */}
        {/* large display serif drifting beneath the columns */}
        <ArticleType />
        <div className="relative z-[1] lg:grid lg:grid-cols-5">
          <div className="md:columns-3 md:gap-x-0 lg:col-span-4 lg:columns-4">
            {COLUMNS.map((html, i) => (
              /* continuous flow — no gaps, no indents. Cells may fragment
                 across columns so the four columns balance to equal height. */
              <div
                key={i}
                className="article-col t-body leading-[1.4] tracking-[0] text-[#8E8E8E] md:pr-8 [&_.wl]:underline [&_.wl]:decoration-[#8E8E8E]"
              >
                {/* inner wrapper = the reveal target */}
                <div className="article-inner" dangerouslySetInnerHTML={{ __html: `<p>${html}</p>` }} />
              </div>
            ))}
          </div>
          {/* nav sidebar in the fifth column (repeats in the article, per Figma).
              The grid item stretches to the article's full height; the inner
              wrapper sticks while the columns scroll past. */}
          <div className="hidden lg:block">
            <div className="sticky top-[clamp(40px,5vw,72px)]">
              <NavIndex />
            </div>
          </div>
        </div>
        <div data-bug="src" className="mt-16 font-sans text-[8px] tracking-[0.01em] text-[#B2B2B2]">
          {"// SRC: MANIFESTO.MD"}
        </div>
        {/* tablet/mobile: the repeated menu sits after the paragraphs + src line */}
        <div className="mt-16 lg:hidden">
          <NavIndex />
        </div>
      </section>

      {/* ===================== MEDIA (16:9 placeholder, gutter to gutter) ===================== */}
      <section className="relative z-[1] px-[var(--gutter)] pb-[clamp(40px,5vw,72px)]">
        <div className="relative aspect-video w-full bg-[#ececea]">
          <span className="absolute bottom-3 left-3 font-sans text-[8px] tracking-[0.01em] text-[#B2B2B2]">
            [ PLACEHOLDER :: 16x9 ]
          </span>
        </div>
      </section>

      {/* ===================== ARTEFACTS (three draggable image windows) ===================== */}
      <DragBoxes />

      {/* ===================== FOOTER (blue glitch + contact + wordmark) ===================== */}
      <Footer />
    </main>
  );
}
