import postgres from 'postgres';

console.log('Database provider check:', {
  USE_SQLITE: process.env.USE_SQLITE,
  HAS_POSTGRES_URL: !!process.env.POSTGRES_URL,
  WILL_USE: process.env.USE_SQLITE === 'true' ? 'SQLite' : 'PostgreSQL',
});

const sql = postgres(process.env.POSTGRES_URL!, {
  max: 1,
  idle_timeout: 20,
  connect_timeout: 10,
  onnotice: () => {},
});

// - If process.env.DB_PROVIDER === 'postgres' or Vercel Postgres env vars exist -> use Postgres
// - Otherwise, use SQLite at SQLITE_PATH (default ./data.sqlite)
//
export async function getAllPinsWithVisits(): Promise<Array<DBPin & { visits: DBVisit[] }>> {
  if (isPostgresSelected()) {
    // Single query for all pins
    const pinsResult = await sql`SELECT * FROM pins ORDER BY updated_at DESC`;

    // Single query for all visits
    const visitsResult = await sql`SELECT * FROM visits ORDER BY pin_id, visited_at DESC`;

    // Group visits by pin_id in memory (fast)
    const visitsByPin = new Map<number, DBVisit[]>();
    visitsResult.forEach((v: any) => {
      const pinId = Number(v.pin_id);
      if (!visitsByPin.has(pinId)) {
        visitsByPin.set(pinId, []);
      }
      visitsByPin.get(pinId)!.push({
        id: Number(v.id),
        pinId: Number(v.pin_id),
        name: v.name,
        note: v.note ?? null,
        imageUrl: v.image_url ?? null,
        visitedAt: new Date(v.visited_at).toISOString?.() ?? String(v.visited_at),
      });
    });

    // Combine
    return pinsResult.map((p: any) => ({
      id: Number(p.id),
      title: p.title,
      description: p.description ?? null,
      lat: Number(p.lat),
      lng: Number(p.lng),
      category: p.category,
      imageUrl: p.image_url ?? null,
      createdAt: new Date(p.created_at).toISOString?.() ?? String(p.created_at),
      updatedAt: new Date(p.updated_at).toISOString?.() ?? String(p.updated_at),
      version: Number(p.version),
      visitsCount: visitsByPin.get(Number(p.id))?.length || 0,
      visits: visitsByPin.get(Number(p.id)) || [],
    }));
  } else {
    const { getSqlite } = await import('./sqlite');
    const db = await getSqlite();
    const pinsResult = await db.execute(`SELECT * FROM pins ORDER BY datetime(updated_at) DESC`);
    const visitsResult = await db.execute(
      `SELECT * FROM visits ORDER BY pin_id, datetime(visited_at) DESC`
    );

    const visitsByPin = new Map<number, DBVisit[]>();
    visitsResult.rows.forEach((v: any) => {
      const pinId = Number(v.pin_id);
      if (!visitsByPin.has(pinId)) {
        visitsByPin.set(pinId, []);
      }
      visitsByPin.get(pinId)!.push({
        id: Number(v.id),
        pinId: Number(v.pin_id),
        name: String(v.name),
        note: v.note ? String(v.note) : null,
        imageUrl: v.image_url ? String(v.image_url) : null,
        visitedAt: String(v.visited_at),
      });
    });

    return pinsResult.rows.map((p: any) => ({
      id: Number(p.id),
      title: String(p.title),
      description: p.description ? String(p.description) : null,
      lat: Number(p.lat),
      lng: Number(p.lng),
      category: String(p.category),
      imageUrl: p.image_url ? String(p.image_url) : null,
      createdAt: String(p.created_at),
      updatedAt: String(p.updated_at),
      version: Number(p.version),
      visitsCount: visitsByPin.get(Number(p.id))?.length || 0,
      visits: visitsByPin.get(Number(p.id)) || [],
    }));
  }
}

