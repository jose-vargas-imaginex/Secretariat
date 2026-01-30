import { getDb, flushInMemoryDataToStorage } from './database.js';
import type { Block } from './types.js';

export function createBlock(
  parentType: string,
  parentId: number,
  type: string,
  content: unknown,
  author: string = 'user'
): number {
  const db = getDb();

  // Get max position
  const posStmt = db.prepare('SELECT MAX(position) FROM blocks WHERE parent_type = ? AND parent_id = ?');
  posStmt.bind([parentType, parentId]);
  let maxPos = -1;
  if (posStmt.step()) {
    maxPos = (posStmt.get()[0] as number | null) ?? -1;
  }
  posStmt.free();

  // Insert the block
  const contentJson = JSON.stringify(content);
  const insertStmt = db.prepare(
    'INSERT INTO blocks (parent_type, parent_id, type, content, position, author) VALUES (?, ?, ?, ?, ?, ?)'
  );
  insertStmt.bind([parentType, parentId, type, contentJson, maxPos + 1, author]);
  insertStmt.step();

  const idResult = db.exec('SELECT last_insert_rowid()');
  const id = idResult[0].values[0][0] as number;

  insertStmt.free();
  flushInMemoryDataToStorage();

  return id;
}

export function getBlocksForParent(parentType: string, parentId: number): Block[] {
  const db = getDb();

  const stmt = db.prepare(
    'SELECT * FROM blocks WHERE parent_type = ? AND parent_id = ? ORDER BY position ASC'
  );
  stmt.bind([parentType, parentId]);

  const blocks: Block[] = [];
  const columns = stmt.getColumnNames();
  while (stmt.step()) {
    const row = stmt.get();
    const block = {} as Record<string, unknown>;
    columns.forEach((col, i) => block[col] = row[i]);
    block.content = JSON.parse(block.content as string);
    blocks.push(block as unknown as Block);
  }
  stmt.free();

  return blocks;
}

export function updateBlock(id: number, content: unknown): void {
  const db = getDb();
  const stmt = db.prepare(
    'UPDATE blocks SET content = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?'
  );
  stmt.run([JSON.stringify(content), id]);
  stmt.free();
  flushInMemoryDataToStorage();
}

export function deleteBlock(id: number): void {
  const db = getDb();
  const stmt = db.prepare('DELETE FROM blocks WHERE id = ?');
  stmt.run([id]);
  stmt.free();
  flushInMemoryDataToStorage();
}
