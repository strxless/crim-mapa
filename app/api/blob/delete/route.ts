import { NextRequest } from "next/server";
import { cookies } from "next/headers";
import { del } from "@vercel/blob";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const session = cookies().get("auth_session")?.value;
  if (!session) {
    return new Response("Unauthorized", { status: 401 });
  }

  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    return new Response(
      "Blob deletes are not configured. Set BLOB_READ_WRITE_TOKEN.",
      { status: 501 }
    );
  }

  const body = await req.json().catch(() => ({}));
  const url = body?.url;
  if (!url || typeof url !== "string") {
    return new Response("Missing url", { status: 400 });
  }

  try {
    await del(url);
    return Response.json({ ok: true });
  } catch {
    // Best-effort cleanup; don't leak details.
    return new Response("Delete failed", { status: 500 });
  }
}
