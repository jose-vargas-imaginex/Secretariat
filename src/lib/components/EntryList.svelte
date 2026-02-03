<script lang="ts">
  import EntryCard from './EntryCard.svelte';
  import { deleteEntry } from '../db/entries.js';
  import { addToast } from '../stores/toasts.svelte.js';
  import type { Entry } from '../db/types.js';

  interface Props {
    entries?: Entry[];
    onEntryDeleted?: () => void;
  }

  let { entries = [], onEntryDeleted }: Props = $props();

  // Track entries pending deletion (hidden but not yet deleted)
  let pendingDeletions = $state<Set<number>>(new Set());

  let visibleEntries = $derived(
    entries.filter((e) => !pendingDeletions.has(e.id))
  );

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
  {#if visibleEntries.length === 0}
    <div class="empty-state">
      <p>No entries yet. Start capturing your work above!</p>
    </div>
  {:else}
    {#each visibleEntries as entry (entry.id)}
      <EntryCard {entry} onDelete={() => handleDelete(entry.id)} />
    {/each}
  {/if}
</div>

<style>
  .entry-list {
    display: flex;
    flex-direction: column;
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
