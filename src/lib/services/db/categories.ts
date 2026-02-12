import { getDb, flushInMemoryDataToStorage } from './database.js';
import type { Category } from './types.js';

export function getAllCategories(): Category[] {
  const db = getDb();
  const result = db.exec('SELECT * FROM categories ORDER BY position ASC');

  if (result.length === 0) return [];

  const columns = result[0].columns;
  return result[0].values.map(row => {
    const cat: Record<string, unknown> = {};
    columns.forEach((col, i) => cat[col] = row[i]);
    cat.is_default = !!cat.is_default;
    return cat as unknown as Category;
  });
}

export function createCategory(name: string, color: string, icon: string | null = null): number {
  const db = getDb();
  const result = db.exec('SELECT MAX(position) FROM categories');
  const maxPos = (result[0]?.values[0]?.[0] as number | null) ?? -1;

  const stmt = db.prepare(
    'INSERT INTO categories (name, color, icon, is_default, position) VALUES (?, ?, ?, 0, ?)'
  );
  stmt.run([name, color, icon, maxPos + 1]);

  const idResult = db.exec('SELECT last_insert_rowid()');
  const id = idResult[0].values[0][0] as number;

  stmt.free();
  flushInMemoryDataToStorage();

  return id;
}

export function updateCategory(id: number, name: string, color: string, icon: string | null = null): void {
  const db = getDb();
  const stmt = db.prepare('UPDATE categories SET name = ?, color = ?, icon = ? WHERE id = ?');
  stmt.run([name, color, icon, id]);
  stmt.free();
  flushInMemoryDataToStorage();
}

export function deleteCategory(id: number): void {
  const db = getDb();

  // Set blocks with this category to null
  const updateStmt = db.prepare('UPDATE blocks SET category_id = NULL WHERE category_id = ?');
  updateStmt.run([id]);
  updateStmt.free();

  const deleteStmt = db.prepare('DELETE FROM categories WHERE id = ? AND is_default = 0');
  deleteStmt.run([id]);
  deleteStmt.free();

  flushInMemoryDataToStorage();
}
