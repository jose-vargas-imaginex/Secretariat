# Core Notes Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build the foundational daily notes app with quick capture, calendar navigation, and persistent storage.

**Architecture:** Svelte 5 frontend with SQLite storage via sql.js (WebAssembly). Data access through a simple store pattern. Electron handles file system access for database persistence.

**Tech Stack:** Svelte 5, Electron, sql.js (SQLite via WASM), Vite

---

## Task 1: Add Dependencies

**Files:**
- Modify: `package.json`

**Step 1: Install sql.js for SQLite**

Run:
```bash
npm install sql.js
```

**Step 2: Install date utility**

Run:
```bash
npm install date-fns
```

**Step 3: Verify installation**

Run: `npm run build`
Expected: Build succeeds

**Step 4: Commit**

```bash
git add package.json package-lock.json
git commit -m "feat: add sql.js and date-fns dependencies"
```

---

## Task 2: Set Up Database Schema

**Files:**
- Create: `src/lib/db/schema.js`
- Create: `src/lib/db/database.js`

**Step 1: Create schema definition**

Create `src/lib/db/schema.js`:

```javascript
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

export const DEFAULT_CATEGORIES = [
  { name: 'Progress', color: '#22c55e', icon: null, is_default: 1, position: 0 },
  { name: 'Blocker', color: '#ef4444', icon: null, is_default: 1, position: 1 },
  { name: 'Idea', color: '#eab308', icon: null, is_default: 1, position: 2 },
  { name: 'Question', color: '#3b82f6', icon: null, is_default: 1, position: 3 },
  { name: 'Meeting Note', color: '#8b5cf6', icon: null, is_default: 1, position: 4 },
];
```

**Step 2: Create database initialization**

Create `src/lib/db/database.js`:

```javascript
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
```

**Step 3: Verify build**

Run: `npm run build`
Expected: Build succeeds

**Step 4: Commit**

```bash
git add src/lib/db/
git commit -m "feat: add SQLite database schema and initialization"
```

---

## Task 3: Create Data Access Layer

**Files:**
- Create: `src/lib/db/dailyNotes.js`
- Create: `src/lib/db/entries.js`
- Create: `src/lib/db/categories.js`

**Step 1: Create daily notes data access**

Create `src/lib/db/dailyNotes.js`:

```javascript
import { getDb, saveDatabase } from './database.js';
import { format } from 'date-fns';

export function getOrCreateDailyNote(date) {
  const db = getDb();
  const dateStr = format(date, 'yyyy-MM-dd');

  let result = db.exec('SELECT * FROM daily_notes WHERE date = ?', [dateStr]);

  if (result.length === 0 || result[0].values.length === 0) {
    db.run('INSERT INTO daily_notes (date) VALUES (?)', [dateStr]);
    saveDatabase();
    result = db.exec('SELECT * FROM daily_notes WHERE date = ?', [dateStr]);
  }

  const row = result[0].values[0];
  return {
    id: row[0],
    date: row[1],
    created_at: row[2],
    updated_at: row[3]
  };
}

export function getDailyNote(date) {
  const db = getDb();
  const dateStr = format(date, 'yyyy-MM-dd');
  const result = db.exec('SELECT * FROM daily_notes WHERE date = ?', [dateStr]);

  if (result.length === 0 || result[0].values.length === 0) {
    return null;
  }

  const row = result[0].values[0];
  return {
    id: row[0],
    date: row[1],
    created_at: row[2],
    updated_at: row[3]
  };
}

export function getDatesWithNotes(startDate, endDate) {
  const db = getDb();
  const startStr = format(startDate, 'yyyy-MM-dd');
  const endStr = format(endDate, 'yyyy-MM-dd');

  const result = db.exec(
    'SELECT date FROM daily_notes WHERE date >= ? AND date <= ?',
    [startStr, endStr]
  );

  if (result.length === 0) return [];
  return result[0].values.map(row => row[0]);
}
```

**Step 2: Create entries data access**

Create `src/lib/db/entries.js`:

```javascript
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
```

**Step 3: Create categories data access**

Create `src/lib/db/categories.js`:

```javascript
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
```

**Step 4: Create blocks data access**

Create `src/lib/db/blocks.js`:

```javascript
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
```

**Step 5: Verify build**

Run: `npm run build`
Expected: Build succeeds

**Step 6: Commit**

```bash
git add src/lib/db/
git commit -m "feat: add data access layer for notes, entries, categories, blocks"
```

---

## Task 4: Create App Layout with Sidebar

**Files:**
- Create: `src/lib/components/Layout.svelte`
- Create: `src/lib/components/Sidebar.svelte`
- Modify: `src/App.svelte`
- Modify: `src/app.css`

**Step 1: Create Layout component**

Create `src/lib/components/Layout.svelte`:

```svelte
<script>
  import Sidebar from './Sidebar.svelte';

  let { children } = $props();
</script>

<div class="layout">
  <Sidebar />
  <main class="main-content">
    {@render children()}
  </main>
</div>

<style>
  .layout {
    display: flex;
    height: 100vh;
    overflow: hidden;
  }

  .main-content {
    flex: 1;
    overflow-y: auto;
    padding: 1.5rem;
    background: var(--bg-primary);
  }
</style>
```

