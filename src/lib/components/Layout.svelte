<script lang="ts">
  import Sidebar from './Sidebar.svelte';
  import type { Snippet } from 'svelte';

  interface Props {
    selectedDate?: Date;
    currentView?: string;
    children: Snippet;
  }

  let {
    selectedDate = $bindable(new Date()),
    currentView = $bindable('today'),
    children
  }: Props = $props();

  function handleViewChange(view: string) {
    currentView = view;
  }
</script>

<div class="layout">
  <Sidebar
    bind:selectedDate
    onViewChange={handleViewChange}
  />
  <main class="main-content">
    {@render children()}
  </main>
</div>

<style>
  .layout {
    display: flex;
    height: 100vh;
    overflow: hidden;
  }

  .main-content {
    flex: 1;
    overflow-y: auto;
    padding: 1.5rem;
    background: var(--bg-primary);
  }
</style>
