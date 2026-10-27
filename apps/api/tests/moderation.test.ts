import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'
import { buildApp } from '../src/app.js'
import { VerificationError, type AccountVerificationService } from '../src/verification/service.js'

const reviewEvent = vi.fn(async () => ({ reviewed: true }))
const verifyMember = vi.fn(async () => ({ verified: true }))
const service = {
  isAdmin: async (id: string) => id === 'admin-id',
  isPrimaryAdmin: async () => false,
  members: vi.fn(async () => ({ users: [{ userId: 'member-id', isAdmin: false }], total: 1 })),
  eventsForReview: vi.fn(async () => ({ events: [{ id: 'pending-event', publicationStatus: 'pending' }], total: 1 })),
  reviewEvent, verifyMember,
} as unknown as AccountVerificationService
const auth = { getUser: async (token: string) => ['admin', 'member'].includes(token) ? { id: `${token}-id`, authId: `${token}-id`, email: null } : null }
const app = buildApp({ list: async () => [], getById: async () => null }, auth, null, null, service, null, null, null)
beforeAll(() => app.ready())
afterAll(() => app.close())
const headers = { authorization: 'Bearer admin' }

describe('event moderation and member management', () => {
  it.each(['/admin-events', '/admin-members'])('protects %s from anonymous and ordinary members', async (url) => {
    expect((await app.inject({ url })).statusCode).toBe(401)
    expect((await app.inject({ url, headers: { authorization: 'Bearer member' } })).statusCode).toBe(403)
    const response = await app.inject({ url, headers })
    expect(response.statusCode).toBe(200)
    expect(response.headers['cache-control']).toBe('private, no-store')
  })
  it('prevents an ordinary member from reviewing an event or verifying a user', async () => {
    for (const [url, payload] of [['/admin-events', { eventId: 'pending-event', decision: 'approve' }], ['/admin-members', { userId: 'member-id' }]] as const) {
      const response = await app.inject({ method: 'PATCH', url, payload, headers: { authorization: 'Bearer member' } })
      expect(response.statusCode).toBe(403)
    }
    expect(reviewEvent).not.toHaveBeenCalled()
    expect(verifyMember).not.toHaveBeenCalled()
  })
  it('uses the authenticated reviewer identity and ignores a spoofed actor', async () => {
    const response = await app.inject({ method: 'PATCH', url: '/admin-events', headers, payload: { eventId: 'pending-event', decision: 'approve', note: ' Ready ', reviewerId: 'spoofed' } })
    expect(response.statusCode).toBe(200)
    expect(reviewEvent).toHaveBeenCalledWith('pending-event', 'admin-id', 'approve', 'Ready')
  })
  it('supports rejection and reports stale decisions without changing them', async () => {
    reviewEvent.mockRejectedValueOnce(new VerificationError('Already reviewed', 409))
    const response = await app.inject({ method: 'PATCH', url: '/admin-events', headers, payload: { eventId: 'pending-event', decision: 'reject' } })
    expect(response.statusCode).toBe(409)
  })
  it('validates paging, decisions, and note lengths', async () => {
    expect((await app.inject({ url: '/admin-events?status=secret', headers })).statusCode).toBe(400)
    expect((await app.inject({ url: '/admin-members?page=-1', headers })).statusCode).toBe(400)
    expect((await app.inject({ method: 'PATCH', url: '/admin-events', headers, payload: { eventId: 'e', decision: 'publish' } })).statusCode).toBe(400)
    expect((await app.inject({ method: 'PATCH', url: '/admin-events', headers, payload: { eventId: 'e', decision: 'approve', note: 'x'.repeat(501) } })).statusCode).toBe(400)
  })
  it('lets admins verify a member without a prior verification request', async () => {
    const response = await app.inject({ method: 'PATCH', url: '/admin-members', headers, payload: { userId: 'member-id' } })
    expect(response.statusCode).toBe(200)
    expect(verifyMember).toHaveBeenCalledWith('member-id', 'admin-id')
  })
})
