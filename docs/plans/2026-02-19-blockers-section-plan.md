# Blockers Section Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build the first persistent AI-generated section — "Current Blockers" — that analyzes daily notes over a configurable timeframe and presents editable blocker items.

**Architecture:** Uses existing `sections` + `entries` tables. Each blocker is an individual entry (`parent_type: 'section'`). AI merge logic preserves user-authored entries and intelligently updates AI-authored ones. New dedicated view accessible from the sidebar.

**Tech Stack:** Svelte 5 (runes), TypeScript, sql.js (SQLite via WASM), Gemini 2.5 Flash API

---

### Task 1: DB layer — sections CRUD

**Files:**
- Create: `src/lib/services/db/sections.ts`
- Modify: `src/lib/services/db/index.ts`

**Step 1: Create `sections.ts` with section and section-entry operations**

```typescript
// src/lib/services/db/sections.ts
import { getDb, flushInMemoryDataToStorage } from './database.js';
import type { Section, Entry } from './types.js';

export function getOrCreateSection(title: string): Section {
  const db = getDb();

  // Try to find existing
  const selectStmt = db.prepare('SELECT * FROM sections WHERE title = ?');
  selectStmt.bind([title]);

  let section: Section | null = null;
  if (selectStmt.step()) {
    const row = selectStmt.get();
    section = {
      id: row[0] as number,
      title: row[1] as string,
      position: row[2] as number,
      last_ai_update: row[3] as string | null,
      created_at: row[4] as string,
      updated_at: row[5] as string,
    };
  }
  selectStmt.free();

  if (section) return section;

  // Create new section
  const maxPosStmt = db.prepare('SELECT MAX(position) FROM sections');
  let maxPos = -1;
  if (maxPosStmt.step()) {
    maxPos = (maxPosStmt.get()[0] as number | null) ?? -1;
  }
  maxPosStmt.free();

  const insertStmt = db.prepare('INSERT INTO sections (title, position) VALUES (?, ?)');
  insertStmt.run([title, maxPos + 1]);
  insertStmt.free();

  const idResult = db.exec('SELECT last_insert_rowid()');
  const id = idResult[0].values[0][0] as number;

  flushInMemoryDataToStorage();

  // Re-fetch to get full row with timestamps
  const refetchStmt = db.prepare('SELECT * FROM sections WHERE id = ?');
  refetchStmt.bind([id]);
  refetchStmt.step();
  const refetchRow = refetchStmt.get();
  refetchStmt.free();

  return {
    id: refetchRow[0] as number,
    title: refetchRow[1] as string,
    position: refetchRow[2] as number,
    last_ai_update: refetchRow[3] as string | null,
    created_at: refetchRow[4] as string,
    updated_at: refetchRow[5] as string,
  };
}

export function getSection(title: string): Section | null {
  const db = getDb();
  const stmt = db.prepare('SELECT * FROM sections WHERE title = ?');
  stmt.bind([title]);

  let section: Section | null = null;
  if (stmt.step()) {
    const row = stmt.get();
    section = {
      id: row[0] as number,
      title: row[1] as string,
      position: row[2] as number,
      last_ai_update: row[3] as string | null,
      created_at: row[4] as string,
      updated_at: row[5] as string,
    };
  }
  stmt.free();
  return section;
}

export function updateSectionTimestamp(sectionId: number): void {
  const db = getDb();
  const stmt = db.prepare(
    'UPDATE sections SET last_ai_update = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP WHERE id = ?'
  );
  stmt.run([sectionId]);
  stmt.free();
  flushInMemoryDataToStorage();
}

export function getEntriesForSection(sectionId: number): Entry[] {
  const db = getDb();
  const stmt = db.prepare(
    'SELECT * FROM entries WHERE parent_type = ? AND parent_id = ? ORDER BY position ASC'
  );
  stmt.bind(['section', sectionId]);

  const entries: Entry[] = [];
  const columns = stmt.getColumnNames();
  while (stmt.step()) {
    const row = stmt.get();
    const entry = {} as Record<string, unknown>;
    columns.forEach((col, i) => (entry[col] = row[i]));
    entry.content = JSON.parse(entry.content as string);
    entries.push(entry as unknown as Entry);
  }
  stmt.free();
  return entries;
}

export function addEntryToSection(
  sectionId: number,
  content: { text: string; status: string },
  author: string = 'user'
): number {
  const db = getDb();

  const posStmt = db.prepare(
    'SELECT MAX(position) FROM entries WHERE parent_type = ? AND parent_id = ?'
  );
  posStmt.bind(['section', sectionId]);
  let maxPos = -1;
  if (posStmt.step()) {
    maxPos = (posStmt.get()[0] as number | null) ?? -1;
  }
  posStmt.free();

  const insertStmt = db.prepare(
    'INSERT INTO entries (parent_type, parent_id, type, content, position, author) VALUES (?, ?, ?, ?, ?, ?)'
  );
  insertStmt.bind(['section', sectionId, 'text', JSON.stringify(content), maxPos + 1, author]);
  insertStmt.step();

  const idResult = db.exec('SELECT last_insert_rowid()');
  const id = idResult[0].values[0][0] as number;

  insertStmt.free();
  flushInMemoryDataToStorage();
  return id;
}

export function deleteEntriesForSection(sectionId: number, authorFilter?: string): void {
  const db = getDb();
  let sql = 'DELETE FROM entries WHERE parent_type = ? AND parent_id = ?';
  const params: (string | number)[] = ['section', sectionId];

  if (authorFilter) {
    sql += ' AND author = ?';
    params.push(authorFilter);
  }

  const stmt = db.prepare(sql);
  stmt.run(params);
  stmt.free();
  flushInMemoryDataToStorage();
}
```

