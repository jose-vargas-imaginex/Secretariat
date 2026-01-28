import { getDb, saveDatabase } from './database.js';
import { format } from 'date-fns';

export function getOrCreateDailyNote(date) {
  const db = getDb();
  const dateStr = format(date, 'yyyy-MM-dd');

  let result = db.exec('SELECT * FROM daily_notes WHERE date = ?', [dateStr]);

  if (result.length === 0 || result[0].values.length === 0) {
    db.run('INSERT INTO daily_notes (date) VALUES (?)', [dateStr]);
    saveDatabase();
    result = db.exec('SELECT * FROM daily_notes WHERE date = ?', [dateStr]);
  }

  const row = result[0].values[0];
  return {
    id: row[0],
    date: row[1],
    created_at: row[2],
    updated_at: row[3]
  };
}

export function getDailyNote(date) {
  const db = getDb();
  const dateStr = format(date, 'yyyy-MM-dd');
  const result = db.exec('SELECT * FROM daily_notes WHERE date = ?', [dateStr]);

  if (result.length === 0 || result[0].values.length === 0) {
    return null;
  }

  const row = result[0].values[0];
  return {
    id: row[0],
    date: row[1],
    created_at: row[2],
    updated_at: row[3]
  };
}

export function getDatesWithNotes(startDate, endDate) {
  const db = getDb();
  const startStr = format(startDate, 'yyyy-MM-dd');
  const endStr = format(endDate, 'yyyy-MM-dd');

  const result = db.exec(
    'SELECT date FROM daily_notes WHERE date >= ? AND date <= ?',
    [startStr, endStr]
  );

  if (result.length === 0) return [];
  return result[0].values.map(row => row[0]);
}
