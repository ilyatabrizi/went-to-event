import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import type { FastifyInstance } from 'fastify'
import { buildApp } from '../src/app.js'
import { InMemoryEventRepository } from '../src/repositories/events.js'

describe('GET /health', () => {
  let app: FastifyInstance

  beforeAll(async () => {
    app = buildApp(new InMemoryEventRepository())
    await app.ready()
  })

  afterAll(async () => {
    await app.close()
  })

  it('reports that the API is running', async () => {
    const response = await app.inject({ method: 'GET', url: '/health' })

    expect(response.statusCode).toBe(200)
    expect(response.json()).toEqual({
      status: 'ok',
      service: 'went-to-event-api',
    })
  })
})
