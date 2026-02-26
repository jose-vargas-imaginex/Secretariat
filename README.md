# Secretariat

An AI-augmented daily work log that helps you capture, organize, and summarize what you're working on.

Secretariat runs as a desktop app (Electron) with an in-browser SQLite database. You log work as **blocks** (categorized items like Progress, Blocker, Idea, Question, Meeting Note), add **entries** (text content) to each block, and optionally use Gemini AI to generate daily summaries, weekly rollups, and blocker reports.

## Tech Stack

- **Frontend** — Svelte 5 (runes) + TypeScript
- **Desktop** — Electron
- **Database** — sql.js (SQLite compiled to WASM, runs in the renderer)
- **AI** — Google Gemini API (optional, configured in Settings)
- **Build** — Vite + vite-plugin-electron
- **Packaging** — electron-builder (macOS DMG)

## Getting Started

```bash
npm install
npm run dev        # starts Vite dev server + Electron window
```

Other scripts:

| Command | Description |
|---|---|
| `npm run build` | Production build (Vite output in `dist/`, Electron in `dist-electron/`) |
| `npm run package` | Build + package as macOS DMG (output in `release/`) |

## Project Structure

```
src/
  App.svelte                  # Root component, view router, DB + theme init
  app.css                     # Global styles and CSS custom properties
  main.js                     # Svelte mount point
  lib/
    components/
      Layout.svelte           # Shell: sidebar + main content area
      Sidebar.svelte           # Navigation, calendar, section links
      Calendar.svelte          # Month calendar with date-has-notes indicators
      DayView.svelte           # Daily log: quick capture + block list + summarize
      QuickCapture.svelte      # Text input for adding new blocks
      BlockList.svelte         # Renders list of BlockCards for a given day
      BlockCard.svelte         # Single block with inline entry editing
      TextEntry.svelte         # Editable text entry within a block
      CategoryChip.svelte      # Colored category label pill
      CategoryPicker.svelte    # Dropdown for choosing/changing a category
      SummarizeButton.svelte   # Triggers AI daily summary
      BlockersView.svelte      # Cross-day blocker aggregation view
      WeeklySummariesView.svelte # AI-generated weekly rollup view
      RefreshModal.svelte      # Confirmation dialog for re-running AI summaries
      Settings.svelte          # Gemini API key, theme, color palette settings
      ToastContainer.svelte    # Toast notification overlay
    services/
      db/
        database.ts            # sql.js init, persistence to localStorage
        schema.ts              # CREATE TABLE statements, default categories
        types.ts               # TypeScript interfaces for all DB entities
        dailyNotes.ts          # CRUD for daily_notes table
        blocks.ts              # CRUD for blocks table (work log items)
        entries.ts             # CRUD for entries table (content within blocks)
        categories.ts          # CRUD for categories table
        sections.ts            # CRUD for sections table (blocker sections, etc.)
        settings.ts            # Key-value settings store
        index.ts               # Re-exports
      gemini.ts                # Gemini API client (generateContent)
      summarization.ts         # Daily summary: collects blocks → prompt → AI response → AI block
      weeklySummarization.ts   # Weekly rollup across multiple days
      blockersSummarization.ts # Aggregates open blockers across days
      theme.ts                 # Color palette types, presets, dark-mode adaptation
    stores/
      toasts.svelte.ts         # Toast notification state (Svelte 5 runes)

electron/
  main.js                      # Electron main process (window creation)
  preload.js                   # Context bridge (contextIsolation enabled)

build/                         # App icons for electron-builder
```

## Data Model

All data lives in an in-browser SQLite database (sql.js WASM) persisted to localStorage.

| Table | Purpose |
|---|---|
| `daily_notes` | One row per calendar date |
| `blocks` | Work log items — linked to a daily note and a category |
| `entries` | Content pieces within a block (text, AI-generated headings) |
| `categories` | Color-coded labels (Progress, Blocker, Idea, Question, Meeting Note) |
| `sections` | Persistent sections like "Current Blockers" |
| `settings` | Key-value store (Gemini API key, theme preference, palette) |

## AI Features

Secretariat uses the Gemini API for optional summarization. Configure your API key in **Settings**.

- **Daily Summary** — Analyzes all blocks for a day and produces a categorized summary stored as an AI-generated block
- **Weekly Summary** — Rolls up multiple days into a weekly overview
- **Blocker Report** — Aggregates open blockers across days

## Theming

- Light/dark mode with system-preference detection
- Five preset color palettes (Default, Ocean, Forest, Sunset, Rose)
- Custom palette support with accent color, background, and text color pickers
- All colors are derived from CSS custom properties (`--accent-color`, `--bg-primary`, etc.)

## Developing with Claude Code

### Recommended MCP Servers

The following MCP servers are recommended when working on this project with Claude Code:

| Server | Purpose |
|---|---|
| **[Svelte](https://github.com/nicolo-ribaudo/mcp-svelte)** | Official Svelte MCP server. Provides Svelte 5 / SvelteKit documentation lookup, code autofixing, and playground link generation. Should be used whenever creating or editing `.svelte` files. |
| **[Chrome DevTools](https://github.com/nicolo-ribaudo/mcp-chrome-devtools)** | Connects to a running Chrome/Electron instance via remote debugging. Enables taking snapshots, clicking elements, filling forms, inspecting network requests, and running performance traces — useful for manual UI testing and debugging. |
| **[Context7](https://github.com/nicolo-ribaudo/mcp-context7)** | Fetches up-to-date documentation and code examples for any library (Electron, sql.js, date-fns, Vite, etc.). Useful when you need current API references beyond the model's training data. |
| **IDE (VS Code)** | Provides language diagnostics from VS Code (TypeScript errors, Svelte warnings). Helpful for verifying changes without running a full build. |

To use Chrome DevTools MCP with the running app, launch Chrome with remote debugging:

```bash
/Applications/Google\ Chrome.app/Contents/MacOS/Google\ Chrome --remote-debugging-port=9222
```

Then navigate to `http://localhost:5174` (the Vite dev server URL).
