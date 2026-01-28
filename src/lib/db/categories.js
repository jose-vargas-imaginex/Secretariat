import { getDb, saveDatabase } from './database.js';

export function getAllCategories() {
  const db = getDb();
  const result = db.exec('SELECT * FROM categories ORDER BY position ASC');

  if (result.length === 0) return [];

  const columns = result[0].columns;
  return result[0].values.map(row => {
    const cat = {};
    columns.forEach((col, i) => cat[col] = row[i]);
    cat.is_default = !!cat.is_default;
    return cat;
  });
}

export function createCategory(name, color, icon = null) {
  const db = getDb();
  const result = db.exec('SELECT MAX(position) FROM categories');
  const maxPos = result[0]?.values[0]?.[0] ?? -1;

  db.run(
    'INSERT INTO categories (name, color, icon, is_default, position) VALUES (?, ?, ?, 0, ?)',
    [name, color, icon, maxPos + 1]
  );
  saveDatabase();

  const idResult = db.exec('SELECT last_insert_rowid()');
  return idResult[0].values[0][0];
}

export function updateCategory(id, name, color, icon = null) {
  const db = getDb();
  db.run(
    'UPDATE categories SET name = ?, color = ?, icon = ? WHERE id = ?',
    [name, color, icon, id]
  );
  saveDatabase();
}

export function deleteCategory(id) {
  const db = getDb();
  // Set entries with this category to null
  db.run('UPDATE entries SET category_id = NULL WHERE category_id = ?', [id]);
  db.run('DELETE FROM categories WHERE id = ? AND is_default = 0', [id]);
  saveDatabase();
}
