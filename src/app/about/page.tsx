import Image from "next/image";
import Footer from "../Footer";
import BugOutline from "../BugOutline";
import CodeNote from "../CodeNote";
import PixelPortrait from "./PixelPortrait";
import RewriteHeading from "./RewriteHeading";
import DragWindow from "../DragWindow";
import PageGuides from "../PageGuides";
import PageChrome from "../PageChrome";
import Credits from "../Credits";

export const metadata = {
  title: "About — Different Thinking",
  description: "A research lab made for minds that don't run the default.",
};

/* `w`/`h` are the source photo's pixel dimensions; `left`/`top`/`width` place the
   portrait window on md+. David's bleeds off the left edge like the mock — that
   overflows to the left of the document, which never adds a scrollbar. */
const TEAM = [
  {
    name: "David Lyria",
    role: "Co-Founder and CEO",
    email: "david@differentthinking.ai",
    photo: "/images/about/david-lyria.webp",
    w: 1076,
    h: 1136,
    left: "-8%",
    top: "22%",
    width: "clamp(240px,23vw,420px)",
  },
  {
    name: "Jack Bleakley",
    role: "Co-Founder and Chief Design Officer",
    email: "jack@differentthinking.ai",
    photo: "/images/about/jack-bleakley.webp",
    w: 536,
    h: 558,
    left: "56%",
    top: "2%",
    width: "clamp(230px,21vw,400px)",
  },
];

/* About — Exposure headline, the intro (code note in column 1, copy in 2-3),
   draggable pixel-reveal team portraits with their credits stacked in column 2,
   the rewriting research heading, the full-width campaign environment, the
   trails in the dialect, the closing line, and the large-scale bug OUTLINE
   closing the page. */
export default function AboutPage() {
  return (
    <main className="relative flex flex-1 flex-col bg-white text-ink">
      <PageGuides />

      {/* page chrome */}
      <header className="relative z-[1] px-[var(--gutter)] pt-[clamp(20px,4vh,44px)]">
        <PageChrome />

        {/* headline */}
        <h1 className="mt-[clamp(48px,9vh,110px)] max-w-[16ch] text-ink [font-family:Exposure,var(--font-sans)] text-[clamp(44px,8.9vw,128px)] leading-[1.02] tracking-[-0.1em]">
          A research lab made for minds that don&apos;t run the default
        </h1>

        {/* intro: code note in column 1, the copy across 2-3 */}
        <div className="mt-[clamp(32px,6vh,72px)] grid grid-cols-1 gap-y-8 md:grid-cols-3 lg:grid-cols-5">
          <CodeNote snippet="bugIsFeature" className="md:pr-8" />
          <p className="text-[20px] leading-[1.4] tracking-[0] text-ink md:col-span-2 md:pr-8 lg:col-span-2">
            Different Thinking exists to end the waste of neurodiverse potential. Somewhere between 15 and 20 percent
            of people are neurodivergent. That&apos;s who we are designing for. We build products designed around
            different styles of thinking rather than retrofitted for them: progress measured against your own baseline
            rather than a neurotypical ideal.
          </p>
        </div>

        {/* team — the portraits are draggable windows scattered across the grid;
            the credits stack in column 2, under the intro copy. Names stay plain
            and legible; role and email are set in the code dialect. */}
        <div className="relative mt-[clamp(56px,10vh,130px)] grid grid-cols-1 md:h-[100vh] md:min-h-[620px] md:grid-cols-3 lg:grid-cols-5">
          <div className="md:col-start-2 md:pr-8 lg:col-start-2">
            {TEAM.map((t, i) => (
              <div key={t.name} className={i > 0 ? "mt-[clamp(72px,12vh,160px)]" : ""}>
                {/* absolute on md+, so it lands on the scatter rather than here */}
                <DragWindow
                  label={t.photo.split("/").pop()!.replace(".webp", "")}
                  closable
                  left={t.left}
                  top={t.top}
                  width={t.width}
                >
                  <PixelPortrait src={t.photo} alt={t.name} width={t.w} height={t.h} />
                </DragWindow>
                <Credits name={t.name} role={t.role} email={t.email} />
              </div>
            ))}
          </div>
        </div>

        {/* research: the heading rewrites its second word, code note beneath.
            64px flat on md+; a clamp below that so the longest word cannot
            overflow a phone viewport. */}
        <div className="mt-[clamp(64px,12vh,160px)]">
          <RewriteHeading className="text-ink [font-family:Exposure,var(--font-sans)] text-[clamp(38px,9.6vw,64px)] leading-[1.08] tracking-[-0.08em] md:text-[64px]" />
          <CodeNote snippet="oneInFive" className="mt-[clamp(24px,4vh,48px)]" />
        </div>
      </header>

      {/* full-width campaign environment (16:9, the asset's native ratio) */}
      <section className="relative z-[1] mt-[clamp(56px,10vh,130px)] px-[var(--gutter)]">
        <div className="relative aspect-video w-full overflow-hidden bg-[#ececea]">
          <Image
            src="/images/about/campaign-env.webp"
            alt="Different Thinking posters running as digital OOH in a transit concourse"
            fill
            sizes="100vw"
            className="object-cover"
          />
        </div>
      </section>

      {/* the trails, in the dialect */}
      <section className="relative z-[1] mt-[clamp(48px,8vh,100px)] px-[var(--gutter)]">
        <CodeNote snippet="followTrails" />
      </section>

      {/* closing line — sits above the outline, which now closes the page */}
      <section className="relative z-[1] mt-[clamp(56px,10vh,130px)] px-[var(--gutter)]">
        <p className="text-ink [font-family:Exposure,var(--font-sans)] text-[96px] leading-[1] tracking-[-0.1em]">
          Your Bugs are Cool.
        </p>
      </section>

      {/* large-scale bug outline */}
      <section
        aria-hidden
        className="relative z-[1] mt-[clamp(40px,6vh,80px)] px-[var(--gutter)] pb-[clamp(40px,6vh,80px)]"
      >
        <BugOutline className="h-auto w-full text-ink" />
      </section>

      <Footer />
    </main>
  );
}
