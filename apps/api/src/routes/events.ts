import type { FastifyInstance } from 'fastify'
import type { EventRepository } from '../../../../packages/shared/src/events.js'

export async function eventsRoutes(
  app: FastifyInstance,
  options: { repository: EventRepository },
) {
  const { repository } = options

  app.get('/events', async () => {
    const events = await repository.list()

    return {
      data: events,
      total: events.length,
    }
  })

  app.get<{ Params: { id: string } }>('/events/:id', async (request, reply) => {
    const event = await repository.getById(request.params.id)

    if (!event) {
      return reply.code(404).send({
        error: 'Event not found',
      })
    }

    return { data: event }
  })
}
