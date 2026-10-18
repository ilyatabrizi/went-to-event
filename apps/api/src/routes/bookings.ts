import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify'
import type { CreateBookingInput } from '../contracts/bookings.js'
import type { AuthService } from '../auth/service.js'
import type { BookingService } from '../bookings/service.js'
import type { EmailService } from '../email/service.js'

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
    && typeof input.showAttendance === 'boolean'
}

export async function bookingRoutes(
  app: FastifyInstance,
  options: { authService: AuthService | null; bookingService: BookingService | null; emailService?: EmailService | null },
) {
  app.post<{ Body: CreateBookingInput }>('/bookings', async (request, reply) => {
    if (!options.authService || !options.bookingService) {
      return reply.code(503).send({ error: 'Bookings are not configured' })
    }

    const user = await currentUser(request, options.authService)
    if (!user) return reply.code(401).send({ error: 'Authentication required' })
    if (!validInput(request.body)) {
      return reply.code(400).send({ error: 'eventId, ticketTierId, quantity, and attendance visibility are required' })
    }

    try {
      const booking = await options.bookingService.create(user.id, request.body)
      if (options.emailService && user.email) {
        try {
          await options.emailService.sendBookingConfirmation(user.email, booking)
        } catch (error) {
          request.log.error({ error, bookingId: booking.id }, 'booking email notification failed')
        }
      }
      return { data: booking }
    } catch (error) {
      request.log.warn({ error }, 'booking creation failed')
      return reply.code(400).send({ error: 'Could not create booking' })
    }
  })

  app.get<{ Params: { eventId: string } }>('/events/:eventId/attendees', async (request, reply) => {
    if (!options.authService || !options.bookingService) return reply.code(503).send({ error: 'Attendance is not configured' })
    const user = await currentUser(request, options.authService)
    if (!user) return reply.code(401).send({ error: 'Authentication required' })
    return { data: await options.bookingService.friendsAttending(user.id, request.params.eventId) }
  })

  app.get('/me/bookings', async (request, reply) => {
    if (!options.authService || !options.bookingService) {
      return reply.code(503).send({ error: 'Bookings are not configured' })
    }

    const user = await currentUser(request, options.authService)
    if (!user) return reply.code(401).send({ error: 'Authentication required' })

    return { data: await options.bookingService.list(user.id) }
  })

  // Vercel's native Fastify deployment exposes this single-segment alias
  // reliably; keep the canonical nested route above for local/server use.
  app.get('/bookings', async (request, reply) => {
    if (!options.authService || !options.bookingService) {
      return reply.code(503).send({ error: 'Bookings are not configured' })
    }

    const user = await currentUser(request, options.authService)
    if (!user) return reply.code(401).send({ error: 'Authentication required' })

    return { data: await options.bookingService.list(user.id) }
  })

  async function removeBooking(request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) {
    if (!options.authService || !options.bookingService) {
      return reply.code(503).send({ error: 'Bookings are not configured' })
    }
    const user = await currentUser(request, options.authService)
    if (!user) return reply.code(401).send({ error: 'Authentication required' })
    const removed = await options.bookingService.cancel(user.id, request.params.id)
    if (!removed) return reply.code(404).send({ error: 'Booking not found or already removed' })
    return { removed: true }
  }

  app.delete<{ Params: { id: string } }>('/bookings/:id', removeBooking)
  app.delete<{ Params: { id: string } }>('/me/bookings/:id', removeBooking)

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

  app.post<{ Body: { qrCode?: string } }>('/ticket-checkins', async (request, reply) => {
    if (!options.authService || !options.bookingService) {
      return reply.code(503).send({ error: 'Ticket check-in is not configured' })
    }
    const user = await currentUser(request, options.authService)
    if (!user) return reply.code(401).send({ error: 'Authentication required' })
    if (typeof request.body?.qrCode !== 'string' || request.body.qrCode.trim().length < 20) {
      return reply.code(400).send({ error: 'A ticket QR code is required' })
    }
    try {
      return { data: await options.bookingService.verifyTicket(user.id, request.body.qrCode) }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Could not verify ticket'
      if (message === 'Only the event host can check in tickets') return reply.code(403).send({ error: message })
      if (message === 'Invalid QR code' || message === 'Ticket not found' || message === 'Booking is not valid') return reply.code(400).send({ error: message })
      request.log.error({ error }, 'ticket check-in failed')
      return reply.code(500).send({ error: 'Could not verify ticket' })
    }
  })
}
