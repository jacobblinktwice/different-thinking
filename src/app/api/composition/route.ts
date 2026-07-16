/* Shared LIVE composition + version history for the glitch.
   The lab publishes here (PUT, gated by the lab code) and every visitor's
   homepage reads it (GET) — so a save goes live for everyone, not just the
   browser that made it.

   Storage: Vercel Blob in production (requires a Blob store on the project —
   BLOB_READ_WRITE_TOKEN is injected automatically once one exists). Local dev
   falls back to plain files under .data/ (gitignored). */
import { NextResponse } from "next/server";
import fs from "node:fs/promises";
import path from "node:path";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const COMP_PATH = "glitch/composition.json";
const VERS_PATH = "glitch/versions.json";
const LAB_CODE = "rewired";
const MAX_VERSIONS = 15;

const hasBlob = () => !!process.env.BLOB_READ_WRITE_TOKEN;
const localFile = (p: string) => path.join(process.cwd(), ".data", p.replace("/", "_"));

async function readJson(p: string): Promise<unknown | null> {
  if (hasBlob()) {
    try {
      const { head } = await import("@vercel/blob");
      const h = await head(p);
      const r = await fetch(`${h.url}${h.url.includes("?") ? "&" : "?"}ts=${Date.now()}`, { cache: "no-store" });
      return r.ok ? await r.json() : null;
    } catch {
      return null; // not found / storage hiccup
    }
  }
  try {
    return JSON.parse(await fs.readFile(localFile(p), "utf8"));
  } catch {
    return null;
  }
}

async function writeJson(p: string, data: unknown): Promise<void> {
  const body = JSON.stringify(data);
  if (hasBlob()) {
    const { put } = await import("@vercel/blob");
    await put(p, body, {
      access: "public",
      addRandomSuffix: false,
      allowOverwrite: true,
      contentType: "application/json",
      cacheControlMaxAge: 0,
    });
    return;
  }
  await fs.mkdir(path.dirname(localFile(p)), { recursive: true });
  await fs.writeFile(localFile(p), body);
}

export async function GET() {
  const [comp, versions] = await Promise.all([readJson(COMP_PATH), readJson(VERS_PATH)]);
  return NextResponse.json({ comp: comp ?? null, versions: Array.isArray(versions) ? versions : [] });
}

export async function PUT(req: Request) {
  if (req.headers.get("x-lab-key") !== LAB_CODE) {
    return NextResponse.json({ ok: false, error: "denied" }, { status: 401 });
  }
  if (!hasBlob() && process.env.VERCEL) {
    return NextResponse.json(
      { ok: false, error: "No storage configured — add a Blob store to the Vercel project." },
      { status: 503 },
    );
  }
  let snap: unknown;
  try {
    snap = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "bad json" }, { status: 400 });
  }
  const obj = snap as { v?: number; boxes?: unknown };
  if (!obj || typeof obj.v !== "number" || !Array.isArray(obj.boxes)) {
    return NextResponse.json({ ok: false, error: "bad composition" }, { status: 400 });
  }
  const prev = await readJson(VERS_PATH);
  const versions = [{ t: Date.now(), snap }, ...(Array.isArray(prev) ? prev : [])].slice(0, MAX_VERSIONS);
  await writeJson(COMP_PATH, snap);
  await writeJson(VERS_PATH, versions);
  return NextResponse.json({ ok: true, versions });
}
