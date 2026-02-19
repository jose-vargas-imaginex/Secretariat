<script lang="ts">
  interface Props {
    open: boolean;
    onClose: () => void;
    onGenerate: (days: number) => void;
    loading: boolean;
  }

  let { open, onClose, onGenerate, loading }: Props = $props();

  let selectedDays: number = $state(7);

  const options: { label: string; value: number }[] = [
    { label: "Past week", value: 7 },
    { label: "Past 2 weeks", value: 14 },
    { label: "Past 3 weeks", value: 21 },
    { label: "Past month", value: 30 },
  ];

  function handleBackdropClick(event: MouseEvent) {
    if (event.target === event.currentTarget) {
      onClose();
    }
  }

  function handleGenerate() {
    onGenerate(selectedDays);
  }
</script>

{#if open}
  <!-- svelte-ignore a11y_no_static_element_interactions -->
  <div class="backdrop" onmousedown={handleBackdropClick}>
    <div class="modal">
      <h2 class="modal-title">Refresh Blockers</h2>

      <p class="modal-label">Analyze notes from:</p>

      <div class="options">
        {#each options as option (option.value)}
          <label class="radio-option">
            <input
              type="radio"
              name="timeframe"
              value={option.value}
              checked={selectedDays === option.value}
              onchange={() => (selectedDays = option.value)}
            />
            <span class="radio-indicator"></span>
            <span class="radio-label">{option.label}</span>
          </label>
        {/each}
      </div>

      <div class="modal-actions">
        <button class="btn secondary" onclick={onClose} disabled={loading}>
          Cancel
        </button>
        <button class="btn primary" onclick={handleGenerate} disabled={loading}>
          {#if loading}
            <svg
              class="spinner"
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
            >
              <path d="M21 12a9 9 0 1 1-6.219-8.56" />
            </svg>
            Generating...
          {:else}
            Generate
          {/if}
        </button>
      </div>
    </div>
  </div>
{/if}

<style>
  .backdrop {
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.5);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 100;
  }

  .modal {
    background: var(--bg-primary);
    border: 1px solid var(--border-color);
    border-radius: 8px;
    padding: 1.5rem;
    max-width: 400px;
    width: 90%;
  }

  .modal-title {
    font-size: 1.125rem;
    font-weight: 600;
    margin: 0 0 1rem 0;
    color: var(--text-primary);
  }

  .modal-label {
    font-size: 0.875rem;
    color: var(--text-secondary);
    margin: 0 0 0.75rem 0;
  }

  .options {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    margin-bottom: 1.5rem;
  }

  .radio-option {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.5rem;
    border-radius: 6px;
    cursor: pointer;
    transition: background-color 0.15s;
  }

  .radio-option:hover {
    background: var(--bg-hover);
  }

  .radio-option input[type="radio"] {
    position: absolute;
    opacity: 0;
    width: 0;
    height: 0;
  }

  .radio-indicator {
    width: 16px;
    height: 16px;
    border-radius: 50%;
    border: 2px solid var(--border-color);
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    transition:
      border-color 0.15s,
      background-color 0.15s;
  }

  .radio-indicator::after {
    content: "";
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: var(--accent-color);
    transform: scale(0);
    transition: transform 0.15s;
  }

  .radio-option input[type="radio"]:checked ~ .radio-indicator {
    border-color: var(--accent-color);
  }

  .radio-option input[type="radio"]:checked ~ .radio-indicator::after {
    transform: scale(1);
  }

  .radio-label {
    font-size: 0.875rem;
    color: var(--text-primary);
  }

  .modal-actions {
    display: flex;
    justify-content: flex-end;
    gap: 0.5rem;
  }

  .btn {
    padding: 0.5rem 1rem;
    border: none;
    border-radius: 6px;
    font-size: 0.875rem;
    font-weight: 500;
    cursor: pointer;
    display: inline-flex;
    align-items: center;
    gap: 0.375rem;
  }

  .btn.primary {
    background: var(--accent-color);
    color: white;
  }

  .btn.secondary {
    background: var(--bg-hover);
    color: var(--text-primary);
  }

  .btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .spinner {
    animation: spin 1s linear infinite;
  }

  @keyframes spin {
    from {
      transform: rotate(0deg);
    }
    to {
      transform: rotate(360deg);
    }
  }
</style>
