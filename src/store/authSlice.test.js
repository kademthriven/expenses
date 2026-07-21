import { describe, expect, it } from 'vitest'
import authReducer, { clearCredentials, setCredentials } from './authSlice'

describe('auth reducer', () => {
  it('stores the authenticated user and bearer token', () => {
    const state = authReducer(undefined, setCredentials({
      bearerToken: 'test-token',
      userId: 'user-123',
      email: 'user@example.com',
    }))

    expect(state).toEqual({
      isLoggedIn: true,
      isLoading: false,
      bearerToken: 'test-token',
      userId: 'user-123',
      email: 'user@example.com',
    })
  })

  it('clears the authenticated session', () => {
    const authenticatedState = authReducer(undefined, setCredentials({
      bearerToken: 'test-token',
      userId: 'user-123',
      email: 'user@example.com',
    }))

    expect(authReducer(authenticatedState, clearCredentials())).toEqual({
      isLoggedIn: false,
      isLoading: false,
      bearerToken: null,
      userId: null,
      email: null,
    })
  })
})