export type DBPin = {
  id: number;
  title: string;
  description: string | null;
  lat: number;
  lng: number;
  category: string;
  imageUrl?: string | null;
  createdAt: string;
  updatedAt: string;
  version: number;
  visitsCount?: number;
};

export type DBVisit = {
  id: number;
  pinId: number;
  name: string;
  note: string | null;
  imageUrl?: string | null;
  visitedAt: string;
};

function isPostgresSelected() {
  if (process.env.DB_PROVIDER === 'postgres') return true;
  // Vercel automatically injects these if a Postgres db is attached
  const hasVercelPg = !!(process.env.POSTGRES_URL || process.env.POSTGRES_PRISMA_URL);
  if (hasVercelPg) return true;
  return false;
}

let initOnce: Promise<void> | null = null;
let schemaInitialized = false;

async function ensurePgSchema() {
  await sql`CREATE TABLE IF NOT EXISTS pins (
    id SERIAL PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT,
    lat DOUBLE PRECISION NOT NULL,
    lng DOUBLE PRECISION NOT NULL,
    category TEXT NOT NULL,
    image_url TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    version INTEGER NOT NULL DEFAULT 1
  );`;
  await sql`ALTER TABLE pins ADD COLUMN IF NOT EXISTS image_url TEXT;`;
  await sql`CREATE TABLE IF NOT EXISTS visits (
    id SERIAL PRIMARY KEY,
    pin_id INTEGER NOT NULL REFERENCES pins(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    note TEXT,
    image_url TEXT,
    visited_at TIMESTAMPTZ NOT NULL DEFAULT now()
  );`;
  await sql`ALTER TABLE visits ADD COLUMN IF NOT EXISTS image_url TEXT;`;
  await sql`CREATE INDEX IF NOT EXISTS idx_visits_pin_id ON visits(pin_id);`;
  await sql`CREATE TABLE IF NOT EXISTS categories (
    name TEXT PRIMARY KEY,
    color TEXT NOT NULL
  );`;
}

async function ensureSqliteSchema() {
  const { getSqlite } = await import('./sqlite');
  const db = await getSqlite();

  await db.batch(
    [
      `CREATE TABLE IF NOT EXISTS pins (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      description TEXT,
      lat REAL NOT NULL,
      lng REAL NOT NULL,
      category TEXT NOT NULL,
      image_url TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      version INTEGER NOT NULL DEFAULT 1
    )`,
      `CREATE TABLE IF NOT EXISTS visits (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      pin_id INTEGER NOT NULL REFERENCES pins(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      note TEXT,
      image_url TEXT,
      visited_at TEXT NOT NULL DEFAULT (datetime('now'))
    )`,
      `CREATE INDEX IF NOT EXISTS idx_visits_pin_id ON visits(pin_id)`,
      `CREATE TABLE IF NOT EXISTS categories (
      name TEXT PRIMARY KEY,
      color TEXT NOT NULL
    )`,
    ],
    'write'
  );

  // Try to add columns if they don't exist (ignore errors)
  try {
    await db.execute(`ALTER TABLE pins ADD COLUMN image_url TEXT`);
  } catch {}
  try {
    await db.execute(`ALTER TABLE visits ADD COLUMN image_url TEXT`);
  } catch {}
}

export async function ensureSchema() {
  if (schemaInitialized) return;

  if (!initOnce) {
    initOnce = (async () => {
      if (isPostgresSelected()) {
        await ensurePgSchema();
        await ensureStreetworkSchema();
      } else {
        await ensureSqliteSchema();
        await ensureStreetworkSchema();
      }
      schemaInitialized = true;
    })();
  }
  await initOnce;
}

