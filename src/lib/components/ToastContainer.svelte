<script lang="ts">
  import { getToasts, removeToast } from '../stores/toasts.svelte.js';

  let toasts = $derived(getToasts());
</script>

<div class="toast-container">
  {#each toasts as toast (toast.id)}
    <div class="toast">
      <span class="toast-message">{toast.message}</span>
      <div class="toast-actions">
        {#if toast.action}
          <button
            class="toast-action"
            onclick={() => {
              toast.action?.callback();
              removeToast(toast.id);
            }}
          >
            {toast.action.label}
          </button>
        {/if}
        <button
          class="toast-dismiss"
          onclick={() => removeToast(toast.id)}
          aria-label="Dismiss"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
        </button>
      </div>
    </div>
  {/each}
</div>

<style>
  .toast-container {
    position: fixed;
    bottom: 1.5rem;
    left: 50%;
    transform: translateX(-50%);
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    z-index: 1000;
    pointer-events: none;
  }

  .toast {
    display: flex;
    align-items: center;
    gap: 1rem;
    background: var(--bg-secondary);
    border: 1px solid var(--border-color);
    border-radius: 8px;
    padding: 0.75rem 1rem;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
    pointer-events: auto;
    animation: slide-up 0.2s ease-out;
  }

  @keyframes slide-up {
    from {
      opacity: 0;
      transform: translateY(1rem);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }

  .toast-message {
    font-size: 0.875rem;
    color: var(--text-primary);
  }

  .toast-actions {
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }

  .toast-action {
    background: none;
    border: none;
    color: var(--accent-color);
    font-size: 0.875rem;
    font-weight: 500;
    cursor: pointer;
    padding: 0.25rem 0.5rem;
    border-radius: 4px;
  }

  .toast-action:hover {
    background: var(--bg-hover);
  }

  .toast-dismiss {
    background: none;
    border: none;
    color: var(--text-secondary);
    cursor: pointer;
    padding: 0.25rem;
    border-radius: 4px;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .toast-dismiss:hover {
    background: var(--bg-hover);
    color: var(--text-primary);
  }
</style>
