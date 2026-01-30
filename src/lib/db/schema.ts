import type { DefaultCategory } from './types.js';

export const SCHEMA = `
  CREATE TABLE IF NOT EXISTS daily_notes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    date TEXT UNIQUE NOT NULL,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS categories (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    color TEXT NOT NULL,
    icon TEXT,
    is_default INTEGER DEFAULT 0,
    position INTEGER DEFAULT 0
  );

  CREATE TABLE IF NOT EXISTS entries (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    daily_note_id INTEGER NOT NULL,
    category_id INTEGER,
    is_ai_generated INTEGER DEFAULT 0,
    source_entry_ids TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (daily_note_id) REFERENCES daily_notes(id),
    FOREIGN KEY (category_id) REFERENCES categories(id)
  );

  CREATE TABLE IF NOT EXISTS blocks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    parent_type TEXT NOT NULL,
    parent_id INTEGER NOT NULL,
    type TEXT NOT NULL DEFAULT 'text',
    content TEXT NOT NULL,
    position INTEGER DEFAULT 0,
    author TEXT DEFAULT 'user',
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS sections (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    position INTEGER DEFAULT 0,
    last_ai_update TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY,
    value TEXT
  );

  CREATE INDEX IF NOT EXISTS idx_entries_daily_note ON entries(daily_note_id);
  CREATE INDEX IF NOT EXISTS idx_blocks_parent ON blocks(parent_type, parent_id);
  CREATE INDEX IF NOT EXISTS idx_daily_notes_date ON daily_notes(date);
`;

export const DEFAULT_CATEGORIES: DefaultCategory[] = [
  { name: 'Progress', color: '#22c55e', icon: null, is_default: 1, position: 0 },
  { name: 'Blocker', color: '#ef4444', icon: null, is_default: 1, position: 1 },
  { name: 'Idea', color: '#eab308', icon: null, is_default: 1, position: 2 },
  { name: 'Question', color: '#3b82f6', icon: null, is_default: 1, position: 3 },
  { name: 'Meeting Note', color: '#8b5cf6', icon: null, is_default: 1, position: 4 },
];
