<script lang="ts">
  import { onMount } from "svelte";
  import { Effect } from "effect";
  import {
    fetchPostsWithRetry,
    fetchPostWithFallback,
    fetchUserDataWithTimeout,
    processPostsWithResourceManagement,
  } from "$lib/effects/simple-api.service";
  import Navigation from "$lib/components/Navigation.svelte";

  let postsResult: any = null;
  let postResult: any = null;
  let userDataResult: any = null;
  let statsResult: any = null;
  let loading = {
    posts: false,
    post: false,
    userData: false,
    stats: false,
  };

  // Load posts with retry mechanism
  async function loadPosts() {
    loading.posts = true;
    try {
      postsResult = await Effect.runPromise(fetchPostsWithRetry());
    } catch (err) {
      postsResult = {
        success: false,
        error: { type: "UnknownError", message: "Failed to load posts" },
      };
    }
    loading.posts = false;
  }

  // Load a specific post with fallback
  async function loadPost(id: number) {
    loading.post = true;
    try {
      postResult = await Effect.runPromise(fetchPostWithFallback(id));
    } catch (err) {
      postResult = {
        success: false,
        error: { type: "UnknownError", message: "Failed to load post" },
      };
    }
    loading.post = false;
  }

  // Load user data with timeout
  async function loadUserData(userId: number) {
    loading.userData = true;
    try {
      userDataResult = await Effect.runPromise(
        fetchUserDataWithTimeout(userId)
      );
    } catch (err) {
      userDataResult = {
        success: false,
        error: { type: "UnknownError", message: "Failed to load user data" },
      };
    }
    loading.userData = false;
  }

  // Process posts with resource management
  async function processStats() {
    loading.stats = true;
    try {
      statsResult = await Effect.runPromise(
        processPostsWithResourceManagement()
      );
    } catch (err) {
      statsResult = {
        success: false,
        error: { type: "UnknownError", message: "Failed to process stats" },
      };
    }
    loading.stats = false;
  }

  onMount(() => {
    loadPosts();
    loadPost(1);
    loadUserData(1);
    processStats();
  });
</script>

<svelte:head>
  <title>EffectKit - SvelteKit + Effect-TS Showcase</title>
  <meta
    name="description"
    content="A comprehensive showcase of Effect-TS integration with SvelteKit"
  />
</svelte:head>

