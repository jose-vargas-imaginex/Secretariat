<script lang="ts">
  import TextBlock from "./TextBlock.svelte";
  import CategoryChip from "./CategoryChip.svelte";
  import { format } from "date-fns";
  import {
    getBlocksForParent,
    createBlock,
    updateBlock,
    deleteBlock,
  } from "../services/db/blocks.js";
  import {
    updateEntryTitle,
    updateEntryCategory,
  } from "../services/db/entries.js";
  import type { Entry } from "../services/db/types.js";

  interface Props {
    entry: Entry;
    onDelete?: () => void;
    onCategoryChange?: () => void;
  }

  let { entry, onDelete, onCategoryChange }: Props = $props();

  // Use an object for refresh key - new reference forces $derived to recalculate
  let refreshKey = $state({});

  // Title editing state
  let isEditingTitle = $state(false);
  let editedTitle = $state("");

  function handleTitleClick() {
    editedTitle = entry.title ?? "";
    isEditingTitle = true;
  }

  function handleTitleBlur() {
    isEditingTitle = false;
    const newTitle = editedTitle.trim() || null;
    if (newTitle !== entry.title) {
      updateEntryTitle(entry.id, newTitle);
      entry.title = newTitle;
    }
  }

  function handleTitleKeyDown(e: KeyboardEvent) {
    if (e.key === "Enter") {
      e.preventDefault();
      (e.target as HTMLInputElement).blur();
    } else if (e.key === "Escape") {
      editedTitle = entry.title ?? "";
      isEditingTitle = false;
    }
  }

  function focusOnMount(node: HTMLInputElement) {
    node.focus();
  }

  let blocks = $derived.by(() => {
    // Track both the refresh key and entry.id as dependencies
    void refreshKey;
    return getBlocksForParent("entry", entry.id);
  });

  function handleBlockUpdate(blockId: number, newContent: unknown) {
    updateBlock(blockId, newContent);
    refreshKey = {}; // New object triggers re-derivation
  }

  function handleBlockDelete(blockId: number) {
    deleteBlock(blockId);
    refreshKey = {}; // New object triggers re-derivation
  }

  function handleAddBlock() {
    createBlock("entry", entry.id, "text", { text: "" });
    refreshKey = {};
  }

  function handleCategoryChange(categoryId: number | null) {
    updateEntryCategory(entry.id, categoryId);
    onCategoryChange?.();
  }
</script>

