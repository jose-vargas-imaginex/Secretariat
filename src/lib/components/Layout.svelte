<script>
  import Sidebar from './Sidebar.svelte';

  let { children } = $props();
</script>

<div class="layout">
  <Sidebar />
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
