"use client";

/* The manifesto flow.

   Desktop/tablet is unchanged: all 22 cells flow into the 3/4 CSS columns and
   balance to equal height — roughly one screenful per column, so a column can
   be read without losing your place.

   Mobile is the problem this component exists to solve. There is no multicol
   there, so the same 22 cells stack into ONE column 3.1 screens tall. Narrowing
   into two columns does not help and measurably hurts: at 375px, two columns at
   the same 12px came out TALLER than one (2637px vs 2503px), because halving the
   measure more than doubles the line count, and even at an unreadable 9px it was
   still 1.74 screens per column — worse than desktop's 1.05, and it would force
   a scroll back up to the top to start column two.

   So mobile gets the argument's spine (SPINE below) at full size, ~1.2 screens,
   with the remaining cells kept in the DOM in their original positions and
   revealed in place by the control. Nothing is cut, and the order never changes. */
import { useState } from "react";

/* 0-based indices of the cells that carry the argument on their own:
   bug as defect → the industry joke → one in five → diversity is a group-level
   feature → mismatch, not broken brain → the abilities are real → what we build
   → the first product → the world we want. */
const SPINE = new Set([0, 1, 2, 4, 7, 10, 16, 19, 21]);

export default function Manifesto({ columns }: { columns: string[] }) {
  const [open, setOpen] = useState(false);
  const rest = columns.length - SPINE.size;

  /* Both directions return to the top of the article.

     Expanding without this looks like it does nothing: the revealed cells are
     interleaved between the spine ones, so they all land ABOVE the control, and
     a reader who taps at the end of the short version is left staring at the
     closing paragraph with 13 new paragraphs out of sight behind them.
     Collapsing needs it for the opposite reason — the short article is 1.2
     screens, so a position from deep in the full read is often past its end
     entirely, which would strand the reader in the section below.

     #about's own top never moves (cells are added inside it, downward), so the
     target can be measured before the state change and needs no re-layout. */
  const toggle = () => {
    const section = document.getElementById("about");
    setOpen((v) => !v);
    if (!section) return;

    // clear the fixed nav, which is opaque on mobile and would otherwise cover
    // the opening lines we are scrolling to. Its wrapper is zero-height (the
    // nav inside is absolutely positioned), so measure the <nav> itself and use
    // its viewport bottom — it is fixed, so that is the clearance directly.
    const nav = document.querySelector<HTMLElement>("[data-sticky-nav] nav");
    const clearance = (nav ? nav.getBoundingClientRect().bottom : 0) + 12;
    const top = Math.max(0, section.getBoundingClientRect().top + window.scrollY - clearance);

    // a document offset rather than the element: lenis.scrollTo(section, {
    // offset }) resolves to the same number, but computing it here means the
    // Lenis path and the no-Lenis path below land in exactly the same place
    // instead of relying on two implementations agreeing. Taken from the rect +
    // scrollY, so it holds whether or not Lenis is mid-animation.
    const lenis = window.__dtLenis;
    if (lenis) lenis.scrollTo(top);
    // reduced motion (Lenis never mounts) — jump, no animation
    else window.scrollTo({ top });
  };

  return (
    <>
      <div className="md:columns-3 md:gap-x-0 lg:col-span-4 lg:columns-4">
        {columns.map((html, i) => (
          /* continuous flow — no gaps, no indents. Cells may fragment
             across columns so the four columns balance to equal height. */
          <div
            key={i}
            className={`article-col t-body leading-[1.4] tracking-[0] text-[#8E8E8E] md:pr-8 [&_.wl]:underline [&_.wl]:decoration-[#8E8E8E] ${
              open || SPINE.has(i) ? "" : "hidden md:block"
            }`}
          >
            {/* inner wrapper = the reveal target */}
            <div className="article-inner" dangerouslySetInnerHTML={{ __html: `<p>${html}</p>` }} />
          </div>
        ))}
      </div>

      {/* mobile only — at md+ every cell is already in the flow, so there is
          nothing to expand. -ml-2/px-2 keeps the label flush to the gutter while
          the padding still gives it a thumb-sized target. */}
      <button
        type="button"
        onClick={toggle}
        aria-expanded={open}
        className="dt-cmd -ml-2 mt-2 cursor-pointer px-2 py-4 font-sans text-[10px] uppercase tracking-[0.08em] text-ink md:hidden"
      >
        {open ? "COLLAPSE(MANIFESTO);" : "EXPAND(MANIFESTO);"}
        <span className="ml-2 normal-case tracking-[0.01em] text-[#B2B2B2]">
          {open ? "// BACK TO THE SHORT READ" : `// +${rest} PARAGRAPHS`}
        </span>
      </button>
    </>
  );
}
