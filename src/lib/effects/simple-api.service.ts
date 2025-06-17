import { Effect, Context, Layer, pipe, Schedule, Duration } from 'effect'
import { Schema } from '@effect/schema'

// Schema for external API responses
export const PostSchema = Schema.Struct({
  id: Schema.Number,
  title: Schema.String,
  body: Schema.String,
  userId: Schema.Number
})

export const TodoSchema = Schema.Struct({
  id: Schema.Number,
  title: Schema.String,
  completed: Schema.Boolean,
  userId: Schema.Number
})

export type Post = Schema.Schema.Type<typeof PostSchema>
export type Todo = Schema.Schema.Type<typeof TodoSchema>

// Custom errors
export class ApiError extends Schema.TaggedError<ApiError>()('ApiError', {
  message: Schema.String,
  status: Schema.optional(Schema.Number)
}) {}

export class NetworkError extends Schema.TaggedError<NetworkError>()('NetworkError', {
  message: Schema.String
}) {}

// API service interface
export interface SimpleApiService {
  readonly getPosts: () => Effect.Effect<readonly Post[], ApiError | NetworkError>
  readonly getPost: (id: number) => Effect.Effect<Post, ApiError | NetworkError>
  readonly getTodos: (userId?: number) => Effect.Effect<readonly Todo[], ApiError | NetworkError>
  readonly searchPosts: (query: string) => Effect.Effect<readonly Post[], ApiError | NetworkError>
}

export const SimpleApiService = Context.GenericTag<SimpleApiService>('SimpleApiService')

// Mock data for demonstration
const mockPosts: Post[] = [
  {
    id: 1,
    title: 'Effect-TS: Functional Programming Made Easy',
    body: 'Effect-TS provides a powerful toolkit for building robust, type-safe applications with composable effects.',
    userId: 1
  },
  {
    id: 2,
    title: 'SvelteKit: The Modern Web Framework',
    body: 'SvelteKit offers the best developer experience with its component-based architecture and server-side rendering.',
    userId: 1
  },
  {
    id: 3,
    title: 'Combining Effect and SvelteKit',
    body: 'Learn how to integrate Effect-TS with SvelteKit for building scalable web applications.',
    userId: 2
  }
]

const mockTodos: Todo[] = [
  { id: 1, title: 'Learn Effect-TS basics', completed: true, userId: 1 },
  { id: 2, title: 'Build a SvelteKit app', completed: true, userId: 1 },
  { id: 3, title: 'Integrate Effect with SvelteKit', completed: false, userId: 1 },
  { id: 4, title: 'Write comprehensive documentation', completed: false, userId: 2 },
  { id: 5, title: 'Create example applications', completed: true, userId: 2 }
]

// Simulate network delay and potential failures
const simulateNetworkCall = <A>(
  data: A,
  failureRate: number = 0.1
): Effect.Effect<A, NetworkError> =>
  pipe(
    Effect.sleep(Duration.millis(Math.random() * 500 + 100)),
    Effect.flatMap(() =>
      Math.random() < failureRate
        ? Effect.fail(new NetworkError({ message: 'Network request failed' }))
        : Effect.succeed(data)
    )
  )

// Implementation of SimpleApiService
const makeSimpleApiService = (): SimpleApiService => ({
  getPosts: () =>
    pipe(
      simulateNetworkCall(mockPosts),
      Effect.mapError(() => new ApiError({ message: 'Failed to fetch posts' }))
    ),

  getPost: (id: number) =>
    pipe(
      simulateNetworkCall(mockPosts.find(post => post.id === id)),
      Effect.flatMap(post =>
        post
          ? Effect.succeed(post)
          : Effect.fail(new ApiError({ message: `Post with ID ${id} not found`, status: 404 }))
      )
    ),

  getTodos: (userId?: number) =>
    pipe(
      simulateNetworkCall(
        userId ? mockTodos.filter(todo => todo.userId === userId) : mockTodos
      ),
      Effect.mapError(() => new ApiError({ message: 'Failed to fetch todos' }))
    ),

  searchPosts: (query: string) =>
    pipe(
      simulateNetworkCall(mockPosts),
      Effect.map(posts =>
        posts.filter(post =>
          post.title.toLowerCase().includes(query.toLowerCase()) ||
          post.body.toLowerCase().includes(query.toLowerCase())
        )
      ),
      Effect.mapError(() => new ApiError({ message: 'Failed to search posts' }))
    )
})

