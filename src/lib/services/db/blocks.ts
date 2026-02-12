import { getDb, flushInMemoryDataToStorage } from './database.js';
import type { Block } from './types.js';

export function createBlock(
  dailyNoteId: number,
  categoryId: number | null = null,
  title: string | null = null
): number {
  const db = getDb();

  const stmt = db.prepare('INSERT INTO blocks (daily_note_id, category_id, title) VALUES (?, ?, ?)');
  stmt.run([dailyNoteId, categoryId, title]);

  const result = db.exec('SELECT last_insert_rowid()');
  const id = result[0].values[0][0] as number;

  stmt.free();
  flushInMemoryDataToStorage();

  return id;
}

export function getBlocksForDailyNote(dailyNoteId: number): Block[] {
  const db = getDb();

  const stmt = db.prepare(`
    SELECT b.*, c.name as category_name, c.color as category_color
    FROM blocks b
    LEFT JOIN categories c ON b.category_id = c.id
    WHERE b.daily_note_id = ?
    ORDER BY b.created_at ASC
  `);
  stmt.bind([dailyNoteId]);

  const blocks: Block[] = [];
  const columns = stmt.getColumnNames();

  while (stmt.step()) {
    const row = stmt.get();
    const block: Record<string, unknown> = {};
    columns.forEach((col, i) => block[col] = row[i]);
    blocks.push(block as unknown as Block);
  }
  stmt.free();

  return blocks;
}

export function updateBlockCategory(blockId: number, categoryId: number | null): void {
  const db = getDb();
  const stmt = db.prepare('UPDATE blocks SET category_id = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?');
  stmt.run([categoryId, blockId]);
  stmt.free();
  flushInMemoryDataToStorage();
}

export function updateBlockTitle(blockId: number, title: string | null): void {
  const db = getDb();
  const stmt = db.prepare('UPDATE blocks SET title = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?');
  stmt.run([title, blockId]);
  stmt.free();
  flushInMemoryDataToStorage();
}

export function createAiBlock(
  dailyNoteId: number,
  title: string,
  sourceBlockIds: number[]
): number {
  const db = getDb();

  const stmt = db.prepare(
    'INSERT INTO blocks (daily_note_id, title, is_ai_generated, source_block_ids) VALUES (?, ?, 1, ?)'
  );
  stmt.run([dailyNoteId, title, JSON.stringify(sourceBlockIds)]);

  const result = db.exec('SELECT last_insert_rowid()');
  const id = result[0].values[0][0] as number;

  stmt.free();
  flushInMemoryDataToStorage();

  return id;
}

export function getAiSummaryForDailyNote(dailyNoteId: number): Block | null {
  const db = getDb();

  const stmt = db.prepare(`
    SELECT b.*, c.name as category_name, c.color as category_color
    FROM blocks b
    LEFT JOIN categories c ON b.category_id = c.id
    WHERE b.daily_note_id = ? AND b.is_ai_generated = 1 AND b.title = 'Daily Summary'
    LIMIT 1
  `);
  stmt.bind([dailyNoteId]);

  let block: Block | null = null;
  const columns = stmt.getColumnNames();

  if (stmt.step()) {
    const row = stmt.get();
    const obj: Record<string, unknown> = {};
    columns.forEach((col, i) => obj[col] = row[i]);
    block = obj as unknown as Block;
  }
  stmt.free();

  return block;
}

export function deleteBlock(blockId: number): void {
  const db = getDb();

  const delEntriesStmt = db.prepare('DELETE FROM entries WHERE parent_type = ? AND parent_id = ?');
  delEntriesStmt.run(['block', blockId]);
  delEntriesStmt.free();

  const delBlockStmt = db.prepare('DELETE FROM blocks WHERE id = ?');
  delBlockStmt.run([blockId]);
  delBlockStmt.free();

  flushInMemoryDataToStorage();
}