// Query helpers abstracted
export async function listPins(category?: string): Promise<DBPin[]> {
  if (isPostgresSelected()) {
    const rows = category
      ? await sql`
          SELECT p.id, p.title, p.description, p.lat, p.lng, p.category, p.image_url,
                 p.created_at, p.updated_at, p.version,
                 COALESCE(vc.cnt, 0)::int AS visits_count
          FROM pins p
          LEFT JOIN (
            SELECT pin_id, COUNT(*)::int AS cnt
            FROM visits
            GROUP BY pin_id
          ) vc ON vc.pin_id = p.id
          WHERE p.category = ${category}
          ORDER BY p.updated_at DESC, p.id DESC
        `
      : await sql`
          SELECT p.id, p.title, p.description, p.lat, p.lng, p.category, p.image_url,
                 p.created_at, p.updated_at, p.version,
                 COALESCE(vc.cnt, 0)::int AS visits_count
          FROM pins p
          LEFT JOIN (
            SELECT pin_id, COUNT(*)::int AS cnt
            FROM visits
            GROUP BY pin_id
          ) vc ON vc.pin_id = p.id
          ORDER BY p.updated_at DESC, p.id DESC
        `;
    return rows.map((r: any) => ({
      id: Number(r.id),
      title: r.title,
      description: r.description ?? null,
      lat: Number(r.lat),
      lng: Number(r.lng),
      category: r.category,
      imageUrl: r.image_url ?? null,
      createdAt: new Date(r.created_at).toISOString?.() ?? String(r.created_at),
      updatedAt: new Date(r.updated_at).toISOString?.() ?? String(r.updated_at),
      version: Number(r.version),
      visitsCount: Number(r.visits_count ?? 0),
    }));
  } else {
    const { getSqlite } = await import('./sqlite');
    const db = await getSqlite();
    const result = await db.execute({
      sql: `SELECT p.id, p.title, p.description, p.lat, p.lng, p.category, p.image_url, p.created_at, p.updated_at, p.version,
              (SELECT COUNT(1) FROM visits v WHERE v.pin_id = p.id) AS visits_count
       FROM pins p
       ${category ? 'WHERE p.category = ?' : ''}
       ORDER BY datetime(p.updated_at) DESC, p.id DESC`,
      args: category ? [category] : [],
    });
    return result.rows.map((r: any) => ({
      id: Number(r.id),
      title: String(r.title),
      description: r.description ? String(r.description) : null,
      lat: Number(r.lat),
      lng: Number(r.lng),
      category: String(r.category),
      imageUrl: r.image_url ? String(r.image_url) : null,
      createdAt: String(r.created_at),
      updatedAt: String(r.updated_at),
      version: Number(r.version),
      visitsCount: Number(r.visits_count ?? 0),
    }));
  }
}

export async function createPin(input: {
  title: string;
  description?: string | null;
  lat: number;
  lng: number;
  category: string;
  imageUrl?: string | null;
}): Promise<DBPin> {
  const { title, description, lat, lng, category, imageUrl } = input;
  if (isPostgresSelected()) {
    const rows = await sql`
      INSERT INTO pins (title, description, lat, lng, category, image_url)
      VALUES (${title}, ${description ?? null}, ${lat}, ${lng}, ${category}, ${imageUrl ?? null})
      RETURNING id, title, description, lat, lng, category, image_url, created_at, updated_at, version
    `;
    const r: any = rows[0];
    return {
      id: Number(r.id),
      title: r.title,
      description: r.description ?? null,
      lat: Number(r.lat),
      lng: Number(r.lng),
      category: r.category,
      imageUrl: r.image_url ?? null,
      createdAt: new Date(r.created_at).toISOString?.() ?? String(r.created_at),
      updatedAt: new Date(r.updated_at).toISOString?.() ?? String(r.updated_at),
      version: Number(r.version),
      visitsCount: 0,
    };
  } else {
    const { getSqlite } = await import('./sqlite');
    const db = await getSqlite();
    const result = await db.execute({
      sql: `INSERT INTO pins (title, description, lat, lng, category, image_url) VALUES (?, ?, ?, ?, ?, ?) RETURNING id, title, description, lat, lng, category, image_url, created_at, updated_at, version`,
      args: [title, description ?? null, lat, lng, category, imageUrl ?? null],
    });
    const row: any = result.rows[0];
    return {
      id: Number(row.id),
      title: String(row.title),
      description: row.description ? String(row.description) : null,
      lat: Number(row.lat),
      lng: Number(row.lng),
      category: String(row.category),
      imageUrl: row.image_url ? String(row.image_url) : null,
      createdAt: String(row.created_at),
      updatedAt: String(row.updated_at),
      version: Number(row.version),
      visitsCount: 0,
    };
  }
}

