# Custom Color Palettes Design

## Overview

Add a "Color Palette" section to Appearance settings allowing users to select preset palettes or create custom ones. Palettes layer independently on top of the light/dark mode toggle. Stored in the DB `settings` table for backup/restore persistence.

## Data Model

Uses the existing `settings` key-value table (Approach A — no schema migration).

**Settings keys:**
- `"active_palette"` — string ID of the active palette (e.g. `"default"`, `"ocean"`, `"custom-1740000000"`)
- `"custom_palettes"` — JSON string containing an array of user-created palettes

**Palette interface:**
```typescript
interface ColorPalette {
  id: string;           // "ocean", "forest", or "custom-<timestamp>"
  name: string;         // Display name
  isPreset: boolean;
  accent: string;       // hex color, e.g. "#667eea"
  bgPrimary: string;    // hex color, e.g. "#ffffff"
  textPrimary: string;  // hex color, e.g. "#1f2937"
}
```

## Derived Colors

From the 3 user-chosen colors (accent, bgPrimary, textPrimary), the following CSS variables are auto-derived:

- `--bg-secondary`: slight shift from bgPrimary toward textPrimary
- `--bg-hover`: between bg-primary and bg-secondary
- `--bg-active`: accent tinted with bgPrimary
- `--text-secondary`: midpoint between textPrimary and bgPrimary
- `--border-color`: derived from bgPrimary toward textPrimary

## Preset Palettes

| ID | Name | Accent | Bg Primary | Text Primary |
|----|------|--------|------------|--------------|
| default | Default | #667eea | (use CSS defaults) | (use CSS defaults) |
| ocean | Ocean | #0891b2 | (tweaked) | (tweaked) |
| forest | Forest | #059669 | (tweaked) | (tweaked) |
| sunset | Sunset | #ea580c | (tweaked) | (tweaked) |
| rose | Rose | #e11d48 | (tweaked) | (tweaked) |

The "Default" palette means no custom CSS variables are applied — the original CSS rules take effect.

## Light/Dark Mode Interaction

Palettes are independent of the light/dark toggle:
- The palette sets base colors (accent, bgPrimary, textPrimary)
- Dark mode inverts/adjusts bgPrimary and textPrimary while keeping the accent
- When palette is "default", existing CSS media queries and data-theme attributes work as before

## UI Design

New section in Settings.svelte below the existing "Theme" section:

- **Section header**: "Color Palette"
- **Palette grid**: Small preview cards showing the 3 key colors
  - Presets listed first, then custom palettes
  - Active palette highlighted with a border/check
- **"Create Custom" button**: Opens inline form with:
  - Name text input
  - 3 color pickers (accent, background, text)
  - Save / Cancel buttons
- **Custom palette actions**: Edit and delete buttons on custom palette cards

## Files Touched

1. `src/lib/services/theme.ts` — palette types, preset definitions, color derivation logic, `applyPalette()` function
2. `src/lib/components/Settings.svelte` — palette picker UI section
3. `src/app.css` — minor adjustments for palette variable layering
4. `src/App.svelte` — load active palette on startup alongside theme preference
