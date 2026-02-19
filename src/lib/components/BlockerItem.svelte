<script lang="ts">
  import type { Entry } from "../services/db/types.js";

  interface BlockerContent {
    text: string;
    status: "active" | "resolved";
    [key: string]: unknown;
  }

  interface Props {
    entry: Entry;
    onUpdate: (content: { text: string; status: string }) => void;
    onDelete: () => void;
    onToggleStatus: () => void;
  }

  let { entry, onUpdate, onDelete, onToggleStatus }: Props = $props();

  let content = $derived(entry.content as BlockerContent);

  let editing = $state(false);
  let editText = $state("");
  let inputRef = $state<HTMLInputElement | null>(null);
  let pendingDelete = $state(false);
  let deleteTimeoutId = $state<ReturnType<typeof setTimeout> | null>(null);

  $effect(() => {
    if (editing && inputRef) {
      inputRef.focus();
    }
  });

  // Cleanup timeout on component destroy
  $effect(() => {
    return () => {
      if (deleteTimeoutId) {
        clearTimeout(deleteTimeoutId);
      }
    };
  });

  function startEdit() {
    if (pendingDelete) return;
    editText = content.text || "";
    editing = true;
  }

  function saveEdit() {
    if (editText.trim() !== (content.text || "")) {
      onUpdate({ ...content, text: editText.trim() });
    }
    editing = false;
  }

  function handleKeyDown(e: KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      saveEdit();
    }
    if (e.key === "Escape") {
      editing = false;
    }
  }

  function startDelete(e: MouseEvent) {
    e.stopPropagation();
    pendingDelete = true;
    deleteTimeoutId = setTimeout(() => {
      onDelete();
      pendingDelete = false;
      deleteTimeoutId = null;
    }, 5000);
  }

  function cancelDelete() {
    if (deleteTimeoutId) {
      clearTimeout(deleteTimeoutId);
      deleteTimeoutId = null;
    }
    pendingDelete = false;
  }

  function handleToggleStatus(e: MouseEvent) {
    e.stopPropagation();
    if (pendingDelete) return;
    onToggleStatus();
  }
</script>

<div
  class="blocker-item"
  class:resolved={content.status === "resolved"}
  class:pending-delete={pendingDelete}
>
  {#if pendingDelete}
    <span class="deleted-message">
      Deleted. <button type="button" class="undo-button" onclick={cancelDelete}
        >Undo</button
      >?
    </span>
  {:else}
    <button
      type="button"
      class="status-indicator"
      onclick={handleToggleStatus}
      aria-label={content.status === "active" ? "Mark as resolved" : "Mark as active"}
    >
      {#if content.status === "resolved"}
        <svg class="check-icon" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M3 8.5L6.5 12L13 4" stroke="#22c55e" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
        </svg>
      {:else}
        <span class="active-dot"></span>
      {/if}
    </button>

    {#if editing}
      <input
        type="text"
        class="edit-input"
        bind:value={editText}
        bind:this={inputRef}
        onblur={saveEdit}
        onkeydown={handleKeyDown}
      />
    {:else}
      <div class="entry-content">
        <button type="button" class="entry-text" onclick={startEdit}>
          {content.text || ""}
        </button>

        {#if entry.author === "ai"}
          <span class="ai-badge">AI</span>
        {/if}

        <button
          type="button"
          class="delete-button"
          onclick={startDelete}
          aria-label="Delete blocker"
        >
          &times;
        </button>
      </div>
    {/if}
  {/if}
</div>

<style>
  .blocker-item {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.25rem 0;
  }

  .blocker-item.resolved {
    opacity: 0.5;
  }

  .blocker-item.pending-delete {
    opacity: 0.4;
  }

  .status-indicator {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 1.25rem;
    height: 1.25rem;
    flex-shrink: 0;
    padding: 0;
    border: none;
    background: transparent;
    cursor: pointer;
    border-radius: 50%;
    transition: background 0.15s ease;
  }

  .status-indicator:hover {
    background: var(--bg-hover, rgba(0, 0, 0, 0.05));
  }

  .active-dot {
    display: block;
    width: 0.625rem;
    height: 0.625rem;
    border-radius: 50%;
    background: #ef4444;
  }

  .check-icon {
    width: 0.875rem;
    height: 0.875rem;
  }

  .entry-content {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    flex: 1;
    min-width: 0;
  }

  .entry-text {
    display: block;
    flex: 1;
    margin: 0;
    padding: 0;
    border: none;
    background: transparent;
    color: inherit;
    font: inherit;
    text-align: left;
    cursor: text;
    min-height: 1.5em;
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .entry-text:hover {
    background: var(--bg-hover);
    border-radius: 4px;
  }

  .entry-text:focus {
    outline: none;
  }

  .ai-badge {
    flex-shrink: 0;
    font-size: 0.625rem;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    color: var(--text-muted, #888);
    background: var(--bg-secondary, #f0f0f0);
    padding: 0.0625rem 0.3125rem;
    border-radius: 3px;
    line-height: 1.2;
  }

  .delete-button {
    flex-shrink: 0;
    opacity: 0;
    padding: 0.125rem 0.375rem;
    border: none;
    background: transparent;
    color: var(--text-muted, #888);
    font-size: 1rem;
    line-height: 1;
    cursor: pointer;
    border-radius: 4px;
    transition:
      opacity 0.15s ease,
      background 0.15s ease;
  }

  .blocker-item:hover .delete-button {
    opacity: 1;
  }

  .delete-button:hover {
    background: var(--bg-hover, rgba(0, 0, 0, 0.1));
    color: var(--text-primary, #333);
  }

  .deleted-message {
    font-style: italic;
    color: var(--text-muted, #888);
  }

  .undo-button {
    padding: 0;
    border: none;
    background: transparent;
    color: var(--accent-color, #007bff);
    font: inherit;
    font-style: italic;
    text-decoration: underline;
    cursor: pointer;
  }

  .undo-button:hover {
    color: var(--accent-color-hover, #0056b3);
  }

  .edit-input {
    flex: 1;
    padding: 0.25rem;
    border: 1px solid var(--accent-color);
    border-radius: 4px;
    background: var(--bg-primary);
    color: var(--text-primary);
    font-size: inherit;
    font-family: inherit;
    min-width: 0;
  }

  .edit-input:focus {
    outline: none;
  }
</style>