export async function getPinWithVisits(
  id: number
): Promise<{ pin: DBPin; visits: DBVisit[] } | null> {
  if (isPostgresSelected()) {
    const pinRes = await sql`SELECT * FROM pins WHERE id = ${id}`;
    if (pinRes.length === 0) return null;
    const p: any = pinRes[0];
    const visitsRes =
      await sql`SELECT id, pin_id, name, note, image_url, visited_at FROM visits WHERE pin_id = ${id} ORDER BY visited_at DESC, id DESC LIMIT 50`;
    return {
      pin: {
        id: Number(p.id),
        title: p.title,
        description: p.description ?? null,
        lat: Number(p.lat),
        lng: Number(p.lng),
        category: p.category,
        imageUrl: p.image_url ?? null,
        createdAt: new Date(p.created_at).toISOString?.() ?? String(p.created_at),
        updatedAt: new Date(p.updated_at).toISOString?.() ?? String(p.updated_at),
        version: Number(p.version),
      },
      visits: visitsRes.map((v: any) => ({
        id: Number(v.id),
        pinId: Number(v.pin_id),
        name: v.name,
        note: v.note ?? null,
        imageUrl: v.image_url ?? null,
        visitedAt: new Date(v.visited_at).toISOString?.() ?? String(v.visited_at),
      })),
    };
  } else {
    const { getSqlite } = await import('./sqlite');
    const db = await getSqlite();
    const pinResult = await db.execute({
      sql: `SELECT * FROM pins WHERE id = ?`,
      args: [id],
    });
    if (pinResult.rows.length === 0) return null;
    const p: any = pinResult.rows[0];

    const visitsResult = await db.execute({
      sql: `SELECT id, pin_id, name, note, image_url, visited_at FROM visits WHERE pin_id = ? ORDER BY datetime(visited_at) DESC, id DESC LIMIT 50`,
      args: [id],
    });

    return {
      pin: {
        id: Number(p.id),
        title: String(p.title),
        description: p.description ? String(p.description) : null,
        lat: Number(p.lat),
        lng: Number(p.lng),
        category: String(p.category),
        imageUrl: p.image_url ? String(p.image_url) : null,
        createdAt: String(p.created_at),
        updatedAt: String(p.updated_at),
        version: Number(p.version),
      },
      visits: visitsResult.rows.map((v: any) => ({
        id: Number(v.id),
        pinId: Number(v.pin_id),
        name: String(v.name),
        note: v.note ? String(v.note) : null,
        imageUrl: v.image_url ? String(v.image_url) : null,
        visitedAt: String(v.visited_at),
      })),
    };
  }
}

