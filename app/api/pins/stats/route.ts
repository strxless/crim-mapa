// app/api/pins/stats/route.ts
import { NextResponse } from 'next/server';
import { listPins } from '@/lib/store';

export const dynamic = 'force-dynamic';

function isPostgresSelected() {
  if (process.env.DB_PROVIDER === 'postgres') return true;
  const hasVercelPg = !!(process.env.POSTGRES_URL || process.env.POSTGRES_PRISMA_URL);
  const isProd = process.env.VERCEL === '1' || process.env.NODE_ENV === 'production';
  return hasVercelPg && isProd;
}

export async function GET() {
  try {
    const pins = await listPins();

    // Use database aggregation for better performance with millions of visits
    let dailyVisits: Map<string, number> = new Map();
    let totalUpdates = 0;

    if (isPostgresSelected()) {
      const postgres = (await import('postgres')).default;
      const sql = postgres(process.env.POSTGRES_URL!, {
        max: 20,
        idle_timeout: 20,
        connect_timeout: 10,
      });

      // Aggregate visits by date directly in database - much faster!
      const visitsAgg = await sql`
        SELECT DATE(visited_at) as visit_date, COUNT(*) as count
        FROM visits
        GROUP BY DATE(visited_at)
        ORDER BY visit_date ASC
      `;
      
      visitsAgg.forEach((v: any) => {
        const date = new Date(v.visit_date).toISOString().split('T')[0];
        dailyVisits.set(date, Number(v.count));
      });
      
      // Get total count efficiently
      const countResult = await sql`SELECT COUNT(*) as total FROM visits`;
      totalUpdates = Number(countResult[0].total);

      await sql.end();
    } else {
      const { getSqlite } = await import("@/lib/sqlite");
      const db = await getSqlite();
      
      const visitsAgg = await db.execute(`
        SELECT DATE(visited_at) as visit_date, COUNT(*) as count
        FROM visits
        GROUP BY DATE(visited_at)
        ORDER BY visit_date ASC
      `);
      
      visitsAgg.rows.forEach((v: any) => {
        dailyVisits.set(String(v.visit_date), Number(v.count));
      });
      
      const countResult = await db.execute(`SELECT COUNT(*) as total FROM visits`);
      totalUpdates = Number(countResult.rows[0].total);
    }


    // Group pins by date
    const dailyStats = new Map<string, {
      count: number;
      cumulative: number;
      categories: Record<string, number>;
      updates: number;
    }>();

    const categoryCount: Record<string, number> = {};

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

    // Merge visit counts with daily stats
    dailyVisits.forEach((count, date) => {
      if (!dailyStats.has(date)) {
        dailyStats.set(date, { count: 0, cumulative: 0, categories: {}, updates: 0 });
      }
      dailyStats.get(date)!.updates = count;
    });

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

    return NextResponse.json(
      {
        daily: dailyArray,
        total: pins.length,
        categories: categoryCount,
        firstPin: sortedPins.length > 0 ? sortedPins[0].createdAt : null,
        lastPin: sortedPins.length > 0 ? sortedPins[sortedPins.length - 1].createdAt : null,
        totalUpdates
      },
      {
        headers: {
          "Cache-Control": "public, s-maxage=15, stale-while-revalidate=60"
        }
      }
    );
  } catch (error) {
    console.error('Error fetching stats:', error);
    return NextResponse.json({ error: 'Failed to fetch stats' }, { status: 500 });
  }
}
