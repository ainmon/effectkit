import { Effect, Context, Layer, pipe } from 'effect'
import { Schema } from '@effect/schema'

// Define User schema with validation
export const UserSchema = Schema.Struct({
  id: Schema.Number,
  name: Schema.String,
  email: Schema.String.pipe(Schema.pattern(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)),
  avatar: Schema.optional(Schema.String),
  createdAt: Schema.Date,
  isActive: Schema.Boolean
})

export type User = Schema.Schema.Type<typeof UserSchema>

// Define custom errors
export class UserNotFoundError extends Schema.TaggedError<UserNotFoundError>()('UserNotFoundError', {
  userId: Schema.Number
}) {}

export class InvalidUserDataError extends Schema.TaggedError<InvalidUserDataError>()('InvalidUserDataError', {
  message: Schema.String
}) {}

export class UserServiceError extends Schema.TaggedError<UserServiceError>()('UserServiceError', {
  message: Schema.String,
  cause: Schema.optional(Schema.Unknown)
}) {}

// User service interface
export interface UserService {
  readonly getUser: (id: number) => Effect.Effect<User, UserNotFoundError | UserServiceError>
  readonly getUsers: () => Effect.Effect<readonly User[], UserServiceError>
  readonly createUser: (userData: Omit<User, 'id' | 'createdAt'>) => Effect.Effect<User, InvalidUserDataError | UserServiceError>
  readonly updateUser: (id: number, userData: Partial<User>) => Effect.Effect<User, UserNotFoundError | InvalidUserDataError | UserServiceError>
  readonly deleteUser: (id: number) => Effect.Effect<void, UserNotFoundError | UserServiceError>
}

export const UserService = Context.GenericTag<UserService>('UserService')

// Mock data for demonstration
const mockUsers: User[] = [
  {
    id: 1,
    name: 'Alice Johnson',
    email: 'alice@example.com',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Alice',
    createdAt: new Date('2024-01-15T10:30:00Z'),
    isActive: true
  },
  {
    id: 2,
    name: 'Bob Smith',
    email: 'bob@example.com',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Bob',
    createdAt: new Date('2024-02-20T14:15:00Z'),
    isActive: true
  },
  {
    id: 3,
    name: 'Charlie Davis',
    email: 'charlie@example.com',
    createdAt: new Date('2024-03-10T09:45:00Z'),
    isActive: false
  }
]

// Implementation of UserService
const makeUserService = (): UserService => ({
  getUser: (id: number) => {
    const user = mockUsers.find(user => user.id === id)
    return user 
      ? Effect.succeed(user)
      : Effect.fail(new UserNotFoundError({ userId: id }))
  },

  getUsers: () => Effect.succeed(mockUsers.slice()),

  createUser: (userData) => {
    try {
      const newUser: User = {
        ...userData,
        id: Math.max(...mockUsers.map(u => u.id)) + 1,
        createdAt: new Date()
      }
      mockUsers.push(newUser)
      return Effect.succeed(newUser)
    } catch (error) {
      return Effect.fail(new UserServiceError({ 
        message: 'Failed to create user', 
        cause: error 
      }))
    }
  },

  updateUser: (id, userData) => {
    const index = mockUsers.findIndex(user => user.id === id)
    if (index < 0) {
      return Effect.fail(new UserNotFoundError({ userId: id }))
    }
    
    try {
      const updatedUser = { ...mockUsers[index], ...userData }
      mockUsers[index] = updatedUser
      return Effect.succeed(updatedUser)
    } catch (error) {
      return Effect.fail(new UserServiceError({ 
        message: 'Failed to update user', 
        cause: error 
      }))
    }
  },

  deleteUser: (id) => {
    const index = mockUsers.findIndex(user => user.id === id)
    if (index < 0) {
      return Effect.fail(new UserNotFoundError({ userId: id }))
    }
    
    mockUsers.splice(index, 1)
    return Effect.succeed(undefined)
  }
})

// Layer for UserService
export const UserServiceLive = Layer.succeed(UserService, makeUserService())

// Helper functions for common operations
export const withUserService = <A, E, R>(
  effect: Effect.Effect<A, E, R | UserService>
): Effect.Effect<A, E, R> =>
  pipe(effect, Effect.provide(UserServiceLive))

// Utility function to run user operations with proper error handling
export const runUserOperation = <A>(
  operation: Effect.Effect<A, UserNotFoundError | InvalidUserDataError | UserServiceError, UserService>
) =>
  pipe(
    operation,
    withUserService,
    Effect.match({
      onFailure: (error) => ({
        success: false as const,
        error: {
          type: error._tag,
          message: error._tag === 'UserNotFoundError' 
            ? `User with ID ${(error as any).userId} not found`
            : (error as any).message || 'An error occurred'
        }
      }),
      onSuccess: (data) => ({
        success: true as const,
        data
      })
    }),
    Effect.runPromise
  ) 