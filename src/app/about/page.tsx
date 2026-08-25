import Link from "next/link";
import NavIndex from "../NavIndex";
import Footer from "../Footer";
import BugOutline from "../BugOutline";
import PixelPortrait from "./PixelPortrait";

export const metadata = {
  title: "About — Different Thinking",
  description: "A research lab made for minds that don't run the default.",
};

const TEAM = [
  { name: "David Lyria", role: "Co-Founder and CEO", email: "david@differentthinking.ai" },
  { name: "Jack Bleakley", role: "Co-Founder and Chief Designer Officer", email: "jack@differentthinking.ai" },
];

/* About — Exposure headline, intro columns, pixel-reveal team portraits,
   research/product columns, a full-width media placeholder, the trails, the
   large-scale bug OUTLINE, and the closing line. */
export default function AboutPage() {
  return (
    <main className="relative flex flex-1 flex-col bg-white text-ink">
      {/* vertical guides, same tiers as the homepage */}
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

      {/* page chrome */}
      <header className="relative z-[1] px-[var(--gutter)] pt-[clamp(20px,4vh,44px)]">
        <div className="grid grid-cols-1 gap-y-6 md:grid-cols-3 lg:grid-cols-5">
          <Link href="/" className="t-title w-fit font-medium tracking-[-0.02em]">
            Your Bugs are Cool.
          </Link>
          <p className="t-body hidden text-balance leading-[1.4] tracking-[0] md:col-start-2 md:block lg:col-start-4">
            An AI research lab building products for people who think differently.
          </p>
          <NavIndex className="max-md:hidden md:col-start-3 lg:col-start-5" />
        </div>

        {/* headline */}
        <h1 className="mt-[clamp(48px,9vh,110px)] max-w-[16ch] text-ink [font-family:Exposure,var(--font-sans)] text-[clamp(44px,8.9vw,128px)] leading-[1.02] tracking-[-0.1em]">
          A research lab made for minds that don&apos;t run the default
        </h1>

        {/* intro columns */}
        <div className="mt-[clamp(32px,6vh,72px)] grid grid-cols-1 gap-y-8 md:grid-cols-3 lg:grid-cols-5">
          <p className="t-body leading-[1.4] tracking-[0] text-[#6E6E6E] md:pr-8">
            In software, a bug is an unplanned behaviour you hunt down and remove. For a century the world has filed
            neurodivergent minds the same way.
          </p>
          <p className="t-body leading-[1.4] tracking-[0] text-[#6E6E6E] md:col-span-2 md:pr-8 lg:col-span-2">
            Different Thinking exists to end the waste of neurodiverse potential. Somewhere between 15 and 20 percent
            of people are neurodivergent. That&apos;s who we are designing for. We build products designed around
            different styles of thinking rather than retrofitted for them: progress measured against your own baseline
            rather than a neurotypical ideal.
          </p>
        </div>

        {/* team — pixelated portraits that resolve on scroll; columns 2 and 4 */}
        <div className="mt-[clamp(56px,10vh,130px)] grid grid-cols-1 gap-y-12 md:grid-cols-3 lg:grid-cols-5">
          {TEAM.map((t, i) => (
            <div key={t.name} className={`md:pr-8 ${i === 1 ? "md:col-start-3 lg:col-start-4" : "md:col-start-1 lg:col-start-2"}`}>
              <PixelPortrait />
              <p className="t-body mt-4 leading-[1.4] tracking-[0] text-ink">{t.name}</p>
              <p className="t-body leading-[1.4] tracking-[0] text-[#6E6E6E]">{t.role}</p>
              <a
                href={`mailto:${t.email}`}
                className="t-body mt-5 block w-fit leading-[1.4] tracking-[0] text-[#6E6E6E] hover:text-ink"
              >
                {t.email}
              </a>
            </div>
          ))}
        </div>

        {/* research / products: headers on cols 1 and 3, copy on cols 2 and 4 —
            the big single words overflow their column like the mock, and the
            copy drops one header line so it sits beside the second word */}
        <div className="mt-[clamp(64px,12vh,160px)] grid grid-cols-1 gap-y-12 md:grid-cols-3 lg:grid-cols-5 lg:gap-y-0">
          <h2 className="text-ink [font-family:Exposure,var(--font-sans)] text-[clamp(28px,3.3vw,64px)] leading-[1.08] tracking-[-0.06em] md:col-start-1 lg:col-start-1">
            Neurological Research
          </h2>
          <p className="t-body leading-[1.4] tracking-[0] text-[#6E6E6E] md:col-start-2 md:pr-8 lg:col-start-2 lg:pt-[clamp(28px,3.3vw,64px)]">
            Different Thinking exists to end the waste of neurodiverse potential. Somewhere between 15 and 20 percent
            of people are neurodivergent. That&apos;s who we are designing for.
          </p>
          <h2 className="text-ink [font-family:Exposure,var(--font-sans)] text-[clamp(28px,3.3vw,64px)] leading-[1.08] tracking-[-0.06em] md:col-start-1 lg:col-start-3">
            {/* non-breaking hyphen: the word overflows its column in one piece */}
            Neuro&#8209;atypical Products
          </h2>
          <p className="t-body leading-[1.4] tracking-[0] text-[#6E6E6E] md:col-start-2 md:pr-8 lg:col-start-4 lg:pt-[clamp(28px,3.3vw,64px)]">
            Different Thinking exists to end the waste of neurodiverse potential. Somewhere between 15 and 20 percent
            of people are neurodivergent. That&apos;s who we are designing for.
          </p>
        </div>
      </header>

      {/* full-width media placeholder */}
      <section className="relative z-[1] mt-[clamp(56px,10vh,130px)] px-[var(--gutter)]">
        <div className="relative aspect-[16/7] w-full bg-[#ececea]">
          <span className="absolute bottom-3 left-3 font-sans text-[8px] tracking-[0.01em] text-[#B2B2B2]">
            [ PLACEHOLDER :: CAMPAIGN_ENV ]
          </span>
        </div>
      </section>

      {/* the trails */}
      <section className="relative z-[1] mt-[clamp(48px,8vh,100px)] px-[var(--gutter)]">
        {["...", ".......", "..............", ".....................", "............................."].map((dots, i) => (
          <p key={i} className="t-body leading-[1.7] tracking-[0] text-ink">
            Follow the trails{dots}
          </p>
        ))}
      </section>

      {/* large-scale bug outline */}
      <section aria-hidden className="relative z-[1] mt-[clamp(40px,6vh,80px)] px-[var(--gutter)]">
        <BugOutline className="mx-auto h-auto w-[min(92%,980px)] text-ink" />
      </section>

      {/* closing line */}
      <section className="relative z-[1] mt-[clamp(56px,10vh,130px)] px-[var(--gutter)] pb-[clamp(40px,6vh,80px)]">
        <p className="text-ink [font-family:Exposure,var(--font-sans)] text-[clamp(44px,8.9vw,128px)] leading-[1] tracking-[-0.1em]">
          Your Bugs are Cool.
        </p>
      </section>

      <Footer />
    </main>
  );
}
