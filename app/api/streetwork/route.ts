import { NextResponse } from 'next/server';
import {
  ensureSchema,
  getStreetworkStats,
  getAllStreetworkMonths,
  upsertStreetworkStat,
  listPins,
} from '@/lib/store';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    await ensureSchema();
    const { searchParams } = new URL(request.url);
    const getPins = searchParams.get('pins');

    // If pins parameter is present, return all pins for autocomplete
    if (getPins === 'true') {
      const pins = await listPins();
      return NextResponse.json({ pins });
    }

    // Otherwise return stats as before
    const stats = await getStreetworkStats();
    const months = await getAllStreetworkMonths();

    return NextResponse.json({ stats, months });
  } catch (error) {
    console.error('Error fetching streetwork data:', error);
    return NextResponse.json({ error: 'Failed to fetch data' }, { status: 500 });
  }
}
export async function POST(request: Request) {
  try {
    await ensureSchema();
    const body = await request.json();
    const { workerName, month, interactions, newContacts, interventions, avatar, bgColor } = body;

    if (!workerName || !month) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const stat = await upsertStreetworkStat({
      workerName,
      month,
      interactions: Number(interactions) || 0,
      newContacts: Number(newContacts) || 0,
      interventions: Number(interventions) || 0,
      avatar: avatar || null,
      bgColor: bgColor || null,
    });

    return NextResponse.json(stat);
  } catch (error) {
    console.error('Error updating streetwork stats:', error);
    return NextResponse.json({ error: 'Failed to update stats' }, { status: 500 });
  }
}
