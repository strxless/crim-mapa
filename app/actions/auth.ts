'use server';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import crypto from 'crypto';
import postgres from 'postgres';
import Database from 'better-sqlite3';

const MAX_ATTEMPTS = 3;
const LOCK_DURATION = 24 * 60 * 60 * 1000;

interface AttemptData {
  count: number;
  lockedUntil?: number;
}

interface User {
  id: number;
  email: string;
  password_hash: string;
  must_change_password: number | boolean;
  created_at: string;
  last_login?: string;
}

const attemptStore = new Map<string, AttemptData>();

// Check if we should use SQLite (localhost)
const USE_SQLITE = process.env.USE_SQLITE === 'true';

let sqliteDb: Database.Database | null = null;

function getSQLiteDB() {
  if (!sqliteDb) {
    const dbPath = process.env.AUTH_DB_PATH || './data/auth.db';
    sqliteDb = new Database(dbPath);
  }
  return sqliteDb;
}

function hashPassword(password: string): string {
  return crypto.createHash('sha256').update(password).digest('hex');
}

function getClientId(): string {
  const cookieStore = cookies();
  let clientId = cookieStore.get('client_id')?.value;

  if (!clientId) {
    clientId = crypto.randomBytes(32).toString('hex');
    cookieStore.set('client_id', clientId, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 365 * 24 * 60 * 60,
    });
  }

  return clientId;
}

function getDB() {
  return postgres(process.env.POSTGRES_URL!, {
    max: 1,
    idle_timeout: 20,
    connect_timeout: 10,
  });
}

function parseEnvBoolean(value: string | undefined, defaultValue: boolean) {
  if (value === undefined) return defaultValue;
  return ['1', 'true', 'yes', 'y', 'on'].includes(value.toLowerCase());
}

function getSeedUsers(): string[] {
  const raw = process.env.AUTH_SEED_USERS;
  if (!raw) return ['demo@example.com'];

  const users = raw
    .split(/[,;\n]+/g)
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);

  return users.length > 0 ? users : ['demo@example.com'];
}

function getSeedPassword(): string {
  return process.env.AUTH_SEED_PASSWORD || 'changeme';
}

function getSeedMustChangePassword(): boolean {
  // Preserve previous behavior by default (seeded accounts require password change)
  return parseEnvBoolean(process.env.AUTH_SEED_MUST_CHANGE_PASSWORD, true);
}

export async function initDatabase() {
  if (USE_SQLITE) {
    const db = getSQLiteDB();

    db.exec(`CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      must_change_password INTEGER DEFAULT 1,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      last_login TEXT
    )`);

    const count = db.prepare('SELECT COUNT(*) as count FROM users').get() as { count: number };

    if (count.count === 0) {
      const defaultPassword = hashPassword(getSeedPassword());
      const mustChange = getSeedMustChangePassword() ? 1 : 0;
      const users = getSeedUsers();

      const insert = db.prepare(
        'INSERT INTO users (email, password_hash, must_change_password) VALUES (?, ?, ?)'
      );
      for (const email of users) {
        insert.run(email, defaultPassword, mustChange);
      }
    }
  } else {
    const sql = getDB();

    await sql`CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      must_change_password BOOLEAN DEFAULT true,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      last_login TIMESTAMPTZ
    )`;

    const result = await sql`SELECT COUNT(*) as count FROM users`;
    const count = Number(result[0].count);

    if (count === 0) {
      const defaultPassword = hashPassword(getSeedPassword());
      const mustChange = getSeedMustChangePassword();
      const users = getSeedUsers();

      for (const email of users) {
        await sql`INSERT INTO users (email, password_hash, must_change_password) VALUES (${email}, ${defaultPassword}, ${mustChange})`;
      }
    }

    await sql.end();
  }
}

