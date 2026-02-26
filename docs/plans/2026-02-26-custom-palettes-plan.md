# Custom Color Palettes Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add preset and custom color palette selection to Appearance settings, stored in the DB for backup/restore persistence.

**Architecture:** Palettes define 3 key colors (accent, bgPrimary, textPrimary) and derive the rest. Active palette ID and custom palettes are stored as JSON in the existing `settings` key-value table. Palettes layer independently on top of the existing light/dark mode toggle by setting CSS custom properties on `document.documentElement.style`.

**Tech Stack:** Svelte 5, TypeScript, CSS custom properties, existing SQLite settings table

---

### Task 1: Add palette types, presets, and color derivation to theme.ts

**Files:**
- Modify: `src/lib/services/theme.ts`

**Step 1: Add the ColorPalette interface and preset definitions**

Add above the existing `applyTheme` function:

```typescript
export interface ColorPalette {
  id: string;
  name: string;
  isPreset: boolean;
  accent: string;
  bgPrimary: string;
  textPrimary: string;
}

export const PRESET_PALETTES: ColorPalette[] = [
  { id: 'default', name: 'Default', isPreset: true, accent: '#667eea', bgPrimary: '', textPrimary: '' },
  { id: 'ocean', name: 'Ocean', isPreset: true, accent: '#0891b2', bgPrimary: '#f0fdfa', textPrimary: '#164e63' },
  { id: 'forest', name: 'Forest', isPreset: true, accent: '#059669', bgPrimary: '#f0fdf4', textPrimary: '#14532d' },
  { id: 'sunset', name: 'Sunset', isPreset: true, accent: '#ea580c', bgPrimary: '#fff7ed', textPrimary: '#7c2d12' },
  { id: 'rose', name: 'Rose', isPreset: true, accent: '#e11d48', bgPrimary: '#fff1f2', textPrimary: '#881337' },
];
```

Note: "Default" has empty bgPrimary/textPrimary meaning "use CSS defaults, don't override."

**Step 2: Add color derivation helper**

```typescript
function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? { r: parseInt(result[1], 16), g: parseInt(result[2], 16), b: parseInt(result[3], 16) }
    : { r: 0, g: 0, b: 0 };
}

function rgbToHex(r: number, g: number, b: number): string {
  return '#' + [r, g, b].map(x => Math.round(x).toString(16).padStart(2, '0')).join('');
}

function mixColors(hex1: string, hex2: string, weight: number): string {
  const c1 = hexToRgb(hex1);
  const c2 = hexToRgb(hex2);
  return rgbToHex(
    c1.r * (1 - weight) + c2.r * weight,
    c1.g * (1 - weight) + c2.g * weight,
    c1.b * (1 - weight) + c2.b * weight
  );
}
```

**Step 3: Add applyPalette function**

```typescript
export function applyPalette(palette: ColorPalette | null): void {
  const root = document.documentElement;

  if (!palette || palette.id === 'default') {
    // Remove all palette overrides, let CSS defaults take over
    root.style.removeProperty('--accent-color');
    root.style.removeProperty('--bg-primary');
    root.style.removeProperty('--bg-secondary');
    root.style.removeProperty('--bg-hover');
    root.style.removeProperty('--bg-active');
    root.style.removeProperty('--text-primary');
    root.style.removeProperty('--text-secondary');
    root.style.removeProperty('--border-color');
    return;
  }

  const { accent, bgPrimary, textPrimary } = palette;

  // Set key colors
  root.style.setProperty('--accent-color', accent);
  root.style.setProperty('--bg-primary', bgPrimary);
  root.style.setProperty('--text-primary', textPrimary);

  // Derive secondary colors
  root.style.setProperty('--bg-secondary', mixColors(bgPrimary, textPrimary, 0.03));
  root.style.setProperty('--bg-hover', mixColors(bgPrimary, textPrimary, 0.06));
  root.style.setProperty('--bg-active', mixColors(bgPrimary, accent, 0.08));
  root.style.setProperty('--text-secondary', mixColors(textPrimary, bgPrimary, 0.4));
  root.style.setProperty('--border-color', mixColors(bgPrimary, textPrimary, 0.12));
}
```

