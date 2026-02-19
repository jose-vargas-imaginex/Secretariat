import { getDb, flushInMemoryDataToStorage } from './database.js';
import type { Section, Entry } from './types.js';

export function getOrCreateSection(title: string): Section {
  const db = getDb();

  // Try to find existing
  const selectStmt = db.prepare('SELECT * FROM sections WHERE title = ?');
  selectStmt.bind([title]);

  let section: Section | null = null;
  if (selectStmt.step()) {
    const row = selectStmt.get();
    section = {
      id: row[0] as number,
      title: row[1] as string,
      position: row[2] as number,
      last_ai_update: row[3] as string | null,
      created_at: row[4] as string,
      updated_at: row[5] as string,
    };
  }
  selectStmt.free();

  if (section) return section;

  // Create new section
  const maxPosStmt = db.prepare('SELECT MAX(position) FROM sections');
  let maxPos = -1;
  if (maxPosStmt.step()) {
    maxPos = (maxPosStmt.get()[0] as number | null) ?? -1;
  }
  maxPosStmt.free();

  const insertStmt = db.prepare('INSERT INTO sections (title, position) VALUES (?, ?)');
  insertStmt.run([title, maxPos + 1]);
  insertStmt.free();

  const idResult = db.exec('SELECT last_insert_rowid()');
  const id = idResult[0].values[0][0] as number;

  flushInMemoryDataToStorage();

  // Re-fetch to get full row with timestamps
  const refetchStmt = db.prepare('SELECT * FROM sections WHERE id = ?');
  refetchStmt.bind([id]);
  refetchStmt.step();
  const refetchRow = refetchStmt.get();
  refetchStmt.free();

  return {
    id: refetchRow[0] as number,
    title: refetchRow[1] as string,
    position: refetchRow[2] as number,
    last_ai_update: refetchRow[3] as string | null,
    created_at: refetchRow[4] as string,
    updated_at: refetchRow[5] as string,
  };
}

export function getSection(title: string): Section | null {
  const db = getDb();
  const stmt = db.prepare('SELECT * FROM sections WHERE title = ?');
  stmt.bind([title]);

  let section: Section | null = null;
  if (stmt.step()) {
    const row = stmt.get();
    section = {
      id: row[0] as number,
      title: row[1] as string,
      position: row[2] as number,
      last_ai_update: row[3] as string | null,
      created_at: row[4] as string,
      updated_at: row[5] as string,
    };
  }
  stmt.free();
  return section;
}

export function updateSectionTimestamp(sectionId: number): void {
  const db = getDb();
  const stmt = db.prepare(
    'UPDATE sections SET last_ai_update = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP WHERE id = ?'
  );
  stmt.run([sectionId]);
  stmt.free();
  flushInMemoryDataToStorage();
}

export function getEntriesForSection(sectionId: number): Entry[] {
  const db = getDb();
  const stmt = db.prepare(
    'SELECT * FROM entries WHERE parent_type = ? AND parent_id = ? ORDER BY position ASC'
  );
  stmt.bind(['section', sectionId]);

  const entries: Entry[] = [];
  const columns = stmt.getColumnNames();
  while (stmt.step()) {
    const row = stmt.get();
    const entry = {} as Record<string, unknown>;
    columns.forEach((col, i) => (entry[col] = row[i]));
    entry.content = JSON.parse(entry.content as string);
    entries.push(entry as unknown as Entry);
  }
  stmt.free();
  return entries;
}

export function addEntryToSection(
  sectionId: number,
  content: { text: string; status: string },
  author: string = 'user'
): number {
  const db = getDb();

  const posStmt = db.prepare(
    'SELECT MAX(position) FROM entries WHERE parent_type = ? AND parent_id = ?'
  );
  posStmt.bind(['section', sectionId]);
  let maxPos = -1;
  if (posStmt.step()) {
    maxPos = (posStmt.get()[0] as number | null) ?? -1;
  }
  posStmt.free();

  const insertStmt = db.prepare(
    'INSERT INTO entries (parent_type, parent_id, type, content, position, author) VALUES (?, ?, ?, ?, ?, ?)'
  );
  insertStmt.bind(['section', sectionId, 'text', JSON.stringify(content), maxPos + 1, author]);
  insertStmt.step();

  const idResult = db.exec('SELECT last_insert_rowid()');
  const id = idResult[0].values[0][0] as number;

  insertStmt.free();
  flushInMemoryDataToStorage();
  return id;
}

export function deleteEntriesForSection(sectionId: number, authorFilter?: string): void {
  const db = getDb();
  let sql = 'DELETE FROM entries WHERE parent_type = ? AND parent_id = ?';
  const params: (string | number)[] = ['section', sectionId];

  if (authorFilter) {
    sql += ' AND author = ?';
    params.push(authorFilter);
  }

  const stmt = db.prepare(sql);
  stmt.run(params);
  stmt.free();
  flushInMemoryDataToStorage();
}