// Layer for SimpleApiService
export const SimpleApiServiceLive = Layer.succeed(SimpleApiService, makeSimpleApiService())

// Helper function to provide SimpleApiService
export const withSimpleApiService = <A, E, R>(
  effect: Effect.Effect<A, E, R | SimpleApiService>
): Effect.Effect<A, E, R> =>
  pipe(effect, Effect.provide(SimpleApiServiceLive))

// Utility functions for common operations with proper error handling
export const fetchPostsWithRetry = () =>
  pipe(
    SimpleApiService.pipe(Effect.flatMap(api => api.getPosts())),
    Effect.retry(Schedule.exponential(Duration.millis(100)).pipe(Schedule.intersect(Schedule.recurs(3)))),
    withSimpleApiService,
    Effect.match({
      onFailure: (error) => ({
        success: false as const,
        error: {
          type: error._tag,
          message: error.message
        }
      }),
      onSuccess: (posts) => ({
        success: true as const,
        data: posts
      })
    })
  )

export const fetchPostWithFallback = (id: number) =>
  pipe(
    SimpleApiService.pipe(Effect.flatMap(api => api.getPost(id))),
    Effect.orElse(() =>
      Effect.succeed({
        id,
        title: 'Fallback Post',
        body: 'This is a fallback post when the original could not be loaded.',
        userId: 0
      })
    ),
    withSimpleApiService,
    Effect.match({
      onFailure: (error) => ({
        success: false as const,
        error: {
          type: error._tag,
          message: error.message
        }
      }),
      onSuccess: (post) => ({
        success: true as const,
        data: post
      })
    })
  )

// Advanced: Parallel data fetching with timeout
export const fetchUserDataWithTimeout = (userId: number) =>
  pipe(
    Effect.all([
      SimpleApiService.pipe(Effect.flatMap(api => api.getPost(userId))),
      SimpleApiService.pipe(Effect.flatMap(api => api.getTodos(userId)))
    ], { concurrency: 2 }),
    Effect.timeout(Duration.seconds(5)),
    Effect.map(([post, todos]) => ({
      post,
      todos,
      summary: {
        totalTodos: todos.length,
        completedTodos: todos.filter(todo => todo.completed).length,
        postTitle: post.title
      }
    })),
    withSimpleApiService,
    Effect.match({
      onFailure: (error) => ({
        success: false as const,
        error: {
          type: error._tag === 'TimeoutException' ? 'Timeout' : error._tag,
          message: error._tag === 'TimeoutException' ? 'Request timed out' : error.message
        }
      }),
      onSuccess: (data) => ({
        success: true as const,
        data
      })
    })
  )

// Resource management example
export const processPostsWithResourceManagement = () =>
  pipe(
    Effect.acquireUseRelease(
      // Acquire: Set up a processing context
      Effect.sync(() => {
        console.log('🚀 Starting post processing...')
        return { startTime: Date.now(), processed: 0 }
      }),
      // Use: Process the posts
      (context) =>
        pipe(
          SimpleApiService.pipe(Effect.flatMap(api => api.getPosts())),
          Effect.map(posts => {
            const stats = {
              total: posts.length,
              avgTitleLength: posts.reduce((sum, post) => sum + post.title.length, 0) / posts.length,
              userPostCounts: posts.reduce((acc, post) => {
                acc[post.userId] = (acc[post.userId] || 0) + 1
                return acc
              }, {} as Record<number, number>),
              processingTime: Date.now() - context.startTime
            }
            context.processed = posts.length
            return stats
          })
        ),
      // Release: Clean up resources
      (context) =>
        Effect.sync(() => {
          console.log(`✅ Processed ${context.processed} posts in ${Date.now() - context.startTime}ms`)
        })
    ),
    withSimpleApiService,
    Effect.match({
      onFailure: (error) => ({
        success: false as const,
        error: {
          type: error._tag,
          message: error.message
        }
      }),
      onSuccess: (stats) => ({
        success: true as const,
        data: stats
      })
    })
  ) 