<main class="container">
  <Navigation />

  <header>
    <h1>🚀 EffectKit</h1>
    <p class="subtitle">SvelteKit + Effect-TS Integration Showcase</p>
    <p class="description">
      Explore the power of functional programming with Effect-TS in a modern
      SvelteKit application. This showcase demonstrates error handling, resource
      management, parallel processing, and more.
    </p>
  </header>

  <div class="showcase-grid">
    <!-- Posts with Retry -->
    <section class="demo-card">
      <h2>📝 Posts with Retry Logic</h2>
      <p>Demonstrates automatic retry with exponential backoff on failure.</p>

      <div class="demo-content">
        {#if loading.posts}
          <div class="loading">Loading posts...</div>
        {:else if postsResult}
          {#if postsResult.success}
            <div class="success">
              <p>✅ Loaded {postsResult.data.length} posts successfully!</p>
              <ul>
                {#each postsResult.data as post}
                  <li>
                    <strong>{post.title}</strong>
                    <p>{post.body.substring(0, 100)}...</p>
                  </li>
                {/each}
              </ul>
            </div>
          {:else}
            <div class="error">
              <p>❌ Error: {postsResult.error.message}</p>
              <button onclick={loadPosts}>Retry</button>
            </div>
          {/if}
        {/if}
      </div>
    </section>

    <!-- Post with Fallback -->
    <section class="demo-card">
      <h2>🔄 Post with Fallback</h2>
      <p>Demonstrates graceful fallback when primary data source fails.</p>

      <div class="demo-content">
        <div class="controls">
          <button onclick={() => loadPost(1)}>Load Post 1</button>
          <button onclick={() => loadPost(999)}>Load Non-existent Post</button>
        </div>

        {#if loading.post}
          <div class="loading">Loading post...</div>
        {:else if postResult}
          {#if postResult.success}
            <div class="success">
              <h3>{postResult.data.title}</h3>
              <p>{postResult.data.body}</p>
              <small>User ID: {postResult.data.userId}</small>
            </div>
          {:else}
            <div class="error">
              <p>❌ Error: {postResult.error.message}</p>
            </div>
          {/if}
        {/if}
      </div>
    </section>

    <!-- Parallel Data Fetching with Timeout -->
    <section class="demo-card">
      <h2>⚡ Parallel Data Fetching</h2>
      <p>Demonstrates concurrent data fetching with timeout protection.</p>

      <div class="demo-content">
        <div class="controls">
          <button onclick={() => loadUserData(1)}>Load User 1 Data</button>
          <button onclick={() => loadUserData(2)}>Load User 2 Data</button>
        </div>

        {#if loading.userData}
          <div class="loading">Loading user data...</div>
        {:else if userDataResult}
          {#if userDataResult.success}
            <div class="success">
              <h3>📊 User Summary</h3>
              <div class="user-summary">
                <div class="summary-item">
                  <strong>Post:</strong>
                  {userDataResult.data.summary.postTitle}
                </div>
                <div class="summary-item">
                  <strong>Total Todos:</strong>
                  {userDataResult.data.summary.totalTodos}
                </div>
                <div class="summary-item">
                  <strong>Completed:</strong>
                  {userDataResult.data.summary.completedTodos}
                </div>
              </div>

              <details>
                <summary>View Todos</summary>
                <ul>
                  {#each userDataResult.data.todos as todo}
                    <li class:completed={todo.completed}>
                      {todo.completed ? "✅" : "⏳"}
                      {todo.title}
                    </li>
                  {/each}
                </ul>
              </details>
            </div>
          {:else}
            <div class="error">
              <p>
                ❌ {userDataResult.error.type}: {userDataResult.error.message}
              </p>
            </div>
          {/if}
        {/if}
      </div>
    </section>

    <!-- Resource Management -->
    <section class="demo-card">
      <h2>🛠️ Resource Management</h2>
      <p>Demonstrates proper resource acquisition and cleanup with Effect.</p>

      <div class="demo-content">
        <button onclick={processStats}>Process Posts Statistics</button>

        {#if loading.stats}
          <div class="loading">Processing statistics...</div>
        {:else if statsResult}
          {#if statsResult.success}
            <div class="success">
              <h3>📈 Processing Results</h3>
              <div class="stats-grid">
                <div class="stat">
                  <strong>Total Posts:</strong>
                  <span>{statsResult.data.total}</span>
                </div>
                <div class="stat">
                  <strong>Avg Title Length:</strong>
                  <span>{statsResult.data.avgTitleLength.toFixed(1)} chars</span
                  >
                </div>
                <div class="stat">
                  <strong>Processing Time:</strong>
                  <span>{statsResult.data.processingTime}ms</span>
                </div>
              </div>

              <div class="user-posts">
                <h4>Posts by User:</h4>
                {#each Object.entries(statsResult.data.userPostCounts) as [userId, count]}
                  <div class="user-stat">User {userId}: {count} posts</div>
                {/each}
              </div>
            </div>
          {:else}
            <div class="error">
              <p>❌ Error: {statsResult.error.message}</p>
            </div>
          {/if}
        {/if}
      </div>
    </section>
  </div>

  <footer>
    <h2>🎯 Key Features Demonstrated</h2>
    <div class="features-grid">
      <div class="feature">
        <h3>Error Handling</h3>
        <p>
          Type-safe error handling with custom error types and proper error
          propagation.
        </p>
      </div>
      <div class="feature">
        <h3>Retry Logic</h3>
        <p>
          Automatic retry with exponential backoff and jittered delays for
          resilient operations.
        </p>
      </div>
      <div class="feature">
        <h3>Fallback Strategies</h3>
        <p>
          Graceful degradation with fallback values when primary operations
          fail.
        </p>
      </div>
      <div class="feature">
        <h3>Parallel Processing</h3>
        <p>
          Concurrent execution of multiple operations with proper resource
          management.
        </p>
      </div>
      <div class="feature">
        <h3>Timeout Protection</h3>
        <p>
          Timeout mechanisms to prevent hanging operations and ensure
          responsiveness.
        </p>
      </div>
      <div class="feature">
        <h3>Resource Management</h3>
        <p>
          Proper acquisition and cleanup of resources using Effect's resource
          management.
        </p>
      </div>
    </div>
  </footer>
</main>

<style>
  :global(body) {
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto,
      sans-serif;
    margin: 0;
    padding: 0;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    min-height: 100vh;
  }

  .container {
    max-width: 1200px;
    margin: 0 auto;
    padding: 2rem;
    color: white;
  }

  header {
    text-align: center;
    margin-bottom: 3rem;
  }

  h1 {
    font-size: 3.5rem;
    margin: 0;
    background: linear-gradient(45deg, #ff6b6b, #4ecdc4);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
  }

  .subtitle {
    font-size: 1.5rem;
    margin: 0.5rem 0;
    opacity: 0.9;
  }

  .description {
    font-size: 1.1rem;
    opacity: 0.8;
    max-width: 600px;
    margin: 0 auto;
    line-height: 1.6;
  }

  .showcase-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(500px, 1fr));
    gap: 2rem;
    margin-bottom: 3rem;
  }

  .demo-card {
    background: rgba(255, 255, 255, 0.1);
    backdrop-filter: blur(10px);
    border-radius: 1rem;
    padding: 2rem;
    border: 1px solid rgba(255, 255, 255, 0.2);
  }

  .demo-card h2 {
    margin-top: 0;
    font-size: 1.5rem;
    margin-bottom: 0.5rem;
  }

  .demo-card p {
    opacity: 0.8;
    margin-bottom: 1.5rem;
  }

  .demo-content {
    min-height: 200px;
  }

  .controls {
    margin-bottom: 1rem;
  }

  .controls button {
    background: rgba(255, 255, 255, 0.2);
    border: 1px solid rgba(255, 255, 255, 0.3);
    color: white;
    padding: 0.5rem 1rem;
    border-radius: 0.5rem;
    cursor: pointer;
    margin-right: 0.5rem;
    margin-bottom: 0.5rem;
    transition: all 0.2s;
  }

  .controls button:hover {
    background: rgba(255, 255, 255, 0.3);
    transform: translateY(-1px);
  }

  .loading {
    padding: 1rem;
    text-align: center;
    opacity: 0.7;
    font-style: italic;
  }

  .success {
    background: rgba(76, 175, 80, 0.2);
    border: 1px solid rgba(76, 175, 80, 0.4);
    border-radius: 0.5rem;
    padding: 1rem;
  }

  .error {
    background: rgba(244, 67, 54, 0.2);
    border: 1px solid rgba(244, 67, 54, 0.4);
    border-radius: 0.5rem;
    padding: 1rem;
  }

  .error button {
    background: rgba(244, 67, 54, 0.8);
    border: none;
    color: white;
    padding: 0.5rem 1rem;
    border-radius: 0.25rem;
    cursor: pointer;
    margin-top: 0.5rem;
  }

  .user-summary {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    gap: 1rem;
    margin: 1rem 0;
  }

  .summary-item {
    background: rgba(255, 255, 255, 0.1);
    padding: 0.75rem;
    border-radius: 0.5rem;
  }

  .stats-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
    gap: 1rem;
    margin: 1rem 0;
  }

  .stat {
    background: rgba(255, 255, 255, 0.1);
    padding: 0.75rem;
    border-radius: 0.5rem;
    text-align: center;
  }

  .stat strong {
    display: block;
    margin-bottom: 0.25rem;
  }

  .stat span {
    font-size: 1.2rem;
    color: #4ecdc4;
  }

  .user-posts {
    margin-top: 1rem;
  }

  .user-stat {
    background: rgba(255, 255, 255, 0.1);
    padding: 0.5rem;
    border-radius: 0.25rem;
    margin-bottom: 0.25rem;
  }

  ul {
    list-style: none;
    padding: 0;
  }

  ul li {
    background: rgba(255, 255, 255, 0.1);
    margin-bottom: 0.5rem;
    padding: 0.75rem;
    border-radius: 0.5rem;
  }

  ul li.completed {
    opacity: 0.7;
    text-decoration: line-through;
  }

  details {
    margin-top: 1rem;
  }

  summary {
    cursor: pointer;
    padding: 0.5rem;
    background: rgba(255, 255, 255, 0.1);
    border-radius: 0.25rem;
    margin-bottom: 0.5rem;
  }

  .features-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
    gap: 1.5rem;
    margin-top: 2rem;
  }

  .feature {
    background: rgba(255, 255, 255, 0.1);
    backdrop-filter: blur(10px);
    border-radius: 1rem;
    padding: 1.5rem;
    border: 1px solid rgba(255, 255, 255, 0.2);
    text-align: center;
  }

  .feature h3 {
    margin-top: 0;
    color: #4ecdc4;
  }

  footer {
    text-align: center;
    margin-top: 4rem;
  }

  footer h2 {
    margin-bottom: 2rem;
  }

  @media (max-width: 768px) {
    .showcase-grid {
      grid-template-columns: 1fr;
    }

    .container {
      padding: 1rem;
    }

    h1 {
      font-size: 2.5rem;
    }
  }
</style>