**Step 2: Export from `index.ts`**

Add this line to `src/lib/services/db/index.ts`:

```typescript
export { getOrCreateSection, getSection, getEntriesForSection, addEntryToSection, updateSectionTimestamp, deleteEntriesForSection } from './sections.js';
```

**Step 3: Commit**

```bash
git add src/lib/services/db/sections.ts src/lib/services/db/index.ts
git commit -m "feat: add sections DB layer (getOrCreateSection, entries CRUD)"
```

---

### Task 2: Blockers data query — fetch blocks across a date range

**Files:**
- Modify: `src/lib/services/db/blocks.ts`
- Modify: `src/lib/services/db/index.ts`

**Step 1: Add `getBlocksInDateRange` function to `blocks.ts`**

Append to the end of `src/lib/services/db/blocks.ts`:

```typescript
export function getBlocksInDateRange(startDate: string, endDate: string): Block[] {
  const db = getDb();

  const stmt = db.prepare(`
    SELECT b.*, c.name as category_name, c.color as category_color
    FROM blocks b
    LEFT JOIN categories c ON b.category_id = c.id
    JOIN daily_notes dn ON b.daily_note_id = dn.id
    WHERE dn.date >= ? AND dn.date <= ?
      AND b.is_ai_generated = 0
    ORDER BY dn.date ASC, b.created_at ASC
  `);
  stmt.bind([startDate, endDate]);

  const blocks: Block[] = [];
  const columns = stmt.getColumnNames();

  while (stmt.step()) {
    const row = stmt.get();
    const block: Record<string, unknown> = {};
    columns.forEach((col, i) => block[col] = row[i]);
    blocks.push(block as unknown as Block);
  }
  stmt.free();

  return blocks;
}
```

**Step 2: Export from `index.ts`**

Add `getBlocksInDateRange` to the blocks export line in `src/lib/services/db/index.ts`:

```typescript
export { createBlock, getBlocksForDailyNote, updateBlockCategory, deleteBlock, getBlocksInDateRange } from './blocks.js';
```

**Step 3: Commit**

```bash
git add src/lib/services/db/blocks.ts src/lib/services/db/index.ts
git commit -m "feat: add getBlocksInDateRange for querying blocks across dates"
```

---

### Task 3: Blockers AI service — prompt building, parsing, merge logic

**Files:**
- Create: `src/lib/services/blockersSummarization.ts`

**Step 1: Create the service file**

