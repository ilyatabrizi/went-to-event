import type { FastifyInstance } from 'fastify'
import { events } from '../data/events.js'

export async function eventsRoutes(app: FastifyInstance) {
  app.get('/events', async () => ({
    data: events,
    total: events.length,
  }))
}
