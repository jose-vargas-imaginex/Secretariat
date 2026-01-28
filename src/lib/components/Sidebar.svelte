<script>
  let currentView = $state('today');
</script>

<aside class="sidebar">
  <div class="logo">
    <h1>Secretariat</h1>
  </div>

  <nav class="nav">
    <button
      class="nav-item"
      class:active={currentView === 'today'}
      onclick={() => currentView = 'today'}
    >
      Today
    </button>
  </nav>

  <div class="sidebar-section">
    <h2>Calendar</h2>
    <p class="placeholder">Calendar coming soon</p>
  </div>

  <div class="sidebar-section">
    <h2>Sections</h2>
    <p class="placeholder">Sections coming soon</p>
  </div>

  <div class="sidebar-footer">
    <button class="nav-item">Settings</button>
  </div>
</aside>

<style>
  .sidebar {
    width: 260px;
    background: var(--bg-secondary);
    border-right: 1px solid var(--border-color);
    display: flex;
    flex-direction: column;
    height: 100vh;
  }

  .logo {
    padding: 1rem;
    border-bottom: 1px solid var(--border-color);
  }

  .logo h1 {
    font-size: 1.25rem;
    font-weight: 600;
    margin: 0;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
  }

  .nav {
    padding: 0.5rem;
  }

  .nav-item {
    width: 100%;
    padding: 0.5rem 0.75rem;
    background: none;
    border: none;
    border-radius: 6px;
    text-align: left;
    cursor: pointer;
    color: var(--text-primary);
    font-size: 0.875rem;
  }

  .nav-item:hover {
    background: var(--bg-hover);
  }

  .nav-item.active {
    background: var(--bg-active);
    color: var(--accent-color);
  }

  .sidebar-section {
    padding: 1rem;
    border-top: 1px solid var(--border-color);
  }

  .sidebar-section h2 {
    font-size: 0.75rem;
    text-transform: uppercase;
    color: var(--text-secondary);
    margin: 0 0 0.5rem 0;
    letter-spacing: 0.05em;
  }

  .placeholder {
    font-size: 0.75rem;
    color: var(--text-secondary);
    margin: 0;
  }

  .sidebar-footer {
    margin-top: auto;
    padding: 0.5rem;
    border-top: 1px solid var(--border-color);
  }
</style>
