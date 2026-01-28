# Core Notes Functionality Design

## Overview

Secretariat is an AI-augmented notes app for tracking daily work. The primary interaction model is a calendar-based daily journal with quick capture throughout the day, enhanced by AI that organizes notes and maintains synthesized views of ongoing work.

## Core Concepts

### Daily Notes
- Each calendar day has one daily note, auto-created on first capture
- Users quickly log entries throughout the day with minimal friction
- AI can organize the day's raw entries into a structured summary on-demand or on schedule

### Synthesized Sections
- Persistent views like "Current Blockers" and "Current Initiatives"
- AI maintains these by scanning daily notes
- User-editable and block-based, same as daily entries
- Auto-refresh periodically with manual refresh available

## Data Model

### Daily Notes
| Field | Type | Description |
|-------|------|-------------|
| id | integer | Primary key |
| date | date | Unique, one per day |
| created_at | timestamp | |
| updated_at | timestamp | |

### Entries
| Field | Type | Description |
|-------|------|-------------|
| id | integer | Primary key |
| daily_note_id | integer | FK to daily_notes |
| category_id | integer | FK to categories, nullable |
| is_ai_generated | boolean | True if created by AI |
| source_entry_ids | JSON | Original entries this was derived from (for AI entries) |
| created_at | timestamp | |
| updated_at | timestamp | |

### Blocks
| Field | Type | Description |
|-------|------|-------------|
| id | integer | Primary key |
| parent_type | string | "entry" or "section" |
| parent_id | integer | FK to entries or sections |
| type | string | text, list, checkbox, code, heading |
| content | JSON | Block content and formatting |
| position | integer | Order within parent |
| author | string | "user" or "ai" |
| created_at | timestamp | |
| updated_at | timestamp | |

### Categories
| Field | Type | Description |
|-------|------|-------------|
| id | integer | Primary key |
| name | string | Display name |
| color | string | Hex color code |
| icon | string | Icon identifier, nullable |
| is_default | boolean | System-provided vs user-created |
| position | integer | Display order |

**Default Categories (v1):**
- Progress
- Blocker
- Idea
- Question
- Meeting Note

### Sections
| Field | Type | Description |
|-------|------|-------------|
| id | integer | Primary key |
| title | string | Section name |
| position | integer | Display order in sidebar |
| last_ai_update | timestamp | When AI last refreshed |
| created_at | timestamp | |
| updated_at | timestamp | |

### Settings
| Field | Type | Description |
|-------|------|-------------|
| key | string | Setting identifier |
| value | string | Value (encrypted for sensitive data) |

### Jira Tokens
| Field | Type | Description |
|-------|------|-------------|
| access_token | string | Encrypted |
| refresh_token | string | Encrypted |
| expires_at | timestamp | Token expiration |

### Jira Cache
| Field | Type | Description |
|-------|------|-------------|
| ticket_key | string | e.g., PROJ-123 |
| data | JSON | Cached ticket details |
| fetched_at | timestamp | Cache timestamp |

## Block Types

| Type | Description |
|------|-------------|
| text | Plain paragraph with inline formatting (bold, italic, code) |
| list | Bulleted or numbered list |
| checkbox | Task item with done/not-done state |
| code | Code snippet with syntax highlighting |
| heading | H1, H2, H3 for structure |

### Block Interactions
- Click to edit, click outside to save
- Drag handle to reorder within parent
- `/` commands to change block type (e.g., `/list`)
- Visual indicator for AI-authored blocks

## App Navigation

### Layout
- **Sidebar**: Calendar (month grid), Synthesized Sections list, Settings
- **Main content**: Selected view

### Views
1. **Today** (default) - Quick capture input at top, today's entries below in chronological order
2. **Day View** - Same layout for any date selected from calendar
3. **Section View** - Synthesized section with editable block content

### Quick Capture
- Always visible at top of Today/Day views
- Text input + optional category dropdown
- Enter submits, entry appears immediately below

## AI Integration

### Provider
- v1 uses **Google Gemini** via API
- User provides API key in Settings
- Key stored encrypted in local database

### Daily Note Organization
- Triggered on-demand ("Organize today's notes") or on schedule
- AI reads raw entries, creates organized summary entry
- Original entries preserved, summary linked to sources

### Synthesized Section Updates
- Auto-refresh on configurable schedule (hourly, daily, manual only)
- AI scans recent daily notes to update sections
- Appends or suggests changes rather than overwriting user edits
- Manual refresh available per section

### Conversational Queries
- Ask questions like "What did I work on last week?"
- AI responds inline or in results panel
- Results can be saved as blocks in a section

### AI Attribution
- AI-created/modified blocks visually distinguished
- Hover shows source entries that informed the output

### Jira Integration
- AI detects ticket references (e.g., `PROJ-123`, Jira URLs)
- Fetches ticket details: title, status, assignee, description
- Enriches daily notes and synthesized sections with ticket context
- Ticket data cached to reduce API calls

## Settings Page

- **Gemini API Key** - Input field with test/verify button
- **Jira Connection** - OAuth login, shows connection status, disconnect option
- **Categories** - Manage defaults and custom (add, rename, delete, reorder)
- **AI Schedule** - Configure auto-refresh frequency

### Jira Auth Flow
1. User clicks "Connect Jira"
2. OAuth flow opens in system browser
3. App receives and stores tokens (encrypted)
4. Tokens auto-refresh; re-auth if expired

## Storage

- **SQLite** local database
- Single file, portable
- Sensitive data (API keys, tokens) encrypted
- AI can export/synthesize data to other formats on demand

## Future Enhancements (Nice-to-Have)

- Voice input for quick capture
- AI-suggested categories based on usage patterns
- Multiple AI provider support (OpenAI, Claude, etc.)
- Additional integrations (GitHub, Slack, Linear, etc.)
