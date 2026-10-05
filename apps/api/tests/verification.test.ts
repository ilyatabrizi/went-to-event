import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'
import type { FastifyInstance } from 'fastify'
import { buildApp } from '../src/app.js'
import type { AuthService } from '../src/auth/service.js'
import type { Event, EventRepository } from '../src/contracts/events.js'
import type { AccountVerificationService } from '../src/verification/service.js'

const event: Event = {
  id: 'event-created',
  category: 'Community',
  title: 'A community event',
  description: 'An event description that is long enough for validation.',
  startsAt: '2027-02-10T18:00:00.000Z',
  endsAt: '2027-02-10T20:00:00.000Z',
  venue: { name: 'The Hall', address: '12 Main Street' },
  host: { name: 'Host' },
  goingCount: 0,
  ticketTiers: [{ id: 'tier-1', name: 'General', description: 'Entry', priceCents: 0 }],
}

describe('account verification authorization', () => {
  let app: FastifyInstance
  const create = vi.fn(async () => event)
  const verificationService = {
    isVerified: vi.fn(async (userId: string) => userId === 'verified-user'),
  }
  const authService = {
    getUser: vi.fn(async (token: string) => token === 'valid'
      ? { id: 'verified-user', authId: 'clerk-user', email: 'person@example.com' }
      : token === 'admin'
        ? { id: 'admin-user', authId: 'clerk-admin', email: 'admin@example.com' }
        : token === 'delegate'
          ? { id: 'delegate-user', authId: 'clerk-delegate', email: 'delegate@example.com' }
        : null),
  }
  Object.assign(verificationService, {
    isAdmin: vi.fn(async (authId: string) => authId === 'clerk-delegate'),
    pendingRequests: vi.fn(async () => []),
    listAdmins: vi.fn(async () => []),
    searchAdminCandidates: vi.fn(async () => []),
    grantAdmin: vi.fn(async () => ({ added: true })),
    revokeAdmin: vi.fn(async () => ({ removed: true })),
  })
  const repository = {
    list: vi.fn(async () => []),
    getById: vi.fn(async () => null),
    create,
  }

  beforeAll(async () => {
    process.env.ADMIN_CLERK_USER_IDS = 'clerk-admin'
    app = buildApp(repository as unknown as EventRepository, authService as unknown as AuthService, null, null, verificationService as unknown as AccountVerificationService)
    await app.ready()
  })

  afterAll(async () => {
    await app.close()
    delete process.env.ADMIN_CLERK_USER_IDS
  })

  it('requires authentication and verified account status to publish events', async () => {
    const input = {
      category: 'Community',
      title: 'A community event',
      description: 'An event description that is long enough for validation.',
      startsAt: '2027-02-10T18:00:00.000Z',
      endsAt: '2027-02-10T20:00:00.000Z',
      venueName: 'The Hall',
      venueAddress: '12 Main Street',
      ticketTiers: [{ name: 'General', description: 'Entry', priceCents: 0 }],
    }

    const unauthenticated = await app.inject({ method: 'POST', url: '/events', payload: input })
    expect(unauthenticated.statusCode).toBe(401)

    const unverified = await app.inject({ method: 'POST', url: '/events', headers: { authorization: 'Bearer admin' }, payload: input })
    expect(unverified.statusCode).toBe(403)

    const verified = await app.inject({ method: 'POST', url: '/events', headers: { authorization: 'Bearer valid' }, payload: input })
    expect(verified.statusCode).toBe(200)
    expect(verified.json()).toEqual({ data: event })
    expect(create).toHaveBeenCalledOnce()
  })

  it('restricts the verification queue to configured Clerk admin IDs', async () => {
    const denied = await app.inject({ method: 'GET', url: '/admin-verification', headers: { authorization: 'Bearer valid' } })
    expect(denied.statusCode).toBe(403)
  })

  it('allows only the primary admin to manage admin accounts', async () => {
    const delegatedQueue = await app.inject({ method: 'GET', url: '/admin-verification', headers: { authorization: 'Bearer delegate' } })
    expect(delegatedQueue.statusCode).toBe(200)
    expect(delegatedQueue.json().canManageAdmins).toBe(false)

    const delegatedGrant = await app.inject({ method: 'POST', url: '/admin-users', headers: { authorization: 'Bearer delegate' }, payload: { userId: 'member-1' } })
    expect(delegatedGrant.statusCode).toBe(403)

    const primaryGrant = await app.inject({ method: 'POST', url: '/admin-users', headers: { authorization: 'Bearer admin' }, payload: { userId: 'member-1' } })
    expect(primaryGrant.statusCode).toBe(200)
    expect(verificationService.grantAdmin).toHaveBeenCalledWith('member-1', 'clerk-admin')
  })
})
