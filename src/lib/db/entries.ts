import { getDb, flushInMemoryDataToStorage } from './database.js';
import type { Entry } from './types.js';

export function createEntry(dailyNoteId: number, categoryId: number | null = null): number {
  const db = getDb();

  const stmt = db.prepare('INSERT INTO entries (daily_note_id, category_id) VALUES (?, ?)');
  stmt.run([dailyNoteId, categoryId]);

  const result = db.exec('SELECT last_insert_rowid()');
  const id = result[0].values[0][0] as number;

  stmt.free();
  flushInMemoryDataToStorage();

  return id;
}

export function getEntriesForDailyNote(dailyNoteId: number): Entry[] {
  const db = getDb();

  const stmt = db.prepare(`
    SELECT e.*, c.name as category_name, c.color as category_color
    FROM entries e
    LEFT JOIN categories c ON e.category_id = c.id
    WHERE e.daily_note_id = ?
    ORDER BY e.created_at ASC
  `);
  stmt.bind([dailyNoteId]);

  const entries: Entry[] = [];
  const columns = stmt.getColumnNames();

  while (stmt.step()) {
    const row = stmt.get();
    const entry: Record<string, unknown> = {};
    columns.forEach((col, i) => entry[col] = row[i]);
    entries.push(entry as unknown as Entry);
  }
  stmt.free();

  return entries;
}

export function updateEntryCategory(entryId: number, categoryId: number | null): void {
  const db = getDb();
  const stmt = db.prepare('UPDATE entries SET category_id = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?');
  stmt.run([categoryId, entryId]);
  stmt.free();
  flushInMemoryDataToStorage();
}

export function deleteEntry(entryId: number): void {
  const db = getDb();

  const delBlocksStmt = db.prepare('DELETE FROM blocks WHERE parent_type = ? AND parent_id = ?');
  delBlocksStmt.run(['entry', entryId]);
  delBlocksStmt.free();

  const delEntryStmt = db.prepare('DELETE FROM entries WHERE id = ?');
  delEntryStmt.run([entryId]);
  delEntryStmt.free();

  flushInMemoryDataToStorage();
}
