import { getDb, saveDatabase } from './database.js';

export function getSetting(key) {
  const db = getDb();
  const result = db.exec('SELECT value FROM settings WHERE key = ?', [key]);

  if (result.length === 0 || result[0].values.length === 0) {
    return null;
  }

  return result[0].values[0][0];
}

export function setSetting(key, value) {
  const db = getDb();
  db.run(
    'INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)',
    [key, value]
  );
  saveDatabase();
}

export function deleteSetting(key) {
  const db = getDb();
  db.run('DELETE FROM settings WHERE key = ?', [key]);
  saveDatabase();
}
