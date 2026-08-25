"use client";

/* The nav lifted out of the hero chrome and fixed to the viewport, so it stays
   put down the whole page. It replaces the copy that used to repeat inside the
   article — the article still spans four of five columns, so it sits in the
   fifth exactly where that repeat did.

   It lives directly under <main> rather than inside the hero on purpose: while
   the glitch is on, SliceShift puts a CSS filter on the hero's children, and a
   filtered ancestor becomes the containing block for fixed descendants — which
   would peg this to the hero instead of the viewport.

   The footer's own content occupies columns 4-5, so the nav stands down once the
   footer arrives rather than sitting on top of the address.

   From lg the nav sits in the fifth column, which the article deliberately
   leaves empty, so it never covers anything. Below that there is no spare
   column and it does overlap the body copy, so it carries a paper backdrop
   there — without one the two sets of text sit on top of each other. */
import { useEffect, useState } from "react";
import NavIndex from "./NavIndex";

export default function StickyNav() {
  const [atFooter, setAtFooter] = useState(false);

  useEffect(() => {
    const footer = document.querySelector("footer");
    if (!footer) return;
    const io = new IntersectionObserver(([e]) => setAtFooter(e.isIntersecting), {
      rootMargin: "-72px 0px 0px 0px",
    });
    io.observe(footer);
    return () => io.disconnect();
  }, []);

  return (
    <div
      className={`pointer-events-none fixed inset-x-0 top-[clamp(20px,4vh,44px)] z-[60] px-[var(--gutter)] transition-opacity duration-300 ease-[var(--ease-snap)] ${
        atFooter ? "opacity-0" : "opacity-100"
      }`}
    >
      {/* reproduces the hero chrome's geometry, so it does not shift at the
          moment it stops scrolling away */}
      <div className="relative">
        <NavIndex
          className={`absolute right-0 top-0 bg-paper p-2 md:left-[66.6667%] md:right-auto md:bg-transparent md:p-0 lg:left-[80%] ${
            atFooter ? "" : "pointer-events-auto"
          }`}
        />
      </div>
    </div>
  );
}
