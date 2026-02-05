import type { SqlValue } from 'sql.js';
import { getDb, flushInMemoryDataToStorage } from './database.js';
import { format } from 'date-fns';
import type { DailyNote } from './types.js';

export function getOrCreateDailyNote(date: Date): DailyNote {
  const db = getDb();
  const dateStr = format(date, 'yyyy-MM-dd');

  // Check if daily note exists
  const selectStmt = db.prepare('SELECT * FROM daily_notes WHERE date = ?');
  selectStmt.bind([dateStr]);

  let row: SqlValue[] | null = null;
  if (selectStmt.step()) {
    row = selectStmt.get();
  }
  selectStmt.free();

  if (!row) {
    // Create new daily note
    const insertStmt = db.prepare('INSERT INTO daily_notes (date) VALUES (?)');
    insertStmt.run([dateStr]);
    insertStmt.free();
    flushInMemoryDataToStorage();

    // Fetch the newly created note
    const refetchStmt = db.prepare('SELECT * FROM daily_notes WHERE date = ?');
    refetchStmt.bind([dateStr]);
    if (refetchStmt.step()) {
      row = refetchStmt.get();
    }
    refetchStmt.free();
  }

  return {
    id: row![0] as number,
    date: row![1] as string,
    created_at: row![2] as string,
    updated_at: row![3] as string
  };
}

export function getDailyNote(date: Date): DailyNote | null {
  const db = getDb();
  const dateStr = format(date, 'yyyy-MM-dd');

  const stmt = db.prepare('SELECT * FROM daily_notes WHERE date = ?');
  stmt.bind([dateStr]);

  let result: DailyNote | null = null;
  if (stmt.step()) {
    const row = stmt.get();
    result = {
      id: row[0] as number,
      date: row[1] as string,
      created_at: row[2] as string,
      updated_at: row[3] as string
    };
  }
  stmt.free();

  return result;
}

export function getDatesWithNotes(startDate: Date, endDate: Date): string[] {
  const db = getDb();
  const startStr = format(startDate, 'yyyy-MM-dd');
  const endStr = format(endDate, 'yyyy-MM-dd');

  const stmt = db.prepare('SELECT date FROM daily_notes WHERE date >= ? AND date <= ?');
  stmt.bind([startStr, endStr]);

  const dates: string[] = [];
  while (stmt.step()) {
    dates.push(stmt.get()[0] as string);
  }
  stmt.free();

  return dates;
}
