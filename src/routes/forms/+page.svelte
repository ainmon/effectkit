<script lang="ts">
  import { Effect, pipe } from "effect";
  import { Schema } from "@effect/schema";
  import {
    runUserOperation,
    UserService,
    type User,
  } from "$lib/effects/user.service";

  // Form data
  let formData = {
    name: "",
    email: "",
    isActive: true,
  };

  let formErrors: Record<string, string> = {};
  let isSubmitting = false;
  let submitResult: any = null;
  let users: User[] = [];
  let selectedUserId: number | null = null;
  let updateFormData = { name: "", email: "", isActive: true };

  // Load users on mount
  async function loadUsers() {
    const result = await runUserOperation(
      UserService.pipe(Effect.flatMap((service) => service.getUsers()))
    );
    if (result.success) {
      users = result.data as User[];
    }
  }

  // Validate form using Effect and Schema
  const validateForm = (data: typeof formData) =>
    pipe(
      Effect.sync(() => ({
        name: data.name.trim(),
        email: data.email.trim().toLowerCase(),
        isActive: data.isActive,
      })),
      Effect.flatMap((normalizedData) => {
        const errors: Record<string, string> = {};

        if (!normalizedData.name) {
          errors.name = "Name is required";
        } else if (normalizedData.name.length < 2) {
          errors.name = "Name must be at least 2 characters";
        }

        if (!normalizedData.email) {
          errors.email = "Email is required";
        } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedData.email)) {
          errors.email = "Please enter a valid email address";
        }

        if (Object.keys(errors).length > 0) {
          return Effect.fail(errors);
        }

        return Effect.succeed(normalizedData);
      })
    );

  // Submit form with Effect
  async function handleSubmit() {
    isSubmitting = true;
    formErrors = {};
    submitResult = null;

    try {
      const validationResult = await Effect.runPromise(validateForm(formData));

      const result = await runUserOperation(
        UserService.pipe(
          Effect.flatMap((service) =>
            service.createUser({
              ...validationResult,
              avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${validationResult.name}`,
            })
          )
        )
      );

      if (result.success) {
        submitResult = { success: true, user: result.data };
        formData = { name: "", email: "", isActive: true };
        await loadUsers(); // Refresh users list
      } else {
        submitResult = { success: false, error: result.error };
      }
    } catch (validationErrors) {
      formErrors = validationErrors as Record<string, string>;
    }

    isSubmitting = false;
  }

  // Update user
  async function handleUpdate() {
    if (!selectedUserId) return;

    isSubmitting = true;

    try {
      const validationResult = await Effect.runPromise(
        validateForm(updateFormData)
      );

      const result = await runUserOperation(
        UserService.pipe(
          Effect.flatMap((service) =>
            service.updateUser(selectedUserId, validationResult)
          )
        )
      );

      if (result.success) {
        submitResult = { success: true, message: "User updated successfully" };
        await loadUsers();
        selectedUserId = null;
        updateFormData = { name: "", email: "", isActive: true };
      } else {
        submitResult = { success: false, error: result.error };
      }
    } catch (validationErrors) {
      formErrors = validationErrors as Record<string, string>;
    }

    isSubmitting = false;
  }

  // Delete user
  async function handleDelete(userId: number) {
    if (!confirm("Are you sure you want to delete this user?")) return;

    const result = await runUserOperation(
      UserService.pipe(Effect.flatMap((service) => service.deleteUser(userId)))
    );

    if (result.success) {
      submitResult = { success: true, message: "User deleted successfully" };
      await loadUsers();
    } else {
      submitResult = { success: false, error: result.error };
    }
  }

  // Select user for editing
  function selectUser(user: User) {
    selectedUserId = user.id;
    updateFormData = {
      name: user.name,
      email: user.email,
      isActive: user.isActive,
    };
  }

  // Load users when component mounts
  import { onMount } from "svelte";
  onMount(loadUsers);
</script>

<svelte:head>
  <title>Forms & State Management - EffectKit</title>
</svelte:head>

<main class="container">
  <header>
    <h1>📝 Forms & State Management</h1>
    <p class="subtitle">Effect-powered form validation and user management</p>
  </header>

  <div class="forms-grid">
    <!-- Create User Form -->
    <section class="form-card">
      <h2>➕ Create New User</h2>

      <form onsubmit={handleSubmit}>
        <div class="form-group">
          <label for="name">Name</label>
          <input
            id="name"
            type="text"
            bind:value={formData.name}
            class:error={formErrors.name}
            placeholder="Enter full name"
            disabled={isSubmitting}
          />
          {#if formErrors.name}
            <span class="error-message">{formErrors.name}</span>
          {/if}
        </div>

        <div class="form-group">
          <label for="email">Email</label>
          <input
            id="email"
            type="email"
            bind:value={formData.email}
            class:error={formErrors.email}
            placeholder="Enter email address"
            disabled={isSubmitting}
          />
          {#if formErrors.email}
            <span class="error-message">{formErrors.email}</span>
          {/if}
        </div>

        <div class="form-group">
          <label class="checkbox-label">
            <input
              type="checkbox"
              bind:checked={formData.isActive}
              disabled={isSubmitting}
            />
            Active User
          </label>
        </div>

        <button type="submit" disabled={isSubmitting} class="submit-button">
          {#if isSubmitting}
            Creating...
          {:else}
            Create User
          {/if}
        </button>
      </form>

      {#if submitResult}
        <div class="result {submitResult.success ? 'success' : 'error'}">
          {#if submitResult.success}
            {#if submitResult.user}
              <p>✅ User "{submitResult.user.name}" created successfully!</p>
            {:else}
              <p>✅ {submitResult.message}</p>
            {/if}
          {:else}
            <p>❌ {submitResult.error.message}</p>
          {/if}
        </div>
      {/if}
    </section>

    <!-- Update User Form -->
    {#if selectedUserId}
      <section class="form-card">
        <h2>✏️ Update User</h2>

        <form onsubmit={handleUpdate}>
          <div class="form-group">
            <label for="update-name">Name</label>
            <input
              id="update-name"
              type="text"
              bind:value={updateFormData.name}
              class:error={formErrors.name}
              placeholder="Enter full name"
              disabled={isSubmitting}
            />
          </div>

          <div class="form-group">
            <label for="update-email">Email</label>
            <input
              id="update-email"
              type="email"
              bind:value={updateFormData.email}
              class:error={formErrors.email}
              placeholder="Enter email address"
              disabled={isSubmitting}
            />
          </div>

          <div class="form-group">
            <label class="checkbox-label">
              <input
                type="checkbox"
                bind:checked={updateFormData.isActive}
                disabled={isSubmitting}
              />
              Active User
            </label>
          </div>

          <div class="form-actions">
            <button type="submit" disabled={isSubmitting} class="submit-button">
              {#if isSubmitting}
                Updating...
              {:else}
                Update User
              {/if}
            </button>
            <button
              type="button"
              onclick={() => {
                selectedUserId = null;
              }}
              class="cancel-button"
            >
              Cancel
            </button>
          </div>
        </form>
      </section>
    {/if}
  </div>

  <!-- Users List -->
  <section class="users-section">
    <h2>👥 Current Users</h2>

    {#if users.length > 0}
      <div class="users-grid">
        {#each users as user}
          <div class="user-card" class:inactive={!user.isActive}>
            <div class="user-info">
              {#if user.avatar}
                <img src={user.avatar} alt={user.name} class="avatar" />
              {:else}
                <div class="avatar-placeholder">
                  {user.name.charAt(0).toUpperCase()}
                </div>
              {/if}

              <div class="user-details">
                <h3>{user.name}</h3>
                <p>{user.email}</p>
                <span class="status {user.isActive ? 'active' : 'inactive'}">
                  {user.isActive ? "🟢 Active" : "🔴 Inactive"}
                </span>
                <small
                  >Created: {new Date(
                    user.createdAt
                  ).toLocaleDateString()}</small
                >
              </div>
            </div>

            <div class="user-actions">
              <button onclick={() => selectUser(user)} class="edit-button">
                Edit
              </button>
              <button
                onclick={() => handleDelete(user.id)}
                class="delete-button"
              >
                Delete
              </button>
            </div>
          </div>
        {/each}
      </div>
    {:else}
      <div class="empty-state">
        <p>No users found. Create your first user above!</p>
      </div>
    {/if}
  </section>

  <section class="features-explanation">
    <h2>🔍 Effect Patterns Demonstrated</h2>
    <div class="patterns-grid">
      <div class="pattern">
        <h3>Schema Validation</h3>
        <p>
          Client-side validation using Effect's powerful schema system with
          custom error handling.
        </p>
      </div>
      <div class="pattern">
        <h3>Effect Composition</h3>
        <p>
          Composing multiple effects for form processing, validation, and API
          calls.
        </p>
      </div>
      <div class="pattern">
        <h3>Error Management</h3>
        <p>
          Structured error handling with typed errors and graceful user
          feedback.
        </p>
      </div>
      <div class="pattern">
        <h3>State Synchronization</h3>
        <p>Keeping UI state in sync with Effect-managed data operations.</p>
      </div>
    </div>
  </section>
</main>

<style>
  .container {
    max-width: 1200px;
    margin: 0 auto;
    padding: 2rem;
    color: white;
    min-height: 100vh;
  }

  header {
    text-align: center;
    margin-bottom: 3rem;
  }

  h1 {
    font-size: 3rem;
    margin: 0;
    background: linear-gradient(45deg, #ff6b6b, #4ecdc4);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
  }

  .subtitle {
    font-size: 1.2rem;
    opacity: 0.8;
  }

  .forms-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(400px, 1fr));
    gap: 2rem;
    margin-bottom: 3rem;
  }

  .form-card {
    background: rgba(255, 255, 255, 0.1);
    backdrop-filter: blur(10px);
    border-radius: 1rem;
    padding: 2rem;
    border: 1px solid rgba(255, 255, 255, 0.2);
  }

  .form-card h2 {
    margin-top: 0;
    margin-bottom: 1.5rem;
  }

  .form-group {
    margin-bottom: 1.5rem;
  }

  label {
    display: block;
    margin-bottom: 0.5rem;
    font-weight: 500;
  }

  input[type="text"],
  input[type="email"] {
    width: 100%;
    padding: 0.75rem;
    border: 1px solid rgba(255, 255, 255, 0.3);
    border-radius: 0.5rem;
    background: rgba(255, 255, 255, 0.1);
    color: white;
    font-size: 1rem;
  }

  input[type="text"]:focus,
  input[type="email"]:focus {
    outline: none;
    border-color: #4ecdc4;
    box-shadow: 0 0 0 2px rgba(78, 205, 196, 0.2);
  }

  input.error {
    border-color: #ff6b6b;
    box-shadow: 0 0 0 2px rgba(255, 107, 107, 0.2);
  }

  .checkbox-label {
    display: flex;
    align-items: center;
    cursor: pointer;
  }

  .checkbox-label input {
    margin-right: 0.5rem;
    width: auto;
  }

  .error-message {
    color: #ff6b6b;
    font-size: 0.875rem;
    margin-top: 0.25rem;
    display: block;
  }

  .submit-button {
    background: linear-gradient(45deg, #4ecdc4, #44a08d);
    border: none;
    color: white;
    padding: 0.75rem 2rem;
    border-radius: 0.5rem;
    font-size: 1rem;
    cursor: pointer;
    transition: all 0.2s;
    width: 100%;
  }

  .submit-button:hover:not(:disabled) {
    transform: translateY(-1px);
    box-shadow: 0 4px 12px rgba(78, 205, 196, 0.3);
  }

  .submit-button:disabled {
    opacity: 0.7;
    cursor: not-allowed;
  }

  .form-actions {
    display: flex;
    gap: 1rem;
  }

  .cancel-button {
    background: rgba(255, 255, 255, 0.2);
    border: 1px solid rgba(255, 255, 255, 0.3);
    color: white;
    padding: 0.75rem 1.5rem;
    border-radius: 0.5rem;
    cursor: pointer;
    transition: all 0.2s;
  }

  .result {
    margin-top: 1rem;
    padding: 1rem;
    border-radius: 0.5rem;
  }

  .result.success {
    background: rgba(76, 175, 80, 0.2);
    border: 1px solid rgba(76, 175, 80, 0.4);
  }

  .result.error {
    background: rgba(244, 67, 54, 0.2);
    border: 1px solid rgba(244, 67, 54, 0.4);
  }

  .users-section {
    margin-bottom: 3rem;
  }

  .users-section h2 {
    margin-bottom: 1.5rem;
  }

  .users-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
    gap: 1.5rem;
  }

  .user-card {
    background: rgba(255, 255, 255, 0.1);
    backdrop-filter: blur(10px);
    border-radius: 1rem;
    padding: 1.5rem;
    border: 1px solid rgba(255, 255, 255, 0.2);
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .user-card.inactive {
    opacity: 0.7;
  }

  .user-info {
    display: flex;
    align-items: center;
    gap: 1rem;
  }

  .avatar {
    width: 60px;
    height: 60px;
    border-radius: 50%;
    object-fit: cover;
  }

  .avatar-placeholder {
    width: 60px;
    height: 60px;
    border-radius: 50%;
    background: linear-gradient(45deg, #ff6b6b, #4ecdc4);
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 1.5rem;
    font-weight: bold;
  }

  .user-details h3 {
    margin: 0 0 0.25rem 0;
    font-size: 1.2rem;
  }

  .user-details p {
    margin: 0 0 0.5rem 0;
    opacity: 0.8;
  }

  .user-details small {
    opacity: 0.6;
    display: block;
  }

  .status {
    display: inline-block;
    padding: 0.25rem 0.5rem;
    border-radius: 0.25rem;
    font-size: 0.875rem;
    margin-bottom: 0.25rem;
  }

  .status.active {
    background: rgba(76, 175, 80, 0.3);
  }

  .status.inactive {
    background: rgba(244, 67, 54, 0.3);
  }

  .user-actions {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  .edit-button {
    background: rgba(78, 205, 196, 0.8);
    border: none;
    color: white;
    padding: 0.5rem 1rem;
    border-radius: 0.25rem;
    cursor: pointer;
    font-size: 0.875rem;
  }

  .delete-button {
    background: rgba(244, 67, 54, 0.8);
    border: none;
    color: white;
    padding: 0.5rem 1rem;
    border-radius: 0.25rem;
    cursor: pointer;
    font-size: 0.875rem;
  }

  .empty-state {
    text-align: center;
    padding: 3rem;
    opacity: 0.7;
  }

  .features-explanation {
    text-align: center;
  }

  .patterns-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
    gap: 1.5rem;
    margin-top: 2rem;
  }

  .pattern {
    background: rgba(255, 255, 255, 0.1);
    backdrop-filter: blur(10px);
    border-radius: 1rem;
    padding: 1.5rem;
    border: 1px solid rgba(255, 255, 255, 0.2);
  }

  .pattern h3 {
    margin-top: 0;
    color: #4ecdc4;
  }

  @media (max-width: 768px) {
    .forms-grid {
      grid-template-columns: 1fr;
    }

    .users-grid {
      grid-template-columns: 1fr;
    }

    .container {
      padding: 1rem;
    }

    h1 {
      font-size: 2rem;
    }
  }
</style>
