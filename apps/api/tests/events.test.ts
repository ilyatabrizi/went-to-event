import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import type { FastifyInstance } from 'fastify'
import { buildApp } from '../src/app.js'

describe('GET /events', () => {
  let app: FastifyInstance

  beforeAll(async () => {
    app = buildApp()
    await app.ready()
  })

  afterAll(async () => {
    await app.close()
  })

  it('returns the temporary event catalogue', async () => {
    const response = await app.inject({ method: 'GET', url: '/events' })
    const body = response.json()

    expect(response.statusCode).toBe(200)
    expect(body.total).toBe(3)
    expect(body.data[0]).toMatchObject({
      id: 'event-1',
      title: 'Warehouse Sessions Vol. 9',
      category: 'Nightlife',
    })
    expect(body.data[0].ticketTiers[0].priceCents).toBe(2500)
  })
})
