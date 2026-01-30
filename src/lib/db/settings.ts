import { getDb, flushInMemoryDataToStorage } from './database.js';

export function getSetting(key: string): string | null {
  const db = getDb();

  const stmt = db.prepare('SELECT value FROM settings WHERE key = ?');
  stmt.bind([key]);

  let value: string | null = null;
  if (stmt.step()) {
    value = stmt.get()[0] as string | null;
  }
  stmt.free();

  return value;
}

export function setSetting(key: string, value: string): void {
  const db = getDb();
  const stmt = db.prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)');
  stmt.run([key, value]);
  stmt.free();
  flushInMemoryDataToStorage();
}

export function deleteSetting(key: string): void {
  const db = getDb();
  const stmt = db.prepare('DELETE FROM settings WHERE key = ?');
  stmt.run([key]);
  stmt.free();
  flushInMemoryDataToStorage();
}
