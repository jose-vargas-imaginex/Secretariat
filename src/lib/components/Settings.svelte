<script lang="ts">
  import { getSetting, setSetting } from "../services/db/settings.js";
  import {
    getAllCategories,
    createCategory,
    deleteCategory,
  } from "../services/db/categories.js";
  import type { Category } from "../services/db/types.js";
  import {
    exportDatabase,
    importDatabase,
    resetDatabase,
  } from "../services/db/database.js";
  import { applyTheme } from "../services/theme.js";

  type TestStatus = "saved" | "testing" | "success" | "error" | null;

  let geminiKey = $state("");
  let showKey = $state(false);
  let testStatus = $state<TestStatus>(null);
  let categories = $state<Category[]>([]);

  let newCategoryName = $state("");
  let newCategoryColor = $state("#6b7280");

  let importStatus = $state<'success' | 'error' | null>(null);
  let importError = $state('');
  let showResetConfirm = $state(false);
  let resetConfirmText = $state('');
  let themePreference = $state<string>("system");

  $effect(() => {
    geminiKey = getSetting("gemini_api_key") || "";
    themePreference = getSetting("theme_preference") || "system";
    categories = getAllCategories();
  });

  function handleThemeChange(value: string) {
    themePreference = value;
    setSetting("theme_preference", value);
    applyTheme(value);
  }

  function saveApiKey() {
    setSetting("gemini_api_key", geminiKey);
    testStatus = "saved";
    setTimeout(() => (testStatus = null), 2000);
  }

  async function testApiKey() {
    testStatus = "testing";
    try {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models?key=${geminiKey}`,
      );
      if (response.ok) {
        testStatus = "success";
      } else {
        testStatus = "error";
      }
    } catch {
      testStatus = "error";
    }
    setTimeout(() => (testStatus = null), 3000);
  }

  function addCategory() {
    if (!newCategoryName.trim()) return;
    createCategory(newCategoryName.trim(), newCategoryColor);
    newCategoryName = "";
    newCategoryColor = "#6b7280";
    categories = getAllCategories();
  }

  function removeCategory(id: number) {
    deleteCategory(id);
    categories = getAllCategories();
  }

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

  async function handleReset() {
    await resetDatabase();
    window.location.reload();
  }
</script>

<div class="settings">
  <h1>Settings</h1>

  <section class="settings-section">
    <h2>Appearance</h2>
    <p class="section-desc">Choose how the app looks.</p>

    <div class="theme-options">
      <label class="theme-option">
        <input
          type="radio"
          name="theme"
          value="system"
          checked={themePreference === "system"}
          onchange={() => handleThemeChange("system")}
        />
        <span class="theme-option-text">
          <span class="theme-option-label">System</span>
          <span class="theme-option-desc">Follow your OS setting</span>
        </span>
      </label>
      <label class="theme-option">
        <input
          type="radio"
          name="theme"
          value="light"
          checked={themePreference === "light"}
          onchange={() => handleThemeChange("light")}
        />
        <span class="theme-option-text">
          <span class="theme-option-label">Light</span>
          <span class="theme-option-desc">Always use light mode</span>
        </span>
      </label>
      <label class="theme-option">
        <input
          type="radio"
          name="theme"
          value="dark"
          checked={themePreference === "dark"}
          onchange={() => handleThemeChange("dark")}
        />
        <span class="theme-option-text">
          <span class="theme-option-label">Dark</span>
          <span class="theme-option-desc">Always use dark mode</span>
        </span>
      </label>
    </div>
  </section>

  <section class="settings-section">
    <h2>Gemini API Key</h2>
    <p class="section-desc">
      Enter your Google Gemini API key to enable AI features.
    </p>

    <div class="api-key-row">
      <input
        type={showKey ? "text" : "password"}
        class="api-key-input"
        bind:value={geminiKey}
        placeholder="Enter your API key"
      />
      <button class="btn secondary" onclick={() => (showKey = !showKey)}>
        {showKey ? "Hide" : "Show"}
      </button>
    </div>

    <div class="api-key-actions">
      <button class="btn primary" onclick={saveApiKey}>Save</button>
      <button class="btn secondary" onclick={testApiKey} disabled={!geminiKey}>
        Test Connection
      </button>
      {#if testStatus === "saved"}
        <span class="status success">Saved!</span>
      {:else if testStatus === "testing"}
        <span class="status">Testing...</span>
      {:else if testStatus === "success"}
        <span class="status success">Connection successful!</span>
      {:else if testStatus === "error"}
        <span class="status error">Connection failed</span>
      {/if}
    </div>
  </section>

  <section class="settings-section">
    <h2>Categories</h2>
    <p class="section-desc">Manage categories for organizing your blocks.</p>

    <div class="category-list">
      {#each categories as cat (cat.id)}
        <div class="category-item">
          <span class="category-color" style="background-color: {cat.color}"
          ></span>
          <span class="category-name">{cat.name}</span>
          {#if cat.is_default}
            <span class="default-badge">Default</span>
          {:else}
            <button class="delete-btn" onclick={() => removeCategory(cat.id)}>
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
      <input type="color" class="color-input" bind:value={newCategoryColor} />
      <button class="btn primary" onclick={addCategory}>Add</button>
    </div>
  </section>

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

  .theme-options {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  .theme-option {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    padding: 0.625rem 0.75rem;
    background: var(--bg-primary);
    border-radius: 6px;
    cursor: pointer;
  }

  .theme-option:hover {
    background: var(--bg-hover);
  }

  .theme-option input[type="radio"] {
    accent-color: var(--accent-color);
  }

  .theme-option-text {
    display: flex;
    flex-direction: column;
  }

  .theme-option-label {
    font-size: 0.875rem;
    font-weight: 500;
  }

  .theme-option-desc {
    font-size: 0.75rem;
    color: var(--text-secondary);
  }
</style>
