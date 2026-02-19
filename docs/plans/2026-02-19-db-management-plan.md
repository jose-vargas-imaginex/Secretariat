# DB Export, Import & Clean — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add database export, import, and reset functionality to the Settings page.

**Architecture:** Three new functions in `database.ts` handle the DB operations. The Settings component gets a new "Data Management" section with export/import buttons and a destructive reset button with double confirmation (type "DELETE"). Uses browser File API for file dialogs — no Electron IPC changes.

**Tech Stack:** Svelte 5, sql.js, TypeScript, Browser File API

---

### Task 1: Add DB service functions to `database.ts`

**Files:**
- Modify: `src/lib/services/db/database.ts`

**Step 1: Add `exportDatabase` function**

Add after the `getDb()` function at line 126:

```typescript
export function exportDatabase(): Uint8Array {
  const database = getDb();
  return database.export();
}
```

**Step 2: Add `importDatabase` function**

Add after `exportDatabase`:

```typescript
export async function importDatabase(data: Uint8Array): Promise<void> {
  const SQL = await initSqlJs({
    locateFile: (file: string) => `https://sql.js.org/dist/${file}`
  });

  // Validate the imported data by opening it and checking for expected tables
  const testDb = new SQL.Database(data);
  const requiredTables = ['blocks', 'entries', 'daily_notes', 'categories', 'settings'];

  try {
    const result = testDb.exec("SELECT name FROM sqlite_master WHERE type='table'");
    const tableNames = result[0]?.values.map((row) => row[0] as string) ?? [];

    for (const table of requiredTables) {
      if (!tableNames.includes(table)) {
        throw new Error(`Invalid database: missing table "${table}"`);
      }
    }
  } catch (e) {
    testDb.close();
    throw e;
  }

  // Valid — replace current DB
  testDb.close();
  if (db) {
    db.close();
  }
  db = new SQL.Database(data);
  await flushInMemoryDataToStorage();
}
```

**Step 3: Add `resetDatabase` function**

Add after `importDatabase`:

```typescript
export async function resetDatabase(): Promise<void> {
  if (db) {
    db.close();
  }

  const SQL = await initSqlJs({
    locateFile: (file: string) => `https://sql.js.org/dist/${file}`
  });

  db = new SQL.Database();
  db.run(SCHEMA);
  await seedDefaultCategories();
}
```

**Step 4: Commit**

```bash
git add src/lib/services/db/database.ts
git commit -m "feat: add exportDatabase, importDatabase, resetDatabase functions"
```

---

### Task 2: Add Data Management UI to Settings

**Files:**
- Modify: `src/lib/components/Settings.svelte`

**IMPORTANT:** Use `svelte:svelte-file-editor` agent or `svelte:svelte-code-writer` skill for all edits to this file.

**Step 1: Add imports and state**

Add to the `<script>` tag imports:

```typescript
import {
  exportDatabase,
  importDatabase,
  resetDatabase,
} from "../services/db/database.js";
```

Add state variables after existing state declarations:

```typescript
let importStatus = $state<'success' | 'error' | null>(null);
let importError = $state('');
let showResetConfirm = $state(false);
let resetConfirmText = $state('');
```

**Step 2: Add export handler**

```typescript
function handleExport() {
  const data = exportDatabase();
  const blob = new Blob([data], { type: 'application/x-sqlite3' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  const date = new Date().toISOString().split('T')[0];
  a.href = url;
  a.download = `secretariat-backup-${date}.db`;
  a.click();
  URL.revokeObjectURL(url);
}
```

**Step 3: Add import handler**

```typescript
async function handleImport(event: Event) {
  const input = event.target as HTMLInputElement;
  const file = input.files?.[0];
  if (!file) return;

  try {
    const buffer = await file.arrayBuffer();
    const data = new Uint8Array(buffer);
    await importDatabase(data);
    importStatus = 'success';
    setTimeout(() => window.location.reload(), 1000);
  } catch (e) {
    importStatus = 'error';
    importError = e instanceof Error ? e.message : 'Invalid database file';
    setTimeout(() => { importStatus = null; importError = ''; }, 3000);
  }

  // Reset the input so the same file can be re-selected
  input.value = '';
}
```

**Step 4: Add reset handler**

```typescript
async function handleReset() {
  await resetDatabase();
  window.location.reload();
}
```

**Step 5: Add Data Management section markup**

Add after the Categories `</section>` closing tag (after line 131):

```svelte
<section class="settings-section">
  <h2>Data Management</h2>
  <p class="section-desc">Export, import, or reset your database.</p>

  <div class="data-actions">
    <button class="btn secondary" onclick={handleExport}>
      Export Database
    </button>
    <label class="btn secondary import-label">
      Import Database
      <input
        type="file"
        accept=".db,.sqlite"
        onchange={handleImport}
        hidden
      />
    </label>
  </div>

  {#if importStatus === 'success'}
    <p class="status success">Database imported successfully. Reloading...</p>
  {:else if importStatus === 'error'}
    <p class="status error">{importError}</p>
  {/if}

  <div class="reset-section">
    <button class="btn danger" onclick={() => (showResetConfirm = true)}>
      Reset Database
    </button>

    {#if showResetConfirm}
      <div class="reset-confirm">
        <p class="reset-warning">
          This will permanently delete all your data and reset the database to its default state. This action cannot be undone.
        </p>
        <p class="reset-prompt">Type <strong>DELETE</strong> to confirm:</p>
        <input
          type="text"
          class="reset-input"
          bind:value={resetConfirmText}
          placeholder="Type DELETE"
        />
        <div class="reset-actions">
          <button
            class="btn danger"
            disabled={resetConfirmText !== 'DELETE'}
            onclick={handleReset}
          >
            Confirm Reset
          </button>
          <button
            class="btn secondary"
            onclick={() => { showResetConfirm = false; resetConfirmText = ''; }}
          >
            Cancel
          </button>
        </div>
      </div>
    {/if}
  </div>
</section>
```

**Step 6: Add styles**

Add these styles to the `<style>` block:

```css
.data-actions {
  display: flex;
  gap: 0.5rem;
  margin-bottom: 1rem;
}

.import-label {
  display: inline-flex;
  align-items: center;
  cursor: pointer;
}

.btn.danger {
  background: #dc2626;
  color: white;
}

.btn.danger:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.reset-section {
  border-top: 1px solid var(--border-color);
  padding-top: 1rem;
  margin-top: 1rem;
}

.reset-confirm {
  margin-top: 1rem;
  padding: 1rem;
  background: rgba(220, 38, 38, 0.05);
  border: 1px solid rgba(220, 38, 38, 0.2);
  border-radius: 6px;
}

.reset-warning {
  font-size: 0.875rem;
  color: #dc2626;
  margin: 0 0 0.75rem 0;
}

.reset-prompt {
  font-size: 0.875rem;
  margin: 0 0 0.5rem 0;
}

.reset-input {
  width: 100%;
  padding: 0.5rem 0.75rem;
  border: 1px solid var(--border-color);
  border-radius: 6px;
  background: var(--bg-primary);
  color: var(--text-primary);
  font-size: 0.875rem;
  margin-bottom: 0.75rem;
}

.reset-actions {
  display: flex;
  gap: 0.5rem;
}
```

**Step 7: Commit**

```bash
git add src/lib/components/Settings.svelte
git commit -m "feat: add data management UI to Settings (export, import, reset)"
```