**Step 2: Create Sidebar component**

Create `src/lib/components/Sidebar.svelte`:

```svelte
<script>
  let currentView = $state('today');
</script>

<aside class="sidebar">
  <div class="logo">
    <h1>Secretariat</h1>
  </div>

  <nav class="nav">
    <button
      class="nav-item"
      class:active={currentView === 'today'}
      onclick={() => currentView = 'today'}
    >
      Today
    </button>
  </nav>

  <div class="sidebar-section">
    <h2>Calendar</h2>
    <p class="placeholder">Calendar coming soon</p>
  </div>

  <div class="sidebar-section">
    <h2>Sections</h2>
    <p class="placeholder">Sections coming soon</p>
  </div>

  <div class="sidebar-footer">
    <button class="nav-item">Settings</button>
  </div>
</aside>

<style>
  .sidebar {
    width: 260px;
    background: var(--bg-secondary);
    border-right: 1px solid var(--border-color);
    display: flex;
    flex-direction: column;
    height: 100vh;
  }

  .logo {
    padding: 1rem;
    border-bottom: 1px solid var(--border-color);
  }

  .logo h1 {
    font-size: 1.25rem;
    font-weight: 600;
    margin: 0;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
  }

  .nav {
    padding: 0.5rem;
  }

  .nav-item {
    width: 100%;
    padding: 0.5rem 0.75rem;
    background: none;
    border: none;
    border-radius: 6px;
    text-align: left;
    cursor: pointer;
    color: var(--text-primary);
    font-size: 0.875rem;
  }

  .nav-item:hover {
    background: var(--bg-hover);
  }

  .nav-item.active {
    background: var(--bg-active);
    color: var(--accent-color);
  }

  .sidebar-section {
    padding: 1rem;
    border-top: 1px solid var(--border-color);
  }

  .sidebar-section h2 {
    font-size: 0.75rem;
    text-transform: uppercase;
    color: var(--text-secondary);
    margin: 0 0 0.5rem 0;
    letter-spacing: 0.05em;
  }

  .placeholder {
    font-size: 0.75rem;
    color: var(--text-secondary);
    margin: 0;
  }

  .sidebar-footer {
    margin-top: auto;
    padding: 0.5rem;
    border-top: 1px solid var(--border-color);
  }
</style>
```

**Step 3: Update app.css with CSS variables**

Replace contents of `src/app.css`:

```css
:root {
  /* Light theme */
  --bg-primary: #ffffff;
  --bg-secondary: #f8f9fa;
  --bg-hover: #f1f3f4;
  --bg-active: #e8f0fe;
  --text-primary: #1f2937;
  --text-secondary: #6b7280;
  --border-color: #e5e7eb;
  --accent-color: #667eea;

  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen,
    Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif;
  line-height: 1.5;
  font-weight: 400;
  font-synthesis: none;
  text-rendering: optimizeLegibility;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

@media (prefers-color-scheme: dark) {
  :root {
    --bg-primary: #1a1a2e;
    --bg-secondary: #16213e;
    --bg-hover: #1f2b47;
    --bg-active: #253554;
    --text-primary: #f8f8f2;
    --text-secondary: #a0a0a0;
    --border-color: #2d3748;
    --accent-color: #667eea;
  }
}

* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  background: var(--bg-primary);
  color: var(--text-primary);
}

#app {
  width: 100%;
  height: 100vh;
}
```

**Step 4: Update App.svelte**

Replace contents of `src/App.svelte`:

```svelte
<script>
  import Layout from './lib/components/Layout.svelte';
  import { onMount } from 'svelte';
  import { initDatabase } from './lib/db/database.js';

  let dbReady = $state(false);
  let error = $state(null);

  onMount(async () => {
    try {
      await initDatabase();
      dbReady = true;
    } catch (e) {
      error = e.message;
      console.error('Failed to initialize database:', e);
    }
  });
</script>

{#if error}
  <div class="error">
    <h1>Error</h1>
    <p>{error}</p>
  </div>
{:else if !dbReady}
  <div class="loading">
    <p>Loading...</p>
  </div>
{:else}
  <Layout>
    <div class="today-view">
      <h1>Today</h1>
      <p>Quick capture coming soon...</p>
    </div>
  </Layout>
{/if}

<style>
  .loading, .error {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    height: 100vh;
    gap: 1rem;
  }

  .error {
    color: #ef4444;
  }

  .today-view h1 {
    font-size: 1.5rem;
    font-weight: 600;
    margin-bottom: 1rem;
  }
</style>
```

**Step 5: Verify build and test visually**

Run: `npm run build`
Expected: Build succeeds

Run: `npm run dev`
Expected: App shows sidebar with "Secretariat" logo and main content area

**Step 6: Commit**

```bash
git add src/
git commit -m "feat: add app layout with sidebar structure"
```

---

## Task 5: Create Calendar Component

