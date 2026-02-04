import { NextRequest } from "next/server";
import { ensureSchema, listPins, createPin } from "@/lib/store";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  await ensureSchema();
  const { searchParams } = new URL(req.url);
  const category = searchParams.get("category") || undefined;
  const pins = await listPins(category);
  return Response.json(pins, {
    headers: {
      "Cache-Control": "public, s-maxage=10, stale-while-revalidate=30"
    }
  });
}

export async function POST(req: NextRequest) {
  await ensureSchema();
  const body = await req.json().catch(() => ({}));
  const { title, description, lat, lng, category, imageUrl } = body ?? {};
  if (!title || !category || typeof lat !== "number" || typeof lng !== "number") {
    return new Response("Missing fields", { status: 400 });
  }
  const pin = await createPin({ title, description, lat, lng, category, imageUrl });
  return Response.json(pin);
}
