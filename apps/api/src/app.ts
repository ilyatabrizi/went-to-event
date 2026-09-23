import Fastify from 'fastify'
import { eventsRoutes } from './routes/events.js'

export function buildApp() {
  const app = Fastify({
    logger: process.env.NODE_ENV !== 'test',
  })

  app.get('/health', async () => ({
    status: 'ok',
    service: 'went-to-event-api',
  }))

  app.register(eventsRoutes)

  return app
}
