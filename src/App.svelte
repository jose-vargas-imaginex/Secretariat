<script lang="ts">
  import Layout from "./lib/components/Layout.svelte";
  import DayView from "./lib/components/DayView.svelte";
  import Settings from "./lib/components/Settings.svelte";
  import { onMount } from "svelte";
  import { initDatabase } from "./lib/services/db/database.js";

  let dbReady = $state(false);
  let error = $state<string | null>(null);
  let selectedDate = $state(new Date());
  let currentView = $state<"today" | "day" | "settings">("today");

  onMount(async () => {
    try {
      await initDatabase();
      dbReady = true;
    } catch (e) {
      error = (e as Error).message;
      console.error("Failed to initialize database:", e);
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
  <Layout bind:selectedDate bind:currentView>
    {#if currentView === "today" || currentView === "day"}
      <DayView
        date={selectedDate}
        onNavigateToSettings={() => (currentView = "settings")}
      />
    {:else if currentView === "settings"}
      <Settings />
    {/if}
  </Layout>
{/if}

<style>
  .loading,
  .error {
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
</style>
