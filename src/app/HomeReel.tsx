"use client";

/* The 16:9 reel that fills the homepage media slot. Autoplays muted, because no
   browser will start a video with sound unasked, with a SOUND(); control to turn
   it on — a click counts as the gesture that unmuting requires — and a
   REPLAY(); to take it back to the start.

   It sits well below the fold, so nothing is fetched until it comes into view:
   preload="none" plus play/pause on an IntersectionObserver, with the poster
   standing in until then. Scrolling away pauses it, which matters once the sound
   is on.

   Under prefers-reduced-motion it never autoplays — it holds the poster, and
   the control becomes the way in: pressing it is a user gesture, so playback
   starts with sound on rather than nothing happening. */
import { useEffect, useRef, useState } from "react";

export default function HomeReel({ src, poster }: { src: string; poster: string }) {
  const ref = useRef<HTMLVideoElement>(null);
  const [sound, setSound] = useState(false);

  useEffect(() => {
    const v = ref.current;
    if (!v) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const io = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) {
          v.preload = "auto";
          void v.play().catch(() => {
            /* autoplay refused — the poster stands in */
          });
        } else {
          v.pause();
        }
      },
      { rootMargin: "10% 0px" },
    );
    io.observe(v);
    return () => io.disconnect();
  }, []);

  const toggleSound = () => {
    const v = ref.current;
    if (!v) return;
    if (sound) {
      v.muted = true;
      setSound(false);
      return;
    }
    v.muted = false;
    setSound(true);
    // unmuting a paused video reads as broken, so make sure it is running. If
    // play is refused, put the element back where the label says it is —
    // otherwise it sits unmuted while the control claims otherwise.
    void v.play().catch(() => {
      v.muted = true;
      setSound(false);
    });
  };

  const replay = () => {
    const v = ref.current;
    if (!v) return;
    v.currentTime = 0;
    /* a replay is a user gesture, so this is also the way in under
       prefers-reduced-motion, where nothing has autoplayed */
    void v.play().catch(() => {
      /* refused — the poster stands in */
    });
  };

  return (
    <>
      <video
        ref={ref}
        src={src}
        poster={poster}
        muted
        loop
        playsInline
        preload="none"
        disablePictureInPicture
        className="absolute inset-0 h-full w-full object-cover"
      />
      {/* padding rather than position for the tap targets: 8px type alone is a
          47x12 hit area, which is nothing on a phone. p-3 against a row pinned
          at bottom/left-0 leaves the labels exactly where bottom/left-3 put
          them, and the negative gap keeps the two sets of padding from adding
          up into a wide dead space between them. */}
      <div className="absolute bottom-0 left-0 flex items-center">
        <button
          type="button"
          onClick={toggleSound}
          aria-pressed={sound}
          aria-label={sound ? "Mute the reel" : "Unmute the reel"}
          className="dt-cmd cursor-pointer p-3 font-sans text-[8px] tracking-[0.01em] text-[#B2B2B2] hover:text-ink"
        >
          {sound ? "SOUND(OFF);" : "SOUND(ON);"}
        </button>
        <button
          type="button"
          onClick={replay}
          aria-label="Play the reel from the start"
          className="dt-cmd -ml-1 cursor-pointer p-3 font-sans text-[8px] tracking-[0.01em] text-[#B2B2B2] hover:text-ink"
        >
          REPLAY();
        </button>
      </div>
    </>
  );
}
