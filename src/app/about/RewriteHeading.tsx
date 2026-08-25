"use client";

/* "Neurodiverse Research" — the second word is rewritten on a loop: GSAP
   backspaces it a character at a time, then types the next one in, with a
   blinking block caret sitting at the insertion point throughout. The word
   always sits on its own line (forced break + a zero-width space holding the
   line box open) so nothing below shifts while the word is mid-delete.

   The timeline only runs while the heading is on screen, and holds on the first
   word entirely under prefers-reduced-motion (the caret stops blinking too —
   see .dt-caret in globals.css). */
import { useEffect, useRef } from "react";
import gsap from "gsap";

const WORDS = ["Research", "Products", "Builders", "Community", "Thinkers"];
const CPS = 16; // characters per second, typing and deleting alike
const HOLD = 2.4; // seconds a finished word stays up

export default function RewriteHeading({ className = "" }: { className?: string }) {
  const wordRef = useRef<HTMLSpanElement>(null);
  const hostRef = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    const word = wordRef.current;
    const host = hostRef.current;
    if (!word || !host) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    /* `at` is the source word being sliced; `cursor` is how much of it shows */
    const state = { cursor: WORDS[0].length };
    let at = 0;
    const render = () => {
      word.textContent = WORDS[at].slice(0, Math.round(state.cursor));
    };

    const tl = gsap.timeline({ repeat: -1, delay: HOLD, paused: true });
    WORDS.forEach((from, k) => {
      const next = (k + 1) % WORDS.length;
      tl.to(state, {
        cursor: 0,
        duration: from.length / CPS,
        ease: "none",
        snap: { cursor: 1 },
        onUpdate: render,
      });
      // swap the source word while nothing is showing, then type it in
      tl.call(() => {
        at = next;
      });
      tl.to(state, {
        cursor: WORDS[next].length,
        duration: WORDS[next].length / CPS,
        ease: "none",
        snap: { cursor: 1 },
        onUpdate: render,
      });
      tl.to({}, { duration: HOLD });
    });

    // no reason to burn frames rewriting a heading nobody is looking at
    const io = new IntersectionObserver(
      ([e]) => (e.isIntersecting ? tl.play() : tl.pause()),
      { rootMargin: "10% 0px" },
    );
    io.observe(host);

    return () => {
      io.disconnect();
      tl.kill();
    };
  }, []);

  return (
    <h2 ref={hostRef} className={className}>
      Neurodiverse
      <span className="block whitespace-nowrap">
        <span ref={wordRef}>{WORDS[0]}</span>
        <span aria-hidden className="dt-caret" />
        {/* zero-width space: keeps the line box open at zero characters */}
        &#8203;
      </span>
    </h2>
  );
}
