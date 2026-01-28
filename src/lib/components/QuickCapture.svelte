<script>
  import CategoryPicker from './CategoryPicker.svelte';

  let { categories = [], onSubmit = () => {} } = $props();

  let text = $state('');
  let categoryId = $state(null);

  function handleSubmit(e) {
    e.preventDefault();
    if (!text.trim()) return;

    onSubmit({ text: text.trim(), categoryId });
    text = '';
    categoryId = null;
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      handleSubmit(e);
    }
  }
</script>

<form class="quick-capture" onsubmit={handleSubmit}>
  <div class="input-row">
    <input
      type="text"
      class="capture-input"
      placeholder="What are you working on?"
      bind:value={text}
      onkeydown={handleKeyDown}
    />
    <CategoryPicker {categories} bind:selectedId={categoryId} />
    <button type="submit" class="submit-btn" disabled={!text.trim()}>
      Add
    </button>
  </div>
</form>

<style>
  .quick-capture {
    background: var(--bg-secondary);
    border: 1px solid var(--border-color);
    border-radius: 8px;
    padding: 1rem;
    margin-bottom: 1.5rem;
  }

  .input-row {
    display: flex;
    gap: 0.5rem;
    align-items: center;
  }

  .capture-input {
    flex: 1;
    padding: 0.5rem 0.75rem;
    border: 1px solid var(--border-color);
    border-radius: 6px;
    background: var(--bg-primary);
    color: var(--text-primary);
    font-size: 0.875rem;
  }

  .capture-input:focus {
    outline: none;
    border-color: var(--accent-color);
  }

  .capture-input::placeholder {
    color: var(--text-secondary);
  }

  .submit-btn {
    padding: 0.5rem 1rem;
    background: var(--accent-color);
    color: white;
    border: none;
    border-radius: 6px;
    font-size: 0.875rem;
    font-weight: 500;
    cursor: pointer;
  }

  .submit-btn:hover:not(:disabled) {
    opacity: 0.9;
  }

  .submit-btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
</style>
