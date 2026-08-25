/* Dev-only route: receives a PNG blob from /export4k and writes it to
   <cwd>/exports/. Disabled outside development — in production this was an
   unauthenticated endpoint that wrote caller-sized files to the server's disk,
   which is a disk-fill vector and serves no purpose on a deployed site. */
import { NextResponse } from "next/server";
import fs from "node:fs/promises";
import path from "node:path";

export const runtime = "nodejs";

export async function POST(req: Request) {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ ok: false, error: "not found" }, { status: 404 });
  }
  const url = new URL(req.url);
  // strip anything that isn't a safe basename — no separators, no traversal
  const name = (url.searchParams.get("name") || "export").replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 100) || "export";
  const buf = Buffer.from(await req.arrayBuffer());
  const dir = path.join(process.cwd(), "exports");
  await fs.mkdir(dir, { recursive: true });
  const file = path.join(dir, `${name}.png`);
  await fs.writeFile(file, buf);
  return NextResponse.json({ ok: true, file, bytes: buf.length });
}