<article class="entry-card" class:ai-generated={entry.is_ai_generated}>
  <div class="entry-header">
    <span class="timestamp">
      {format(new Date(entry.created_at), "h:mm a")}
    </span>
    {#if isEditingTitle}
      <input
        type="text"
        class="title-input"
        bind:value={editedTitle}
        onblur={handleTitleBlur}
        onkeydown={handleTitleKeyDown}
        use:focusOnMount
      />
    {:else if entry.title}
      <button class="title" onclick={handleTitleClick}>
        {entry.title}
      </button>
    {:else}
      <button class="title title-empty" onclick={handleTitleClick}>
        Add title...
      </button>
    {/if}
    {#if !entry.is_ai_generated}
      <CategoryChip
        categoryId={entry.category_id}
        categoryName={entry.category_name}
        categoryColor={entry.category_color}
        onCategoryChange={handleCategoryChange}
      />
    {/if}
    {#if entry.is_ai_generated}
      <span class="ai-badge"
        >{entry.title === "Daily Summary" ? "AI Summary" : "AI"}</span
      >
    {/if}
    {#if onDelete}
      <button class="delete-btn" onclick={onDelete} aria-label="Delete entry">
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
          <polyline points="3 6 5 6 21 6"></polyline>
          <path
            d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"
          ></path>
          <line x1="10" y1="11" x2="10" y2="17"></line>
          <line x1="14" y1="11" x2="14" y2="17"></line>
        </svg>
      </button>
    {/if}
  </div>

  <div class="entry-content">
    {#each blocks as block (block.id)}
      {#if block.type === "category-heading"}
        <div class="category-heading">
          <span
            class="category-pill"
            style="background-color: {block.content.color}20; color: {block.content.color}"
          >
            {block.content.name}
          </span>
        </div>
      {:else if block.type === "text"}
        <TextBlock
          {block}
          onUpdate={(content) => handleBlockUpdate(block.id, content)}
          onDelete={() => handleBlockDelete(block.id)}
        />
      {/if}
    {/each}

    {#if blocks.length === 0}
      <button class="empty-placeholder" onclick={handleAddBlock}>
        Click to add content
      </button>
    {:else}
      <button class="add-block-btn" onclick={handleAddBlock}>
        <svg
          width="12"
          height="12"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
        >
          <line x1="12" y1="5" x2="12" y2="19"></line>
          <line x1="5" y1="12" x2="19" y2="12"></line>
        </svg>
        Add block
      </button>
    {/if}
  </div>
</article>

<style>
  .entry-card {
    background: var(--bg-secondary);
    border: 1px solid var(--border-color);
    border-radius: 8px;
    padding: 1rem;
    margin-bottom: 0.75rem;
  }

  .entry-card.ai-generated {
    border-left: 3px solid var(--accent-color);
    background: linear-gradient(
      135deg,
      var(--bg-secondary) 0%,
      rgba(102, 126, 234, 0.05) 100%
    );
  }

  .entry-header {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    margin-bottom: 0.5rem;
  }

  .timestamp {
    font-size: 0.75rem;
    color: var(--text-secondary);
    flex-shrink: 0;
  }

  .title {
    font-size: 0.875rem;
    font-weight: 500;
    color: var(--text-primary);
    background: none;
    border: none;
    padding: 0;
    cursor: pointer;
    text-align: left;
    flex: 1;
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .title:hover {
    color: var(--accent-color);
  }

  .title-empty {
    color: var(--text-secondary);
    font-style: italic;
    font-weight: 400;
  }

  .title-input {
    flex: 1;
    min-width: 0;
    font-size: 0.875rem;
    font-weight: 500;
    color: var(--text-primary);
    background: var(--bg-primary);
    border: 1px solid var(--accent-color);
    border-radius: 4px;
    padding: 0.125rem 0.375rem;
    outline: none;
  }

  .ai-badge {
    font-size: 0.625rem;
    font-weight: 500;
    padding: 0.125rem 0.375rem;
    border-radius: 4px;
    background: var(--accent-color);
    color: white;
  }

  .delete-btn {
    margin-left: auto;
    padding: 0.25rem;
    background: none;
    border: none;
    color: var(--text-secondary);
    cursor: pointer;
    border-radius: 4px;
    display: flex;
    align-items: center;
    justify-content: center;
    opacity: 0;
    transition:
      opacity 0.15s,
      color 0.15s,
      background-color 0.15s;
  }

  .entry-card:hover .delete-btn {
    opacity: 1;
  }

  .delete-btn:hover {
    color: #ef4444;
    background-color: rgba(239, 68, 68, 0.1);
  }

  .entry-content {
    font-size: 0.875rem;
  }

  .empty-placeholder {
    color: var(--text-secondary);
    font-style: italic;
    margin: 0;
    background: none;
    border: 1px dashed var(--border-color);
    border-radius: 4px;
    padding: 0.5rem 0.75rem;
    width: 100%;
    text-align: left;
    cursor: pointer;
    font-size: inherit;
    transition:
      border-color 0.15s,
      color 0.15s;
  }

  .empty-placeholder:hover {
    border-color: var(--accent-color);
    color: var(--accent-color);
  }

  .add-block-btn {
    display: flex;
    align-items: center;
    gap: 0.375rem;
    margin-top: 0.5rem;
    padding: 0.25rem 0.5rem;
    background: none;
    border: none;
    color: var(--text-secondary);
    font-size: 0.75rem;
    cursor: pointer;
    border-radius: 4px;
    opacity: 0;
    transition:
      opacity 0.15s,
      color 0.15s,
      background-color 0.15s;
  }

  .entry-card:hover .add-block-btn {
    opacity: 1;
  }

  .add-block-btn:hover {
    color: var(--accent-color);
    background-color: var(--bg-hover);
  }

  .category-heading {
    margin-top: 0.5rem;
    margin-bottom: 0.25rem;
  }

  .category-heading:first-child {
    margin-top: 0;
  }

  .category-pill {
    display: inline-block;
    font-size: 0.625rem;
    font-weight: 500;
    padding: 0.125rem 0.5rem;
    border-radius: 9999px;
    text-transform: uppercase;
    letter-spacing: 0.025em;
  }
</style>