**Step 4: Add helper to get palette by ID (used by App.svelte and Settings)**

```typescript
export function getPaletteById(id: string, customPalettes: ColorPalette[]): ColorPalette | null {
  return PRESET_PALETTES.find(p => p.id === id)
    || customPalettes.find(p => p.id === id)
    || null;
}
```

**Step 5: Verify the build compiles**

Run: `cd /Users/josevargas/Source/personal/vibes/Secretariat && npx tsc --noEmit --skipLibCheck 2>&1 | head -20`
Expected: No errors related to theme.ts

**Step 6: Commit**

```bash
git add src/lib/services/theme.ts
git commit -m "feat: add palette types, presets, and color derivation to theme service"
```

---

### Task 2: Load active palette on app startup

**Files:**
- Modify: `src/App.svelte:17-22` (the onMount block)

**Step 1: Import applyPalette and getPaletteById**

Add to existing imports from theme.js:

```typescript
import { applyTheme, applyPalette, getPaletteById } from "./lib/services/theme.js";
import type { ColorPalette } from "./lib/services/theme.js";
```

**Step 2: Load and apply palette in onMount**

After the existing `applyTheme(theme)` line, add:

```typescript
const activePaletteId = getSetting("active_palette") || "default";
const customPalettesJson = getSetting("custom_palettes");
const customPalettes: ColorPalette[] = customPalettesJson ? JSON.parse(customPalettesJson) : [];
const palette = getPaletteById(activePaletteId, customPalettes);
applyPalette(palette);
```

**Step 3: Verify dev server starts**

Run: `cd /Users/josevargas/Source/personal/vibes/Secretariat && npx tsc --noEmit --skipLibCheck 2>&1 | head -20`
Expected: No errors

**Step 4: Commit**

```bash
git add src/App.svelte
git commit -m "feat: load and apply color palette on app startup"
```

---

### Task 3: Add palette picker UI to Settings.svelte

**Files:**
- Modify: `src/lib/components/Settings.svelte`

This is the largest task. Use the `svelte:svelte-file-editor` agent.

**Step 1: Add palette state and imports**

In the `<script>` section, add imports:

```typescript
import { applyPalette, getPaletteById, PRESET_PALETTES } from "../services/theme.js";
import type { ColorPalette } from "../services/theme.js";
```

Add state variables after the existing ones:

```typescript
let activePaletteId = $state("default");
let customPalettes = $state<ColorPalette[]>([]);
let showCreatePalette = $state(false);
let editingPaletteId = $state<string | null>(null);
let newPaletteName = $state("");
let newPaletteAccent = $state("#667eea");
let newPaletteBg = $state("#ffffff");
let newPaletteText = $state("#1f2937");
```

Load them in the existing `$effect`:

```typescript
activePaletteId = getSetting("active_palette") || "default";
const customPalettesJson = getSetting("custom_palettes");
customPalettes = customPalettesJson ? JSON.parse(customPalettesJson) : [];
```

**Step 2: Add palette handler functions**