**Files:**
- Create: `src/lib/components/Calendar.svelte`
- Modify: `src/lib/components/Sidebar.svelte`

**Step 1: Create Calendar component**

Create `src/lib/components/Calendar.svelte`:

```svelte
<script>
  import {
    startOfMonth,
    endOfMonth,
    startOfWeek,
    endOfWeek,
    eachDayOfInterval,
    format,
    isSameMonth,
    isSameDay,
    addMonths,
    subMonths
  } from 'date-fns';

  let { selectedDate = $bindable(new Date()), datesWithNotes = [] } = $props();

  let viewDate = $state(new Date());

  let calendarDays = $derived.by(() => {
    const monthStart = startOfMonth(viewDate);
    const monthEnd = endOfMonth(viewDate);
    const calStart = startOfWeek(monthStart);
    const calEnd = endOfWeek(monthEnd);

    return eachDayOfInterval({ start: calStart, end: calEnd });
  });

  function hasNotes(date) {
    const dateStr = format(date, 'yyyy-MM-dd');
    return datesWithNotes.includes(dateStr);
  }

  function prevMonth() {
    viewDate = subMonths(viewDate, 1);
  }

  function nextMonth() {
    viewDate = addMonths(viewDate, 1);
  }

  function selectDay(date) {
    selectedDate = date;
  }
</script>

<div class="calendar">
  <div class="calendar-header">
    <button class="nav-btn" onclick={prevMonth}>&lt;</button>
    <span class="month-label">{format(viewDate, 'MMMM yyyy')}</span>
    <button class="nav-btn" onclick={nextMonth}>&gt;</button>
  </div>

  <div class="calendar-grid">
    <div class="weekday">Su</div>
    <div class="weekday">Mo</div>
    <div class="weekday">Tu</div>
    <div class="weekday">We</div>
    <div class="weekday">Th</div>
    <div class="weekday">Fr</div>
    <div class="weekday">Sa</div>

    {#each calendarDays as day}
      <button
        class="day"
        class:other-month={!isSameMonth(day, viewDate)}
        class:selected={isSameDay(day, selectedDate)}
        class:today={isSameDay(day, new Date())}
        class:has-notes={hasNotes(day)}
        onclick={() => selectDay(day)}
      >
        {format(day, 'd')}
      </button>
    {/each}
  </div>
</div>

<style>
  .calendar {
    padding: 0.5rem;
  }

  .calendar-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 0.5rem;
  }

  .month-label {
    font-size: 0.875rem;
    font-weight: 500;
  }

  .nav-btn {
    background: none;
    border: none;
    padding: 0.25rem 0.5rem;
    cursor: pointer;
    color: var(--text-secondary);
    border-radius: 4px;
  }

  .nav-btn:hover {
    background: var(--bg-hover);
    color: var(--text-primary);
  }

  .calendar-grid {
    display: grid;
    grid-template-columns: repeat(7, 1fr);
    gap: 2px;
  }

  .weekday {
    font-size: 0.625rem;
    text-align: center;
    color: var(--text-secondary);
    padding: 0.25rem;
  }

  .day {
    aspect-ratio: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 0.75rem;
    border: none;
    background: none;
    cursor: pointer;
    border-radius: 4px;
    color: var(--text-primary);
    position: relative;
  }

  .day:hover {
    background: var(--bg-hover);
  }

  .day.other-month {
    color: var(--text-secondary);
    opacity: 0.5;
  }

  .day.today {
    font-weight: 600;
    color: var(--accent-color);
  }

  .day.selected {
    background: var(--accent-color);
    color: white;
  }

  .day.has-notes::after {
    content: '';
    position: absolute;
    bottom: 2px;
    width: 4px;
    height: 4px;
    background: var(--accent-color);
    border-radius: 50%;
  }

  .day.selected.has-notes::after {
    background: white;
  }
</style>
```

**Step 2: Update Sidebar to use Calendar**

Update `src/lib/components/Sidebar.svelte`:

```svelte
<script>
  import Calendar from './Calendar.svelte';
  import { getDatesWithNotes } from '../db/dailyNotes.js';
  import { startOfMonth, endOfMonth } from 'date-fns';

  let { selectedDate = $bindable(new Date()), onViewChange = () => {} } = $props();

  let datesWithNotes = $state([]);

  $effect(() => {
    const start = startOfMonth(selectedDate);
    const end = endOfMonth(selectedDate);
    datesWithNotes = getDatesWithNotes(start, end);
  });

  function goToToday() {
    selectedDate = new Date();
    onViewChange('today');
  }
</script>

<aside class="sidebar">
  <div class="logo">
    <h1>Secretariat</h1>
  </div>

  <nav class="nav">
    <button
      class="nav-item"
      onclick={goToToday}
    >
      Today
    </button>
  </nav>

  <div class="sidebar-section">
    <h2>Calendar</h2>
    <Calendar bind:selectedDate {datesWithNotes} />
  </div>

  <div class="sidebar-section">
    <h2>Sections</h2>
    <p class="placeholder">Sections coming soon</p>
  </div>

  <div class="sidebar-footer">
    <button class="nav-item" onclick={() => onViewChange('settings')}>Settings</button>
  </div>
</aside>

<style>
  .sidebar {
    width: 260px;
    background: var(--bg-secondary);
    border-right: 1px solid var(--border-color);
    display: flex;
    flex-direction: column;
    height: 100vh;
  }

  .logo {
    padding: 1rem;
    border-bottom: 1px solid var(--border-color);
  }

  .logo h1 {
    font-size: 1.25rem;
    font-weight: 600;
    margin: 0;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
  }

  .nav {
    padding: 0.5rem;
  }

  .nav-item {
    width: 100%;
    padding: 0.5rem 0.75rem;
    background: none;
    border: none;
    border-radius: 6px;
    text-align: left;
    cursor: pointer;
    color: var(--text-primary);
    font-size: 0.875rem;
  }

  .nav-item:hover {
    background: var(--bg-hover);
  }

  .sidebar-section {
    padding: 0.5rem 1rem;
    border-top: 1px solid var(--border-color);
  }

  .sidebar-section h2 {
    font-size: 0.75rem;
    text-transform: uppercase;
    color: var(--text-secondary);
    margin: 0 0 0.5rem 0;
    letter-spacing: 0.05em;
  }

  .placeholder {
    font-size: 0.75rem;
    color: var(--text-secondary);
    margin: 0;
  }

  .sidebar-footer {
    margin-top: auto;
    padding: 0.5rem;
    border-top: 1px solid var(--border-color);
  }
</style>
```

**Step 3: Verify build**

Run: `npm run build`
Expected: Build succeeds

**Step 4: Commit**

```bash
git add src/lib/components/
git commit -m "feat: add calendar component with month navigation"
```

---

## Task 6: Create Quick Capture Component

**Files:**
- Create: `src/lib/components/QuickCapture.svelte`
- Create: `src/lib/components/CategoryPicker.svelte`

**Step 1: Create CategoryPicker component**

Create `src/lib/components/CategoryPicker.svelte`:

```svelte
<script>
  let { categories = [], selectedId = $bindable(null) } = $props();
</script>

<select class="category-picker" bind:value={selectedId}>
  <option value={null}>No category</option>
  {#each categories as category}
    <option value={category.id}>
      {category.name}
    </option>
  {/each}
</select>

<style>
  .category-picker {
    padding: 0.5rem;
    border: 1px solid var(--border-color);
    border-radius: 6px;
    background: var(--bg-primary);
    color: var(--text-primary);
    font-size: 0.875rem;
    cursor: pointer;
  }

  .category-picker:focus {
    outline: none;
    border-color: var(--accent-color);
  }
</style>
```

**Step 2: Create QuickCapture component**

Create `src/lib/components/QuickCapture.svelte`:

```svelte
<script>
  import CategoryPicker from './CategoryPicker.svelte';

  let { categories = [], onSubmit = () => {} } = $props();

  let text = $state('');
  let categoryId = $state(null);

  function handleSubmit(e) {
    e.preventDefault();
    if (!text.trim()) return;

    onSubmit({ text: text.trim(), categoryId });
    text = '';
    categoryId = null;
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      handleSubmit(e);
    }
  }
</script>

<form class="quick-capture" onsubmit={handleSubmit}>
  <div class="input-row">
    <input
      type="text"
      class="capture-input"
      placeholder="What are you working on?"
      bind:value={text}
      onkeydown={handleKeyDown}
    />
    <CategoryPicker {categories} bind:selectedId={categoryId} />
    <button type="submit" class="submit-btn" disabled={!text.trim()}>
      Add
    </button>
  </div>
</form>

<style>
  .quick-capture {
    background: var(--bg-secondary);
    border: 1px solid var(--border-color);
    border-radius: 8px;
    padding: 1rem;
    margin-bottom: 1.5rem;
  }

  .input-row {
    display: flex;
    gap: 0.5rem;
    align-items: center;
  }

  .capture-input {
    flex: 1;
    padding: 0.5rem 0.75rem;
    border: 1px solid var(--border-color);
    border-radius: 6px;
    background: var(--bg-primary);
    color: var(--text-primary);
    font-size: 0.875rem;
  }

  .capture-input:focus {
    outline: none;
    border-color: var(--accent-color);
  }

  .capture-input::placeholder {
    color: var(--text-secondary);
  }

  .submit-btn {
    padding: 0.5rem 1rem;
    background: var(--accent-color);
    color: white;
    border: none;
    border-radius: 6px;
    font-size: 0.875rem;
    font-weight: 500;
    cursor: pointer;
  }

  .submit-btn:hover:not(:disabled) {
    opacity: 0.9;
  }

  .submit-btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
</style>
```

**Step 3: Verify build**

Run: `npm run build`
Expected: Build succeeds

**Step 4: Commit**

```bash
git add src/lib/components/
git commit -m "feat: add quick capture and category picker components"
```

---

## Task 7: Create Entry Display Components

**Files:**
- Create: `src/lib/components/EntryList.svelte`
- Create: `src/lib/components/EntryCard.svelte`
- Create: `src/lib/components/TextBlock.svelte`

