import { Effect, Context, Layer, pipe, Schedule, Duration } from 'effect'
import { Schema } from '@effect/schema'
import { HttpClient, HttpClientRequest, HttpClientResponse } from '@effect/platform'

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
  status: Schema.optional(Schema.Number),
  cause: Schema.optional(Schema.Unknown)
}) {}

export class NetworkError extends Schema.TaggedError<NetworkError>()('NetworkError', {
  message: Schema.String
}) {}

// API service interface
export interface ApiService {
  readonly getPosts: () => Effect.Effect<readonly Post[], ApiError | NetworkError>
  readonly getPost: (id: number) => Effect.Effect<Post, ApiError | NetworkError>
  readonly getTodos: (userId?: number) => Effect.Effect<readonly Todo[], ApiError | NetworkError>
  readonly searchPosts: (query: string) => Effect.Effect<readonly Post[], ApiError | NetworkError>
}

export const ApiService = Context.GenericTag<ApiService>('ApiService')

// Base URL for JSONPlaceholder API
const BASE_URL = 'https://jsonplaceholder.typicode.com'

// Retry policy for network requests
const retryPolicy = Schedule.exponential(Duration.millis(100)).pipe(
  Schedule.intersect(Schedule.recurs(3)),
  Schedule.jittered
)

// Timeout for requests
const REQUEST_TIMEOUT = Duration.seconds(10)

// Helper function to make HTTP requests with proper error handling
const makeRequest = <A>(
  url: string,
  schema: Schema.Schema<A>
): Effect.Effect<A, ApiError | NetworkError, HttpClient.HttpClient> =>
  pipe(
    Effect.Do,
    Effect.bind('client', () => HttpClient.HttpClient),
    Effect.bind('request', ({ client }) =>
      pipe(
        HttpClientRequest.get(url),
        HttpClientRequest.setHeaders({
          'Content-Type': 'application/json',
          'User-Agent': 'EffectKit/1.0'
        }),
        Effect.succeed
      )
    ),
    Effect.bind('response', ({ client, request }) =>
      pipe(
        client.execute(request),
        Effect.timeout(REQUEST_TIMEOUT),
        Effect.retry(retryPolicy)
      )
    ),
    Effect.bind('json', ({ response }) =>
      HttpClientResponse.json(response)
    ),
    Effect.bind('decoded', ({ json }) =>
      Schema.decodeUnknown(schema)(json)
    ),
    Effect.map(({ decoded }) => decoded),
    Effect.catchTags({
      TimeoutException: () => new NetworkError({ message: 'Request timed out' }),
      HttpClientError: (error) => new ApiError({
        message: `HTTP error: ${error.message}`,
        cause: error
      }),
      RequestError: (error) => new NetworkError({
        message: `Network error: ${error.message}`
      }),
      ParseError: (error) => new ApiError({
        message: `Failed to decode response: ${error.message}`
      })
    })
  )

// Helper for array responses
const makeArrayRequest = <A>(
  url: string,
  schema: Schema.Schema<A>
): Effect.Effect<readonly A[], ApiError | NetworkError, HttpClient.HttpClient> =>
  makeRequest(url, Schema.Array(schema))

// Implementation of ApiService
const makeApiService = (client: HttpClient.HttpClient): ApiService => ({
  getPosts: () =>
    makeArrayRequest(`${BASE_URL}/posts`, PostSchema).pipe(Effect.provide(Layer.succeed(HttpClient.HttpClient, client))),

  getPost: (id: number) =>
    makeRequest(`${BASE_URL}/posts/${id}`, PostSchema).pipe(Effect.provide(Layer.succeed(HttpClient.HttpClient, client))),

  getTodos: (userId?: number) => {
    const url = userId
      ? `${BASE_URL}/todos?userId=${userId}`
      : `${BASE_URL}/todos`
    return makeArrayRequest(url, TodoSchema).pipe(Effect.provide(Layer.succeed(HttpClient.HttpClient, client)))
  },

  searchPosts: (query: string) =>
    pipe(
      makeArrayRequest(`${BASE_URL}/posts`, PostSchema),
      Effect.map(posts =>
        posts.filter(post =>
          post.title.toLowerCase().includes(query.toLowerCase()) ||
          post.body.toLowerCase().includes(query.toLowerCase())
        )
      ),
      Effect.provide(Layer.succeed(HttpClient.HttpClient, client))
    )
})

// Layer for ApiService with HttpClient dependency
export const ApiServiceLive = Layer.effect(
  ApiService,
  Effect.map(HttpClient.HttpClient, makeApiService)
)

// Helper function to provide both HttpClient and ApiService
export const withApiService = <A, E, R>(
  effect: Effect.Effect<A, E, R | ApiService>
): Effect.Effect<A, E, R | HttpClient.HttpClient> =>
  pipe(effect, Effect.provide(ApiServiceLive))

// Utility functions for common operations
export const fetchPostsWithErrorHandling = () =>
  pipe(
    ApiService.pipe(Effect.flatMap(api => api.getPosts())),
    withApiService,
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

export const fetchPostWithCaching = (id: number) => {
  // Simple in-memory cache for demonstration
  const cache = new Map<number, Post>()
  
  return pipe(
    Effect.sync(() => cache.get(id)),
    Effect.flatMap(cached =>
      cached
        ? Effect.succeed(cached)
        : pipe(
            ApiService.pipe(Effect.flatMap(api => api.getPost(id))),
            Effect.tap(post => Effect.sync(() => cache.set(id, post)))
          )
    ),
    withApiService,
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
}

// Advanced: Parallel data fetching with resource management
export const fetchUserDataParallel = (userId: number) =>
  pipe(
    Effect.all([
      ApiService.pipe(Effect.flatMap(api => api.getPost(userId))),
      ApiService.pipe(Effect.flatMap(api => api.getTodos(userId)))
    ], { concurrency: 2 }),
    Effect.map(([post, todos]) => ({
      post,
      todos,
      summary: {
        totalTodos: todos.length,
        completedTodos: todos.filter(todo => todo.completed).length,
        postTitle: post.title
      }
    })),
    withApiService,
    Effect.match({
      onFailure: (error) => ({
        success: false as const,
        error: {
          type: error._tag,
          message: error.message
        }
      }),
      onSuccess: (data) => ({
        success: true as const,
        data
      })
    })
  )

// Stream-based data processing example
export const processPostsStream = (batchSize: number = 5) =>
  pipe(
    ApiService.pipe(Effect.flatMap(api => api.getPosts())),
    Effect.map(posts => ({
      total: posts.length,
      batches: Math.ceil(posts.length / batchSize),
      avgTitleLength: posts.reduce((sum, post) => sum + post.title.length, 0) / posts.length,
      topUsers: Array.from(
        posts.reduce((acc, post) => {
          acc.set(post.userId, (acc.get(post.userId) || 0) + 1)
          return acc
        }, new Map<number, number>())
      ).sort(([, a], [, b]) => b - a).slice(0, 3)
    })),
    withApiService,
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