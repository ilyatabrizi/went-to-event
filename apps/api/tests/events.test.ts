import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import type { FastifyInstance } from 'fastify'
import { buildApp } from '../src/app.js'
import { events } from '../src/data/events.js'
import { InMemoryEventRepository } from '../src/repositories/events.js'

describe('GET /events', () => {
  let app: FastifyInstance

  beforeAll(async () => {
    app = buildApp(new InMemoryEventRepository())
    await app.ready()
  })

  afterAll(async () => {
    await app.close()
  })

  it('returns the temporary event catalogue', async () => {
    const response = await app.inject({ method: 'GET', url: '/events' })
    const body = response.json()

    expect(response.statusCode).toBe(200)
    const upcoming = events.filter((event) => new Date(event.endsAt).getTime() > Date.now())
    expect(body.total).toBe(upcoming.length)
    expect(body.data).toEqual(upcoming)
    expect(events[0]).toMatchObject({
      id: 'event-1',
      title: 'Warehouse Sessions: Autumn Opening',
      category: 'Nightlife',
    })
    expect(events[0].ticketTiers[0].priceCents).toBe(2500)
  })

  it('includes five November demo events with valid dates, locations, and no invented attendance', () => {
    const demos = events.filter((event) => event.id.startsWith('demo-nov-2026-'))
    expect(demos).toHaveLength(5)
    expect(new Set(demos.map((event) => event.category)).size).toBe(5)
    for (const event of demos) {
      expect(event.startsAt).toMatch(/^2026-11-/)
      expect(event.endsAt).toMatch(/^2026-11-/)
      expect(new Date(event.endsAt).getTime()).toBeGreaterThan(new Date(event.startsAt).getTime())
      expect(event.publicationStatus).toBe('approved')
      expect(event.goingCount).toBe(0)
      expect(event.venue.latitude).toBeTypeOf('number')
      expect(event.venue.longitude).toBeTypeOf('number')
      expect(event.ticketTiers.length).toBeGreaterThan(0)
    }
  })

  it('returns one event by id', async () => {
    const response = await app.inject({ method: 'GET', url: '/events/event-2' })

    expect(response.statusCode).toBe(200)
    expect(response.json()).toEqual({
      data: expect.objectContaining({
        id: 'event-2',
        title: 'Sunrise Rooftop Yoga',
      }),
    })
  })

  it('returns 404 for an unknown event', async () => {
    const response = await app.inject({ method: 'GET', url: '/events/does-not-exist' })

    expect(response.statusCode).toBe(404)
    expect(response.json()).toEqual({ error: 'Event not found' })
  })
})
