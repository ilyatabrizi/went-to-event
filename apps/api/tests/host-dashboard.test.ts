import Fastify from 'fastify'
import { describe, expect, it, vi } from 'vitest'
import { hostDashboardRoutes } from '../src/routes/host-dashboard.js'
import type { AccountVerificationService } from '../src/verification/service.js'
import { SupabaseHostDashboardService } from '../src/bookings/host-dashboard.js'
import type { SupabaseClient } from '@supabase/supabase-js'

async function setup(status = 'verified') {
  const overview = vi.fn(async (id: string) => ({ events: [{ id: 'owned-event', title: id }], registrations: [] }))
  const app = Fastify()
  app.register(hostDashboardRoutes, {
    authService: { getUser: async (token: string) => token === 'valid' ? { id: 'host-1', email: null } : null },
    verificationService: { status: async () => ({ status }) } as AccountVerificationService,
    hostDashboardService: { overview },
  })
  return { app, overview }
}

describe('host dashboard authorization', () => {
  it('requires a valid session before returning private registrations', async () => {
    const { app, overview } = await setup()
    for (const authorization of ['', 'Bearer invalid']) {
      expect((await app.inject({ url: '/host-dashboard', headers: { authorization } })).statusCode).toBe(401)
    }
    expect(overview).not.toHaveBeenCalled()
    await app.close()
  })
  it.each(['unverified', 'pending', 'rejected', 'suspended'])('denies %s accounts', async (status) => {
    const { app, overview } = await setup(status)
    expect((await app.inject({ url: '/host-dashboard', headers: { authorization: 'Bearer valid' } })).statusCode).toBe(403)
    expect(overview).not.toHaveBeenCalled()
    await app.close()
  })
  it('uses the authenticated host identity and disables caching', async () => {
    const { app, overview } = await setup()
    const response = await app.inject({ url: '/host-dashboard?userId=another-host', headers: { authorization: 'Bearer valid' } })
    expect(response.statusCode).toBe(200)
    expect(response.headers['cache-control']).toBe('private, no-store')
    expect(overview).toHaveBeenCalledWith('host-1')
    await app.close()
  })
})

describe('host dashboard data', () => {
  it('scopes both events and bookings to the owner and excludes QR secrets', async () => {
    const calls: Array<{ table: string; filters: unknown[]; select?: string }> = []
    const client = { from(table: string) {
      const call = { table, filters: [] as unknown[], select: '' }; calls.push(call)
      const query = {
        select(value: string) { call.select = value; return query },
        eq(key: string, value: string) { call.filters.push([key, value]); return query },
        in() { return query }, order() { return query },
        async range() { return { error: null, data: table === 'events' ? [{ id: 'e1', title: 'Owned', starts_at: '2026-10-21', ends_at: '2026-10-22' }]
          : table === 'profiles' ? [{ id: 'guest1', display_name: 'Guest One', username: 'guest' }]
          : [{ id: 'b1', event_id: 'e1', user_id: 'guest1', status: 'confirmed', total_cents: 5000, created_at: '2026-10-20', booking_items: [{ quantity: 2, ticket_tiers: { name: 'General' } }], ticket_codes: [{ checked_in_at: '2026-10-21' }, { checked_in_at: null }] }] } },
      }
      return query
    } } as unknown as SupabaseClient
    const data = await new SupabaseHostDashboardService(client).overview('host1')
    expect(calls.find((call) => call.table === 'events')?.filters).toContainEqual(['host_user_id', 'host1'])
    expect(calls.find((call) => call.table === 'bookings')?.filters).toContainEqual(['events.host_user_id', 'host1'])
    expect(calls.find((call) => call.table === 'bookings')?.select).not.toMatch(/token_hash|qr_code/)
    expect(data.registrations[0]).toMatchObject({ quantity: 2, totalCents: 5000, checkedIn: 1, displayName: 'Guest One', ticketNames: ['General'] })
  })
})
