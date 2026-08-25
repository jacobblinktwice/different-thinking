import Link from "next/link";
import NavIndex from "./NavIndex";

/* The strip every inner page opens with: wordmark link home, the one-line
   positioning statement, and the nav index — laid out on the column grid. */
export default function PageChrome() {
  return (
    <div className="grid grid-cols-1 gap-y-6 md:grid-cols-3 lg:grid-cols-5">
      <Link href="/" className="t-title w-fit font-medium tracking-[-0.02em]">
        Your Bugs are Cool.
      </Link>
      <p className="t-body hidden text-balance leading-[1.4] tracking-[0] md:col-start-2 md:block lg:col-start-4">
        An AI research lab building products for people who think differently.
      </p>
      {/* max-md:hidden keeps NavIndex's own grid display intact on md+ */}
      <NavIndex className="max-md:hidden md:col-start-3 lg:col-start-5" />
    </div>
  );
}
