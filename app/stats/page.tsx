export const dynamic = 'force-dynamic';
export const revalidate = 0;

import { listPins, ensureSchema } from '@/lib/store';
import StatsClient from './StatsClient';

async function getAllVisits() {
    const isPostgresSelected = () => {
        if (process.env.DB_PROVIDER === 'postgres') return true;
        const hasVercelPg = !!(process.env.POSTGRES_URL || process.env.POSTGRES_PRISMA_URL);
        const isProd = process.env.VERCEL === '1' || process.env.NODE_ENV === 'production';
        return hasVercelPg && isProd;
    };

    if (isPostgresSelected()) {
        const postgres = (await import('postgres')).default;
        const sql = postgres(process.env.POSTGRES_URL!, {
            max: 1,
            idle_timeout: 20,
            connect_timeout: 10,
        });

        const visitsResult = await sql`SELECT pin_id, visited_at FROM visits ORDER BY visited_at ASC`;
        const visits = visitsResult.map((v: any) => ({
            pinId: Number(v.pin_id),
            visitedAt: new Date(v.visited_at).toISOString()
        }));

        await sql.end();
        return visits;
    } else {
        const { getSqlite } = await import("@/lib/sqlite");
        const db = await getSqlite();
        const result = await db.execute(`SELECT pin_id, visited_at FROM visits ORDER BY datetime(visited_at) ASC`);
        return result.rows.map((v: any) => ({
            pinId: Number(v.pin_id),
            visitedAt: String(v.visited_at)
        }));
    }
}

export default async function StatsPage() {
    await ensureSchema();
    const pins = await listPins();
    const visits = await getAllVisits();

    // Grupowanie pinów po dniach
    const dailyMap: Record<string, { date: string; count: number; categories: Record<string, number>; updates: number }> = {};

    for (const pin of pins) {
        const date = new Date(pin.createdAt).toISOString().split('T')[0];
        if (!dailyMap[date]) {
            dailyMap[date] = { date, count: 0, categories: {}, updates: 0 };
        }
        dailyMap[date].count++;
        dailyMap[date].categories[pin.category] = (dailyMap[date].categories[pin.category] || 0) + 1;
    }

    // Grupowanie wizyt po dniach
    for (const visit of visits) {
        const date = new Date(visit.visitedAt).toISOString().split('T')[0];
        if (!dailyMap[date]) {
            dailyMap[date] = { date, count: 0, categories: {}, updates: 0 };
        }
        dailyMap[date].updates++;
    }

    // Sortowanie po datach
    const sortedStats = Object.values(dailyMap).sort((a, b) =>
        a.date.localeCompare(b.date)
    );

    // Kumulatywne liczenie
    let cumulative = 0;
    const statsWithCumulative = sortedStats.map(stat => {
        cumulative += stat.count;
        return {
            ...stat,
            cumulative
        };
    });

    // Statystyki ogólne - kategorii
    const categoriesCount: Record<string, number> = {};
    for (const pin of pins) {
        categoriesCount[pin.category] = (categoriesCount[pin.category] || 0) + 1;
    }

    const stats = {
        daily: statsWithCumulative,
        total: pins.length,
        categories: categoriesCount,
        firstPin: pins.length > 0 ? pins[pins.length - 1].createdAt : null,
        lastPin: pins.length > 0 ? pins[0].createdAt : null,
        totalUpdates: visits.length
    };

    return <StatsClient stats={stats} />;
}