**Step 1: Create TextBlock component**

Create `src/lib/components/TextBlock.svelte`:

```svelte
<script>
  let { block, onUpdate = () => {} } = $props();

  let editing = $state(false);
  let editText = $state('');

  function startEdit() {
    editText = block.content.text || '';
    editing = true;
  }

  function saveEdit() {
    if (editText.trim() !== (block.content.text || '')) {
      onUpdate({ ...block.content, text: editText.trim() });
    }
    editing = false;
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      saveEdit();
    }
    if (e.key === 'Escape') {
      editing = false;
    }
  }
</script>

<div class="text-block" class:ai-authored={block.author === 'ai'}>
  {#if editing}
    <input
      type="text"
      class="edit-input"
      bind:value={editText}
      onblur={saveEdit}
      onkeydown={handleKeyDown}
      autofocus
    />
  {:else}
    <p class="block-text" onclick={startEdit}>
      {block.content.text || ''}
    </p>
  {/if}
</div>

<style>
  .text-block {
    padding: 0.25rem 0;
  }

  .text-block.ai-authored {
    border-left: 2px solid var(--accent-color);
    padding-left: 0.5rem;
    margin-left: -0.5rem;
  }

  .block-text {
    margin: 0;
    cursor: text;
    min-height: 1.5em;
  }

  .block-text:hover {
    background: var(--bg-hover);
    border-radius: 4px;
  }

  .edit-input {
    width: 100%;
    padding: 0.25rem;
    border: 1px solid var(--accent-color);
    border-radius: 4px;
    background: var(--bg-primary);
    color: var(--text-primary);
    font-size: inherit;
    font-family: inherit;
  }

  .edit-input:focus {
    outline: none;
  }
</style>
```

**Step 2: Create EntryCard component**

Create `src/lib/components/EntryCard.svelte`:

```svelte
<script>
  import TextBlock from './TextBlock.svelte';
  import { format } from 'date-fns';
  import { getBlocksForParent, updateBlock } from '../db/blocks.js';

  let { entry } = $props();

  let blocks = $state([]);

  $effect(() => {
    blocks = getBlocksForParent('entry', entry.id);
  });

  function handleBlockUpdate(blockId, newContent) {
    updateBlock(blockId, newContent);
    blocks = getBlocksForParent('entry', entry.id);
  }
</script>

<article class="entry-card">
  <div class="entry-header">
    <span class="timestamp">
      {format(new Date(entry.created_at), 'h:mm a')}
    </span>
    {#if entry.category_name}
      <span
        class="category-badge"
        style="background-color: {entry.category_color}20; color: {entry.category_color}"
      >
        {entry.category_name}
      </span>
    {/if}
    {#if entry.is_ai_generated}
      <span class="ai-badge">AI</span>
    {/if}
  </div>

  <div class="entry-content">
    {#each blocks as block}
      {#if block.type === 'text'}
        <TextBlock
          {block}
          onUpdate={(content) => handleBlockUpdate(block.id, content)}
        />
      {/if}
    {/each}

    {#if blocks.length === 0}
      <p class="empty">No content</p>
    {/if}
  </div>
</article>

<style>
  .entry-card {
    background: var(--bg-secondary);
    border: 1px solid var(--border-color);
    border-radius: 8px;
    padding: 1rem;
    margin-bottom: 0.75rem;
  }

  .entry-header {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    margin-bottom: 0.5rem;
  }

  .timestamp {
    font-size: 0.75rem;
    color: var(--text-secondary);
  }

  .category-badge {
    font-size: 0.625rem;
    font-weight: 500;
    padding: 0.125rem 0.5rem;
    border-radius: 9999px;
    text-transform: uppercase;
    letter-spacing: 0.025em;
  }

  .ai-badge {
    font-size: 0.625rem;
    font-weight: 500;
    padding: 0.125rem 0.375rem;
    border-radius: 4px;
    background: var(--accent-color);
    color: white;
  }

  .entry-content {
    font-size: 0.875rem;
  }

  .empty {
    color: var(--text-secondary);
    font-style: italic;
    margin: 0;
  }
</style>
```

**Step 3: Create EntryList component**

Create `src/lib/components/EntryList.svelte`:

```svelte
<script>
  import EntryCard from './EntryCard.svelte';

  let { entries = [] } = $props();
</script>

<div class="entry-list">
  {#if entries.length === 0}
    <div class="empty-state">
      <p>No entries yet. Start capturing your work above!</p>
    </div>
  {:else}
    {#each entries as entry (entry.id)}
      <EntryCard {entry} />
    {/each}
  {/if}
</div>

<style>
  .entry-list {
    display: flex;
    flex-direction: column;
  }

  .empty-state {
    text-align: center;
    padding: 3rem;
    color: var(--text-secondary);
  }

  .empty-state p {
    margin: 0;
  }
</style>
```

**Step 4: Verify build**

Run: `npm run build`
Expected: Build succeeds

**Step 5: Commit**

```bash
git add src/lib/components/
git commit -m "feat: add entry display components with text block editing"
```

---