export async function updatePin(
  id: number,
  input: {
    title: string;
    description?: string | null;
    category: string;
    imageUrl?: string | null;
    expectedUpdatedAt?: string | null;
  }
): Promise<DBPin | { conflict: true; serverUpdatedAt: string }> {
  const { title, description, category, imageUrl, expectedUpdatedAt } = input;
  if (isPostgresSelected()) {
    const current = await sql`SELECT updated_at FROM pins WHERE id = ${id}`;
    if (current.length === 0) throw new Error('Not found');
    const serverUpdatedAt =
      new Date(current[0].updated_at).toISOString?.() ?? String(current[0].updated_at);
    if (expectedUpdatedAt && expectedUpdatedAt !== serverUpdatedAt) {
      return { conflict: true as const, serverUpdatedAt };
    }
    const res = await sql`
      UPDATE pins SET title = ${title}, description = ${description ?? null}, category = ${category}, image_url = ${imageUrl ?? null},
                      updated_at = now(), version = version + 1
      WHERE id = ${id}
      RETURNING id, title, description, lat, lng, category, image_url, created_at, updated_at, version
    `;
    const r: any = res[0];
    return {
      id: Number(r.id),
      title: r.title,
      description: r.description ?? null,
      lat: Number(r.lat),
      lng: Number(r.lng),
      category: r.category,
      imageUrl: r.image_url ?? null,
      createdAt: new Date(r.created_at).toISOString?.() ?? String(r.created_at),
      updatedAt: new Date(r.updated_at).toISOString?.() ?? String(r.updated_at),
      version: Number(r.version),
    };
  } else {
    const { getSqlite } = await import('./sqlite');
    const db = await getSqlite();
    const currentResult = await db.execute({
      sql: `SELECT updated_at FROM pins WHERE id = ?`,
      args: [id],
    });
    if (currentResult.rows.length === 0) throw new Error('Not found');
    const current = currentResult.rows[0];
    const serverUpdatedAt = String(current.updated_at);
    if (expectedUpdatedAt && expectedUpdatedAt !== serverUpdatedAt) {
      return { conflict: true as const, serverUpdatedAt };
    }
    await db.execute({
      sql: `UPDATE pins SET title = ?, description = ?, category = ?, image_url = ?, updated_at = datetime('now'), version = version + 1 WHERE id = ?`,
      args: [title, description ?? null, category, imageUrl ?? null, id],
    });
    const result = await db.execute({
      sql: `SELECT id, title, description, lat, lng, category, image_url, created_at, updated_at, version FROM pins WHERE id = ?`,
      args: [id],
    });
    const r: any = result.rows[0];
    return {
      id: Number(r.id),
      title: String(r.title),
      description: r.description ? String(r.description) : null,
      lat: Number(r.lat),
      lng: Number(r.lng),
      category: String(r.category),
      imageUrl: r.image_url ? String(r.image_url) : null,
      createdAt: String(r.created_at),
      updatedAt: String(r.updated_at),
      version: Number(r.version),
    };
  }
}

export async function deletePin(id: number): Promise<void> {
  if (isPostgresSelected()) {
    await sql`DELETE FROM pins WHERE id = ${id}`;
  } else {
    const { getSqlite } = await import('./sqlite');
    const db = await getSqlite();
    await db.execute({
      sql: `DELETE FROM pins WHERE id = ?`,
      args: [id],
    });
  }
}

export type Category = { name: string; color: string };

export async function listCategories(): Promise<Category[]> {
  if (isPostgresSelected()) {
    const rows = await sql`SELECT name, color FROM categories ORDER BY name ASC`;
    return rows.map((r: any) => ({ name: r.name as string, color: r.color as string }));
  } else {
    const { getSqlite } = await import('./sqlite');
    const db = await getSqlite();
    const result = await db.execute(`SELECT name, color FROM categories ORDER BY name ASC`);
    return result.rows.map((r: any) => ({
      name: String(r.name),
      color: String(r.color),
    }));
  }
}

export async function createCategory(name: string, color: string): Promise<Category> {
  if (isPostgresSelected()) {
    await sql`INSERT INTO categories(name, color) VALUES (${name}, ${color}) ON CONFLICT (name) DO UPDATE SET color = EXCLUDED.color`;
    return { name, color };
  } else {
    const { getSqlite } = await import('./sqlite');
    const db = await getSqlite();
    await db.execute({
      sql: `INSERT INTO categories(name, color) VALUES (?, ?) ON CONFLICT(name) DO UPDATE SET color = excluded.color`,
      args: [name, color],
    });
    return { name, color };
  }
}

