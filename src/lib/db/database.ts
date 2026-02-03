import initSqlJs, { type Database } from 'sql.js';
import { SCHEMA, DEFAULT_CATEGORIES } from './schema.js';

const DB_NAME = 'secretariat';
const DB_STORE = 'database';
const DB_KEY = 'sqlite';

let db: Database | null = null;

function openIndexedDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
    request.onupgradeneeded = () => {
      request.result.createObjectStore(DB_STORE);
    };
  });
}

async function loadFromStorage(): Promise<Uint8Array | null> {
  const idb = await openIndexedDB();
  return new Promise((resolve, reject) => {
    const tx = idb.transaction(DB_STORE, 'readonly');
    const store = tx.objectStore(DB_STORE);
    const request = store.get(DB_KEY);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result ?? null);
  });
}

async function saveToIndexDB(data: Uint8Array): Promise<void> {
  const idb = await openIndexedDB();
  return new Promise((resolve, reject) => {
    const tx = idb.transaction(DB_STORE, 'readwrite');
    const store = tx.objectStore(DB_STORE);
    const request = store.put(data, DB_KEY);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve();
  });
}

export async function initDatabase(): Promise<Database> {
  const SQL = await initSqlJs({
    locateFile: (file: string) => `https://sql.js.org/dist/${file}`
  });

  const savedData = await loadFromStorage();
  if (savedData) {
    db = new SQL.Database(savedData);
    await runMigrations();
  } else {
    db = new SQL.Database();
    db.run(SCHEMA);
    await seedDefaultCategories();
  }

  return db;
}

async function runMigrations(): Promise<void> {
  if (!db) return;

  // Check if title column exists in entries table
  const tableInfo = db.exec("PRAGMA table_info(entries)");
  const columns = tableInfo[0]?.values.map((row) => row[1]) ?? [];

  if (!columns.includes("title")) {
    db.run("ALTER TABLE entries ADD COLUMN title TEXT");
    await flushInMemoryDataToStorage();
  }
}

async function seedDefaultCategories(): Promise<void> {
  if (!db) return;
  const stmt = db.prepare(
    'INSERT INTO categories (name, color, icon, is_default, position) VALUES (?, ?, ?, ?, ?)'
  );
  for (const cat of DEFAULT_CATEGORIES) {
    stmt.run([cat.name, cat.color, cat.icon, cat.is_default, cat.position]);
  }
  stmt.free();
  await flushInMemoryDataToStorage();
}

export async function flushInMemoryDataToStorage(): Promise<void> {
  if (!db) return;
  const data = db.export();
  await saveToIndexDB(data);
}

export function getDb(): Database {
  if (!db) throw new Error('Database not initialized');
  return db;
}
