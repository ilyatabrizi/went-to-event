import type { FastifyInstance } from 'fastify'
import type { CreateEventInput, EventRepository } from '../contracts/events.js'
import type { AuthService } from '../auth/service.js'
import type { AccountVerificationService } from '../verification/service.js'

function bearerToken(value: string | undefined) {
  if (!value?.startsWith('Bearer ')) return null
  return value.slice('Bearer '.length).trim() || null
}

function validCreateInput(value: unknown): value is CreateEventInput {
  if (!value || typeof value !== 'object') return false
  const input = value as Record<string, unknown>
  if (typeof input.category !== 'string' || input.category.trim().length < 2 || input.category.length > 40) return false
  if (typeof input.title !== 'string' || input.title.trim().length < 4 || input.title.length > 120) return false
  if (typeof input.description !== 'string' || input.description.trim().length < 1 || input.description.length > 2000) return false
  if (typeof input.startsAt !== 'string' || typeof input.endsAt !== 'string') return false
  const startsAt = Date.parse(input.startsAt)
  const endsAt = Date.parse(input.endsAt)
  if (!Number.isFinite(startsAt) || !Number.isFinite(endsAt) || startsAt <= Date.now() || endsAt <= startsAt) return false
  if (typeof input.venueName !== 'string' || input.venueName.trim().length < 2 || input.venueName.length > 120) return false
  if (typeof input.venueAddress !== 'string' || input.venueAddress.trim().length < 4 || input.venueAddress.length > 240) return false
  if (typeof input.latitude !== 'number' || typeof input.longitude !== 'number' || !Number.isFinite(input.latitude) || input.latitude < -90 || input.latitude > 90 || !Number.isFinite(input.longitude) || input.longitude < -180 || input.longitude > 180) return false
  if (!Array.isArray(input.ticketTiers) || input.ticketTiers.length < 1 || input.ticketTiers.length > 8) return false
  return input.ticketTiers.every((tier) => {
    if (!tier || typeof tier !== 'object') return false
    const item = tier as Record<string, unknown>
    return typeof item.name === 'string' && item.name.trim().length >= 2 && item.name.length <= 60
      && typeof item.description === 'string' && item.description.trim().length >= 2 && item.description.length <= 240
      && Number.isInteger(item.priceCents) && (item.priceCents as number) >= 0 && (item.priceCents as number) <= 10000000
  })
}

export async function eventsRoutes(
  app: FastifyInstance,
  options: { repository: EventRepository; authService: AuthService | null; verificationService: AccountVerificationService | null },
) {
  const { repository } = options

  app.get('/events', async (_request, reply) => {
    // Public discovery data can tolerate a short delay after publication.
    // A longer edge cache window keeps list reads off the function/database
    // during bursts; stale responses remain available while Vercel refreshes.
    reply.header('Cache-Control', 'public, s-maxage=60, stale-while-revalidate=300')
    const events = await repository.list()

    return {
      data: events,
      total: events.length,
    }
  })

  app.post<{ Body: CreateEventInput }>('/events', async (request, reply) => {
    const token = bearerToken(request.headers.authorization)
    const user = token && options.authService ? await options.authService.getUser(token) : null
    if (!user) return reply.code(401).send({ error: 'Authentication required' })
    if (!options.verificationService) return reply.code(503).send({ error: 'Event creation is not configured' })
    if (!await options.verificationService.isVerified(user.id)) return reply.code(403).send({ error: 'A manually verified account is required to add events.' })
    if (!options.repository.create) return reply.code(503).send({ error: 'Event creation is not configured' })
    if (!validCreateInput(request.body)) return reply.code(400).send({ error: 'Check the event details and provide valid dates and ticket tiers.' })
    try {
      return { data: await options.repository.create(user.id, request.body) }
    } catch (error) {
      if (typeof error === 'object' && error !== null && 'code' in error && error.code === '42501') {
        return reply.code(403).send({ error: 'A manually verified account is required to add events.' })
      }
      request.log.error({ error }, 'Could not create event')
      return reply.code(500).send({ error: 'Could not create event' })
    }
  })

  app.get<{ Params: { id: string } }>('/events/:id', async (request, reply) => {
    reply.header('Cache-Control', 'public, s-maxage=30, stale-while-revalidate=60')
    const event = await repository.getById(request.params.id)

    if (!event) {
      return reply.code(404).send({
        error: 'Event not found',
      })
    }

    return { data: event }
  })
}