```typescript
function handlePaletteSelect(id: string) {
  activePaletteId = id;
  setSetting("active_palette", id);
  const palette = getPaletteById(id, customPalettes);
  applyPalette(palette);
}

function saveCustomPalette() {
  if (!newPaletteName.trim()) return;

  if (editingPaletteId) {
    customPalettes = customPalettes.map(p =>
      p.id === editingPaletteId
        ? { ...p, name: newPaletteName.trim(), accent: newPaletteAccent, bgPrimary: newPaletteBg, textPrimary: newPaletteText }
        : p
    );
  } else {
    const palette: ColorPalette = {
      id: `custom-${Date.now()}`,
      name: newPaletteName.trim(),
      isPreset: false,
      accent: newPaletteAccent,
      bgPrimary: newPaletteBg,
      textPrimary: newPaletteText,
    };
    customPalettes = [...customPalettes, palette];
  }

  setSetting("custom_palettes", JSON.stringify(customPalettes));

  // If editing the active palette, re-apply it
  if (editingPaletteId && editingPaletteId === activePaletteId) {
    const palette = getPaletteById(activePaletteId, customPalettes);
    applyPalette(palette);
  }

  resetPaletteForm();
}

function editCustomPalette(palette: ColorPalette) {
  editingPaletteId = palette.id;
  newPaletteName = palette.name;
  newPaletteAccent = palette.accent;
  newPaletteBg = palette.bgPrimary;
  newPaletteText = palette.textPrimary;
  showCreatePalette = true;
}

function deleteCustomPalette(id: string) {
  customPalettes = customPalettes.filter(p => p.id !== id);
  setSetting("custom_palettes", JSON.stringify(customPalettes));
  if (activePaletteId === id) {
    handlePaletteSelect("default");
  }
}

function resetPaletteForm() {
  showCreatePalette = false;
  editingPaletteId = null;
  newPaletteName = "";
  newPaletteAccent = "#667eea";
  newPaletteBg = "#ffffff";
  newPaletteText = "#1f2937";
}
```

**Step 3: Add palette section markup**

Insert a new section inside the Appearance `<section>`, after the `.theme-options` div (before the closing `</section>` of Appearance):

```svelte
<div class="palette-section">
  <h3>Color Palette</h3>
  <p class="palette-desc">Choose a color palette or create your own.</p>

  <div class="palette-grid">
    {#each PRESET_PALETTES as palette (palette.id)}
      <button
        class="palette-card"
        class:active={activePaletteId === palette.id}
        onclick={() => handlePaletteSelect(palette.id)}
      >
        <div class="palette-swatches">
          <span class="swatch" style="background-color: {palette.accent}"></span>
          <span class="swatch" style="background-color: {palette.bgPrimary || '#ffffff'}"></span>
          <span class="swatch" style="background-color: {palette.textPrimary || '#1f2937'}"></span>
        </div>
        <span class="palette-name">{palette.name}</span>
      </button>
    {/each}

    {#each customPalettes as palette (palette.id)}
      <button
        class="palette-card"
        class:active={activePaletteId === palette.id}
        onclick={() => handlePaletteSelect(palette.id)}
      >
        <div class="palette-swatches">
          <span class="swatch" style="background-color: {palette.accent}"></span>
          <span class="swatch" style="background-color: {palette.bgPrimary}"></span>
          <span class="swatch" style="background-color: {palette.textPrimary}"></span>
        </div>
        <span class="palette-name">{palette.name}</span>
        <div class="palette-actions">
          <button class="palette-action-btn" onclick|stopPropagation={() => editCustomPalette(palette)}>Edit</button>
          <button class="palette-action-btn danger" onclick|stopPropagation={() => deleteCustomPalette(palette.id)}>Delete</button>
        </div>
      </button>
    {/each}
  </div>

  {#if !showCreatePalette}
    <button class="btn secondary" onclick={() => (showCreatePalette = true)}>
      Create Custom Palette
    </button>
  {:else}
    <div class="create-palette-form">
      <input
        type="text"
        class="palette-name-input"
        bind:value={newPaletteName}
        placeholder="Palette name"
      />
      <div class="color-pickers">
        <label class="color-picker-group">
          <span>Accent</span>
          <input type="color" bind:value={newPaletteAccent} />
        </label>
        <label class="color-picker-group">
          <span>Background</span>
          <input type="color" bind:value={newPaletteBg} />
        </label>
        <label class="color-picker-group">
          <span>Text</span>
          <input type="color" bind:value={newPaletteText} />
        </label>
      </div>
      <div class="form-actions">
        <button class="btn primary" onclick={saveCustomPalette} disabled={!newPaletteName.trim()}>
          {editingPaletteId ? 'Update' : 'Save'}
        </button>
        <button class="btn secondary" onclick={resetPaletteForm}>Cancel</button>
      </div>
    </div>
  {/if}
</div>
```

