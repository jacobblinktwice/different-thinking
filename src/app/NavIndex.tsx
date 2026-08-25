import Link from "next/link";

const NAV: [string, string, string][] = [
  ["01", "About", "/about"],
  ["02", "Different Thinkers", "/different-thinkers"],
  ["03", "Eventually", "/eventually"],
  ["04", "Contact", "/#contact"],
];

export default function NavIndex({ className = "" }: { className?: string }) {
  return (
    <nav className={`grid grid-cols-[auto_1fr] items-baseline gap-x-3 gap-y-[7px] ${className}`}>
      {NAV.map(([n, label, href]) => (
        <div key={n} className="contents">
          <span className="font-sans text-[8px] leading-[17px] tracking-[0.01em] text-neutral-500">[ {n} ]</span>
          <Link href={href} className="t-body w-fit leading-[17px] tracking-[0]">
            {label}
          </Link>
        </div>
      ))}
    </nav>
  );
}
