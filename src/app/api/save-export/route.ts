/* TEMPORARY dev-only route: receives a PNG blob from /export4k and writes it to <cwd>/exports/.
   Not for production — delete after generating exports. */
import { NextResponse } from "next/server";
import fs from "node:fs/promises";
import path from "node:path";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const url = new URL(req.url);
  const name = (url.searchParams.get("name") || "export").replace(/[^a-zA-Z0-9_-]/g, "");
  const buf = Buffer.from(await req.arrayBuffer());
  const dir = path.join(process.cwd(), "exports");
  await fs.mkdir(dir, { recursive: true });
  const file = path.join(dir, `${name}.png`);
  await fs.writeFile(file, buf);
  return NextResponse.json({ ok: true, file, bytes: buf.length });
}
