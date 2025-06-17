import { json, error } from '@sveltejs/kit'
import type { RequestHandler } from './$types'
import { Effect } from 'effect'
import { runUserOperation, UserService } from '$lib/effects/user.service'

export const GET: RequestHandler = async ({ url }) => {
  try {
    const result = await runUserOperation(
      UserService.pipe(Effect.flatMap(service => service.getUsers()))
    )

    if (result.success) {
      return json({
        users: result.data,
        meta: {
          total: result.data.length,
          timestamp: new Date().toISOString()
        }
      })
    } else {
      return json(
        { error: result.error },
        { status: result.error.type === 'UserNotFoundError' ? 404 : 500 }
      )
    }
  } catch (err) {
    console.error('Unexpected error in users API:', err)
    return json(
      { error: { type: 'InternalError', message: 'Internal server error' } },
      { status: 500 }
    )
  }
}

export const POST: RequestHandler = async ({ request }) => {
  try {
    const userData = await request.json()

    const result = await runUserOperation(
      UserService.pipe(Effect.flatMap(service => service.createUser(userData)))
    )

    if (result.success) {
      return json(
        {
          user: result.data,
          message: 'User created successfully'
        },
        { status: 201 }
      )
    } else {
      return json(
        { error: result.error },
        { 
          status: result.error.type === 'InvalidUserDataError' ? 400 : 500 
        }
      )
    }
  } catch (err) {
    console.error('Unexpected error creating user:', err)
    return json(
      { error: { type: 'InternalError', message: 'Failed to create user' } },
      { status: 500 }
    )
  }
} 