import { getDb, flushInMemoryDataToStorage } from './database.js';
import type { Entry } from './types.js';

export function createEntry(
  parentType: string,
  parentId: number,
  type: string,
  content: unknown,
  author: string = 'user'
): number {
  const db = getDb();

  // Get max position
  const posStmt = db.prepare('SELECT MAX(position) FROM entries WHERE parent_type = ? AND parent_id = ?');
  posStmt.bind([parentType, parentId]);
  let maxPos = -1;
  if (posStmt.step()) {
    maxPos = (posStmt.get()[0] as number | null) ?? -1;
  }
  posStmt.free();

  // Insert the entry
  const contentJson = JSON.stringify(content);
  const insertStmt = db.prepare(
    'INSERT INTO entries (parent_type, parent_id, type, content, position, author) VALUES (?, ?, ?, ?, ?, ?)'
  );
  insertStmt.bind([parentType, parentId, type, contentJson, maxPos + 1, author]);
  insertStmt.step();

  const idResult = db.exec('SELECT last_insert_rowid()');
  const id = idResult[0].values[0][0] as number;

  insertStmt.free();
  flushInMemoryDataToStorage();

  return id;
}

export function getEntriesForParent(parentType: string, parentId: number): Entry[] {
  const db = getDb();

  const stmt = db.prepare(
    'SELECT * FROM entries WHERE parent_type = ? AND parent_id = ? ORDER BY position ASC'
  );
  stmt.bind([parentType, parentId]);

  const entries: Entry[] = [];
  const columns = stmt.getColumnNames();
  while (stmt.step()) {
    const row = stmt.get();
    const entry = {} as Record<string, unknown>;
    columns.forEach((col, i) => entry[col] = row[i]);
    entry.content = JSON.parse(entry.content as string);
    entries.push(entry as unknown as Entry);
  }
  stmt.free();

  return entries;
}

export function updateEntry(id: number, content: unknown): void {
  const db = getDb();
  const stmt = db.prepare(
    'UPDATE entries SET content = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?'
  );
  stmt.run([JSON.stringify(content), id]);
  stmt.free();
  flushInMemoryDataToStorage();
}

export function deleteEntry(id: number): void {
  const db = getDb();
  const stmt = db.prepare('DELETE FROM entries WHERE id = ?');
  stmt.run([id]);
  stmt.free();
  flushInMemoryDataToStorage();
}
