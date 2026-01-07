// app/api/pins/export/route.ts
import { NextResponse } from "next/server";
import { ensureSchema, listPins, getPinWithVisits } from "@/lib/store";

export async function GET() {
  try {
    await ensureSchema();
    
    // Get all pins
    const pins = await listPins();
    
    // Get visits for each pin
    const pinsWithVisits = await Promise.all(
      pins.map(async (pin) => {
        const data = await getPinWithVisits(pin.id);
        return {
          ...pin,
          visits: data?.visits || []
        };
      })
    );

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
