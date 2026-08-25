/* The six vertical hairlines bounding the column grid, running the full page
   height: 5 columns on desktop (lg), 3 on tablet (md), gutter lines only on
   mobile. Every page draws the same set — `z` lets a page lift them above a
   full-bleed layer where it needs to. */
export default function PageGuides({ z = "z-0" }: { z?: string }) {
  return (
    <div
      aria-hidden
      className={`pointer-events-none absolute inset-y-0 left-[var(--gutter)] right-[var(--gutter)] ${z}`}
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
  );
}
