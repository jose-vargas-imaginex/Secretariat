<script lang="ts">
  import { getAllCategories } from '../db/categories.js';
  import type { Category } from '../db/types.js';

  interface Props {
    categoryId: number | null;
    categoryName: string | undefined;
    categoryColor: string | undefined;
    onCategoryChange: (categoryId: number | null) => void;
  }

  let { categoryId, categoryName, categoryColor, onCategoryChange }: Props = $props();

  let isOpen = $state(false);
  let categories = $state<Category[]>([]);
  let containerRef = $state<HTMLDivElement | null>(null);

  function handleChipClick() {
    if (!isOpen) {
      categories = getAllCategories();
    }
    isOpen = !isOpen;
  }

  function handleSelect(id: number | null) {
    onCategoryChange(id);
    isOpen = false;
  }

  function handleClickOutside(event: MouseEvent) {
    if (containerRef && !containerRef.contains(event.target as Node)) {
      isOpen = false;
    }
  }

  function handleKeyDown(event: KeyboardEvent) {
    if (event.key === 'Escape') {
      isOpen = false;
    }
  }

  $effect(() => {
    if (isOpen) {
      document.addEventListener('click', handleClickOutside);
      document.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.removeEventListener('click', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  });
</script>

<div class="category-chip-container" bind:this={containerRef}>
  <button
    class="chip"
    class:has-category={categoryId !== null && categoryName}
    style={categoryColor ? `background-color: ${categoryColor}20; color: ${categoryColor}` : ''}
    onclick={handleChipClick}
  >
    {categoryName ?? 'Uncategorized'}
  </button>

  {#if isOpen}
    <div class="dropdown">
      <button
        class="dropdown-item"
        class:selected={categoryId === null}
        onclick={() => handleSelect(null)}
      >
        <span class="none-indicator"></span>
        None
      </button>
      {#each categories as category (category.id)}
        <button
          class="dropdown-item"
          class:selected={categoryId === category.id}
          onclick={() => handleSelect(category.id)}
        >
          <span
            class="color-dot"
            style="background-color: {category.color}"
          ></span>
          {category.name}
        </button>
      {/each}
    </div>
  {/if}
</div>

<style>
  .category-chip-container {
    position: relative;
    display: inline-block;
  }

  .chip {
    font-size: 0.625rem;
    font-weight: 500;
    padding: 0.125rem 0.5rem;
    border-radius: 9999px;
    text-transform: uppercase;
    letter-spacing: 0.025em;
    border: none;
    cursor: pointer;
    background-color: var(--bg-secondary);
    color: var(--text-secondary);
    transition: background-color 0.15s, color 0.15s;
  }

  .chip:hover {
    background-color: var(--bg-hover, var(--bg-secondary));
  }

  .chip.has-category:hover {
    filter: brightness(0.95);
  }

  .dropdown {
    position: absolute;
    top: 100%;
    left: 0;
    margin-top: 0.25rem;
    min-width: 150px;
    background: var(--bg-primary);
    border: 1px solid var(--border-color);
    border-radius: 6px;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
    z-index: 100;
    overflow: hidden;
  }

  .dropdown-item {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    width: 100%;
    padding: 0.5rem 0.75rem;
    font-size: 0.8125rem;
    color: var(--text-primary);
    background: none;
    border: none;
    cursor: pointer;
    text-align: left;
    transition: background-color 0.15s;
  }

  .dropdown-item:hover {
    background-color: var(--bg-hover, var(--bg-secondary));
  }

  .dropdown-item.selected {
    background-color: var(--accent-color);
    color: white;
  }

  .color-dot {
    width: 0.625rem;
    height: 0.625rem;
    border-radius: 50%;
    flex-shrink: 0;
  }

  .none-indicator {
    width: 0.625rem;
    height: 0.625rem;
    border-radius: 50%;
    border: 1px dashed var(--text-secondary);
    flex-shrink: 0;
  }

  .dropdown-item.selected .none-indicator {
    border-color: white;
  }
</style>
