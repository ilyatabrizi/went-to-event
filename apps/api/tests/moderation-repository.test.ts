import { describe, expect, it } from 'vitest'
import type { SupabaseClient } from '@supabase/supabase-js'
import { SupabaseEventRepository } from '../src/repositories/supabase-events.js'

function database() {
  const rows = ['approved', 'pending', 'rejected'].map((status) => ({ id: status, publication_status: status, category: 'Music', title: status, description: 'Event', starts_at: '2099-01-01', ends_at: '2099-01-02', host_user_id: 'host', host_name: 'Host', going_count: 0, venue: { name: 'Hall', address: 'Address' }, ticketTiers: [] }))
  return {
    from: () => {
      let data = rows
      const builder = {
        select: () => builder,
        eq: (field: string, value: unknown) => { data = data.filter((row) => row[field as keyof typeof row] === value); return builder },
        gt: () => builder, not: () => builder, order: () => builder,
        maybeSingle: async () => ({ data: data[0] ?? null, error: null }),
        then: (resolve: (result: unknown) => unknown) => Promise.resolve({ data, error: null }).then(resolve),
      }
      return builder
    },
    rpc: async () => ({ data: 'pending', error: null }),
    approve: () => { rows[1].publication_status = 'approved' },
  } as unknown as SupabaseClient & { approve: () => void }
}

describe('service-role public event queries', () => {
  it('lists only approved events even when the database client can see all rows', async () => {
    const repository = new SupabaseEventRepository(database())
    expect((await repository.list()).map((event) => event.id)).toEqual(['approved'])
  })
  it('does not expose pending or rejected events through direct IDs', async () => {
    const repository = new SupabaseEventRepository(database())
    expect(await repository.getById('pending')).toBeNull()
    expect(await repository.getById('rejected')).toBeNull()
    expect((await repository.getById('approved'))?.id).toBe('approved')
  })
  it('shows approval immediately after the list and missing detail were already read', async () => {
    const client = database()
    const repository = new SupabaseEventRepository(client)
    expect((await repository.list()).map((event) => event.id)).toEqual(['approved'])
    expect(await repository.getById('pending')).toBeNull()
    client.approve()
    expect((await repository.list()).map((event) => event.id)).toEqual(['approved', 'pending'])
    expect((await repository.getById('pending'))?.publicationStatus).toBe('approved')
  })
  it('returns a pending submission privately to its creator without caching it publicly', async () => {
    const repository = new SupabaseEventRepository(database())
    const event = await repository.create('host', { category: 'Music', title: 'Concert', description: 'Music', startsAt: '2099-01-01', endsAt: '2099-01-02', venueName: 'Hall', venueAddress: 'Address', latitude: 35, longitude: 51, ticketTiers: [] })
    expect(event.publicationStatus).toBe('pending')
    expect(await repository.getById(event.id)).toBeNull()
    expect((await repository.list()).map((event) => event.id)).toEqual(['approved'])
  })
})
