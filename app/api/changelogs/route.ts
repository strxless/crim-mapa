import { NextResponse } from 'next/server';
import { getSession } from '@/app/actions/auth';
import postgres from 'postgres';
import Database from 'better-sqlite3';

const USE_SQLITE = process.env.USE_SQLITE === 'true';

let sqliteDb: Database.Database | null = null;

function getSQLiteDB() {
  if (!sqliteDb) {
    const dbPath = process.env.AUTH_DB_PATH || './data/auth.db';
    sqliteDb = new Database(dbPath);
  }
  return sqliteDb;
}

function getDB() {
  const url = process.env.POSTGRES_URL;
  if (!url) {
    throw new Error('POSTGRES_URL is not set');
  }
  return postgres(url, {
    max: 1,
    idle_timeout: 20,
    connect_timeout: 10,
  });
}

export async function GET() {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    let latestUpdate = null;
    let hasViewed = false;

    if (USE_SQLITE) {
      const db = getSQLiteDB();

      // Get the latest update
      const update = db.prepare(`
        SELECT * FROM app_updates 
        ORDER BY released_at DESC 
        LIMIT 1
      `).get() as any;

      if (update) {
        latestUpdate = {
          ...update,
          features: JSON.parse(update.features),
        };

        // Check if user has viewed it
        const viewed = db.prepare(`
          SELECT * FROM user_updates_viewed 
          WHERE user_id = ? AND update_id = ?
        `).get(session.userId, update.id);

        hasViewed = !!viewed;
      }
    } else {
      const sql = getDB();

      // Get the latest update
      const updates = await sql`
        SELECT * FROM app_updates 
        ORDER BY released_at DESC 
        LIMIT 1
      `;

      if (updates.length > 0) {
        const update = updates[0] as any;
        latestUpdate = {
          ...update,
          features: JSON.parse(update.features),
        };

        // Check if user has viewed it
        const viewedRecords = await sql`
          SELECT * FROM user_updates_viewed 
          WHERE user_id = ${session.userId} AND update_id = ${update.id}
        `;

        hasViewed = viewedRecords.length > 0;
      }

      await sql.end();
    }

    if (!latestUpdate) {
      return NextResponse.json({ update: null, hasViewed: true });
    }

    return NextResponse.json({ update: latestUpdate, hasViewed });
  } catch (error) {
    console.error('Error fetching changelog:', error);
    return NextResponse.json({ error: 'Failed to fetch changelog' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { updateId } = await request.json();

    if (!updateId) {
      return NextResponse.json({ error: 'Update ID is required' }, { status: 400 });
    }

    if (USE_SQLITE) {
      const db = getSQLiteDB();
      
      // Use INSERT OR IGNORE to prevent duplicates
      db.prepare(`
        INSERT OR IGNORE INTO user_updates_viewed (user_id, update_id) 
        VALUES (?, ?)
      `).run(session.userId, updateId);
    } else {
      const sql = getDB();

      await sql`
        INSERT INTO user_updates_viewed (user_id, update_id) 
        VALUES (${session.userId}, ${updateId})
        ON CONFLICT (user_id, update_id) DO NOTHING
      `;

      await sql.end();
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error marking changelog as viewed:', error);
    return NextResponse.json({ error: 'Failed to mark as viewed' }, { status: 500 });
  }
}
