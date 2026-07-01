import { Glitch } from "@/components/glitch";

/* Homepage.
   NOTE: this is a functional placeholder that already mounts the shared glitch effect as the hero.
   The Figma-accurate build (type scale, spacing, exact layout) is the next phase — see the
   GLITCH MOUNT POINT below, which is where the effect drops into the final design. */
export default function Home() {
  return (
    <main className="flex flex-1 flex-col">
      {/* ===== HERO ===== */}
      <section className="relative h-[min(100vh,1040px)] min-h-[640px] w-full overflow-hidden">
        {/* faint 12.5% vertical guides */}
        <div
          className="pointer-events-none absolute inset-0 z-[2] opacity-50"
          style={{
            backgroundImage:
              "repeating-linear-gradient(to right,transparent 0,transparent calc(12.5% - 1px),var(--hair) calc(12.5% - 1px),var(--hair) 12.5%)",
          }}
        />

        {/* ===== GLITCH MOUNT POINT — shared component, same source as /lab ===== */}
        <Glitch className="absolute inset-0 z-[1]" mode="landing" background={[0.988, 0.988, 0.988]} />

        {/* wordmark — complementary knock-out over the boxes via difference blend */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/logotype.svg"
          alt="Different Thinking"
          aria-hidden
          className="pointer-events-none absolute bottom-[8%] left-[2%] right-[2%] z-[2] w-[96%]"
          style={{ filter: "invert(1)", mixBlendMode: "difference" }}
        />

        {/* overlay chrome */}
        <div className="pointer-events-none absolute inset-0 z-[3]">
          <div className="absolute left-[clamp(20px,3vw,54px)] top-[clamp(18px,4vh,50px)] text-[clamp(20px,2.1vw,31px)] font-medium tracking-tight">
            Your Bugs are Cool.
          </div>
          <nav className="pointer-events-auto absolute right-[clamp(18px,3vw,54px)] top-[clamp(18px,4vh,50px)] grid grid-cols-[auto_auto] gap-x-[18px] gap-y-[9px] text-[15px] tracking-tight">
            {[
              ["01", "About"],
              ["02", "Different Thinkers"],
              ["03", "Alex"],
              ["04", "Specimen"],
            ].map(([n, label]) => (
              <div key={n} className="contents">
                <span className="font-mono text-[12px] opacity-80">[{n}]</span>
                <a href="#about" className="transition-opacity hover:opacity-50">
                  {label}
                </a>
              </div>
            ))}
          </nav>
          <div className="absolute inset-x-0 bottom-[clamp(14px,3vh,34px)] flex justify-between px-[clamp(20px,3vw,54px)] font-mono text-[15px]">
            <span>{"{reSrch}"}</span>
            <span className="-ml-[16vw]">; @{"}"}</span>
            <span>&lt;&quot;aiLab&quot;&gt;</span>
          </div>
        </div>
      </section>

      {/* ===== INTRO ===== */}
      <section
        id="about"
        className="border-t border-hair px-[clamp(20px,4vw,72px)] py-[clamp(48px,7vw,110px)]"
      >
        <h1 className="max-w-4xl text-[clamp(28px,4vw,56px)] font-semibold leading-[1.05] tracking-[-0.03em]">
          An AI research lab building products for people who think differently.
        </h1>
        <p className="mt-6 max-w-xl text-lg leading-8 text-neutral-600">
          Different Thinking designs tools around cognitive difference rather than against it.
          The outliers in a system — the bugs — are usually the most interesting signal.
        </p>
        <p className="mt-10 font-mono text-xs text-neutral-500">
          Tune the hero effect at{" "}
          <a href="/lab" className="text-blue underline">
            /lab
          </a>
          .
        </p>
      </section>
    </main>
  );
}
