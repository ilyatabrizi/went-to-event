import Fastify from 'fastify'
import type { EventRepository } from '../../../packages/shared/src/events.js'
import { InMemoryEventRepository } from './repositories/events.js'
import { eventsRoutes } from './routes/events.js'

export function buildApp(repository: EventRepository = new InMemoryEventRepository()) {
  const app = Fastify({
    logger: process.env.NODE_ENV !== 'test',
  })

  app.get('/health', async () => ({
    status: 'ok',
    service: 'went-to-event-api',
  }))

  app.register(eventsRoutes, { repository })

  return app
}
