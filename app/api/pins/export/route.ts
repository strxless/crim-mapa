// app/api/pins/export/route.ts
import { NextResponse } from "next/server";
import { ensureSchema, getAllPinsWithVisits } from "@/lib/store";

export const maxDuration = 60; // 60 seconds timeout

export async function GET() {
  try {
    await ensureSchema();
    const pinsWithVisits = await getAllPinsWithVisits();
    
    return NextResponse.json({
      pins: pinsWithVisits,
      exportedAt: new Date().toISOString()
    });
  } catch (error) {
    console.error("Export error:", error);
    return NextResponse.json(
      { error: "Failed to export data" },
      { status: 500 }
    );
  }
}
