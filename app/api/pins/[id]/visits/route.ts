import { NextRequest } from "next/server";
import { ensureSchema, addVisit, updateVisit } from "@/lib/store";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  await ensureSchema();
  const pinId = Number(params.id);
  if (!Number.isFinite(pinId)) return new Response("Bad id", { status: 400 });
  const body = await req.json().catch(() => ({}));
  const { name, note, imageUrl } = body ?? {};
  if (!name) return new Response("Missing name", { status: 400 });
  try {
    const visit = await addVisit(pinId, { name, note, imageUrl });
    return Response.json(visit);
  } catch (e: any) {
    if (String(e.message || e) === "Not found") return new Response("Not found", { status: 404 });
    return new Response("Error", { status: 500 });
  }
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  await ensureSchema();
  const pinId = Number(params.id);
  if (!Number.isFinite(pinId)) return new Response("Bad id", { status: 400 });
  const body = await req.json().catch(() => ({}));
  const { visitId, name, note } = body ?? {};
  if (!visitId || !Number.isFinite(Number(visitId))) return new Response("Missing visitId", { status: 400 });
  if (!name?.trim()) return new Response("Missing name", { status: 400 });
  try {
    const visit = await updateVisit(Number(visitId), { name: name.trim(), note: note ?? null });
    return Response.json(visit);
  } catch (e: any) {
    if (String(e.message || e) === "Not found") return new Response("Not found", { status: 404 });
    return new Response("Error", { status: 500 });
  }
}
