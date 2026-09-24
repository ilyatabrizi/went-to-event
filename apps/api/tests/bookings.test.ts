import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import type { FastifyInstance } from 'fastify'
import { buildApp } from '../src/app.js'
import type { AuthService } from '../src/auth/service.js'
import type { BookingService } from '../src/bookings/service.js'

const user = { id: 'user-1', email: 'sam@example.com' }
const authService: AuthService = {
  async getUser(token) {
    return token === 'valid-token' ? user : null
  },
}

const bookingService: BookingService = {
  async create(userId, input) {
    return {
      id: 'booking-1',
      eventId: input.eventId,
      ticketTierId: input.ticketTierId,
      quantity: input.quantity,
      status: 'confirmed',
      totalCents: input.quantity * 2500,
      createdAt: '2026-09-24T00:00:00.000Z',
    }
  },
  async list() { return [] },
  async get() { return null },
}

describe('booking routes', () => {
  let app: FastifyInstance

  beforeAll(async () => {
    app = buildApp(undefined, authService, bookingService)
    await app.ready()
  })

  afterAll(async () => {
    await app.close()
  })

  it('requires authentication to create a booking', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/bookings',
      payload: { eventId: 'event-1', ticketTierId: 'tier-1', quantity: 1 },
    })

    expect(response.statusCode).toBe(401)
  })

  it('creates a booking for an authenticated user', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/bookings',
      headers: { authorization: 'Bearer valid-token' },
      payload: { eventId: 'event-1', ticketTierId: 'tier-1', quantity: 2 },
    })

    expect(response.statusCode).toBe(200)
    expect(response.json()).toEqual({
      data: expect.objectContaining({
        id: 'booking-1',
        eventId: 'event-1',
        quantity: 2,
        totalCents: 5000,
      }),
    })
  })

  it('rejects malformed booking input', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/bookings',
      headers: { authorization: 'Bearer valid-token' },
      payload: { eventId: 'event-1', ticketTierId: 'tier-1', quantity: '2' },
    })

    expect(response.statusCode).toBe(400)
  })
})