```typescript
// src/lib/services/blockersSummarization.ts
import { getBlocksInDateRange } from './db/blocks.js';
import { getEntriesForParent } from './db/entries.js';
import {
  getOrCreateSection,
  getEntriesForSection,
  addEntryToSection,
  updateSectionTimestamp,
  deleteEntriesForSection,
} from './db/sections.js';
import { updateEntry, deleteEntry } from './db/entries.js';
import { generateContent, GeminiError } from './gemini.js';
import { format, subDays } from 'date-fns';
import type { Block, Entry } from './db/types.js';

const SECTION_TITLE = 'Current Blockers';

interface BlockerItem {
  id: number | null;
  text: string;
  status: 'active' | 'resolved';
}

interface BlockersResponse {
  blockers: BlockerItem[];
}

export function getBlockersSection() {
  return getOrCreateSection(SECTION_TITLE);
}

export function getBlockerEntries(sectionId: number): Entry[] {
  return getEntriesForSection(sectionId);
}

function buildBlockerPrompt(
  blocks: Block[],
  entriesByBlock: Map<number, Entry[]>,
  existingAiEntries: { id: number; text: string; status: string }[]
): string {
  // Group blocks by date (using daily_note_id as proxy — we'll include date context)
  let notesText = '';
  for (const block of blocks) {
    const categoryLabel = block.category_name ? ` [${block.category_name}]` : '';
    notesText += `\n- ${block.title || '(untitled)'}${categoryLabel}\n`;

    const entries = entriesByBlock.get(block.id) ?? [];
    for (const entry of entries) {
      if (entry.type === 'text') {
        const text = (entry.content as { text?: string })?.text ?? '';
        if (text.trim()) {
          notesText += `  ${text}\n`;
        }
      }
    }
  }

  let existingText = '';
  if (existingAiEntries.length > 0) {
    existingText = `\nCurrent AI-generated blockers (with their IDs):\n`;
    for (const entry of existingAiEntries) {
      existingText += `- [ID: ${entry.id}] (${entry.status}) ${entry.text}\n`;
    }
  }

  return `You are analyzing work log entries to identify and track blockers — things that are preventing or slowing down progress.

Return a JSON object with this exact structure:
{
  "blockers": [
    { "id": <existing_id_or_null>, "text": "Description of the blocker", "status": "active" | "resolved" }
  ]
}

Rules:
- Identify blockers from context: look for things people are "stuck on", "waiting for", "blocked by", "can't proceed with", "need help with"
- Entries categorized as "Blocker" should always be considered
- For existing blockers (shown with IDs): keep them with their ID if still relevant, update text if wording should change, mark as "resolved" if the notes show the issue was resolved, or omit entirely if no longer relevant at all
- For new blockers: use "id": null
- Keep descriptions concise (1-2 sentences max)
- Only include genuine blockers, not general work items
- If no blockers are found, return an empty array
${existingText}
Here are the work log entries from the selected timeframe:
${notesText}`;
}

function parseBlockersResponse(text: string): BlockersResponse {
  const parsed = JSON.parse(text) as BlockersResponse;

  if (!parsed.blockers || !Array.isArray(parsed.blockers)) {
    throw new Error('Invalid blockers response structure');
  }

  for (const blocker of parsed.blockers) {
    if (typeof blocker.text !== 'string' || !['active', 'resolved'].includes(blocker.status)) {
      throw new Error('Invalid blocker item in response');
    }
  }

  return parsed;
}

export async function refreshBlockers(days: number): Promise<void> {
  const section = getOrCreateSection(SECTION_TITLE);

  // Calculate date range
  const endDate = new Date();
  const startDate = subDays(endDate, days);
  const startStr = format(startDate, 'yyyy-MM-dd');
  const endStr = format(endDate, 'yyyy-MM-dd');

  // Fetch all blocks in range
  const blocks = getBlocksInDateRange(startStr, endStr);

  // Fetch entries for each block
  const entriesByBlock = new Map<number, Entry[]>();
  for (const block of blocks) {
    entriesByBlock.set(block.id, getEntriesForParent('block', block.id));
  }

  // Get current section entries
  const currentEntries = getEntriesForSection(section.id);
  const aiEntries = currentEntries.filter((e) => e.author === 'ai');
  const existingAiEntries = aiEntries.map((e) => ({
    id: e.id,
    text: (e.content as { text?: string })?.text ?? '',
    status: (e.content as { status?: string })?.status ?? 'active',
  }));

  // Build prompt and call Gemini
  const prompt = buildBlockerPrompt(blocks, entriesByBlock, existingAiEntries);
  let responseText: string;
  try {
    responseText = await generateContent(prompt);
  } catch (err) {
    if (err instanceof GeminiError) throw err;
    throw new GeminiError('NETWORK_ERROR', 'Unexpected error calling Gemini API.');
  }

  // Parse response
  let result: BlockersResponse;
  try {
    result = parseBlockersResponse(responseText);
  } catch {
    throw new GeminiError('INVALID_RESPONSE', 'Unexpected response format from AI. Please try again.');
  }

  // Apply changes — merge AI entries
  const returnedIds = new Set<number>();

  for (const blocker of result.blockers) {
    if (blocker.id !== null) {
      // Update existing AI entry
      returnedIds.add(blocker.id);
      updateEntry(blocker.id, { text: blocker.text, status: blocker.status });
    } else {
      // Create new AI entry
      addEntryToSection(section.id, { text: blocker.text, status: blocker.status }, 'ai');
    }
  }

  // Delete AI entries not in response
  for (const existing of aiEntries) {
    if (!returnedIds.has(existing.id)) {
      deleteEntry(existing.id);
    }
  }

  // Update timestamp
  updateSectionTimestamp(section.id);
}
```

