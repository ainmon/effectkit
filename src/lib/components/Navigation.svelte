<script lang="ts">
  import { page } from "$app/stores";

  const navItems = [
    {
      href: "/",
      label: "🏠 Home",
      description: "Main showcase with Effect patterns",
    },
    {
      href: "/forms",
      label: "📝 Forms",
      description: "Form validation and state management",
    },
  ];
</script>

<nav class="navigation">
  <div class="nav-brand">
    <h2>EffectKit</h2>
    <span class="tagline">SvelteKit + Effect-TS</span>
  </div>

  <ul class="nav-links">
    {#each navItems as item}
      <li>
        <a
          href={item.href}
          class:active={$page.url.pathname === item.href}
          title={item.description}
        >
          {item.label}
        </a>
      </li>
    {/each}
  </ul>

  <div class="nav-actions">
    <a
      href="https://github.com/effect-ts/effect"
      target="_blank"
      rel="noopener noreferrer"
      class="external-link"
      title="Effect-TS GitHub"
    >
      🔗 Effect-TS
    </a>
    <a
      href="https://kit.svelte.dev/"
      target="_blank"
      rel="noopener noreferrer"
      class="external-link"
      title="SvelteKit Documentation"
    >
      🔗 SvelteKit
    </a>
  </div>
</nav>

<style>
  .navigation {
    background: rgba(255, 255, 255, 0.1);
    backdrop-filter: blur(20px);
    border: 1px solid rgba(255, 255, 255, 0.2);
    border-radius: 1rem;
    padding: 1rem 2rem;
    margin-bottom: 2rem;
    display: flex;
    align-items: center;
    justify-content: space-between;
    flex-wrap: wrap;
    gap: 1rem;
  }

  .nav-brand {
    display: flex;
    flex-direction: column;
  }

  .nav-brand h2 {
    margin: 0;
    font-size: 1.5rem;
    background: linear-gradient(45deg, #ff6b6b, #4ecdc4);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
  }

  .tagline {
    font-size: 0.875rem;
    opacity: 0.7;
    margin-top: -0.25rem;
  }

  .nav-links {
    display: flex;
    list-style: none;
    margin: 0;
    padding: 0;
    gap: 1rem;
  }

  .nav-links a {
    color: rgba(255, 255, 255, 0.8);
    text-decoration: none;
    padding: 0.5rem 1rem;
    border-radius: 0.5rem;
    transition: all 0.2s;
    border: 1px solid transparent;
  }

  .nav-links a:hover {
    background: rgba(255, 255, 255, 0.1);
    color: white;
    transform: translateY(-1px);
  }

  .nav-links a.active {
    background: rgba(78, 205, 196, 0.2);
    border-color: rgba(78, 205, 196, 0.4);
    color: #4ecdc4;
  }

  .nav-actions {
    display: flex;
    gap: 0.75rem;
  }

  .external-link {
    color: rgba(255, 255, 255, 0.7);
    text-decoration: none;
    font-size: 0.875rem;
    padding: 0.5rem 0.75rem;
    border: 1px solid rgba(255, 255, 255, 0.2);
    border-radius: 0.5rem;
    transition: all 0.2s;
  }

  .external-link:hover {
    background: rgba(255, 255, 255, 0.1);
    color: white;
    border-color: rgba(255, 255, 255, 0.4);
    transform: translateY(-1px);
  }

  @media (max-width: 768px) {
    .navigation {
      flex-direction: column;
      text-align: center;
      padding: 1.5rem 1rem;
    }

    .nav-links {
      width: 100%;
      justify-content: center;
      flex-wrap: wrap;
    }

    .nav-actions {
      justify-content: center;
    }
  }
</style>
