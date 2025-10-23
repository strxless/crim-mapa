"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import crypto from "crypto";

const CORRECT_PASSWORD = "CwelJebany";
const MAX_ATTEMPTS = 3;
const LOCK_DURATION = 24 * 60 * 60 * 1000; // 24 hours in milliseconds

interface AttemptData {
  count: number;
  lockedUntil?: number;
}

// In-memory store for attempt tracking (per deployment)
// For production, use Redis or database
const attemptStore = new Map<string, AttemptData>();

function hashPassword(password: string): string {
  return crypto.createHash("sha256").update(password).digest("hex");
}

function getClientId(request?: Request): string {
  // Use a combination of factors to identify client
  // In production, consider using IP address from headers
  const cookieStore = cookies();
  let clientId = cookieStore.get("client_id")?.value;

  if (!clientId) {
    clientId = crypto.randomBytes(32).toString("hex");
    cookieStore.set("client_id", clientId, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 365 * 24 * 60 * 60, // 1 year
    });
  }

  return clientId;
}

export async function login(formData: FormData) {
  const password = formData.get("password") as string;
  const clientId = getClientId();

  // Check if client is locked
  const attemptData = attemptStore.get(clientId);
  if (attemptData?.lockedUntil && Date.now() < attemptData.lockedUntil) {
    const remainingTime = Math.ceil(
      (attemptData.lockedUntil - Date.now()) / 1000 / 60,
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

  // Verify password
  if (password === CORRECT_PASSWORD) {
    // Clear attempts on successful login
    attemptStore.delete(clientId);

    // Set auth cookie
    const cookieStore = cookies();
    cookieStore.set("auth_session", "authenticated", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 60 * 60 * 24, // 24 hours
    });

    return { success: true };
  }

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
    error: `Nieprawidłowe hasło. Pozostało prób: ${MAX_ATTEMPTS - newAttempts}`,
    attemptsLeft: MAX_ATTEMPTS - newAttempts,
    locked: false,
  };
}

export async function logout() {
  const cookieStore = cookies();
  cookieStore.delete("auth_session");
  redirect("/");
}

export async function checkAuth() {
  const cookieStore = cookies();
  return cookieStore.get("auth_session")?.value === "authenticated";
}
