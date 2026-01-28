<script>
  import EntryCard from './EntryCard.svelte';

  let { entries = [] } = $props();
</script>

<div class="entry-list">
  {#if entries.length === 0}
    <div class="empty-state">
      <p>No entries yet. Start capturing your work above!</p>
    </div>
  {:else}
    {#each entries as entry (entry.id)}
      <EntryCard {entry} />
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
