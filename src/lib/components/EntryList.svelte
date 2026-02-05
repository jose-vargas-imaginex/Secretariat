<script lang="ts">
  import EntryCard from './EntryCard.svelte';
  import { deleteEntry } from '../services/db/entries.js';
  import { addToast } from '../stores/toasts.svelte.js';
  import type { Entry } from '../services/db/types.js';

  interface Props {
    entries?: Entry[];
    onEntryDeleted?: () => void;
    onCategoryChange?: () => void;
  }

  let { entries = [], onEntryDeleted, onCategoryChange }: Props = $props();

  // Track entries pending deletion (hidden but not yet deleted)
  let pendingDeletions = $state<Set<number>>(new Set());

  let visibleEntries = $derived(
    entries.filter((e) => !pendingDeletions.has(e.id))
  );

  let aiEntries = $derived(visibleEntries.filter((e) => e.is_ai_generated));
  let userEntries = $derived(visibleEntries.filter((e) => !e.is_ai_generated));

  function handleDelete(entryId: number) {
    // Hide entry immediately (optimistic)
    pendingDeletions = new Set([...pendingDeletions, entryId]);

    addToast('Entry deleted', {
      action: {
        label: 'Undo',
        callback: () => {
          // Restore entry
          pendingDeletions = new Set([...pendingDeletions].filter((id) => id !== entryId));
        },
      },
      onExpire: () => {
        // Actually delete when toast expires
        deleteEntry(entryId);
        pendingDeletions = new Set([...pendingDeletions].filter((id) => id !== entryId));
        onEntryDeleted?.();
      },
    });
  }
</script>

<div class="entry-list">
  {#if aiEntries.length > 0}
    <div class="ai-entries-section">
      {#each aiEntries as entry (entry.id)}
        <EntryCard {entry} onDelete={() => handleDelete(entry.id)} {onCategoryChange} />
      {/each}
    </div>
  {/if}

  {#if userEntries.length === 0 && aiEntries.length === 0}
    <div class="empty-state">
      <p>No entries yet. Start capturing your work above!</p>
    </div>
  {:else}
    {#each userEntries as entry (entry.id)}
      <EntryCard {entry} onDelete={() => handleDelete(entry.id)} {onCategoryChange} />
    {/each}
  {/if}
</div>

<style>
  .entry-list {
    display: flex;
    flex-direction: column;
  }

  .ai-entries-section {
    padding-bottom: 0.75rem;
    margin-bottom: 0.75rem;
    border-bottom: 1px solid var(--border-color);
  }

  .empty-state {
    text-align: center;
    padding: 3rem;
    color: var(--text-secondary);
  }

  .empty-state p {
    margin: 0;
  }
</style>
