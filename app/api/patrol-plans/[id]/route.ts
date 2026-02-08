import { NextResponse } from 'next/server';
import {
  ensureSchema,
  getPatrolPlan,
  updatePatrolPlan,
  deletePatrolPlan,
  addPinToPatrolPlan,
  removePinFromPatrolPlan,
  updatePatrolPlanPinsSortOrder,
  getPatrolPlanPins,
} from '@/lib/store';

export const dynamic = 'force-dynamic';

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    await ensureSchema();
    const id = Number(params.id);
    const plan = await getPatrolPlan(id);
    
    if (!plan) {
      return NextResponse.json({ error: 'Patrol plan not found' }, { status: 404 });
    }

    const pins = await getPatrolPlanPins(id);
    return NextResponse.json({ plan, pins });
  } catch (error) {
    console.error('Error fetching patrol plan:', error);
    return NextResponse.json({ error: 'Failed to fetch patrol plan' }, { status: 500 });
  }
}

export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    await ensureSchema();
    const id = Number(params.id);
    const body = await request.json();
    const { name, date } = body;

    if (!name || !date) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const plan = await updatePatrolPlan(id, name, date);
    return NextResponse.json(plan);
  } catch (error) {
    console.error('Error updating patrol plan:', error);
    return NextResponse.json({ error: 'Failed to update patrol plan' }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    await ensureSchema();
    const id = Number(params.id);
    await deletePatrolPlan(id);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting patrol plan:', error);
    return NextResponse.json({ error: 'Failed to delete patrol plan' }, { status: 500 });
  }
}
