import Database from "better-sqlite3";

let _db: Database.Database | null = null;

export async function getSqlite() {
  if (_db) return _db;
  const file = process.env.SQLITE_PATH || "./data.sqlite";
  _db = new Database(file);
  _db.pragma("journal_mode = WAL");
  _db.pragma("foreign_keys = ON");
  return _db;
}
