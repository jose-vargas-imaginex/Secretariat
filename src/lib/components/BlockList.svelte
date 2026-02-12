<script lang="ts">
  import BlockCard from './BlockCard.svelte';
  import { deleteBlock } from '../services/db/blocks.js';
  import { addToast } from '../stores/toasts.svelte.js';
  import type { Block } from '../services/db/types.js';

  interface Props {
    blocks?: Block[];
    onBlockDeleted?: () => void;
    onCategoryChange?: () => void;
  }

  let { blocks = [], onBlockDeleted, onCategoryChange }: Props = $props();

  // Track blocks pending deletion (hidden but not yet deleted)
  let pendingDeletions = $state<Set<number>>(new Set());

  let visibleBlocks = $derived(
    blocks.filter((b) => !pendingDeletions.has(b.id))
  );

  let aiBlocks = $derived(visibleBlocks.filter((b) => b.is_ai_generated));
  let userBlocks = $derived(visibleBlocks.filter((b) => !b.is_ai_generated));

  function handleDelete(blockId: number) {
    // Hide block immediately (optimistic)
    pendingDeletions = new Set([...pendingDeletions, blockId]);

    addToast('Block deleted', {
      action: {
        label: 'Undo',
        callback: () => {
          // Restore block
          pendingDeletions = new Set([...pendingDeletions].filter((id) => id !== blockId));
        },
      },
      onExpire: () => {
        // Actually delete when toast expires
        deleteBlock(blockId);
        pendingDeletions = new Set([...pendingDeletions].filter((id) => id !== blockId));
        onBlockDeleted?.();
      },
    });
  }
</script>

<div class="block-list">
  {#if aiBlocks.length > 0}
    <div class="ai-blocks-section">
      {#each aiBlocks as block (block.id)}
        <BlockCard {block} onDelete={() => handleDelete(block.id)} {onCategoryChange} />
      {/each}
    </div>
  {/if}

  {#if userBlocks.length === 0 && aiBlocks.length === 0}
    <div class="empty-state">
      <p>No blocks yet. Start capturing your work above!</p>
    </div>
  {:else}
    {#each userBlocks as block (block.id)}
      <BlockCard {block} onDelete={() => handleDelete(block.id)} {onCategoryChange} />
    {/each}
  {/if}
</div>

<style>
  .block-list {
    display: flex;
    flex-direction: column;
  }

  .ai-blocks-section {
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
