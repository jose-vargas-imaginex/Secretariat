import initSqlJs from 'sql.js';
import { SCHEMA, DEFAULT_CATEGORIES } from './schema.js';

let db = null;

export async function initDatabase() {
  const SQL = await initSqlJs({
    locateFile: file => `https://sql.js.org/dist/${file}`
  });

  // Try to load existing database from localStorage
  const savedDb = localStorage.getItem('secretariat_db');
  if (savedDb) {
    const data = Uint8Array.from(atob(savedDb), c => c.charCodeAt(0));
    db = new SQL.Database(data);
  } else {
    db = new SQL.Database();
    db.run(SCHEMA);
    seedDefaultCategories();
  }

  return db;
}

function seedDefaultCategories() {
  const stmt = db.prepare(
    'INSERT INTO categories (name, color, icon, is_default, position) VALUES (?, ?, ?, ?, ?)'
  );
  for (const cat of DEFAULT_CATEGORIES) {
    stmt.run([cat.name, cat.color, cat.icon, cat.is_default, cat.position]);
  }
  stmt.free();
  saveDatabase();
}

export function saveDatabase() {
  if (!db) return;
  const data = db.export();
  const base64 = btoa(String.fromCharCode(...data));
  localStorage.setItem('secretariat_db', base64);
}

export function getDb() {
  if (!db) throw new Error('Database not initialized');
  return db;
}
