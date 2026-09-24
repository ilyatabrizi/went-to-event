import type { FastifyInstance, FastifyRequest } from 'fastify'
import type { CreateBookingInput } from '../../../../packages/shared/src/bookings.js'
import type { AuthService } from '../auth/service.js'
import type { BookingService } from '../bookings/service.js'

function bearerToken(value: string | undefined) {
  if (!value?.startsWith('Bearer ')) return null
  return value.slice('Bearer '.length).trim() || null
}

async function currentUser(request: FastifyRequest, authService: AuthService) {
  const token = bearerToken(request.headers.authorization)
  return token ? authService.getUser(token) : null
}

function validInput(body: unknown): body is CreateBookingInput {
  if (!body || typeof body !== 'object') return false
  const input = body as Record<string, unknown>
  return typeof input.eventId === 'string'
    && typeof input.ticketTierId === 'string'
    && Number.isInteger(input.quantity)
}

export async function bookingRoutes(
  app: FastifyInstance,
  options: { authService: AuthService | null; bookingService: BookingService | null },
) {
  app.post<{ Body: CreateBookingInput }>('/bookings', async (request, reply) => {
    if (!options.authService || !options.bookingService) {
      return reply.code(503).send({ error: 'Bookings are not configured' })
    }

    const user = await currentUser(request, options.authService)
    if (!user) return reply.code(401).send({ error: 'Authentication required' })
    if (!validInput(request.body)) {
      return reply.code(400).send({ error: 'eventId, ticketTierId, and integer quantity are required' })
    }

    try {
      return { data: await options.bookingService.create(user.id, request.body) }
    } catch (error) {
      request.log.warn({ error }, 'booking creation failed')
      return reply.code(400).send({ error: 'Could not create booking' })
    }
  })

  app.get('/me/bookings', async (request, reply) => {
    if (!options.authService || !options.bookingService) {
      return reply.code(503).send({ error: 'Bookings are not configured' })
    }

    const user = await currentUser(request, options.authService)
    if (!user) return reply.code(401).send({ error: 'Authentication required' })

    return { data: await options.bookingService.list(user.id) }
  })

  app.get<{ Params: { id: string } }>('/me/bookings/:id', async (request, reply) => {
    if (!options.authService || !options.bookingService) {
      return reply.code(503).send({ error: 'Bookings are not configured' })
    }

    const user = await currentUser(request, options.authService)
    if (!user) return reply.code(401).send({ error: 'Authentication required' })

    const booking = await options.bookingService.get(user.id, request.params.id)
    if (!booking) return reply.code(404).send({ error: 'Booking not found' })

    return { data: booking }
  })
}
