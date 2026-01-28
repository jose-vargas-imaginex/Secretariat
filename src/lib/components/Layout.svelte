<script>
  import Sidebar from './Sidebar.svelte';

  let {
    selectedDate = $bindable(new Date()),
    currentView = $bindable('today'),
    children
  } = $props();

  function handleViewChange(view) {
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
