<script>
  import {
    startOfMonth,
    endOfMonth,
    startOfWeek,
    endOfWeek,
    eachDayOfInterval,
    format,
    isSameMonth,
    isSameDay,
    addMonths,
    subMonths
  } from 'date-fns';

  let { selectedDate = $bindable(new Date()), datesWithNotes = [] } = $props();

  let viewDate = $state(new Date());

  let calendarDays = $derived.by(() => {
    const monthStart = startOfMonth(viewDate);
    const monthEnd = endOfMonth(viewDate);
    const calStart = startOfWeek(monthStart);
    const calEnd = endOfWeek(monthEnd);

    return eachDayOfInterval({ start: calStart, end: calEnd });
  });

  function hasNotes(date) {
    const dateStr = format(date, 'yyyy-MM-dd');
    return datesWithNotes.includes(dateStr);
  }

  function prevMonth() {
    viewDate = subMonths(viewDate, 1);
  }

  function nextMonth() {
    viewDate = addMonths(viewDate, 1);
  }

  function selectDay(date) {
    selectedDate = date;
  }
</script>

<div class="calendar">
  <div class="calendar-header">
    <button class="nav-btn" onclick={prevMonth}>&lt;</button>
    <span class="month-label">{format(viewDate, 'MMMM yyyy')}</span>
    <button class="nav-btn" onclick={nextMonth}>&gt;</button>
  </div>

  <div class="calendar-grid">
    <div class="weekday">Su</div>
    <div class="weekday">Mo</div>
    <div class="weekday">Tu</div>
    <div class="weekday">We</div>
    <div class="weekday">Th</div>
    <div class="weekday">Fr</div>
    <div class="weekday">Sa</div>

    {#each calendarDays as day (day.getTime())}
      <button
        class="day"
        class:other-month={!isSameMonth(day, viewDate)}
        class:selected={isSameDay(day, selectedDate)}
        class:today={isSameDay(day, new Date())}
        class:has-notes={hasNotes(day)}
        onclick={() => selectDay(day)}
      >
        {format(day, 'd')}
      </button>
    {/each}
  </div>
</div>

<style>
  .calendar {
    padding: 0.5rem;
  }

  .calendar-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 0.5rem;
  }

  .month-label {
    font-size: 0.875rem;
    font-weight: 500;
  }

  .nav-btn {
    background: none;
    border: none;
    padding: 0.25rem 0.5rem;
    cursor: pointer;
    color: var(--text-secondary);
    border-radius: 4px;
  }

  .nav-btn:hover {
    background: var(--bg-hover);
    color: var(--text-primary);
  }

  .calendar-grid {
    display: grid;
    grid-template-columns: repeat(7, 1fr);
    gap: 2px;
  }

  .weekday {
    font-size: 0.625rem;
    text-align: center;
    color: var(--text-secondary);
    padding: 0.25rem;
  }

  .day {
    aspect-ratio: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 0.75rem;
    border: none;
    background: none;
    cursor: pointer;
    border-radius: 4px;
    color: var(--text-primary);
    position: relative;
  }

  .day:hover {
    background: var(--bg-hover);
  }

  .day.other-month {
    color: var(--text-secondary);
    opacity: 0.5;
  }

  .day.today {
    font-weight: 600;
    color: var(--accent-color);
  }

  .day.selected {
    background: var(--accent-color);
    color: white;
  }

  .day.has-notes::after {
    content: '';
    position: absolute;
    bottom: 2px;
    width: 4px;
    height: 4px;
    background: var(--accent-color);
    border-radius: 50%;
  }

  .day.selected.has-notes::after {
    background: white;
  }
</style>
