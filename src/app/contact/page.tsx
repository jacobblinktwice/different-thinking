import Footer from "../Footer";
import CodeNote from "../CodeNote";
import ComposeMail from "./ComposeMail";
import PageGuides from "../PageGuides";
import PageChrome from "../PageChrome";
import Credits from "../Credits";

export const metadata = {
  title: "Contact — Different Thinking",
  description: "One address, read by the people building the products. Tell us your cool bug.",
};

/* The two founders, same addresses and treatment as the About page credits. */
const DIRECT = [
  { name: "David Lyria", role: "Co-Founder and CEO", email: "david@differentthinking.ai" },
  { name: "Jack Bleakley", role: "Co-Founder and Chief Design Officer", email: "jack@differentthinking.ai" },
];

/* Contact — the footer's line taken as the page: Exposure headline, the
   intro (code note in column 1, copy in 2-3), the draggable dialect block that
   composes the mail, then the direct lines and what to expect back. */
export default function ContactPage() {
  return (
    <main className="relative flex flex-1 flex-col bg-white text-ink">
      <PageGuides />

      {/* page chrome */}
      <header className="relative z-[1] px-[var(--gutter)] pt-[clamp(20px,4vh,44px)]">
        <PageChrome />

        {/* headline — the footer's line, at page scale */}
        <h1 className="mt-[clamp(48px,9vh,110px)] max-w-[16ch] text-ink [font-family:Exposure,var(--font-sans)] text-[clamp(44px,8.9vw,128px)] leading-[1.02] tracking-[-0.1em]">
          Say Hello
        </h1>

        {/* intro: code note in column 1, the copy across 2-3 */}
        <div className="mt-[clamp(32px,6vh,72px)] grid grid-cols-1 gap-y-8 md:grid-cols-3 lg:grid-cols-5">
          <CodeNote snippet="deploy" className="md:pr-8" />
          <p className="text-[20px] leading-[1.4] tracking-[0] text-ink md:col-span-2 md:pr-8 lg:col-span-2">
            Tell us how your unique mind works, what you&apos;d like us to build next, or if you&apos;re a different
            thinker and want to join our expanding team. We&apos;d love to hear from you.
          </p>
        </div>
      </header>

      {/* the composer, on columns 1-3 — the marker sits in the gutter column
          beside it on lg, the way the codestrip labels the grid elsewhere */}
      <section className="relative z-[1] mt-[clamp(40px,7vh,90px)] px-[var(--gutter)]">
        <div className="grid grid-cols-1 gap-y-6 md:grid-cols-3 lg:grid-cols-5">
          <ComposeMail className="md:col-span-3 lg:col-span-3" />
          <div className="hidden lg:col-start-5 lg:block">
            <pre className="font-sans text-[8px] leading-[1.7] tracking-[0.01em] text-[#B2B2B2]">
              {"RUN COMPOSE_MAIL();\n// NO FORM ROUTING\n// NO AUTORESPONDER\n// A PERSON READS IT"}
            </pre>
          </div>
        </div>
      </section>

      {/* direct lines: the general address at scale, the founders in the dialect,
          and what comes back — one per column band */}
      {/* no bottom padding: the footer runs straight on from here, and its own
          top padding is all the separation this needs */}
      <section className="relative z-[1] mt-[clamp(56px,10vh,130px)] px-[var(--gutter)]">
        <div className="grid grid-cols-1 gap-y-12 md:grid-cols-3 lg:grid-cols-5">
          <div className="md:col-span-2 lg:col-span-2 lg:pr-8">
            <p className="t-body leading-[1.4] tracking-[0] text-ink">Or just write to us directly.</p>
            <a
              href="mailto:info@differentthinking.ai"
              className="mt-4 block w-fit font-sans text-[clamp(22px,2.8vw,44px)] leading-[1.1] tracking-[-0.02em] text-ink"
            >
              info@differentthinking.ai
            </a>
          </div>

          <div className="md:col-start-3 lg:col-start-3">
            {DIRECT.map((d, i) => (
              <div key={d.email} className={i > 0 ? "mt-8" : ""}>
                <Credits name={d.name} role={d.role} email={d.email} />
              </div>
            ))}
          </div>

          {/* what comes back — the refusals, applied to a reply */}
          <div className="lg:col-start-5">
            <pre className="font-sans text-[8px] leading-[1.7] tracking-[0.01em] text-[#6E6E6E]">
              {"REPLY({\n    GUILT_MECHANICS: NULL,\n    FORM_LETTERS: NULL,\n    PERFORMED_URGENCY: NULL,\n});\n// WRITTEN BY A PERSON\n// SOMETIMES SLOWLY"}
            </pre>
          </div>
        </div>

        <div className="mt-16 font-sans text-[8px] tracking-[0.01em] text-[#B2B2B2]">{"// SRC: CONTACT.MD"}</div>
      </section>

      {/* the page already opens with the address and the composer */}
      <Footer showAddress={false} />
    </main>
  );
}
