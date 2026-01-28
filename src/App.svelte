<script>
  import Layout from './lib/components/Layout.svelte';
  import { onMount } from 'svelte';
  import { initDatabase } from './lib/db/database.js';

  let dbReady = $state(false);
  let error = $state(null);

  onMount(async () => {
    try {
      await initDatabase();
      dbReady = true;
    } catch (e) {
      error = e.message;
      console.error('Failed to initialize database:', e);
    }
  });
</script>

{#if error}
  <div class="error">
    <h1>Error</h1>
    <p>{error}</p>
  </div>
{:else if !dbReady}
  <div class="loading">
    <p>Loading...</p>
  </div>
{:else}
  <Layout>
    <div class="today-view">
      <h1>Today</h1>
      <p>Quick capture coming soon...</p>
    </div>
  </Layout>
{/if}

<style>
  .loading, .error {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    height: 100vh;
    gap: 1rem;
  }

  .error {
    color: #ef4444;
  }

  .today-view h1 {
    font-size: 1.5rem;
    font-weight: 600;
    margin-bottom: 1rem;
  }
</style>
