<script lang="ts">
  import type { Category } from '../db/types.js';

  interface Props {
    categories?: Category[];
    selectedId?: number | null;
  }

  let { categories = [], selectedId = $bindable<number | null>(null) }: Props = $props();
</script>

<select class="category-picker" bind:value={selectedId}>
  <option value={null}>No category</option>
  {#each categories as category (category.id)}
    <option value={category.id}>
      {category.name}
    </option>
  {/each}
</select>

<style>
  .category-picker {
    padding: 0.5rem;
    border: 1px solid var(--border-color);
    border-radius: 6px;
    background: var(--bg-primary);
    color: var(--text-primary);
    font-size: 0.875rem;
    cursor: pointer;
  }

  .category-picker:focus {
    outline: none;
    border-color: var(--accent-color);
  }
</style>
