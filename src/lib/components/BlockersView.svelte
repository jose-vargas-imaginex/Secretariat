<script lang="ts">
  import { format } from "date-fns";
  import BlockerItem from "./BlockerItem.svelte";
  import RefreshModal from "./RefreshModal.svelte";
  import {
    getBlockersSection,
    getBlockerEntries,
    refreshBlockers,
  } from "../services/blockersSummarization.js";
  import { addEntryToSection } from "../services/db/sections.js";
  import { updateEntry, deleteEntry } from "../services/db/entries.js";
  import { GeminiError } from "../services/gemini.js";
  import type { Entry, Section } from "../services/db/types.js";

  interface Props {
    onNavigateToSettings: () => void;
  }

  let { onNavigateToSettings }: Props = $props();

  let refreshCounter = $state(0);
  let showModal = $state(false);
  let loading = $state(false);
  let errorMessage = $state("");
  let errorCode = $state("");

  let section: Section = $derived.by(() => {
    refreshCounter;
    return getBlockersSection();
  });

  let entries: Entry[] = $derived.by(() => {
    refreshCounter;
    if (section) {
      return getBlockerEntries(section.id);
    }
    return [];
  });

  let activeEntries = $derived(
    entries.filter(
      (e) => (e.content as { status?: string })?.status === "active",
    ),
  );

  let resolvedEntries = $derived(
    entries.filter(
      (e) => (e.content as { status?: string })?.status === "resolved",
    ),
  );

  let hasNeverGenerated = $derived(section?.last_ai_update === null);

  let formattedDate = $derived(
    section?.last_ai_update
      ? format(new Date(section.last_ai_update), "MMM d, yyyy 'at' h:mm a")
      : "Not yet generated",
  );

  let needsSettingsLink = $derived(
    errorCode === "NO_API_KEY" || errorCode === "AUTH_ERROR",
  );

  async function handleRefresh(days: number) {
    showModal = false;
    loading = true;
    errorMessage = "";
    errorCode = "";
    try {
      await refreshBlockers(days);
      refreshCounter++;
    } catch (err) {
      if (err instanceof GeminiError) {
        errorMessage = err.message;
        errorCode = err.code;
      } else {
        errorMessage = "An unexpected error occurred.";
      }
    } finally {
      loading = false;
    }
  }

  function handleUpdate(
    entryId: number,
    content: { text: string; status: string },
  ) {
    updateEntry(entryId, content);
    refreshCounter++;
  }

  function handleDelete(entryId: number) {
    deleteEntry(entryId);
    refreshCounter++;
  }

  function handleToggleStatus(entry: Entry) {
    const content = entry.content as { text: string; status: string };
    const newStatus = content.status === "active" ? "resolved" : "active";
    updateEntry(entry.id, { ...content, status: newStatus });
    refreshCounter++;
  }

  function handleAddBlocker() {
    addEntryToSection(section.id, { text: "", status: "active" }, "user");
    refreshCounter++;
  }
</script>

