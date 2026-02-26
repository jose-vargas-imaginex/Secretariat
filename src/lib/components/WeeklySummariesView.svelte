<script lang="ts">
  import { format } from "date-fns";
  import {
    getWeekKey,
    formatWeekRange,
    getWeeklySummaries,
    getWeeklySummary,
    generateWeeklySummary,
    type SummaryVerbosity,
  } from "../services/weeklySummarization.js";
  import { updateEntry } from "../services/db/entries.js";
  import { GeminiError } from "../services/gemini.js";
  import type { WeeklySummaryInfo } from "../services/weeklySummarization.js";

  interface Props {
    onNavigateToSettings: () => void;
  }

  let { onNavigateToSettings }: Props = $props();

  let refreshCounter = $state(0);
  let selectedWeekKey = $state(getWeekKey(new Date()));
  let loading = $state(false);
  let errorMessage = $state("");
  let errorCode = $state("");
  let verbosity: SummaryVerbosity = $state('moderate');

  let summaries: WeeklySummaryInfo[] = $derived.by(() => {
    refreshCounter;
    return getWeeklySummaries();
  });

  let currentSummary: WeeklySummaryInfo = $derived.by(() => {
    refreshCounter;
    return getWeeklySummary(selectedWeekKey);
  });

  let weekOptions = $derived.by(() => {
    const currentWeekKey = getWeekKey(new Date());
    const seen: Record<string, boolean> = {};
    const options: { weekKey: string; label: string }[] = [];

    // Always include current week
    seen[currentWeekKey] = true;
    options.push({
      weekKey: currentWeekKey,
      label: formatWeekRange(currentWeekKey),
    });

    // Add existing summaries
    for (const s of summaries) {
      if (!seen[s.weekKey]) {
        seen[s.weekKey] = true;
        options.push({
          weekKey: s.weekKey,
          label: formatWeekRange(s.weekKey),
        });
      }
    }

    // Sort most recent first
    options.sort((a, b) => (b.weekKey > a.weekKey ? 1 : b.weekKey < a.weekKey ? -1 : 0));
    return options;
  });

  let hasNeverGenerated = $derived(currentSummary?.section?.last_ai_update === null);

  let formattedDate = $derived(
    currentSummary?.section?.last_ai_update
      ? format(new Date(currentSummary.section.last_ai_update), "MMM d, yyyy 'at' h:mm a")
      : "Not yet generated",
  );

  let needsSettingsLink = $derived(
    errorCode === "NO_API_KEY" || errorCode === "AUTH_ERROR",
  );

  let summaryText = $derived(
    (currentSummary?.entry?.content as { text?: string })?.text ?? "",
  );

  // Writable derived: syncs from summary, but can be overridden by user edits
  let editedText = $derived(
    (currentSummary?.entry?.content as { text?: string })?.text ?? "",
  );

  async function handleGenerate() {
    loading = true;
    errorMessage = "";
    errorCode = "";
    try {
      await generateWeeklySummary(selectedWeekKey, verbosity);
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

  function handleSave() {
    if (
      currentSummary?.entry &&
      editedText !== ((currentSummary.entry.content as { text?: string })?.text ?? "")
    ) {
      updateEntry(currentSummary.entry.id, { text: editedText });
      refreshCounter++;
    }
  }
</script>

<div class="weekly-summary-view">
  <header class="summary-header">
    <div class="header-text">
      <h1>Weekly Summary</h1>
      <p class="last-updated">Last updated: {formattedDate}</p>
    </div>
    <div class="header-actions">
      <label class="verbosity-label">
        Verbosity
        <select bind:value={verbosity}>
          <option value="concise">Concise</option>
          <option value="moderate">Moderate</option>
          <option value="verbose">Verbose</option>
        </select>
      </label>
    <button
      class="refresh-btn"
      onclick={handleGenerate}
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
        Generating...
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
        {hasNeverGenerated ? "Generate" : "Regenerate"}
      {/if}
    </button>
    </div>
  </header>

  <div class="week-selector">
    <select
      bind:value={selectedWeekKey}
    >
      {#each weekOptions as option (option.weekKey)}
        <option value={option.weekKey}>{option.label}</option>
      {/each}
    </select>
  </div>

  {#if errorMessage}
    <div class="error-container">
      <p class="error-message">{errorMessage}</p>
      <div class="error-actions">
        <button class="refresh-btn" onclick={handleGenerate}>
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
      <p class="loading-text">Generating weekly summary...</p>
    </div>
  {:else if !summaryText && hasNeverGenerated}
    <div class="empty-state">
      <p>No summary generated yet. Click Generate to create one.</p>
    </div>
  {:else if summaryText}
    <textarea
      class="summary-textarea"
      rows="10"
      bind:value={editedText}
      onblur={handleSave}
    ></textarea>
  {/if}
</div>

<style>
  .weekly-summary-view {
    max-width: 800px;
    margin: 0 auto;
  }

  .summary-header {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    margin-bottom: 1.5rem;
  }

  .header-actions {
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }

  .verbosity-label {
    display: flex;
    align-items: center;
    gap: 0.375rem;
    font-size: 0.8125rem;
    color: var(--text-secondary);
  }

  .verbosity-label select {
    background: var(--bg-secondary);
    border: 1px solid var(--border-color);
    color: var(--text-primary);
    border-radius: 6px;
    padding: 0.375rem 0.75rem;
    font-size: 0.8125rem;
    font-family: inherit;
    cursor: pointer;
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

  .week-selector {
    margin-bottom: 1.5rem;
  }

  .week-selector select {
    background: var(--bg-secondary);
    border: 1px solid var(--border-color);
    color: var(--text-primary);
    border-radius: 6px;
    padding: 0.375rem 0.75rem;
    font-size: 0.875rem;
    font-family: inherit;
    cursor: pointer;
  }

  .summary-textarea {
    width: 100%;
    min-height: 200px;
    padding: 0.75rem;
    font-family: inherit;
    font-size: 0.875rem;
    line-height: 1.6;
    background: var(--bg-secondary);
    border: 1px solid var(--border-color);
    border-radius: 6px;
    color: var(--text-primary);
    resize: vertical;
    box-sizing: border-box;
  }

  .summary-textarea:focus {
    outline: none;
    border-color: var(--accent-color);
  }
</style>