## Task 8: Create Day View and Wire Everything Together

**Files:**
- Create: `src/lib/components/DayView.svelte`
- Modify: `src/lib/components/Layout.svelte`
- Modify: `src/App.svelte`

**Step 1: Create DayView component**

Create `src/lib/components/DayView.svelte`:

```svelte
<script>
  import { format, isToday } from 'date-fns';
  import QuickCapture from './QuickCapture.svelte';
  import EntryList from './EntryList.svelte';
  import { getOrCreateDailyNote } from '../db/dailyNotes.js';
  import { createEntry, getEntriesForDailyNote } from '../db/entries.js';
  import { createBlock } from '../db/blocks.js';
  import { getAllCategories } from '../db/categories.js';

  let { date = new Date() } = $props();

  let categories = $state([]);
  let entries = $state([]);
  let dailyNote = $state(null);

  $effect(() => {
    categories = getAllCategories();
  });

  $effect(() => {
    dailyNote = getOrCreateDailyNote(date);
    refreshEntries();
  });

  function refreshEntries() {
    if (dailyNote) {
      entries = getEntriesForDailyNote(dailyNote.id);
    }
  }

  function handleCapture({ text, categoryId }) {
    if (!dailyNote) return;

    const entryId = createEntry(dailyNote.id, categoryId);
    createBlock('entry', entryId, 'text', { text });
    refreshEntries();
  }

  let title = $derived(isToday(date) ? 'Today' : format(date, 'EEEE, MMMM d, yyyy'));
</script>

<div class="day-view">
  <header class="day-header">
    <h1>{title}</h1>
    {#if !isToday(date)}
      <p class="date-subtitle">{format(date, 'MMMM d, yyyy')}</p>
    {/if}
  </header>

  <QuickCapture {categories} onSubmit={handleCapture} />

  <EntryList {entries} />
</div>

<style>
  .day-view {
    max-width: 800px;
    margin: 0 auto;
  }

  .day-header {
    margin-bottom: 1.5rem;
  }

  .day-header h1 {
    font-size: 1.5rem;
    font-weight: 600;
    margin: 0;
  }

  .date-subtitle {
    font-size: 0.875rem;
    color: var(--text-secondary);
    margin: 0.25rem 0 0 0;
  }
</style>
```

**Step 2: Update Layout component**

Replace `src/lib/components/Layout.svelte`:

```svelte
<script>
  import Sidebar from './Sidebar.svelte';

  let {
    selectedDate = $bindable(new Date()),
    currentView = $bindable('today'),
    children
  } = $props();

  function handleViewChange(view) {
    currentView = view;
  }
</script>

<div class="layout">
  <Sidebar
    bind:selectedDate
    onViewChange={handleViewChange}
  />
  <main class="main-content">
    {@render children()}
  </main>
</div>

<style>
  .layout {
    display: flex;
    height: 100vh;
    overflow: hidden;
  }

  .main-content {
    flex: 1;
    overflow-y: auto;
    padding: 1.5rem;
    background: var(--bg-primary);
  }
</style>
```

**Step 3: Update App.svelte**

Replace `src/App.svelte`:

```svelte
<script>
  import Layout from './lib/components/Layout.svelte';
  import DayView from './lib/components/DayView.svelte';
  import { onMount } from 'svelte';
  import { initDatabase } from './lib/db/database.js';

  let dbReady = $state(false);
  let error = $state(null);
  let selectedDate = $state(new Date());
  let currentView = $state('today');

  onMount(async () => {
    try {
      await initDatabase();
      dbReady = true;
    } catch (e) {
      error = e.message;
      console.error('Failed to initialize database:', e);
    }
  });
</script>

{#if error}
  <div class="error">
    <h1>Error</h1>
    <p>{error}</p>
  </div>
{:else if !dbReady}
  <div class="loading">
    <p>Loading...</p>
  </div>
{:else}
  <Layout bind:selectedDate bind:currentView>
    {#if currentView === 'today' || currentView === 'day'}
      <DayView date={selectedDate} />
    {:else if currentView === 'settings'}
      <div class="settings-view">
        <h1>Settings</h1>
        <p>Settings coming soon...</p>
      </div>
    {/if}
  </Layout>
{/if}

<style>
  .loading, .error {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    height: 100vh;
    gap: 1rem;
  }

  .error {
    color: #ef4444;
  }

  .settings-view {
    max-width: 600px;
    margin: 0 auto;
  }

  .settings-view h1 {
    font-size: 1.5rem;
    font-weight: 600;
    margin-bottom: 1rem;
  }
</style>
```

**Step 4: Verify build and test**

Run: `npm run build`
Expected: Build succeeds

Run: `npm run dev`
Expected: Full app with sidebar, calendar, quick capture, and entry list working

**Step 5: Commit**

```bash
git add src/
git commit -m "feat: wire up day view with quick capture and entry display"
```

---

## Task 9: Create Basic Settings Page

**Files:**
- Create: `src/lib/components/Settings.svelte`
- Create: `src/lib/db/settings.js`
- Modify: `src/App.svelte`