**Step 2: Commit**

```bash
git add src/lib/services/blockersSummarization.ts
git commit -m "feat: add blockers AI service with prompt building and merge logic"
```

---

### Task 4: Sidebar navigation — add "Current Blockers" link

**Files:**
- Modify: `src/lib/components/Sidebar.svelte:40-43` (replace placeholder)
- Modify: `src/App.svelte:11,35-42` (add 'blockers' view)

**Step 1: Update Sidebar to show "Current Blockers" link**

In `src/lib/components/Sidebar.svelte`, replace the placeholder paragraph (lines 41-42):

```svelte
<!-- Replace: -->
<p class="placeholder">Sections coming soon</p>

<!-- With: -->
<button class="nav-item section-link" onclick={() => onViewChange('blockers')}>
  Current Blockers
</button>
```

**Step 2: Add the `blockers` view to App.svelte**

In `src/App.svelte`:

1. Add the import at the top of the `<script>` block:
```typescript
import BlockersView from "./lib/components/BlockersView.svelte";
```

2. Update the `currentView` type (line 11):
```typescript
let currentView = $state<"today" | "day" | "settings" | "blockers">("today");
```

3. Add the view branch in the template (after the settings `{:else if}`):
```svelte
{:else if currentView === "blockers"}
  <BlockersView onNavigateToSettings={() => (currentView = "settings")} />
```

**Step 3: Commit**

```bash
git add src/lib/components/Sidebar.svelte src/App.svelte
git commit -m "feat: add blockers navigation to sidebar and App routing"
```

Note: This will not compile yet because `BlockersView.svelte` doesn't exist. That's created in Tasks 5-7.

---

### Task 5: BlockerItem component — individual blocker entry

**Files:**
- Create: `src/lib/components/BlockerItem.svelte`

**Step 1: Create the component**

Use the `svelte:svelte-file-editor` agent. The component should:

- Accept props: `entry: Entry`, `onUpdate: (content) => void`, `onDelete: () => void`, `onToggleStatus: () => void`
- Show a status indicator (filled circle for active, checkmark for resolved)
- Click status indicator to toggle active/resolved
- Inline text editing (click text to edit, Enter to save, Escape to cancel) — same pattern as `TextEntry.svelte`
- Delete button (appears on hover) with undo behavior — same pattern as `TextEntry.svelte`
- Visual distinction: resolved items are dimmed
- Subtle AI/user indicator (small "AI" badge for `author === 'ai'`)

Follow the exact patterns from `TextEntry.svelte` (lines 1-225) for editing and delete behavior.

**Step 2: Commit**

```bash
git add src/lib/components/BlockerItem.svelte
git commit -m "feat: add BlockerItem component with edit/delete/status toggle"
```

---

### Task 6: RefreshModal component — timeframe selection

**Files:**
- Create: `src/lib/components/RefreshModal.svelte`

**Step 1: Create the modal component**

