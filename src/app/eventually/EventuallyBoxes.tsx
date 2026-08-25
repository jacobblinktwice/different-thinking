/* Eventually — the centre stack of draggable artefact windows carrying the
   campaign assets. Scattered down a tall centre band on md+; stacked and
   static on mobile. Chrome, dragging and stacking live in DragWindow, so this
   is just data and needs no client bundle of its own.

   `name` is the window chrome's filename (part of the design language) and is
   deliberately not the asset path. `ratio` matches each source's native aspect
   so object-cover never crops. */
import Image from "next/image";
import DragWindow from "../DragWindow";

const BOXES: { name: string; left: string; top: string; w: string; ratio: string; src: string; alt: string }[] = [
  { name: "eventually-campaign-hero.png", left: "6%", top: "0%", w: "clamp(300px,38vw,600px)", ratio: "2565 / 3132", src: "/images/eventually/hero.webp", alt: "Eventually campaign hero — phone held up showing the app" },
  { name: "eventually-app-icon.png", left: "32%", top: "26%", w: "clamp(240px,27vw,440px)", ratio: "3945 / 3240", src: "/images/eventually/app-icon.webp", alt: "The Eventually app icon on a phone home screen" },
  { name: "eventually-ooh-poster.png", left: "62%", top: "32%", w: "clamp(240px,26vw,420px)", ratio: "1530 / 2536", src: "/images/eventually/poster.webp", alt: "Eventually poster — Unlock Your Neurodiverse Potential" },
  { name: "eventually-app-preview.png", left: "10%", top: "50%", w: "clamp(200px,21vw,340px)", ratio: "1464 / 2151", src: "/images/eventually/app-scans.webp", alt: "Eventually app screen showing friends' voice scans" },
  { name: "eve-packaging.png", left: "38%", top: "66%", w: "clamp(220px,24vw,400px)", ratio: "1464 / 2151", src: "/images/eventually/packaging.webp", alt: "The eve keychain in its packaging" },
];

export default function EventuallyBoxes() {
  return (
    <section className="relative mx-[var(--gutter)] mb-[clamp(40px,5vw,72px)] md:h-[230vh]">
      {BOXES.map((b, i) => (
        <DragWindow key={b.name} label={b.name} closable left={b.left} top={b.top} width={b.w}>
          <div className="relative w-full overflow-hidden bg-[#ececea]" style={{ aspectRatio: b.ratio }}>
            <Image
              src={b.src}
              alt={b.alt}
              fill
              draggable={false}
              priority={i === 0}
              sizes="(max-width: 768px) 100vw, 38vw"
              className="select-none object-cover"
            />
          </div>
        </DragWindow>
      ))}
    </section>
  );
}
