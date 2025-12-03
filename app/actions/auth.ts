"use server";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import crypto from "crypto";
import { getSqlite } from "@/lib/sqlite";

//
const MAX_ATTEMPTS = 3;
const LOCK_DURATION = 24 * 60 * 60 * 1000; // 24 hours in milliseconds

interface AttemptData {
  count: number;
  lockedUntil?: number;
}

interface User {
  id: number;
  email: string;
  password_hash: string;
  must_change_password: boolean;
  created_at: string;
  last_login?: string;
}

// In-memory store for attempt tracking
const attemptStore = new Map<string, AttemptData>();

function hashPassword(password: string): string {
  return crypto.createHash("sha256").update(password).digest("hex");
}

function getClientId(): string {
  const cookieStore = cookies();
  let clientId = cookieStore.get("client_id")?.value;

  if (!clientId) {
    clientId = crypto.randomBytes(32).toString("hex");
    cookieStore.set("client_id", clientId, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 365 * 24 * 60 * 60,
    });
  }

  return clientId;
}

// Initialize database with users table
export async function initDatabase() {
  const db = await getSqlite();

  await db.execute(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      must_change_password BOOLEAN DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      last_login DATETIME
    )
  `);

  // Check if default users exist
  const result = await db.execute("SELECT COUNT(*) as count FROM users");
  const count = result.rows[0].count as number;

  // Insert default users if table is empty
  if (count === 0) {
    const defaultPassword = hashPassword("mopsgdynia");
    const users = [
      "d.zablocki@mopsgdynia.pl",
      "j.nowicka@mopsgdynia.pl",
      "m.adamski@mopsgdynia.pl",
      "l.filc@mopsgdynia.pl",
      "m.walenciej@mopsgdynia.pl",
      "p.niemczyk@mopsgdynia.pl",
      "m.kowalewski@mopsgdynia.pl"
    ];

    for (const email of users) {
      await db.execute({
        sql: "INSERT INTO users (email, password_hash, must_change_password) VALUES (?, ?, 1)",
        args: [email, defaultPassword]
      });
    }
  }
}

export async function login(formData: FormData) {
  const email = (formData.get("email") as string)?.toLowerCase().trim();
  const password = formData.get("password") as string;
  const clientId = getClientId();

  if (!email || !password) {
    return {
      success: false,
      error: "Email i hasło są wymagane.",
    };
  }

  // Check if client is locked
  const attemptData = attemptStore.get(clientId);
  if (attemptData?.lockedUntil && Date.now() < attemptData.lockedUntil) {
    const remainingTime = Math.ceil(
      (attemptData.lockedUntil - Date.now()) / 1000 / 60
    );
    return {
      success: false,
      error: `Dostęp zablokowany. Spróbuj ponownie za ${remainingTime} minut.`,
      attemptsLeft: 0,
      locked: true,
    };
  }

  // Clear lock if time has passed
  if (attemptData?.lockedUntil && Date.now() >= attemptData.lockedUntil) {
    attemptStore.delete(clientId);
  }

  const db = await getSqlite();
  const passwordHash = hashPassword(password);

  // Find user
  const result = await db.execute({
    sql: "SELECT * FROM users WHERE email = ? AND password_hash = ?",
    args: [email, passwordHash]
  });

  if (result.rows.length === 0) {
    // Handle failed attempt
    const currentAttempts = attemptData?.count || 0;
    const newAttempts = currentAttempts + 1;

    if (newAttempts >= MAX_ATTEMPTS) {
      attemptStore.set(clientId, {
        count: newAttempts,
        lockedUntil: Date.now() + LOCK_DURATION,
      });
      return {
        success: false,
        error: "Wyczerpano limit prób. Dostęp zablokowany na 24 godziny.",
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

  const user = result.rows[0] as unknown as User;

  // Clear attempts on successful login
  attemptStore.delete(clientId);

  // Update last login
  await db.execute({
    sql: "UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = ?",
    args: [user.id]
  });

  // Set auth cookie
  const cookieStore = cookies();
  cookieStore.set("auth_session", JSON.stringify({
    userId: user.id,
    email: user.email
  }), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    maxAge: 60 * 60 * 24,
  });

  return {
    success: true,
    mustChangePassword: user.must_change_password === 1 || user.must_change_password === true
  };
}

export async function changePassword(formData: FormData) {
  const currentPassword = formData.get("currentPassword") as string;
  const newPassword = formData.get("newPassword") as string;
  const confirmPassword = formData.get("confirmPassword") as string;

  if (!currentPassword || !newPassword || !confirmPassword) {
    return {
      success: false,
      error: "Wszystkie pola są wymagane."
    };
  }

  if (newPassword !== confirmPassword) {
    return {
      success: false,
      error: "Nowe hasła nie są identyczne."
    };
  }

  if (newPassword.length < 8) {
    return {
      success: false,
      error: "Nowe hasło musi mieć minimum 8 znaków."
    };
  }

  const session = await getSession();
  if (!session) {
    return {
      success: false,
      error: "Brak aktywnej sesji."
    };
  }

  const db = await getSqlite();
  const currentPasswordHash = hashPassword(currentPassword);

  // Verify current password
  const result = await db.execute({
    sql: "SELECT * FROM users WHERE id = ? AND password_hash = ?",
    args: [session.userId, currentPasswordHash]
  });

  if (result.rows.length === 0) {
    return {
      success: false,
      error: "Nieprawidłowe obecne hasło."
    };
  }

  // Update password
  const newPasswordHash = hashPassword(newPassword);
  await db.execute({
    sql: "UPDATE users SET password_hash = ?, must_change_password = 0 WHERE id = ?",
    args: [newPasswordHash, session.userId]
  });

  return {
    success: true,
    message: "Hasło zostało zmienione."
  };
}

export async function logout() {
  const cookieStore = cookies();
  cookieStore.delete("auth_session");
  redirect("/");
}

export async function getSession() {
  const cookieStore = cookies();
  const sessionCookie = cookieStore.get("auth_session")?.value;

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

  const db = await getSqlite();
  const result = await db.execute({
    sql: "SELECT id, email, must_change_password, last_login FROM users WHERE id = ?",
    args: [session.userId]
  });

  if (result.rows.length === 0) return null;

  return result.rows[0] as unknown as Omit<User, 'password_hash'>;
}
