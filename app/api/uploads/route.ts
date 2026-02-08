import { NextRequest } from "next/server";
import { cookies } from "next/headers";
import path from "node:path";
import fs from "node:fs/promises";
import crypto from "node:crypto";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const UPLOADS_DIR = path.resolve(process.cwd(), "uploads");
const MAX_SIZE = 3 * 1024 * 1024; // 3MB
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"];

function isAuthed() {
  const session = cookies().get("auth_session")?.value;
  return Boolean(session);
}

function useVercelBlob() {
  // Only use Vercel Blob when actually deployed on Vercel (not local dev)
  return Boolean(process.env.BLOB_READ_WRITE_TOKEN && process.env.VERCEL);
}

export async function POST(req: NextRequest) {
  if (!isAuthed()) {
    return new Response("Unauthorized", { status: 401 });
  }

  const contentType = req.headers.get("content-type") ?? "";
  if (!contentType.includes("multipart/form-data")) {
    return new Response("Expected multipart/form-data", { status: 400 });
  }

  let formData: FormData;
  try {
    formData = await req.formData();
  } catch {
    return new Response("Invalid form data", { status: 400 });
  }

  const file = formData.get("file");
  if (!file || typeof file === "string" || typeof (file as any).arrayBuffer !== "function") {
    return new Response("Missing file", { status: 400 });
  }

  const fileObj = file as Blob & { type: string; size: number; name?: string };

  if (!ALLOWED_TYPES.includes(fileObj.type)) {
    return new Response("Invalid file type. Allowed: jpeg, png, webp", { status: 400 });
  }

  if (fileObj.size > MAX_SIZE) {
    return new Response("File too large. Max 3MB", { status: 400 });
  }

  const buffer = Buffer.from(await fileObj.arrayBuffer());
  const ext = fileObj.type === "image/webp" ? "webp" : fileObj.type === "image/png" ? "png" : "jpg";
  const id = crypto.randomBytes(12).toString("hex");
  const filename = `${Date.now()}-${id}.${ext}`;

  // --- Prod: Vercel Blob ---
  if (useVercelBlob()) {
    try {
      const { put } = await import("@vercel/blob");
      const blob = await put(`visits/${filename}`, buffer, {
        access: "public",
        contentType: fileObj.type,
        addRandomSuffix: false,
      });
      return Response.json({ url: blob.url });
    } catch (e: any) {
      return new Response(`Blob upload failed: ${e.message}`, { status: 500 });
    }
  }

  // --- Dev: local disk ---
  try {
    const subdir = path.join(UPLOADS_DIR, "visits");
    await fs.mkdir(subdir, { recursive: true });
    const filePath = path.join(subdir, filename);
    await fs.writeFile(filePath, buffer);
    return Response.json({ url: `/api/uploads/visits/${filename}` });
  } catch (e: any) {
    return new Response(`Local upload failed: ${e.message}`, { status: 500 });
  }
}
