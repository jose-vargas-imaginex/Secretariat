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

  // Migrate Entry ↔ Block naming swap: old "entries" table had daily_note_id (work items),
  // old "blocks" table had parent_type/parent_id (content pieces).
  // New naming: "blocks" = work items, "entries" = content pieces.
  const oldEntriesInfo = db.exec("PRAGMA table_info(entries)");
  const oldEntriesCols = oldEntriesInfo[0]?.values.map((row) => row[1]) ?? [];

  if (oldEntriesCols.includes("daily_note_id")) {
    // Old schema detected — need to swap table names via temp
    db.run("ALTER TABLE entries RENAME TO _old_entries");
    db.run("ALTER TABLE blocks RENAME TO entries");
    db.run("ALTER TABLE _old_entries RENAME TO blocks");

    // Rename source_entry_ids column to source_block_ids
    const blocksCols = db.exec("PRAGMA table_info(blocks)");
    const blocksColNames = blocksCols[0]?.values.map((row) => row[1]) ?? [];
    if (blocksColNames.includes("source_entry_ids")) {
      db.run("ALTER TABLE blocks RENAME COLUMN source_entry_ids TO source_block_ids");
    }

    // Update parent_type values: 'entry' → 'block'
    db.run("UPDATE entries SET parent_type = 'block' WHERE parent_type = 'entry'");

    // Recreate indexes with new names
    db.run("DROP INDEX IF EXISTS idx_entries_daily_note");
    db.run("DROP INDEX IF EXISTS idx_blocks_parent");
    db.run("CREATE INDEX IF NOT EXISTS idx_blocks_daily_note ON blocks(daily_note_id)");
    db.run("CREATE INDEX IF NOT EXISTS idx_entries_parent ON entries(parent_type, parent_id)");

    await flushInMemoryDataToStorage();
  }

  // Check if title column exists in blocks table (previously entries)
  const blocksInfo = db.exec("PRAGMA table_info(blocks)");
  const blocksCols = blocksInfo[0]?.values.map((row) => row[1]) ?? [];

  if (!blocksCols.includes("title")) {
    db.run("ALTER TABLE blocks ADD COLUMN title TEXT");
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
