# DB Export, Import & Clean — Design

## Overview

Add three data management features to the Settings page: export the database as a file, import a database from a file, and reset the database to a clean state.

## Decisions

- **Export format**: Raw SQLite binary (`.db`) via `db.export()` — simplest, preserves exact state
- **File dialogs**: Browser File API — no Electron IPC changes needed
- **Clean DB confirmation**: Double confirmation — user must type "DELETE" to proceed

## Export

1. Call `db.export()` to get `Uint8Array`
2. Wrap in `Blob`, create object URL, trigger browser download
3. Filename: `secretariat-backup-YYYY-MM-DD.db`

## Import

1. Hidden `<input type="file" accept=".db,.sqlite">` triggered by button
2. Read file as `ArrayBuffer` → `Uint8Array`
3. Open new sql.js database from imported data to validate
4. Verify expected tables exist (`blocks`, `entries`, `daily_notes`, `categories`, `settings`)
5. If valid: replace in-memory DB, flush to IndexedDB, reload app
6. If invalid: show error toast, no changes

## Clean DB (Reset)

1. "Reset Database" button with destructive styling
2. Confirmation modal with warning text
3. User must type "DELETE" to enable confirm button
4. On confirm: drop all tables, re-create schema, seed default categories
5. Flush to IndexedDB, reload app

## New DB Service Functions (`database.ts`)

- `exportDatabase(): Uint8Array` — returns raw DB bytes
- `importDatabase(data: Uint8Array): boolean` — validates and replaces DB
- `resetDatabase(): void` — drops all data, re-creates with defaults

## UI in Settings

New "Data Management" section after existing sections:

```
[Export Database]  [Import Database]
[Reset Database — destructive red styling]
```
