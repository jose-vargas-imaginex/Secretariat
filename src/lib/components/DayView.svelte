<script lang="ts">
  import { format, isToday } from "date-fns";
  import QuickCapture from "./QuickCapture.svelte";
  import EntryList from "./EntryList.svelte";
  import { getOrCreateDailyNote } from "../db/dailyNotes.js";
  import { createEntry, getEntriesForDailyNote } from "../db/entries.js";
  import { getAllCategories } from "../db/categories.js";

  interface Props {
    date?: Date;
  }

  let { date = new Date() }: Props = $props();

  let refreshCounter = $state(0);

  let categories = $derived(getAllCategories());

  let dailyNote = $derived(getOrCreateDailyNote(date));

  let entries = $derived.by(() => {
    // Access refreshCounter to trigger re-computation when entries change
    refreshCounter;
    if (dailyNote) {
      return getEntriesForDailyNote(dailyNote.id);
    }
    return [];
  });

  function handleCapture({
    text,
    categoryId,
  }: {
    text: string;
    categoryId: number | null;
  }) {
    if (!dailyNote) return;

    createEntry(dailyNote.id, categoryId, text);
    refreshCounter++;
  }

  let title = $derived(
    isToday(date) ? "Today" : format(date, "EEEE, MMMM d, yyyy"),
  );
</script>

<div class="day-view">
  <header class="day-header">
    <h1>{title}</h1>
    {#if !isToday(date)}
      <p class="date-subtitle">{format(date, "MMMM d, yyyy")}</p>
    {/if}
  </header>

  <QuickCapture {categories} onSubmit={handleCapture} />

  <EntryList {entries} onEntryDeleted={() => refreshCounter++} />
</div>

<style>
  .day-view {
    max-width: 800px;
    margin: 0 auto;
  }

  .day-header {
    margin-bottom: 1.5rem;
  }

  .day-header h1 {
    font-size: 1.5rem;
    font-weight: 600;
    margin: 0;
  }

  .date-subtitle {
    font-size: 0.875rem;
    color: var(--text-secondary);
    margin: 0.25rem 0 0 0;
  }
</style>
