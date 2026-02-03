<script lang="ts">
  import type { Block } from "../db/types.js";

  interface TextContent {
    text?: string;
    [key: string]: unknown;
  }

  interface Props {
    block: Block;
    onUpdate?: (content: TextContent) => void;
    onDelete?: () => void;
  }

  let { block, onUpdate = () => {}, onDelete }: Props = $props();

  let content = $derived(block.content as TextContent);

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
      if (onDelete) {
        onDelete();
      }
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
</script>

<div
  class="text-block"
  class:ai-authored={block.author === "ai"}
  class:pending-delete={pendingDelete}
>
  {#if pendingDelete}
    <span class="deleted-message">
      Deleted. <button type="button" class="undo-button" onclick={cancelDelete}
        >Undo</button
      >?
    </span>
  {:else if editing}
    <input
      type="text"
      class="edit-input"
      bind:value={editText}
      bind:this={inputRef}
      onblur={saveEdit}
      onkeydown={handleKeyDown}
    />
  {:else}
    <div class="block-content">
      <button type="button" class="block-text" onclick={startEdit}>
        {content.text || ""}
      </button>
      {#if onDelete}
        <button
          type="button"
          class="delete-button"
          onclick={startDelete}
          aria-label="Delete block"
        >
          &times;
        </button>
      {/if}
    </div>
  {/if}
</div>

<style>
  .text-block {
    padding: 0.25rem 0;
  }

  .text-block.ai-authored {
    border-left: 2px solid var(--accent-color);
    padding-left: 0.5rem;
    margin-left: -0.5rem;
  }

  .text-block.pending-delete {
    opacity: 0.6;
  }

  .block-content {
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }

  .block-text {
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
  }

  .block-text:hover {
    background: var(--bg-hover);
    border-radius: 4px;
  }

  .block-text:focus {
    outline: none;
  }

  .delete-button {
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

  .block-content:hover .delete-button {
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
    width: 100%;
    padding: 0.25rem;
    border: 1px solid var(--accent-color);
    border-radius: 4px;
    background: var(--bg-primary);
    color: var(--text-primary);
    font-size: inherit;
    font-family: inherit;
  }

  .edit-input:focus {
    outline: none;
  }
</style>
