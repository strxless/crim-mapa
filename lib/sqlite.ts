import { createClient, Client } from '@libsql/client';

let _db: Client | null = null;

export async function getSqlite() {
  if (_db) return _db;
  
  // For local development with file-based SQLite
  if (process.env.SQLITE_PATH && !process.env.TURSO_DATABASE_URL) {
    _db = createClient({
      url: `file:${process.env.SQLITE_PATH || './data.sqlite'}`
    });
  } 
  // For Turso cloud database (optional - if you want SQLite in production too)
  else if (process.env.TURSO_DATABASE_URL) {
    _db = createClient({
      url: process.env.TURSO_DATABASE_URL,
      authToken: process.env.TURSO_AUTH_TOKEN,
    });
  }
  // Fallback to local file
  else {
    _db = createClient({
      url: 'file:./data.sqlite'
    });
  }
  
  // Enable WAL mode and foreign keys
  await _db.execute('PRAGMA journal_mode = WAL');
  await _db.execute('PRAGMA foreign_keys = ON');
  
  return _db;
}