export async function addVisit(
  pinId: number,
  input: { name: string; note?: string | null; imageUrl?: string | null }
): Promise<DBVisit> {
  const { name, note, imageUrl } = input;
  if (isPostgresSelected()) {
    const exists = await sql`SELECT id FROM pins WHERE id = ${pinId}`;
    if (exists.length === 0) throw new Error('Not found');
    const res =
      await sql`INSERT INTO visits (pin_id, name, note, image_url) VALUES (${pinId}, ${name}, ${note ?? null}, ${imageUrl ?? null}) RETURNING id, pin_id, name, note, image_url, visited_at`;
    await sql`UPDATE pins SET updated_at = now(), version = version + 1 WHERE id = ${pinId}`;
    const v: any = res[0];
    return {
      id: Number(v.id),
      pinId: Number(v.pin_id),
      name: v.name,
      note: v.note ?? null,
      imageUrl: v.image_url ?? null,
      visitedAt: new Date(v.visited_at).toISOString?.() ?? String(v.visited_at),
    };
  } else {
    const { getSqlite } = await import('./sqlite');
    const db = await getSqlite();
    const existsResult = await db.execute({
      sql: `SELECT id FROM pins WHERE id = ?`,
      args: [pinId],
    });
    if (existsResult.rows.length === 0) throw new Error('Not found');

    const insertResult = await db.execute({
      sql: `INSERT INTO visits (pin_id, name, note, image_url) VALUES (?, ?, ?, ?) RETURNING id, pin_id, name, note, image_url, visited_at`,
      args: [pinId, name, note ?? null, imageUrl ?? null],
    });

    await db.execute({
      sql: `UPDATE pins SET updated_at = datetime('now'), version = version + 1 WHERE id = ?`,
      args: [pinId],
    });

    const v: any = insertResult.rows[0];
    return {
      id: Number(v.id),
      pinId: Number(v.pin_id),
      name: String(v.name),
      note: v.note ? String(v.note) : null,
      imageUrl: v.image_url ? String(v.image_url) : null,
      visitedAt: String(v.visited_at),
    };
  }
}

// ===== STREETWORK STATS =====

export type StreetworkStat = {
  id: number;
  workerName: string;
  month: string; // Format: YYYY-MM
  interactions: number;
  newContacts: number;
  interventions: number;
  createdAt: string;
  updatedAt: string;
};

async function ensureStreetworkSchema() {
  if (isPostgresSelected()) {
    await sql`CREATE TABLE IF NOT EXISTS streetwork_stats (
      id SERIAL PRIMARY KEY,
      worker_name TEXT NOT NULL,
      month TEXT NOT NULL,
      interactions INTEGER NOT NULL DEFAULT 0,
      new_contacts INTEGER NOT NULL DEFAULT 0,
      interventions INTEGER NOT NULL DEFAULT 0,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      UNIQUE(worker_name, month)
    );`;
    await sql`CREATE INDEX IF NOT EXISTS idx_streetwork_month ON streetwork_stats(month);`;
  } else {
    const { getSqlite } = await import('./sqlite');
    const db = await getSqlite();
    await db.execute(`CREATE TABLE IF NOT EXISTS streetwork_stats (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      worker_name TEXT NOT NULL,
      month TEXT NOT NULL,
      interactions INTEGER NOT NULL DEFAULT 0,
      new_contacts INTEGER NOT NULL DEFAULT 0,
      interventions INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      UNIQUE(worker_name, month)
    )`);
    await db.execute(`CREATE INDEX IF NOT EXISTS idx_streetwork_month ON streetwork_stats(month)`);
  }
}

export async function ensureStreetworkStats() {
  await ensureStreetworkSchema();
}