<div class="blockers-view">
  <header class="blockers-header">
    <div class="header-text">
      <h1>Current Blockers</h1>
      <p class="last-updated">Last updated: {formattedDate}</p>
    </div>
    <button
      class="refresh-btn"
      onclick={() => (showModal = true)}
      disabled={loading}
    >
      {#if loading}
        <svg
          class="spinner"
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
        >
          <path d="M21 12a9 9 0 1 1-6.219-8.56" />
        </svg>
        Refreshing...
      {:else}
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
        >
          <path
            d="M21.5 2v6h-6M2.5 22v-6h6M2 11.5a10 10 0 0 1 18.8-4.3M22 12.5a10 10 0 0 1-18.8 4.2"
          />
        </svg>
        Refresh
      {/if}
    </button>
  </header>

  {#if errorMessage}
    <div class="error-container">
      <p class="error-message">{errorMessage}</p>
      <div class="error-actions">
        <button class="refresh-btn" onclick={() => (showModal = true)}>
          Retry
        </button>
        {#if needsSettingsLink}
          <button class="settings-link" onclick={() => onNavigateToSettings()}>
            Go to Settings
          </button>
        {/if}
      </div>
    </div>
  {/if}

  {#if loading}
    <div class="loading-state">
      <p class="loading-text">Analyzing your recent notes for blockers...</p>
    </div>
  {:else if entries.length === 0 && hasNeverGenerated}
    <div class="empty-state">
      <p>
        No blockers identified yet. Click Refresh to analyze your recent notes.
      </p>
    </div>
  {:else if entries.length === 0 && !hasNeverGenerated}
    <div class="empty-state">
      <p>No blockers found in your recent notes.</p>
    </div>
  {:else}
    {#if activeEntries.length > 0}
      <div class="blocker-list">
        {#each activeEntries as entry (entry.id)}
          <BlockerItem
            {entry}
            onUpdate={(content) => handleUpdate(entry.id, content)}
            onDelete={() => handleDelete(entry.id)}
            onToggleStatus={() => handleToggleStatus(entry)}
          />
        {/each}
      </div>
    {/if}

    {#if resolvedEntries.length > 0}
      <div class="resolved-section">
        <div class="resolved-divider">
          <span class="resolved-label">Resolved</span>
        </div>
        <div class="blocker-list">
          {#each resolvedEntries as entry (entry.id)}
            <BlockerItem
              {entry}
              onUpdate={(content) => handleUpdate(entry.id, content)}
              onDelete={() => handleDelete(entry.id)}
              onToggleStatus={() => handleToggleStatus(entry)}
            />
          {/each}
        </div>
      </div>
    {/if}
  {/if}

  {#if !loading}
    <button type="button" class="add-blocker-btn" onclick={handleAddBlocker}>
      <span class="add-icon">+</span> Add blocker
    </button>
  {/if}
</div>

<RefreshModal
  open={showModal}
  onClose={() => (showModal = false)}
  onGenerate={handleRefresh}
  {loading}
/>

<style>
  .blockers-view {
    max-width: 800px;
    margin: 0 auto;
  }

  .blockers-header {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    margin-bottom: 1.5rem;
  }

  .header-text h1 {
    font-size: 1.5rem;
    font-weight: 600;
    margin: 0;
  }

  .last-updated {
    font-size: 0.8125rem;
    color: var(--text-secondary);
    margin: 0.25rem 0 0 0;
  }

  .refresh-btn {
    display: inline-flex;
    align-items: center;
    gap: 0.375rem;
    padding: 0.375rem 0.75rem;
    background: var(--bg-secondary);
    border: 1px solid var(--border-color);
    border-radius: 6px;
    color: var(--text-secondary);
    font-size: 0.8125rem;
    cursor: pointer;
    transition:
      color 0.15s,
      border-color 0.15s,
      background-color 0.15s;
    flex-shrink: 0;
  }

  .refresh-btn:hover:not(:disabled) {
    color: var(--accent-color);
    border-color: var(--accent-color);
    background-color: var(--bg-hover);
  }

  .refresh-btn:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }

  .spinner {
    animation: spin 1s linear infinite;
  }

  @keyframes spin {
    from {
      transform: rotate(0deg);
    }
    to {
      transform: rotate(360deg);
    }
  }

  .error-container {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    margin-bottom: 1rem;
  }

  .error-message {
    margin: 0;
    font-size: 0.8125rem;
    color: #ef4444;
  }

  .error-actions {
    display: flex;
    align-items: center;
    gap: 0.75rem;
  }

  .settings-link {
    font-size: 0.8125rem;
    color: var(--accent-color);
    background: none;
    border: none;
    cursor: pointer;
    padding: 0;
    font-family: inherit;
  }

  .settings-link:hover {
    text-decoration: underline;
  }

  .loading-state {
    padding: 2rem 0;
    text-align: center;
  }

  .loading-text {
    font-size: 0.875rem;
    color: var(--text-secondary);
    margin: 0;
  }

  .empty-state {
    padding: 2rem 0;
    text-align: center;
  }

  .empty-state p {
    font-size: 0.875rem;
    color: var(--text-secondary);
    margin: 0;
  }

  .blocker-list {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
  }

  .add-blocker-btn {
    display: inline-flex;
    align-items: center;
    gap: 0.25rem;
    margin-top: 0.75rem;
    padding: 0.25rem 0.5rem;
    background: transparent;
    border: none;
    color: var(--text-secondary);
    font-size: 0.8125rem;
    cursor: pointer;
    border-radius: 4px;
    transition:
      color 0.15s,
      background-color 0.15s;
  }

  .add-blocker-btn:hover {
    color: var(--text-primary);
    background: var(--bg-hover);
  }

  .add-icon {
    font-size: 1rem;
    line-height: 1;
    font-weight: 500;
  }

  .resolved-section {
    margin-top: 1.5rem;
  }

  .resolved-divider {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    margin-bottom: 0.75rem;
  }

  .resolved-divider::before,
  .resolved-divider::after {
    content: "";
    flex: 1;
    height: 1px;
    background: var(--border-color);
  }

  .resolved-label {
    font-size: 0.75rem;
    font-weight: 500;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    color: var(--text-muted, #888);
  }
</style>
