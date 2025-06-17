# 🚀 EffectKit

**A comprehensive showcase of Effect-TS integration with SvelteKit**

EffectKit demonstrates the power of combining [Effect-TS](https://effect.website/) with [SvelteKit](https://kit.svelte.dev/) to build robust, type-safe, and highly composable web applications. This starter repository showcases advanced functional programming patterns, error handling, resource management, and more.

## ✨ Features

### 🔧 Effect-TS Integration

- **Type-safe error handling** with custom error types and proper error propagation
- **Retry logic** with exponential backoff and jittered delays
- **Fallback strategies** for graceful degradation
- **Parallel processing** with proper resource management
- **Timeout protection** to prevent hanging operations
- **Resource management** using Effect's acquire/use/release pattern
- **Schema validation** using `@effect/schema` for runtime type safety

### 🌐 SvelteKit Features

- **Server-side rendering** with Effect-powered load functions
- **API endpoints** demonstrating Effect patterns on the server
- **Client-side Effects** for reactive data management
- **Form validation** with Effect-powered validation logic
- **Real-time state management** with proper error boundaries

### 🎯 Real-World Patterns

- **Data fetching** with caching, retries, and timeouts
- **User management** with CRUD operations
- **Form handling** with comprehensive validation
- **Error boundaries** with user-friendly error messages
- **Resource cleanup** and proper lifecycle management

## 🏗️ Project Structure

```
src/
├── lib/
│   └── effects/
│       ├── user.service.ts         # User management with Effect
│       ├── simple-api.service.ts   # API operations with Effect patterns
│       └── api.service.ts          # Advanced HTTP client patterns
├── routes/
│   ├── +page.svelte               # Main showcase page
│   ├── forms/
│   │   └── +page.svelte           # Form handling demo
│   └── api/
│       └── users/
│           └── +server.ts         # Effect-powered API endpoints
└── app.html                       # Root HTML template
```

## 🚀 Getting Started

### Prerequisites

- Node.js 18+ or Bun
- pnpm (recommended) or npm

### Installation

1. **Clone the repository**

   ```bash
   git clone <your-repo-url> effectkit
   cd effectkit
   ```

2. **Install dependencies**

   ```bash
   pnpm install
   ```

3. **Start the development server**

   ```bash
   pnpm dev
   ```

4. **Open your browser**
   Visit `http://localhost:5173` to see the showcase

## 📚 What's Demonstrated

### 1. Effect-TS Fundamentals

#### Service-Based Architecture

```typescript
// Define a service interface
export interface UserService {
  readonly getUser: (
    id: number
  ) => Effect.Effect<User, UserNotFoundError | UserServiceError>;
  readonly getUsers: () => Effect.Effect<readonly User[], UserServiceError>;
  // ... more operations
}

// Create a service tag
export const UserService = Context.GenericTag<UserService>("UserService");

// Implement the service
const makeUserService = (): UserService => ({
  getUser: (id: number) =>
    pipe(
      Effect.sync(() => findUserById(id)),
      Effect.flatMap((user) =>
        user
          ? Effect.succeed(user)
          : Effect.fail(new UserNotFoundError({ userId: id }))
      )
    ),
});
```

#### Error Handling

```typescript
// Define custom error types
export class UserNotFoundError extends Schema.TaggedError<UserNotFoundError>()(
  "UserNotFoundError",
  {
    userId: Schema.Number,
  }
) {}

// Handle errors with proper types
pipe(
  userService.getUser(id),
  Effect.match({
    onFailure: (error) => {
      switch (error._tag) {
        case "UserNotFoundError":
          return `User ${error.userId} not found`;
        case "UserServiceError":
          return `Service error: ${error.message}`;
      }
    },
    onSuccess: (user) => `Found user: ${user.name}`,
  })
);
```

#### Resource Management

```typescript
const processWithResourceManagement = () =>
  pipe(
    Effect.acquireUseRelease(
      // Acquire: Set up resources
      Effect.sync(() => ({ startTime: Date.now() })),
      // Use: Perform operations
      (context) => performDataProcessing(context),
      // Release: Clean up resources
      (context) =>
        Effect.sync(() =>
          console.log(`Completed in ${Date.now() - context.startTime}ms`)
        )
    )
  );
```

### 2. SvelteKit Integration

#### Load Functions with Effect

```typescript
// src/routes/users/+page.server.ts
export const load: PageServerLoad = async () => {
  const result = await runUserOperation(
    UserService.pipe(Effect.flatMap((service) => service.getUsers()))
  );

  if (result.success) {
    return { users: result.data };
  } else {
    error(500, result.error.message);
  }
};
```

#### API Endpoints with Effect

```typescript
// src/routes/api/users/+server.ts
export const GET: RequestHandler = async () => {
  const result = await runUserOperation(
    UserService.pipe(Effect.flatMap((service) => service.getUsers()))
  );

  return json(result.success ? result.data : { error: result.error });
};
```

#### Client-Side Effect Integration

```typescript
// In Svelte components
async function loadData() {
  try {
    const result = await Effect.runPromise(
      pipe(
        apiService.fetchData(),
        Effect.timeout(Duration.seconds(10)),
        Effect.retry(retryPolicy)
      )
    );
    // Handle result...
  } catch (error) {
    // Handle error...
  }
}
```

### 3. Advanced Patterns

#### Parallel Data Fetching

```typescript
const fetchUserDataParallel = (userId: number) =>
  pipe(
    Effect.all([apiService.getPost(userId), apiService.getTodos(userId)], {
      concurrency: 2,
    }),
    Effect.map(([post, todos]) => ({ post, todos }))
  );
```

#### Retry with Exponential Backoff

```typescript
const retryPolicy = Schedule.exponential(Duration.millis(100)).pipe(
  Schedule.intersect(Schedule.recurs(3)),
  Schedule.jittered
);

const reliableOperation = pipe(
  riskyOperation(),
  Effect.retry(retryPolicy),
  Effect.timeout(Duration.seconds(30))
);
```

#### Schema Validation

```typescript
const UserSchema = Schema.Struct({
  id: Schema.Number,
  name: Schema.String,
  email: Schema.String.pipe(Schema.pattern(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)),
  isActive: Schema.Boolean,
});

// Runtime validation
const validateUser = (data: unknown) => Schema.decodeUnknown(UserSchema)(data);
```

## 🎮 Interactive Examples

The showcase includes several interactive examples:

### 1. **Main Dashboard** (`/`)

- **Posts with Retry Logic**: Demonstrates automatic retry with exponential backoff
- **Post with Fallback**: Shows graceful fallback when primary data source fails
- **Parallel Data Fetching**: Concurrent operations with timeout protection
- **Resource Management**: Proper resource acquisition and cleanup

### 2. **Forms & State Management** (`/forms`)

- **Effect-powered validation**: Schema-based validation with custom error messages
- **CRUD operations**: Create, read, update, and delete users with proper error handling
- **State synchronization**: Real-time UI updates with Effect-managed state
- **Type-safe forms**: Full type safety from form inputs to API calls

### 3. **API Endpoints** (`/api/*`)

- **Server-side Effect patterns**: Effect usage in SvelteKit API routes
- **Error handling**: Proper HTTP status codes and error responses
- **Data transformation**: Schema validation and data normalization

## 🛠️ Development

### Available Scripts

```bash
# Development
pnpm dev          # Start development server
pnpm dev --open   # Start dev server and open browser

# Building
pnpm build        # Build for production
pnpm preview      # Preview production build

# Code Quality
pnpm check        # Run type checking
pnpm check:watch  # Run type checking in watch mode
```

### Key Dependencies

- **Effect-TS Ecosystem**:

  - `effect` - Core Effect library
  - `@effect/schema` - Schema validation and transformation
  - `@effect/platform` - Platform-specific utilities
  - `@effect/platform-node` - Node.js specific implementations
  - `@effect/cli` - CLI utilities and command handling

- **SvelteKit**:
  - `@sveltejs/kit` - The web framework
  - `svelte` - The component framework
  - `vite` - Build tool and dev server

## 🎯 Key Concepts Learned

### Effect-TS Patterns

1. **Services and Dependency Injection**: How to structure applications with services
2. **Error Handling**: Type-safe error handling with custom error types
3. **Resource Management**: Proper resource acquisition and cleanup
4. **Concurrency**: Parallel processing and resource coordination
5. **Resilience**: Retry policies, timeouts, and fallback strategies
6. **Schema Validation**: Runtime type safety with `@effect/schema`

### SvelteKit Integration

1. **Server-Side Effects**: Using Effect in load functions and API routes
2. **Client-Side Integration**: Effect patterns in Svelte components
3. **Type Safety**: End-to-end type safety from server to client
4. **Error Boundaries**: Graceful error handling in the UI
5. **State Management**: Effect-powered reactive state

## 📖 Further Reading

- [Effect-TS Documentation](https://effect.website/docs/introduction)
- [SvelteKit Documentation](https://kit.svelte.dev/docs)
- [Effect-TS Schema Guide](https://effect.website/docs/schema/introduction)
- [Functional Programming with Effect](https://effect.website/docs/guides/essentials/introduction)

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- [Effect-TS Team](https://github.com/Effect-TS) for creating an amazing functional programming library
- [Svelte Team](https://github.com/sveltejs) for building an incredible web framework
- The functional programming community for inspiring better software design

---
