import { SNIPPETS, type SnippetKey } from "./codeSnippets";

/* A block of the brand code dialect set as page texture — same 8px mono-ish
   treatment as the footer copyright and the Eventually credits. Pass a key from
   `codeSnippets.ts`; `className` carries the placement (grid column, margins). */
export default function CodeNote({ snippet, className = "" }: { snippet: SnippetKey; className?: string }) {
  return (
    <pre
      aria-hidden
      className={`select-none font-sans text-[8px] leading-[1.7] tracking-[0.01em] text-[#6E6E6E] ${className}`}
    >
      {SNIPPETS[snippet]}
    </pre>
  );
}
