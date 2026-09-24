import Fastify from 'fastify'
import type { EventRepository } from '../../../packages/shared/src/events.js'
import type { AuthService } from './auth/service.js'
import { createAuthService } from './auth/service.js'
import type { BookingService } from './bookings/service.js'
import { createBookingService } from './bookings/service.js'
import { createEventRepository } from './repositories/factory.js'
import { bookingRoutes } from './routes/bookings.js'
import { meRoutes } from './routes/me.js'
import { eventsRoutes } from './routes/events.js'

export function buildApp(
  repository: EventRepository = createEventRepository(),
  authService: AuthService | null = createAuthService(),
  bookingService: BookingService | null = createBookingService(),
) {
  const app = Fastify({
    logger: process.env.NODE_ENV !== 'test',
  })

  app.get('/health', async () => ({
    status: 'ok',
    service: 'went-to-event-api',
  }))

  app.register(eventsRoutes, { repository })
  app.register(meRoutes, { authService })
  app.register(bookingRoutes, { authService, bookingService })

  return app
}
