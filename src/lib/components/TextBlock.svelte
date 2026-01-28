<script>
  let { block, onUpdate = () => {} } = $props();

  let editing = $state(false);
  let editText = $state('');
  let inputRef = $state(null);

  $effect(() => {
    if (editing && inputRef) {
      inputRef.focus();
    }
  });

  function startEdit() {
    editText = block.content.text || '';
    editing = true;
  }

  function saveEdit() {
    if (editText.trim() !== (block.content.text || '')) {
      onUpdate({ ...block.content, text: editText.trim() });
    }
    editing = false;
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      saveEdit();
    }
    if (e.key === 'Escape') {
      editing = false;
    }
  }
</script>

<div class="text-block" class:ai-authored={block.author === 'ai'}>
  {#if editing}
    <input
      type="text"
      class="edit-input"
      bind:value={editText}
      bind:this={inputRef}
      onblur={saveEdit}
      onkeydown={handleKeyDown}
    />
  {:else}
    <button type="button" class="block-text" onclick={startEdit}>
      {block.content.text || ''}
    </button>
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

  .block-text {
    display: block;
    width: 100%;
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
