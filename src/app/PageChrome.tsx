import Link from "next/link";
import NavIndex from "./NavIndex";

/* The strip every inner page opens with: wordmark link home, the one-line
   positioning statement, and the nav index — laid out on the column grid. */
export default function PageChrome() {
  return (
    <div className="grid grid-cols-1 gap-y-6 md:grid-cols-3 lg:grid-cols-5">
      {/* self-start matters now the hover paints a background: as a grid item it
          stretched to the row height set by the taller nav, so the sweep drew a
          block several lines deep behind one line of text */}
      <Link href="/" className="t-title h-fit w-fit self-start font-medium tracking-[-0.02em]">
        Your Bugs are Cool.
      </Link>
      <p className="t-body hidden text-balance leading-[1.4] tracking-[0] md:col-start-2 md:block lg:col-start-4">
        An AI research lab building products for people who think differently.
      </p>
      {/* Shown at every breakpoint. It used to carry max-md:hidden, which left
          all four inner pages with NO navigation at all on a phone — the only
          way out was the browser's back button, which is most likely what made
          the back button feel broken in the first place. */}
      <NavIndex className="md:col-start-3 lg:col-start-5" />
    </div>
  );
}
