import { getDb, saveDatabase } from './database.js';

export function createEntry(dailyNoteId, categoryId = null) {
  const db = getDb();
  db.run(
    'INSERT INTO entries (daily_note_id, category_id) VALUES (?, ?)',
    [dailyNoteId, categoryId]
  );
  saveDatabase();

  const result = db.exec('SELECT last_insert_rowid()');
  return result[0].values[0][0];
}

export function getEntriesForDailyNote(dailyNoteId) {
  const db = getDb();
  const result = db.exec(`
    SELECT e.*, c.name as category_name, c.color as category_color
    FROM entries e
    LEFT JOIN categories c ON e.category_id = c.id
    WHERE e.daily_note_id = ?
    ORDER BY e.created_at ASC
  `, [dailyNoteId]);

  if (result.length === 0) return [];

  const columns = result[0].columns;
  return result[0].values.map(row => {
    const entry = {};
    columns.forEach((col, i) => entry[col] = row[i]);
    return entry;
  });
}

export function updateEntryCategory(entryId, categoryId) {
  const db = getDb();
  db.run(
    'UPDATE entries SET category_id = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
    [categoryId, entryId]
  );
  saveDatabase();
}

export function deleteEntry(entryId) {
  const db = getDb();
  db.run('DELETE FROM blocks WHERE parent_type = ? AND parent_id = ?', ['entry', entryId]);
  db.run('DELETE FROM entries WHERE id = ?', [entryId]);
  saveDatabase();
}
