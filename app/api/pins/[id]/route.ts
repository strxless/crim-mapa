import { NextRequest } from "next/server";
import { ensureSchema, getPinWithVisits, updatePin, deletePin } from "@/lib/store";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  await ensureSchema();
  const id = Number(params.id);
  if (!Number.isFinite(id)) return new Response("Bad id", { status: 400 });
  const result = await getPinWithVisits(id);
  if (!result) return new Response("Not found", { status: 404 });
  return Response.json(result);
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  await ensureSchema();
  const id = Number(params.id);
  if (!Number.isFinite(id)) return new Response("Bad id", { status: 400 });
  const body = await req.json().catch(() => ({}));
  const { title, description, category, imageUrl, expectedUpdatedAt } = body ?? {};
  if (!title || !category) return new Response("Missing fields", { status: 400 });
  try {
    const updated = await updatePin(id, { title, description, category, imageUrl, expectedUpdatedAt });
    if ((updated as any).conflict) {
      return Response.json({ error: "Conflict", serverUpdatedAt: (updated as any).serverUpdatedAt }, { status: 409 });
    }
    return Response.json(updated);
  } catch (e: any) {
    if (String(e.message || e) === "Not found") return new Response("Not found", { status: 404 });
    return new Response("Error", { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  await ensureSchema();
  const id = Number(params.id);
  if (!Number.isFinite(id)) return new Response("Bad id", { status: 400 });
  await deletePin(id);
  return new Response(null, { status: 204 });
}
