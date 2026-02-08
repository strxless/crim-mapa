import { NextResponse } from 'next/server';
import {
  ensureSchema,
  addPinToPatrolPlan,
  removePinFromPatrolPlan,
  updatePatrolPlanPinsSortOrder,
} from '@/lib/store';

export const dynamic = 'force-dynamic';

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    await ensureSchema();
    const patrolPlanId = Number(params.id);
    const body = await request.json();
    const { pinId, sortOrder } = body;

    if (!pinId || sortOrder === undefined) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const patrolPlanPin = await addPinToPatrolPlan(patrolPlanId, Number(pinId), Number(sortOrder));
    return NextResponse.json(patrolPlanPin);
  } catch (error) {
    console.error('Error adding pin to patrol plan:', error);
    return NextResponse.json({ error: 'Failed to add pin to patrol plan' }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    await ensureSchema();
    const { searchParams } = new URL(request.url);
    const pinLinkId = searchParams.get('pinLinkId');

    if (!pinLinkId) {
      return NextResponse.json({ error: 'Missing pinLinkId parameter' }, { status: 400 });
    }

    await removePinFromPatrolPlan(Number(pinLinkId));
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error removing pin from patrol plan:', error);
    return NextResponse.json({ error: 'Failed to remove pin from patrol plan' }, { status: 500 });
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    await ensureSchema();
    const body = await request.json();
    const { updates } = body;

    if (!updates || !Array.isArray(updates)) {
      return NextResponse.json({ error: 'Missing or invalid updates array' }, { status: 400 });
    }

    await updatePatrolPlanPinsSortOrder(updates);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error updating pin sort order:', error);
    return NextResponse.json({ error: 'Failed to update pin sort order' }, { status: 500 });
  }
}