export async function login(formData: FormData) {
  const email = (formData.get('email') as string)?.toLowerCase().trim();
  const password = formData.get('password') as string;
  const clientId = getClientId();

  if (!email || !password) {
    return {
      success: false,
      error: 'Email i hasło są wymagane.',
    };
  }

  const attemptData = attemptStore.get(clientId);
  if (attemptData?.lockedUntil && Date.now() < attemptData.lockedUntil) {
    const remainingTime = Math.ceil((attemptData.lockedUntil - Date.now()) / 1000 / 60);
    return {
      success: false,
      error: `Dostęp zablokowany. Spróbuj ponownie za ${remainingTime} minut.`,
      attemptsLeft: 0,
      locked: true,
    };
  }

  if (attemptData?.lockedUntil && Date.now() >= attemptData.lockedUntil) {
    attemptStore.delete(clientId);
  }

  const passwordHash = hashPassword(password);
  let user: User | null = null;

  if (USE_SQLITE) {
    const db = getSQLiteDB();
    const result = db
      .prepare('SELECT * FROM users WHERE email = ? AND password_hash = ?')
      .get(email, passwordHash) as User | undefined;
    user = result || null;
  } else {
    const sql = getDB();
    const result =
      await sql`SELECT * FROM users WHERE email = ${email} AND password_hash = ${passwordHash}`;
    await sql.end();
    user = result.length > 0 ? (result[0] as unknown as User) : null;
  }

  if (!user) {
    const currentAttempts = attemptData?.count || 0;
    const newAttempts = currentAttempts + 1;

    if (newAttempts >= MAX_ATTEMPTS) {
      attemptStore.set(clientId, {
        count: newAttempts,
        lockedUntil: Date.now() + LOCK_DURATION,
      });
      return {
        success: false,
        error: 'Wyczerpano limit prób. Dostęp zablokowany na 24 godziny.',
        attemptsLeft: 0,
        locked: true,
      };
    }

    attemptStore.set(clientId, { count: newAttempts });
    return {
      success: false,
      error: `Nieprawidłowy email lub hasło. Pozostało prób: ${MAX_ATTEMPTS - newAttempts}`,
      attemptsLeft: MAX_ATTEMPTS - newAttempts,
      locked: false,
    };
  }

  attemptStore.delete(clientId);

  if (USE_SQLITE) {
    const db = getSQLiteDB();
    db.prepare('UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = ?').run(user.id);
  } else {
    const sql2 = getDB();
    await sql2`UPDATE users SET last_login = now() WHERE id = ${user.id}`;
    await sql2.end();
  }

  const cookieStore = cookies();
  cookieStore.set(
    'auth_session',
    JSON.stringify({
      userId: user.id,
      email: user.email,
    }),
    {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 60 * 60 * 24,
    }
  );

  return {
    success: true,
    mustChangePassword: Boolean(user.must_change_password),
  };
}

export async function changePassword(formData: FormData) {
  const currentPassword = formData.get('currentPassword') as string;
  const newPassword = formData.get('newPassword') as string;
  const confirmPassword = formData.get('confirmPassword') as string;

  if (!currentPassword || !newPassword || !confirmPassword) {
    return {
      success: false,
      error: 'Wszystkie pola są wymagane.',
    };
  }

  if (newPassword !== confirmPassword) {
    return {
      success: false,
      error: 'Nowe hasła nie są identyczne.',
    };
  }

  if (newPassword.length < 8) {
    return {
      success: false,
      error: 'Nowe hasło musi mieć minimum 8 znaków.',
    };
  }

  const session = await getSession();
  if (!session) {
    return {
      success: false,
      error: 'Brak aktywnej sesji.',
    };
  }

  const currentPasswordHash = hashPassword(currentPassword);

  if (USE_SQLITE) {
    const db = getSQLiteDB();
    const result = db
      .prepare('SELECT * FROM users WHERE id = ? AND password_hash = ?')
      .get(session.userId, currentPasswordHash) as User | undefined;

    if (!result) {
      return {
        success: false,
        error: 'Nieprawidłowe obecne hasło.',
      };
    }

    const newPasswordHash = hashPassword(newPassword);
    db.prepare('UPDATE users SET password_hash = ?, must_change_password = 0 WHERE id = ?').run(
      newPasswordHash,
      session.userId
    );
  } else {
    const sql = getDB();
    const result =
      await sql`SELECT * FROM users WHERE id = ${session.userId} AND password_hash = ${currentPasswordHash}`;

    if (result.length === 0) {
      await sql.end();
      return {
        success: false,
        error: 'Nieprawidłowe obecne hasło.',
      };
    }

    const newPasswordHash = hashPassword(newPassword);
    await sql`UPDATE users SET password_hash = ${newPasswordHash}, must_change_password = false WHERE id = ${session.userId}`;
    await sql.end();
  }

  return {
    success: true,
    message: 'Hasło zostało zmienione.',
  };
}

export async function logout() {
  const cookieStore = cookies();
  cookieStore.delete('auth_session');
  redirect('/');
}

export async function getSession() {
  const cookieStore = cookies();
  const sessionCookie = cookieStore.get('auth_session')?.value;

  if (!sessionCookie) return null;

  try {
    return JSON.parse(sessionCookie) as { userId: number; email: string };
  } catch {
    return null;
  }
}

export async function checkAuth() {
  return (await getSession()) !== null;
}

export async function getCurrentUser() {
  const session = await getSession();
  if (!session) return null;

  if (USE_SQLITE) {
    const db = getSQLiteDB();
    const result = db
      .prepare('SELECT id, email, must_change_password, last_login FROM users WHERE id = ?')
      .get(session.userId) as User | undefined;
    return result || null;
  } else {
    const sql = getDB();
    const result =
      await sql`SELECT id, email, must_change_password, last_login FROM users WHERE id = ${session.userId}`;
    await sql.end();

    if (result.length === 0) return null;
    return result[0] as unknown as Omit<User, 'password_hash'>;
  }
}
