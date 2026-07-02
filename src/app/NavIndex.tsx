import Link from "next/link";

const NAV: [string, string][] = [
  ["01", "About"],
  ["02", "Different Thinkers"],
  ["03", "Alex"],
  ["04", "Specimen"],
];

export default function NavIndex({ className = "" }: { className?: string }) {
  return (
    <nav className={`grid grid-cols-[auto_1fr] gap-x-3 gap-y-[7px] ${className}`}>
      {NAV.map(([n, label]) => {
        const href = label === "Specimen" ? "/lab" : `#${label.toLowerCase().replace(/\s+/g, "-")}`;
        return (
          <div key={n} className="contents">
            <span className="font-mono text-[10px] leading-5 text-neutral-500">[ {n} ]</span>
            <Link href={href} className="text-[15px] leading-5 tracking-tight transition-opacity hover:opacity-50">
              {label}
            </Link>
          </div>
        );
      })}
    </nav>
  );
}