**Step 4: Add palette styles**

Add to the `<style>` section:

```css
.palette-section {
  margin-top: 1.25rem;
  padding-top: 1.25rem;
  border-top: 1px solid var(--border-color);
}

.palette-section h3 {
  font-size: 0.875rem;
  font-weight: 600;
  margin: 0 0 0.25rem 0;
}

.palette-desc {
  font-size: 0.75rem;
  color: var(--text-secondary);
  margin: 0 0 0.75rem 0;
}

.palette-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(100px, 1fr));
  gap: 0.5rem;
  margin-bottom: 0.75rem;
}

.palette-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.375rem;
  padding: 0.625rem;
  background: var(--bg-primary);
  border: 2px solid var(--border-color);
  border-radius: 8px;
  cursor: pointer;
  transition: border-color 0.15s;
}

.palette-card:hover {
  border-color: var(--accent-color);
}

.palette-card.active {
  border-color: var(--accent-color);
  background: var(--bg-active);
}

.palette-swatches {
  display: flex;
  gap: 0.25rem;
}

.swatch {
  width: 20px;
  height: 20px;
  border-radius: 50%;
  border: 1px solid var(--border-color);
}

.palette-name {
  font-size: 0.75rem;
  font-weight: 500;
}

.palette-actions {
  display: flex;
  gap: 0.25rem;
  margin-top: 0.125rem;
}

.palette-action-btn {
  font-size: 0.625rem;
  padding: 0.125rem 0.375rem;
  background: none;
  border: 1px solid var(--border-color);
  border-radius: 4px;
  color: var(--text-secondary);
  cursor: pointer;
}

.palette-action-btn:hover {
  border-color: var(--accent-color);
  color: var(--accent-color);
}

.palette-action-btn.danger:hover {
  border-color: #ef4444;
  color: #ef4444;
}

.create-palette-form {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  padding: 0.75rem;
  background: var(--bg-primary);
  border: 1px solid var(--border-color);
  border-radius: 8px;
}

.palette-name-input {
  padding: 0.5rem 0.75rem;
  border: 1px solid var(--border-color);
  border-radius: 6px;
  background: var(--bg-secondary);
  color: var(--text-primary);
  font-size: 0.875rem;
}

.color-pickers {
  display: flex;
  gap: 1rem;
}

.color-picker-group {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.25rem;
  font-size: 0.75rem;
  color: var(--text-secondary);
  cursor: pointer;
}

.color-picker-group input[type="color"] {
  width: 40px;
  height: 32px;
  padding: 2px;
  border: 1px solid var(--border-color);
  border-radius: 6px;
  cursor: pointer;
}

.form-actions {
  display: flex;
  gap: 0.5rem;
}
```

**Step 5: Verify the build compiles**

Run: `cd /Users/josevargas/Source/personal/vibes/Secretariat && npx tsc --noEmit --skipLibCheck 2>&1 | head -20`
Expected: No errors

**Step 6: Commit**

```bash
git add src/lib/components/Settings.svelte
git commit -m "feat: add color palette picker UI to appearance settings"
```

---

### Task 4: Handle dark mode + palette interaction

**Files:**
- Modify: `src/lib/services/theme.ts` (update applyPalette)
- Modify: `src/app.css` (ensure inline styles override CSS rules)

**Step 1: Update applyPalette to handle dark mode context**

The current approach of using `document.documentElement.style.setProperty()` already works because inline styles have highest specificity, overriding the CSS `:root` rules. However, when a non-default palette is active and the user is in dark mode, we need to generate dark-appropriate versions of the palette colors.

Add a `deriveForDarkMode` helper and update `applyPalette` to accept the current theme:

```typescript
function isDarkMode(): boolean {
  const root = document.documentElement;
  const explicit = root.getAttribute('data-theme');
  if (explicit === 'dark') return true;
  if (explicit === 'light') return false;
  return window.matchMedia('(prefers-color-scheme: dark)').matches;
}

function invertForDarkMode(bgPrimary: string, textPrimary: string): { bg: string; text: string } {
  // Swap: use a dark version of bgPrimary and a light version of textPrimary
  const bg = mixColors(bgPrimary, '#1a1a2e', 0.85);
  const text = mixColors(textPrimary, '#f8f8f2', 0.85);
  return { bg, text };
}
```

Update `applyPalette`:

```typescript
export function applyPalette(palette: ColorPalette | null): void {
  const root = document.documentElement;

  if (!palette || palette.id === 'default') {
    // Remove all palette overrides
    ['--accent-color', '--bg-primary', '--bg-secondary', '--bg-hover', '--bg-active', '--text-primary', '--text-secondary', '--border-color'].forEach(prop => root.style.removeProperty(prop));
    return;
  }

  let { accent, bgPrimary, textPrimary } = palette;

  if (isDarkMode()) {
    const inverted = invertForDarkMode(bgPrimary, textPrimary);
    bgPrimary = inverted.bg;
    textPrimary = inverted.text;
  }

  root.style.setProperty('--accent-color', accent);
  root.style.setProperty('--bg-primary', bgPrimary);
  root.style.setProperty('--text-primary', textPrimary);
  root.style.setProperty('--bg-secondary', mixColors(bgPrimary, textPrimary, 0.03));
  root.style.setProperty('--bg-hover', mixColors(bgPrimary, textPrimary, 0.06));
  root.style.setProperty('--bg-active', mixColors(bgPrimary, accent, 0.08));
  root.style.setProperty('--text-secondary', mixColors(textPrimary, bgPrimary, 0.4));
  root.style.setProperty('--border-color', mixColors(bgPrimary, textPrimary, 0.12));
}
```

**Step 2: Re-apply palette when theme changes**

In `Settings.svelte`, update `handleThemeChange` to also re-apply the active palette after changing theme:

```typescript
function handleThemeChange(value: string) {
  themePreference = value;
  setSetting("theme_preference", value);
  applyTheme(value);
  // Re-apply palette so it adapts to the new light/dark mode
  const palette = getPaletteById(activePaletteId, customPalettes);
  applyPalette(palette);
}
```

Also in `App.svelte`, ensure `applyPalette` is called *after* `applyTheme` (already the case from Task 2).

**Step 3: Listen for system color scheme changes**

In `App.svelte`, add a listener for when the OS switches between light/dark (only matters when theme is "system"):

```typescript
// Inside onMount, after applyPalette:
window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
  const currentPaletteId = getSetting("active_palette") || "default";
  if (currentPaletteId !== "default") {
    const cpJson = getSetting("custom_palettes");
    const cp: ColorPalette[] = cpJson ? JSON.parse(cpJson) : [];
    const p = getPaletteById(currentPaletteId, cp);
    applyPalette(p);
  }
});
```

**Step 4: Verify the build compiles**

Run: `cd /Users/josevargas/Source/personal/vibes/Secretariat && npx tsc --noEmit --skipLibCheck 2>&1 | head -20`

**Step 5: Commit**

```bash
git add src/lib/services/theme.ts src/lib/components/Settings.svelte src/App.svelte
git commit -m "feat: handle dark mode + palette interaction with auto-adaptation"
```

---

### Task 5: Manual verification

**Step 1: Start the dev server**

Run: `npm run dev` (in background)

**Step 2: Open the app and verify**

Navigate to Settings > Appearance and test:
- Preset palette cards render with swatches
- Clicking a preset applies colors immediately
- "Default" removes overrides and reverts to original theme
- Switching light/dark mode while a palette is active adapts colors
- "Create Custom Palette" form opens/closes
- Creating a custom palette persists (reload the app and it's still active)
- Editing a custom palette updates it
- Deleting the active custom palette reverts to Default
- System theme changes re-apply the palette correctly

**Step 3: Final commit if any fixes needed**
