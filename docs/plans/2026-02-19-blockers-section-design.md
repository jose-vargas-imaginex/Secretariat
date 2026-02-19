# Blockers Section Design

## Overview

The first persistent AI-generated section in Secretariat. Analyzes daily notes over a user-selected timeframe to identify and track blockers. Lives as a dedicated view accessible from the sidebar. Supports both AI-generated and manually-added blocker items, with AI-aware merge logic that preserves user edits on refresh.

## Data Model

Uses existing tables — no schema changes required.

### sections table

A single row for the Blockers section, created on first use:

```
{ id: 1, title: "Current Blockers", position: 0, last_ai_update: "2026-02-19T15:45:00Z" }
```

### entries table

Each blocker is an individual entry with `parent_type: 'section'`:

```
{
  id: 1,
  parent_type: 'section',
  parent_id: <section_id>,
  type: 'text',
  content: '{"text": "Waiting on API access from DevOps", "status": "active"}',
  position: 0,
  author: 'ai' | 'user',
  created_at: ...,
  updated_at: ...
}
```

**Content structure:** `{ text: string, status: "active" | "resolved" }`

The `author` field distinguishes AI-generated entries from user-added ones. User entries are never modified by AI refresh.

### New DB functions

- `getOrCreateSection(title: string): Section` — ensures the section row exists
- `getEntriesForSection(sectionId: number): Entry[]` — fetches all entries for a section
- `addEntryToSection(sectionId: number, content: object, author: string): Entry` — creates a new entry
- `updateEntry(entryId: number, content: object): void` — updates entry content
- `deleteEntry(entryId: number): void` — removes an entry
- `updateSectionTimestamp(sectionId: number): void` — sets `last_ai_update` to now

## AI Prompt & Merge Logic

### Timeframe

- Default: 1 week (7 days)
- Options: 1 week, 2 weeks, 3 weeks, 1 month (30 days)
- Selected via modal when user clicks Refresh

### Refresh flow

1. **Gather context:**
   - Fetch all blocks + entries from daily notes within the selected timeframe
   - Fetch current section entries (existing blockers)
   - Separate entries by `author`

2. **Build prompt:**
   - Include daily note content grouped by date
   - Include current AI-authored blockers with their IDs
   - Instruct AI to:
     - **Keep** AI entries still relevant (return with existing ID)
     - **Update** AI entries whose wording should change (return with existing ID + new text)
     - **Remove** AI entries no longer relevant (omit from response)
     - **Add** new blockers discovered (return without ID)
   - User-authored entries are NOT included in the prompt — they are preserved untouched

3. **Expected response format:**
   ```json
   {
     "blockers": [
       { "id": 5, "text": "Waiting on API access from DevOps", "status": "active" },
       { "id": null, "text": "CI pipeline failing on staging", "status": "active" },
       { "id": 3, "text": "Design review completed", "status": "resolved" }
     ]
   }
   ```

4. **Apply changes:**
   - Items with existing `id` → update content in DB
   - Items with `null` id → create new entry with `author: 'ai'`
   - Existing AI entries NOT in response → delete from DB
   - User entries are never touched
   - Update `last_ai_update` timestamp

### Blocker identification

The AI uses two signals:
- **Contextual inference** — language cues like "stuck on", "waiting for", "blocked by", "can't proceed"
- **Category-based** — blocks tagged with the "Blocker" category are prioritized

## UI Design

### Navigation

- New sidebar link under a "Sections" heading: "Current Blockers"
- Clicking sets `currentView` to `'blockers'` (existing navigation pattern)

### Blockers View

```
┌─────────────────────────────────────────────────┐
│  Current Blockers                                │
│  Last updated: Feb 19, 2026 at 3:45 PM          │
│                                        [Refresh] │
│                                                  │
│  ● Waiting on API access from DevOps    [edit][x]│
│  ● CI pipeline failing on staging       [edit][x]│
│  ● Design review blocked by PTO         [edit][x]│
│                                                  │
│  [+ Add blocker manually]                        │
│                                                  │
│  ─── Resolved ───                                │
│  ✓ Authentication flow approved            [x]   │
└─────────────────────────────────────────────────┘
```

### Refresh Modal

Appears when user clicks Refresh:

```
┌──────────────────────────────────┐
│  Refresh Blockers                │
│                                  │
│  Analyze notes from:             │
│  ○ Past week  (default)          │
│  ○ Past 2 weeks                  │
│  ○ Past 3 weeks                  │
│  ○ Past month                    │
│                                  │
│       [Cancel]  [Generate]       │
└──────────────────────────────────┘
```

### Interactions

- **Inline editing** — click entry text to edit (same pattern as TextEntry)
- **Delete** — with undo toast (existing toast pattern)
- **Add manually** — creates a new `author: 'user'` entry
- **Status toggle** — click status indicator to toggle active/resolved
- **Refresh** — opens timeframe modal, then runs AI generation with loading spinner

### States

- **Empty** — "No blockers identified yet. Click Refresh to analyze your recent notes."
- **Loading** — spinner on refresh button, existing content stays visible
- **Error** — toast notification if Gemini fails, content preserved
- **No API key** — message with link to Settings (same as SummarizeButton)

## Components

- `BlockersView.svelte` — main view component
- `RefreshModal.svelte` — timeframe selection modal
- `BlockerItem.svelte` — individual blocker entry with edit/delete/status toggle

## Service Layer

- `src/lib/services/db/sections.ts` — DB CRUD for sections and section entries
- `src/lib/services/blockersSummarization.ts` — AI prompt building, response parsing, merge logic
