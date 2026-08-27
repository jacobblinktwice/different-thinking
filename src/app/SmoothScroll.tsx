"use client";

/* Lenis smooth scrolling, site-wide from the root layout. Anchors opt in so the
   nav's #about links glide instead of jumping.

   Skipped on /lab, whose side panel scrolls natively, and under
   prefers-reduced-motion. */
import { useEffect } from "react";
import { usePathname } from "next/navigation";
import Lenis from "lenis";

/* Programmatic scrolls have to go through the live instance. Lenis drives the
   page by calling window.scrollTo itself and tracking its own target, so a bare
   window.scrollTo leaves that target stale and the next wheel event snaps back
   to where Lenis still thinks it is. Publishing the instance lets components
   (Manifesto's expand) hand their scrolls to it instead. */
declare global {
  interface Window {
    __dtLenis?: Lenis;
  }
}

export default function SmoothScroll() {
  const pathname = usePathname();

  useEffect(() => {
    if (pathname?.startsWith("/lab")) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const lenis = new Lenis({ lerp: 0.1, anchors: true });
    window.__dtLenis = lenis;
    let raf = 0;
    const loop = (time: number) => {
      lenis.raf(time);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => {
      cancelAnimationFrame(raf);
      if (window.__dtLenis === lenis) delete window.__dtLenis;
      lenis.destroy();
    };
  }, [pathname]);
  return null;
}
