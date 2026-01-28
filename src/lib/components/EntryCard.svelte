<script>
  import TextBlock from './TextBlock.svelte';
  import { format } from 'date-fns';
  import { getBlocksForParent, updateBlock } from '../db/blocks.js';

  let { entry } = $props();

  let refreshCounter = $state(0);

  let blocks = $derived.by(() => {
    // Include refreshCounter to trigger re-derivation when blocks are updated
    void refreshCounter;
    return getBlocksForParent('entry', entry.id);
  });

  function handleBlockUpdate(blockId, newContent) {
    updateBlock(blockId, newContent);
    refreshCounter++;
  }
</script>

<article class="entry-card">
  <div class="entry-header">
    <span class="timestamp">
      {format(new Date(entry.created_at), 'h:mm a')}
    </span>
    {#if entry.category_name}
      <span
        class="category-badge"
        style="background-color: {entry.category_color}20; color: {entry.category_color}"
      >
        {entry.category_name}
      </span>
    {/if}
    {#if entry.is_ai_generated}
      <span class="ai-badge">AI</span>
    {/if}
  </div>

  <div class="entry-content">
    {#each blocks as block (block.id)}
      {#if block.type === 'text'}
        <TextBlock
          {block}
          onUpdate={(content) => handleBlockUpdate(block.id, content)}
        />
      {/if}
    {/each}

    {#if blocks.length === 0}
      <p class="empty">No content</p>
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

  .entry-header {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    margin-bottom: 0.5rem;
  }

  .timestamp {
    font-size: 0.75rem;
    color: var(--text-secondary);
  }

  .category-badge {
    font-size: 0.625rem;
    font-weight: 500;
    padding: 0.125rem 0.5rem;
    border-radius: 9999px;
    text-transform: uppercase;
    letter-spacing: 0.025em;
  }

  .ai-badge {
    font-size: 0.625rem;
    font-weight: 500;
    padding: 0.125rem 0.375rem;
    border-radius: 4px;
    background: var(--accent-color);
    color: white;
  }

  .entry-content {
    font-size: 0.875rem;
  }

  .empty {
    color: var(--text-secondary);
    font-style: italic;
    margin: 0;
  }
</style>
