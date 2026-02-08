import { NextResponse } from 'next/server';
import {
  ensureSchema,
  getAllPatrolPlans,
  createPatrolPlan,
  getPatrolPlanPins,
} from '@/lib/store';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    await ensureSchema();
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (id) {
      // Get specific patrol plan with its pins
      const pins = await getPatrolPlanPins(Number(id));
      return NextResponse.json({ pins });
    }

    // Get all patrol plans
    const plans = await getAllPatrolPlans();
    return NextResponse.json({ plans });
  } catch (error) {
    console.error('Error fetching patrol plans:', error);
    return NextResponse.json({ error: 'Failed to fetch patrol plans' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    await ensureSchema();
    const body = await request.json();
    const { name, date } = body;

    if (!name || !date) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const plan = await createPatrolPlan(name, date);
    return NextResponse.json(plan);
  } catch (error) {
    console.error('Error creating patrol plan:', error);
    return NextResponse.json({ error: 'Failed to create patrol plan' }, { status: 500 });
  }
}
