import { NextResponse } from 'next/server';
import {
  ensureSchema,
  getStreetworkStats,
  getAllStreetworkMonths,
  upsertStreetworkStat,
} from '@/lib/store';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    await ensureSchema();
    const stats = await getStreetworkStats();
    const months = await getAllStreetworkMonths();

    return NextResponse.json({ stats, months });
  } catch (error) {
    console.error('Error fetching streetwork stats:', error);
    return NextResponse.json({ error: 'Failed to fetch stats' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    await ensureSchema();
    const body = await request.json();
    const { workerName, month, interactions, newContacts, interventions } = body;

    if (!workerName || !month) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const stat = await upsertStreetworkStat({
      workerName,
      month,
      interactions: Number(interactions) || 0,
      newContacts: Number(newContacts) || 0,
      interventions: Number(interventions) || 0,
    });

    return NextResponse.json(stat);
  } catch (error) {
    console.error('Error updating streetwork stats:', error);
    return NextResponse.json({ error: 'Failed to update stats' }, { status: 500 });
  }
}
