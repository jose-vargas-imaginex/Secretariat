import { getDb, saveDatabase } from './database.js';

export function createBlock(parentType, parentId, type, content, author = 'user') {
  const db = getDb();
  const result = db.exec(
    'SELECT MAX(position) FROM blocks WHERE parent_type = ? AND parent_id = ?',
    [parentType, parentId]
  );
  const maxPos = result[0]?.values[0]?.[0] ?? -1;

  db.run(
    'INSERT INTO blocks (parent_type, parent_id, type, content, position, author) VALUES (?, ?, ?, ?, ?, ?)',
    [parentType, parentId, type, JSON.stringify(content), maxPos + 1, author]
  );
  saveDatabase();

  const idResult = db.exec('SELECT last_insert_rowid()');
  return idResult[0].values[0][0];
}

export function getBlocksForParent(parentType, parentId) {
  const db = getDb();
  const result = db.exec(
    'SELECT * FROM blocks WHERE parent_type = ? AND parent_id = ? ORDER BY position ASC',
    [parentType, parentId]
  );

  if (result.length === 0) return [];

  const columns = result[0].columns;
  return result[0].values.map(row => {
    const block = {};
    columns.forEach((col, i) => block[col] = row[i]);
    block.content = JSON.parse(block.content);
    return block;
  });
}

export function updateBlock(id, content) {
  const db = getDb();
  db.run(
    'UPDATE blocks SET content = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
    [JSON.stringify(content), id]
  );
  saveDatabase();
}

export function deleteBlock(id) {
  const db = getDb();
  db.run('DELETE FROM blocks WHERE id = ?', [id]);
  saveDatabase();
}
