import { getDb, flushInMemoryDataToStorage } from './database.js';
import type { Entry } from './types.js';

export function createEntry(
  dailyNoteId: number,
  categoryId: number | null = null,
  title: string | null = null
): number {
  const db = getDb();

  const stmt = db.prepare('INSERT INTO entries (daily_note_id, category_id, title) VALUES (?, ?, ?)');
  stmt.run([dailyNoteId, categoryId, title]);

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

export function updateEntryTitle(entryId: number, title: string | null): void {
  const db = getDb();
  const stmt = db.prepare('UPDATE entries SET title = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?');
  stmt.run([title, entryId]);
  stmt.free();
  flushInMemoryDataToStorage();
}

export function createAiEntry(
  dailyNoteId: number,
  title: string,
  sourceEntryIds: number[]
): number {
  const db = getDb();

  const stmt = db.prepare(
    'INSERT INTO entries (daily_note_id, title, is_ai_generated, source_entry_ids) VALUES (?, ?, 1, ?)'
  );
  stmt.run([dailyNoteId, title, JSON.stringify(sourceEntryIds)]);

  const result = db.exec('SELECT last_insert_rowid()');
  const id = result[0].values[0][0] as number;

  stmt.free();
  flushInMemoryDataToStorage();

  return id;
}

export function getAiSummaryForDailyNote(dailyNoteId: number): Entry | null {
  const db = getDb();

  const stmt = db.prepare(`
    SELECT e.*, c.name as category_name, c.color as category_color
    FROM entries e
    LEFT JOIN categories c ON e.category_id = c.id
    WHERE e.daily_note_id = ? AND e.is_ai_generated = 1 AND e.title = 'Daily Summary'
    LIMIT 1
  `);
  stmt.bind([dailyNoteId]);

  let entry: Entry | null = null;
  const columns = stmt.getColumnNames();

  if (stmt.step()) {
    const row = stmt.get();
    const obj: Record<string, unknown> = {};
    columns.forEach((col, i) => obj[col] = row[i]);
    entry = obj as unknown as Entry;
  }
  stmt.free();

  return entry;
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
