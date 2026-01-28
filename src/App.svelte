<script>
  let name = $state('Secretariat');
</script>

<main>
  <div class="welcome">
    <h1>Hello World!</h1>
    <p>Welcome to <span class="highlight">{name}</span></p>
    <p class="subtitle">Your AI-augmented notes app</p>
  </div>
</main>

<style>
  main {
    text-align: center;
    padding: 2rem;
  }

  .welcome {
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }

  h1 {
    font-size: 3rem;
    font-weight: 700;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
  }

  p {
    font-size: 1.25rem;
    color: inherit;
    opacity: 0.9;
  }

  .highlight {
    font-weight: 600;
    color: #667eea;
  }

  .subtitle {
    font-size: 1rem;
    opacity: 0.7;
  }
</style>
