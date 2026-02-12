<script lang="ts">
  import { createDailySummary } from "../services/summarization.js";
  import { GeminiError } from "../services/gemini.js";
  import type { Block } from "../services/db/types.js";

  interface Props {
    dailyNoteId: number;
    hasUserBlocks: boolean;
    existingSummary: Block | null;
    onSummaryCreated: () => void;
    onNavigateToSettings?: () => void;
  }

  let {
    dailyNoteId,
    hasUserBlocks,
    existingSummary,
    onSummaryCreated,
    onNavigateToSettings,
  }: Props = $props();

  let state: "idle" | "loading" | "error" = $state("idle");
  let errorMessage: string = $state("");
  let errorCode: string = $state("");

  let buttonLabel = $derived(
    existingSummary ? "Regenerate Summary" : "Summarize Day",
  );
  let needsSettingsLink = $derived(
    errorCode === "NO_API_KEY" || errorCode === "AUTH_ERROR",
  );

  async function handleClick() {
    state = "loading";
    errorMessage = "";
    errorCode = "";

    try {
      await createDailySummary(dailyNoteId);
      state = "idle";
      onSummaryCreated();
    } catch (err) {
      state = "error";
      if (err instanceof GeminiError) {
        errorMessage = err.message;
        errorCode = err.code;
      } else {
        errorMessage = "An unexpected error occurred. Please try again.";
        errorCode = "";
      }
    }
  }
</script>

{#if hasUserBlocks}
  <div class="summarize-container">
    {#if state === "loading"}
      <button class="summarize-btn" disabled>
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
        Generating summary...
      </button>
    {:else if state === "error"}
      <div class="error-container">
        <p class="error-message">{errorMessage}</p>
        <div class="error-actions">
          <button class="summarize-btn" onclick={handleClick}> Retry </button>
          {#if needsSettingsLink}
            <button
              class="settings-link"
              onclick={() => onNavigateToSettings?.()}>Go to Settings</button
            >
          {/if}
        </div>
      </div>
    {:else}
      <button class="summarize-btn" onclick={handleClick}>
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
          <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
        </svg>
        {buttonLabel}
      </button>
    {/if}
  </div>
{/if}

<style>
  .summarize-container {
    margin: 0.75rem 0;
  }

  .summarize-btn {
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
  }

  .summarize-btn:hover:not(:disabled) {
    color: var(--accent-color);
    border-color: var(--accent-color);
    background-color: var(--bg-hover);
  }

  .summarize-btn:disabled {
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
    text-decoration: none;
    background: none;
    border: none;
    cursor: pointer;
    padding: 0;
    font-size: inherit;
    font-family: inherit;
  }

  .settings-link:hover {
    text-decoration: underline;
  }
</style>
