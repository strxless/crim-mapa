'use client'
// app/api/pins/stats/route.ts
import { NextResponse } from 'next/server';
import { listPins } from '@/lib/store';
import postgres from 'postgres';

export const dynamic = 'force-dynamic';

const sql = postgres(process.env.POSTGRES_URL!, {
    max: 1,
    idle_timeout: 20,
    connect_timeout: 10,
});

function isPostgresSelected() {
    if (process.env.DB_PROVIDER === 'postgres') return true;
    const hasVercelPg = !!(process.env.POSTGRES_URL || process.env.POSTGRES_PRISMA_URL);
    const isProd = process.env.VERCEL === '1' || process.env.NODE_ENV === 'production';
    return hasVercelPg && isProd;
}

export async function GET() {
    try {
        const pins = await listPins();

        // Get all visits
        let allVisits: Array<{ pinId: number; visitedAt: string }> = [];

        if (isPostgresSelected()) {
            const visitsResult = await sql`SELECT pin_id, visited_at FROM visits ORDER BY visited_at ASC`;
            allVisits = visitsResult.map((v: any) => ({
                pinId: Number(v.pin_id),
                visitedAt: new Date(v.visited_at).toISOString()
            }));
        } else {
            const { getSqlite } = await import("@/lib/sqlite");
            const db = await getSqlite();
            const result = await db.execute(`SELECT pin_id, visited_at FROM visits ORDER BY datetime(visited_at) ASC`);
            allVisits = result.rows.map((v: any) => ({
                pinId: Number(v.pin_id),
                visitedAt: String(v.visited_at)
            }));
        }

        // Group pins by date
        const dailyStats = new Map<string, {
            count: number;
            cumulative: number;
            categories: Record<string, number>;
            updates: number;
        }>();

        const categoryCount: Record<string, number> = {};
        let totalUpdates = allVisits.length;

        // Sort pins by creation date
        const sortedPins = [...pins].sort((a, b) =>
            new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
        );

        // Process pins
        for (const pin of sortedPins) {
            const date = new Date(pin.createdAt).toISOString().split('T')[0];

            if (!dailyStats.has(date)) {
                dailyStats.set(date, { count: 0, cumulative: 0, categories: {}, updates: 0 });
            }

            const dayData = dailyStats.get(date)!;
            dayData.count++;

            categoryCount[pin.category] = (categoryCount[pin.category] || 0) + 1;
            dayData.categories[pin.category] = (dayData.categories[pin.category] || 0) + 1;
        }

        // Process visits
        for (const visit of allVisits) {
            const date = new Date(visit.visitedAt).toISOString().split('T')[0];

            if (!dailyStats.has(date)) {
                dailyStats.set(date, { count: 0, cumulative: 0, categories: {}, updates: 0 });
            }

            const dayData = dailyStats.get(date)!;
            dayData.updates++;
        }

        // Calculate cumulative counts
        let cumulative = 0;
        const dailyArray = Array.from(dailyStats.entries())
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([date, data]) => {
                cumulative += data.count;
                return {
                    date,
                    count: data.count,
                    cumulative,
                    categories: data.categories,
                    updates: data.updates
                };
            });

        return NextResponse.json({
            daily: dailyArray,
            total: pins.length,
            categories: categoryCount,
            firstPin: sortedPins.length > 0 ? sortedPins[0].createdAt : null,
            lastPin: sortedPins.length > 0 ? sortedPins[sortedPins.length - 1].createdAt : null,
            totalUpdates
        });
    } catch (error) {
        console.error('Error fetching stats:', error);
        return NextResponse.json({ error: 'Failed to fetch stats' }, { status: 500 });
    }
}
