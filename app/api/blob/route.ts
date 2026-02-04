import { NextRequest } from "next/server";
import { cookies } from "next/headers";
import { handleUpload } from "@vercel/blob/client";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function isAuthed() {
  const session = cookies().get("auth_session")?.value;
  return Boolean(session);
}

export async function POST(req: NextRequest) {
  if (!isAuthed()) {
    return new Response("Unauthorized", { status: 401 });
  }

  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    return new Response(
      "Blob uploads are not configured. Set BLOB_READ_WRITE_TOKEN.",
      { status: 501 }
    );
  }

  const body = await req.json().catch(() => null);
  if (!body) return new Response("Bad request", { status: 400 });

  try {
    const json = await handleUpload({
      request: req,
      body,
      onBeforeGenerateToken: async () => {
        return {
          allowedContentTypes: ["image/jpeg", "image/png", "image/webp"],
          // Keep images small (cost + bandwidth). Large mobile photos should be compressed client-side.
          maximumSizeInBytes: 3 * 1024 * 1024,
          // Browser caches are your friend.
          cacheControlMaxAge: 60 * 60 * 24 * 365,
          addRandomSuffix: true,
        };
      },
      // We store the returned URL in our DB from the client immediately after upload.
      // Nothing to do here for now.
      onUploadCompleted: async () => {},
    });

    return Response.json(json);
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Upload error";
    return new Response(message, { status: 500 });
  }
}
