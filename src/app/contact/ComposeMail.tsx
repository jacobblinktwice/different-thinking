"use client";

/* The contact panel, written as a block of the brand code dialect that happens
   to be editable: the ABOUT tokens are the selector, FROM and BUG are fields,
   and SEND(); hands the finished thing to the visitor's own mail client. No
   endpoint, no queue, no ticket number — nothing leaves the page until they
   press it.

   Chrome and dragging come from DragWindow, in header-only mode: grabbing the
   body would fight selecting and editing the text inside it.

   The dialect is ALL CAPS; the visitor's own words are the one thing on the
   page that isn't. That's deliberate twice over — it reads as the human
   speaking back to the machine, and it keeps what's displayed identical to what
   gets sent (a CSS uppercase would lie about the mailto body). */
import { useRef, useState } from "react";
import DragWindow from "../DragWindow";

const TO = "info@differentthinking.ai";

const ABOUT = ["WORKING_TOGETHER", "BEING_IN_THE_ROOM", "RESEARCH", "PRESS", "SOMETHING_ELSE"] as const;
type About = (typeof ABOUT)[number];

const IDLE = "// NOTHING LEAVES THIS PAGE UNTIL YOU PRESS SEND";

export default function ComposeMail({ className = "" }: { className?: string }) {
  const [about, setAbout] = useState<About>("WORKING_TOGETHER");
  const [name, setName] = useState("");
  const [msg, setMsg] = useState("");
  const [note, setNote] = useState(IDLE);
  const msgRef = useRef<HTMLTextAreaElement>(null);

  const send = () => {
    if (!msg.trim()) {
      setNote("// NEEDS A BUG FIRST");
      msgRef.current?.focus();
      return;
    }
    const who = name.trim();
    const subject = `${about.replace(/_/g, " ").toLowerCase()}${who ? ` — ${who}` : ""}`;
    const body = `${msg.trim()}\n\n— ${who || "someone who thinks differently"}`;
    setNote("// HANDED OFF TO YOUR MAIL CLIENT");
    window.location.href = `mailto:${TO}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  };

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(TO);
      setNote("// ADDRESS COPIED");
    } catch {
      setNote("// COPY BLOCKED — SELECT IT BY HAND");
    }
  };

  return (
    <DragWindow label="compose.mail" meta="// LOCAL_DRAFT" handle="header" className={className}>
      {/* the dialect block — indents are in ch so they hold at every size */}
      <div className="t-body px-3 pb-5 leading-[1.9] tracking-[0] text-[#6E6E6E]">
        <p>{"MAIL({"}</p>

        <p className="pl-[2ch]">
          {"TO: "}
          <a href={`mailto:${TO}`} className="text-ink underline decoration-[var(--hair)] hover:decoration-ink">
            {`"${TO.toUpperCase()}"`}
          </a>
          {","}
        </p>

        {/* ABOUT is the selector: the tokens are the control, no dropdown chrome */}
        <div className="pl-[2ch]">
          {"ABOUT: ["}
          <span className="inline-flex flex-wrap gap-x-[1.2ch]">
            {ABOUT.map((a) => (
              <button
                key={a}
                type="button"
                aria-pressed={a === about}
                onClick={() => {
                  setAbout(a);
                  setNote(IDLE);
                }}
                className={`cursor-pointer px-[0.18em] transition-colors duration-200 ${
                  a === about ? "bg-blue text-white" : "text-[#B2B2B2] hover:text-ink"
                }`}
              >
                {a}
              </button>
            ))}
          </span>
          {"],"}
        </div>

        <p className="pl-[2ch]">
          {"FROM: "}
          <span className="text-ink">&quot;</span>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="your name"
            aria-label="Your name"
            autoComplete="name"
            className="w-[min(100%,26ch)] border-b border-[var(--hair)] bg-transparent px-1 text-ink caret-ink outline-none placeholder:text-[#B2B2B2] focus:border-ink"
          />
          <span className="text-ink">&quot;</span>
          {","}
        </p>

        <p className="pl-[2ch]">{'BUG: "'}</p>
        <textarea
          ref={msgRef}
          value={msg}
          onChange={(e) => {
            setMsg(e.target.value);
            if (note !== IDLE) setNote(IDLE);
          }}
          rows={4}
          placeholder="What your mind does well. What the template keeps breaking. The thing you'd like us to design around next."
          aria-label="Your message"
          className="ml-[4ch] w-[calc(100%-4ch)] resize-none border-b border-[var(--hair)] bg-transparent px-1 leading-[1.5] text-ink caret-ink outline-none placeholder:text-[#B2B2B2] focus:border-ink"
        />
        <p className="pl-[2ch]">{'",'}</p>
        <p>{"});"}</p>

        {/* the commands — same highlight sweep as the nav links */}
        <div className="mt-6 flex flex-wrap items-baseline gap-x-8">
          <button type="button" onClick={send} className="dt-cmd cursor-pointer text-ink">
            SEND();
          </button>
          <button type="button" onClick={copy} className="dt-cmd cursor-pointer text-ink">
            COPY(ADDRESS);
          </button>
        </div>

        {/* status, in the log voice */}
        <p aria-live="polite" className="mt-4 font-sans text-[8px] tracking-[0.01em] text-[#B2B2B2]">
          {note}
        </p>
      </div>
    </DragWindow>
  );
}
