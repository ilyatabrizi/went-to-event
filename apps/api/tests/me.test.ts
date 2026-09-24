import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import type { FastifyInstance } from 'fastify'
import { buildApp } from '../src/app.js'
import type { AuthService } from '../src/auth/service.js'

const user = { id: 'user-1', email: 'sam@example.com' }
const authService: AuthService = {
  async getUser(token) {
    return token === 'valid-token' ? user : null
  },
}

describe('GET /me', () => {
  let app: FastifyInstance

  beforeAll(async () => {
    app = buildApp(undefined, authService)
    await app.ready()
  })

  afterAll(async () => {
    await app.close()
  })

  it('requires authentication', async () => {
    const response = await app.inject({ method: 'GET', url: '/me' })

    expect(response.statusCode).toBe(401)
    expect(response.json()).toEqual({ error: 'Authentication required' })
  })

  it('returns the current user for a valid token', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/me',
      headers: { authorization: 'Bearer valid-token' },
    })

    expect(response.statusCode).toBe(200)
    expect(response.json()).toEqual({ user })
  })

  it('rejects an invalid token', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/me',
      headers: { authorization: 'Bearer invalid-token' },
    })

    expect(response.statusCode).toBe(401)
    expect(response.json()).toEqual({ error: 'Invalid or expired token' })
  })
})
