import type { FastifyInstance } from 'fastify'
import { events } from '../data/events.js'

export async function eventsRoutes(app: FastifyInstance) {
  app.get('/events', async () => ({
    data: events,
    total: events.length,
  }))

  app.get<{ Params: { id: string } }>('/events/:id', async (request, reply) => {
    const event = events.find((candidate) => candidate.id === request.params.id)

    if (!event) {
      return reply.code(404).send({
        error: 'Event not found',
      })
    }

    return { data: event }
  })
}
