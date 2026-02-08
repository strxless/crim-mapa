import { NextRequest } from "next/server";
import path from "node:path";
import fs from "node:fs/promises";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const UPLOADS_DIR = path.resolve(process.cwd(), "uploads");

const MIME: Record<string, string> = {
  ".webp": "image/webp",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
};

export async function GET(
  _req: NextRequest,
  { params }: { params: { path: string[] } }
) {
  const segments = params.path;
  if (!segments || segments.length === 0) {
    return new Response("Not found", { status: 404 });
  }

  // Prevent path traversal
  for (const s of segments) {
    if (s.includes("..") || s.includes("\0")) {
      return new Response("Forbidden", { status: 403 });
    }
  }

  const filePath = path.join(UPLOADS_DIR, ...segments);

  // Make sure the resolved path is within UPLOADS_DIR
  const resolved = path.resolve(filePath);
  if (!resolved.startsWith(UPLOADS_DIR)) {
    return new Response("Forbidden", { status: 403 });
  }

  try {
    const buffer = await fs.readFile(resolved);
    const ext = path.extname(resolved).toLowerCase();
    const contentType = MIME[ext] || "application/octet-stream";

    return new Response(buffer, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
  } catch {
    return new Response("Not found", { status: 404 });
  }
}
