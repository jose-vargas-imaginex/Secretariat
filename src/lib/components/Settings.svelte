<script lang="ts">
  import { getSetting, setSetting } from "../services/db/settings.js";
  import {
    getAllCategories,
    createCategory,
    deleteCategory,
  } from "../services/db/categories.js";
  import type { Category } from "../services/db/types.js";

  type TestStatus = "saved" | "testing" | "success" | "error" | null;

  let geminiKey = $state("");
  let showKey = $state(false);
  let testStatus = $state<TestStatus>(null);
  let categories = $state<Category[]>([]);

  let newCategoryName = $state("");
  let newCategoryColor = $state("#6b7280");

  $effect(() => {
    geminiKey = getSetting("gemini_api_key") || "";
    categories = getAllCategories();
  });

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
</script>

<div class="settings">
  <h1>Settings</h1>

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
    <p class="section-desc">Manage categories for organizing your entries.</p>

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
