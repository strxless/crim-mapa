// lib/db.ts
import { createClient } from '@libsql/client';

let _db: ReturnType<typeof createClient> | null = null;

export function getSqlite() {
  if (_db) return _db;
  
  _db = createClient({
    url: process.env.TURSO_DATABASE_URL!,
    authToken: process.env.TURSO_AUTH_TOKEN,
  });
  
  return _db;
}