**Step 1: Create settings data access**

Create `src/lib/db/settings.js`:

```javascript
import { getDb, saveDatabase } from './database.js';

export function getSetting(key) {
  const db = getDb();
  const result = db.exec('SELECT value FROM settings WHERE key = ?', [key]);

  if (result.length === 0 || result[0].values.length === 0) {
    return null;
  }

  return result[0].values[0][0];
}

export function setSetting(key, value) {
  const db = getDb();
  db.run(
    'INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)',
    [key, value]
  );
  saveDatabase();
}

export function deleteSetting(key) {
  const db = getDb();
  db.run('DELETE FROM settings WHERE key = ?', [key]);
  saveDatabase();
}
```

**Step 2: Create Settings component**

Create `src/lib/components/Settings.svelte`:

```svelte
<script>
  import { getSetting, setSetting } from '../db/settings.js';
  import { getAllCategories, createCategory, deleteCategory, updateCategory } from '../db/categories.js';

  let geminiKey = $state('');
  let showKey = $state(false);
  let testStatus = $state(null);
  let categories = $state([]);

  let newCategoryName = $state('');
  let newCategoryColor = $state('#6b7280');

  $effect(() => {
    geminiKey = getSetting('gemini_api_key') || '';
    categories = getAllCategories();
  });

  function saveApiKey() {
    setSetting('gemini_api_key', geminiKey);
    testStatus = 'saved';
    setTimeout(() => testStatus = null, 2000);
  }

  async function testApiKey() {
    testStatus = 'testing';
    try {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models?key=${geminiKey}`
      );
      if (response.ok) {
        testStatus = 'success';
      } else {
        testStatus = 'error';
      }
    } catch {
      testStatus = 'error';
    }
    setTimeout(() => testStatus = null, 3000);
  }

  function addCategory() {
    if (!newCategoryName.trim()) return;
    createCategory(newCategoryName.trim(), newCategoryColor);
    newCategoryName = '';
    newCategoryColor = '#6b7280';
    categories = getAllCategories();
  }

  function removeCategory(id) {
    deleteCategory(id);
    categories = getAllCategories();
  }
</script>