export async function getStreetworkStats(month?: string): Promise<StreetworkStat[]> {
  if (isPostgresSelected()) {
    const rows = month
      ? await sql`SELECT * FROM streetwork_stats WHERE month = ${month} ORDER BY worker_name ASC`
      : await sql`SELECT * FROM streetwork_stats ORDER BY month DESC, worker_name ASC`;

    return rows.map((r: any) => ({
      id: Number(r.id),
      workerName: r.worker_name,
      month: r.month,
      interactions: Number(r.interactions),
      newContacts: Number(r.new_contacts),
      interventions: Number(r.interventions),
      createdAt: new Date(r.created_at).toISOString?.() ?? String(r.created_at),
      updatedAt: new Date(r.updated_at).toISOString?.() ?? String(r.updated_at),
    }));
  } else {
    const { getSqlite } = await import('./sqlite');
    const db = await getSqlite();
    const result = month
      ? await db.execute({
          sql: `SELECT * FROM streetwork_stats WHERE month = ? ORDER BY worker_name ASC`,
          args: [month],
        })
      : await db.execute(`SELECT * FROM streetwork_stats ORDER BY month DESC, worker_name ASC`);

    return result.rows.map((r: any) => ({
      id: Number(r.id),
      workerName: String(r.worker_name),
      month: String(r.month),
      interactions: Number(r.interactions),
      newContacts: Number(r.new_contacts),
      interventions: Number(r.interventions),
      createdAt: String(r.created_at),
      updatedAt: String(r.updated_at),
    }));
  }
}

export async function upsertStreetworkStat(input: {
  workerName: string;
  month: string;
  interactions: number;
  newContacts: number;
  interventions: number;
}): Promise<StreetworkStat> {
  const { workerName, month, interactions, newContacts, interventions } = input;

  if (isPostgresSelected()) {
    const res = await sql`
      INSERT INTO streetwork_stats (worker_name, month, interactions, new_contacts, interventions)
      VALUES (${workerName}, ${month}, ${interactions}, ${newContacts}, ${interventions})
      ON CONFLICT (worker_name, month)
      DO UPDATE SET
        interactions = ${interactions},
        new_contacts = ${newContacts},
        interventions = ${interventions},
        updated_at = now()
      RETURNING *
    `;
    const r: any = res[0];
    return {
      id: Number(r.id),
      workerName: r.worker_name,
      month: r.month,
      interactions: Number(r.interactions),
      newContacts: Number(r.new_contacts),
      interventions: Number(r.interventions),
      createdAt: new Date(r.created_at).toISOString?.() ?? String(r.created_at),
      updatedAt: new Date(r.updated_at).toISOString?.() ?? String(r.updated_at),
    };
  } else {
    const { getSqlite } = await import('./sqlite');
    const db = await getSqlite();
    await db.execute({
      sql: `INSERT INTO streetwork_stats (worker_name, month, interactions, new_contacts, interventions)
            VALUES (?, ?, ?, ?, ?)
            ON CONFLICT(worker_name, month)
            DO UPDATE SET
              interactions = ?,
              new_contacts = ?,
              interventions = ?,
              updated_at = datetime('now')`,
      args: [
        workerName,
        month,
        interactions,
        newContacts,
        interventions,
        interactions,
        newContacts,
        interventions,
      ],
    });

    const result = await db.execute({
      sql: `SELECT * FROM streetwork_stats WHERE worker_name = ? AND month = ?`,
      args: [workerName, month],
    });
    const r: any = result.rows[0];
    return {
      id: Number(r.id),
      workerName: String(r.worker_name),
      month: String(r.month),
      interactions: Number(r.interactions),
      newContacts: Number(r.new_contacts),
      interventions: Number(r.interventions),
      createdAt: String(r.created_at),
      updatedAt: String(r.updated_at),
    };
  }
}

export async function getAllStreetworkMonths(): Promise<string[]> {
  if (isPostgresSelected()) {
    const rows = await sql`SELECT DISTINCT month FROM streetwork_stats ORDER BY month DESC`;
    return rows.map((r: any) => r.month);
  } else {
    const { getSqlite } = await import('./sqlite');
    const db = await getSqlite();
    const result = await db.execute(
      `SELECT DISTINCT month FROM streetwork_stats ORDER BY month DESC`
    );
    return result.rows.map((r: any) => String(r.month));
  }
}