Use the `svelte:svelte-file-editor` agent. The component should:

- Accept props: `open: boolean`, `onClose: () => void`, `onGenerate: (days: number) => void`, `loading: boolean`
- Radio button list with options:
  - Past week (7 days) — selected by default
  - Past 2 weeks (14 days)
  - Past 3 weeks (21 days)
  - Past month (30 days)
- Cancel button calls `onClose`
- Generate button calls `onGenerate(selectedDays)` — disabled and shows spinner when `loading` is true
- Modal overlay (click backdrop to close)
- Styled consistently with the rest of the app (use CSS variables)

**Step 2: Commit**

```bash
git add src/lib/components/RefreshModal.svelte
git commit -m "feat: add RefreshModal component for timeframe selection"
```

---

### Task 7: BlockersView component — main view

**Files:**
- Create: `src/lib/components/BlockersView.svelte`

**Step 1: Create the main view component**

Use the `svelte:svelte-file-editor` agent. The component should:

- Accept props: `onNavigateToSettings: () => void`
- On mount, call `getBlockersSection()` to get/create the section, then `getBlockerEntries(sectionId)` to load entries
- Use `refreshCounter` + `$derived.by()` pattern for reactivity (same as `DayView`)

**Layout (top to bottom):**
1. Header: "Current Blockers" title
2. Subtitle: "Last updated: [formatted date]" or "Not yet generated" — using `section.last_ai_update`
3. Refresh button (top-right area) — opens RefreshModal
4. Active blockers list (entries with `status: 'active'`), each rendered with `BlockerItem`
5. "Add blocker" button — creates a new user entry with `addEntryToSection(sectionId, { text: '', status: 'active' }, 'user')` and immediately puts it in edit mode
6. Resolved section with divider, showing entries with `status: 'resolved'` (dimmed)

**States:**
- Empty: "No blockers identified yet. Click Refresh to analyze your recent notes."
- Loading: `RefreshModal` handles the loading state internally; refresh button shows spinner after modal closes during generation
- Error: If `GeminiError` with code `NO_API_KEY` or `AUTH_ERROR`, show message with "Go to Settings" link (same as `SummarizeButton.svelte` pattern). For other errors, show toast.
- No entries but section exists and `last_ai_update` is set: "No blockers found in your recent notes."

**Handlers:**
- `handleRefresh(days)`: calls `refreshBlockers(days)`, then `refreshCounter++`
- `handleUpdate(entryId, content)`: calls `updateEntry(entryId, content)`, then `refreshCounter++`
- `handleDelete(entryId)`: calls `deleteEntry(entryId)`, then `refreshCounter++`
- `handleToggleStatus(entry)`: calls `updateEntry(entry.id, { ...content, status: toggled })`, then `refreshCounter++`
- `handleAddBlocker()`: calls `addEntryToSection(...)`, then `refreshCounter++`

**Step 2: Commit**

```bash
git add src/lib/components/BlockersView.svelte
git commit -m "feat: add BlockersView with refresh, edit, and manual entry support"
```

---

### Task 8: Integration — wire everything together and test

**Files:**
- Verify: All files from Tasks 1-7

**Step 1: Run the dev server**

```bash
npm run dev
```

Expected: No build errors. App loads.

**Step 2: Manual testing checklist**

1. Click "Current Blockers" in the sidebar → view loads with empty state message
2. Click "Refresh" → modal opens with timeframe options
3. Select timeframe, click "Generate" → spinner appears, AI generates blockers
4. Blockers appear in the list after generation
5. Click a blocker's text → inline edit mode activates
6. Edit text, press Enter → text updates
7. Click delete button → "Deleted. Undo?" appears, entry removes after timeout
8. Click "Add blocker" → new empty entry in edit mode
9. Type text, press Enter → user-authored blocker saved
10. Click Refresh again → AI entries may update, user entries stay untouched
11. Click status indicator → blocker moves to resolved section (or vice versa)
12. Verify "Last updated" timestamp updates after refresh
13. Test with no API key → error message with Settings link

**Step 3: Fix any issues found during testing**

**Step 4: Final commit**

```bash
git add -A
git commit -m "feat: complete Blockers section with AI generation and manual editing"
```
