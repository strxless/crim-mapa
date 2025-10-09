import { NextRequest } from "next/server";
import { ensureSchema, listCategories, createCategory } from "@/lib/store";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  await ensureSchema();
  const cats = await listCategories();
  return Response.json(cats, { headers: { "Cache-Control": "no-store" } });
}

export async function POST(req: NextRequest) {
  await ensureSchema();
  const body = await req.json().catch(() => ({}));
  const { name, color } = body ?? {};
  if (!name || !color) return new Response("Missing", { status: 400 });
  const cat = await createCategory(String(name), String(color));
  return Response.json(cat);
}