<div class="settings">
  <h1>Settings</h1>

  <section class="settings-section">
    <h2>Gemini API Key</h2>
    <p class="section-desc">Enter your Google Gemini API key to enable AI features.</p>

    <div class="api-key-row">
      <input
        type={showKey ? 'text' : 'password'}
        class="api-key-input"
        bind:value={geminiKey}
        placeholder="Enter your API key"
      />
      <button class="btn secondary" onclick={() => showKey = !showKey}>
        {showKey ? 'Hide' : 'Show'}
      </button>
    </div>

    <div class="api-key-actions">
      <button class="btn primary" onclick={saveApiKey}>Save</button>
      <button class="btn secondary" onclick={testApiKey} disabled={!geminiKey}>
        Test Connection
      </button>
      {#if testStatus === 'saved'}
        <span class="status success">Saved!</span>
      {:else if testStatus === 'testing'}
        <span class="status">Testing...</span>
      {:else if testStatus === 'success'}
        <span class="status success">Connection successful!</span>
      {:else if testStatus === 'error'}
        <span class="status error">Connection failed</span>
      {/if}
    </div>
  </section>

  <section class="settings-section">
    <h2>Categories</h2>
    <p class="section-desc">Manage categories for organizing your entries.</p>

    <div class="category-list">
      {#each categories as cat}
        <div class="category-item">
          <span
            class="category-color"
            style="background-color: {cat.color}"
          ></span>
          <span class="category-name">{cat.name}</span>
          {#if cat.is_default}
            <span class="default-badge">Default</span>
          {:else}
            <button
              class="delete-btn"
              onclick={() => removeCategory(cat.id)}
            >
              Delete
            </button>
          {/if}
        </div>
      {/each}
    </div>

    <div class="add-category">
      <input
        type="text"
        class="category-input"
        bind:value={newCategoryName}
        placeholder="Category name"
      />
      <input
        type="color"
        class="color-input"
        bind:value={newCategoryColor}
      />
      <button class="btn primary" onclick={addCategory}>Add</button>
    </div>
  </section>
</div>

<style>
  .settings {
    max-width: 600px;
    margin: 0 auto;
  }

  h1 {
    font-size: 1.5rem;
    font-weight: 600;
    margin-bottom: 2rem;
  }

  .settings-section {
    background: var(--bg-secondary);
    border: 1px solid var(--border-color);
    border-radius: 8px;
    padding: 1.5rem;
    margin-bottom: 1.5rem;
  }

  .settings-section h2 {
    font-size: 1rem;
    font-weight: 600;
    margin: 0 0 0.25rem 0;
  }

  .section-desc {
    font-size: 0.875rem;
    color: var(--text-secondary);
    margin: 0 0 1rem 0;
  }

  .api-key-row {
    display: flex;
    gap: 0.5rem;
    margin-bottom: 0.75rem;
  }

  .api-key-input {
    flex: 1;
    padding: 0.5rem 0.75rem;
    border: 1px solid var(--border-color);
    border-radius: 6px;
    background: var(--bg-primary);
    color: var(--text-primary);
    font-family: monospace;
    font-size: 0.875rem;
  }

  .api-key-actions {
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }

  .btn {
    padding: 0.5rem 1rem;
    border: none;
    border-radius: 6px;
    font-size: 0.875rem;
    font-weight: 500;
    cursor: pointer;
  }

  .btn.primary {
    background: var(--accent-color);
    color: white;
  }

  .btn.secondary {
    background: var(--bg-hover);
    color: var(--text-primary);
  }

  .btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .status {
    font-size: 0.875rem;
    color: var(--text-secondary);
  }

  .status.success {
    color: #22c55e;
  }

  .status.error {
    color: #ef4444;
  }

  .category-list {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    margin-bottom: 1rem;
  }

  .category-item {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.5rem;
    background: var(--bg-primary);
    border-radius: 6px;
  }

  .category-color {
    width: 1rem;
    height: 1rem;
    border-radius: 4px;
  }

  .category-name {
    flex: 1;
    font-size: 0.875rem;
  }

  .default-badge {
    font-size: 0.625rem;
    padding: 0.125rem 0.375rem;
    background: var(--bg-hover);
    border-radius: 4px;
    color: var(--text-secondary);
  }

  .delete-btn {
    font-size: 0.75rem;
    padding: 0.25rem 0.5rem;
    background: none;
    border: 1px solid var(--border-color);
    border-radius: 4px;
    color: var(--text-secondary);
    cursor: pointer;
  }

  .delete-btn:hover {
    border-color: #ef4444;
    color: #ef4444;
  }

  .add-category {
    display: flex;
    gap: 0.5rem;
  }

  .category-input {
    flex: 1;
    padding: 0.5rem 0.75rem;
    border: 1px solid var(--border-color);
    border-radius: 6px;
    background: var(--bg-primary);
    color: var(--text-primary);
    font-size: 0.875rem;
  }

  .color-input {
    width: 40px;
    height: 36px;
    padding: 2px;
    border: 1px solid var(--border-color);
    border-radius: 6px;
    cursor: pointer;
  }
</style>
```

**Step 3: Update App.svelte to use Settings**

Replace `src/App.svelte`:

```svelte
<script>
  import Layout from './lib/components/Layout.svelte';
  import DayView from './lib/components/DayView.svelte';
  import Settings from './lib/components/Settings.svelte';
  import { onMount } from 'svelte';
  import { initDatabase } from './lib/db/database.js';

  let dbReady = $state(false);
  let error = $state(null);
  let selectedDate = $state(new Date());
  let currentView = $state('today');

  onMount(async () => {
    try {
      await initDatabase();
      dbReady = true;
    } catch (e) {
      error = e.message;
      console.error('Failed to initialize database:', e);
    }
  });
</script>

{#if error}
  <div class="error">
    <h1>Error</h1>
    <p>{error}</p>
  </div>
{:else if !dbReady}
  <div class="loading">
    <p>Loading...</p>
  </div>
{:else}
  <Layout bind:selectedDate bind:currentView>
    {#if currentView === 'today' || currentView === 'day'}
      <DayView date={selectedDate} />
    {:else if currentView === 'settings'}
      <Settings />
    {/if}
  </Layout>
{/if}

<style>
  .loading, .error {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    height: 100vh;
    gap: 1rem;
  }

  .error {
    color: #ef4444;
  }
</style>
```

**Step 4: Verify build and test**

Run: `npm run build`
Expected: Build succeeds

Run: `npm run dev`
Expected: Settings page shows API key input and category management

**Step 5: Commit**

```bash
git add src/
git commit -m "feat: add settings page with API key and category management"
```

---

## Task 10: Final Polish and Testing

**Files:**
- Various minor fixes

**Step 1: Test the complete flow**

Run: `npm run dev`

Test:
1. App loads with sidebar and calendar
2. Click on calendar dates - view updates
3. Enter text in quick capture, select category, press Add
4. Entry appears in list with timestamp and category badge
5. Click on entry text to edit
6. Navigate to Settings
7. Enter API key, save, test connection
8. Add a custom category
9. Refresh page - data persists

**Step 2: Fix any issues found**

Address any bugs discovered during testing.

**Step 3: Final commit**

```bash
git add -A
git commit -m "feat: complete core notes implementation

- SQLite database with schema for notes, entries, blocks, categories
- Calendar navigation with date highlighting
- Quick capture with category selection
- Entry display with text block editing
- Settings page with API key and category management
- Data persistence via localStorage"
```

---

## Summary

This implementation plan covers:

1. **Database**: SQLite via sql.js with full schema
2. **Data Access**: CRUD operations for all entities
3. **UI Components**: Layout, Sidebar, Calendar, QuickCapture, EntryList, Settings
4. **Features**: Quick capture, category picker, text block editing, API key storage

**Not included (future tasks):**
- AI integration (Gemini API calls)
- Jira integration
- Synthesized sections
- Additional block types (list, checkbox, code, heading)
- Block reordering
- Entry deletion
