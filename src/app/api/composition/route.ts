/* Shared LIVE composition + version history for the glitch.
   The lab publishes here (PUT, gated by the lab code) and every visitor's
   homepage reads it (GET) — so a save goes live for everyone, not just the
   browser that made it.

   Storage: Vercel Blob in production. Works with both auth modes — OIDC
   (BLOB_STORE_ID + VERCEL_OIDC_TOKEN, the default for newly created stores)
   and the legacy static BLOB_READ_WRITE_TOKEN — and with either store access
   mode (private/public, tried in that order). Local dev falls back to plain
   files under .data/ (gitignored). */
import { NextResponse } from "next/server";
import { timingSafeEqual } from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const COMP_PATH = "glitch/composition.json"; // the LIVE composition
const SAVED_PATH = "glitch/saved.json"; // the lab's working save
const VERS_PATH = "glitch/versions.json";
const MAX_VERSIONS = 15;

/* The write key lives in the environment, never in the bundle. It used to be a
   constant shared with lab/page.tsx — a "use client" file — which shipped the
   secret to every visitor, so anyone could read it out of the JS and publish a
   composition live. Fails closed when LAB_KEY is unset: no key, no writes. */
function authorised(req: Request): boolean {
  const expected = process.env.LAB_KEY;
  const got = req.headers.get("x-lab-key");
  if (!expected || !got) return false;
  const a = Buffer.from(got);
  const b = Buffer.from(expected);
  // timingSafeEqual demands equal lengths; comparing them first leaks only length
  return a.length === b.length && timingSafeEqual(a, b);
}

const hasBlob = () => !!(process.env.BLOB_READ_WRITE_TOKEN || process.env.BLOB_STORE_ID);
const localFile = (p: string) => path.join(process.cwd(), ".data", p.replace("/", "_"));
const ACCESS_MODES = ["private", "public"] as const;

async function readJson(p: string): Promise<unknown | null> {
  if (hasBlob()) {
    const { get } = await import("@vercel/blob");
    for (const access of ACCESS_MODES) {
      try {
        const res = await get(p, { access, useCache: false });
        if (res?.stream) return await new Response(res.stream as BodyInit).json();
      } catch {
        /* wrong access mode for this store — try the other */
      }
    }
    return null; // not found / storage hiccup
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
    let lastErr: unknown;
    for (const access of ACCESS_MODES) {
      try {
        await put(p, body, {
          access,
          addRandomSuffix: false,
          allowOverwrite: true,
          contentType: "application/json",
          cacheControlMaxAge: 0,
        });
        return;
      } catch (err) {
        lastErr = err; // wrong access mode for this store — try the other
      }
    }
    throw lastErr;
  }
  await fs.mkdir(path.dirname(localFile(p)), { recursive: true });
  await fs.writeFile(localFile(p), body);
}

export async function GET() {
  const [comp, saved, versions] = await Promise.all([readJson(COMP_PATH), readJson(SAVED_PATH), readJson(VERS_PATH)]);
  return NextResponse.json({
    comp: comp ?? null,
    saved: saved ?? null,
    versions: Array.isArray(versions) ? versions : [],
  });
}

/* Verify a key without writing anything, so the lab's unlock gate can check the
   code it was given without the secret ever reaching the client. */
export async function POST(req: Request) {
  return authorised(req)
    ? NextResponse.json({ ok: true })
    : NextResponse.json({ ok: false, error: "denied" }, { status: 401 });
}

export async function PUT(req: Request) {
  if (!authorised(req)) {
    return NextResponse.json({ ok: false, error: "denied" }, { status: 401 });
  }
  if (!hasBlob() && process.env.VERCEL) {
    return NextResponse.json(
      { ok: false, error: "No storage configured — add a Blob store to the Vercel project." },
      { status: 503 },
    );
  }
  let body: { action?: string; snap?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "bad json" }, { status: 400 });
  }
  const action = body.action === "publish" ? "publish" : "save";
  const snap = body.snap;
  const obj = snap as { v?: number; boxes?: unknown };
  if (!obj || typeof obj.v !== "number" || !Array.isArray(obj.boxes)) {
    return NextResponse.json({ ok: false, error: "bad composition" }, { status: 400 });
  }
  const prev = await readJson(VERS_PATH);
  const entry = action === "publish" ? { t: Date.now(), snap, live: true } : { t: Date.now(), snap };
  const versions = [entry, ...(Array.isArray(prev) ? prev : [])].slice(0, MAX_VERSIONS);
  // save = the lab's working state + a history entry; publish = live for everyone
  await writeJson(SAVED_PATH, snap);
  if (action === "publish") await writeJson(COMP_PATH, snap);
  await writeJson(VERS_PATH, versions);
  return NextResponse.json({ ok: true, versions });
}
