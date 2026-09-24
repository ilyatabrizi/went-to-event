import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import type { Event, EventRepository } from '../../../../packages/shared/src/events.js'

type EventRow = {
  id: string
  category: string
  title: string
  description: string
  starts_at: string
  ends_at: string
  host_name: string
  going_count: number
  venue: { name: string; address: string } | Array<{ name: string; address: string }>
  ticketTiers: Array<{
    id: string
    name: string
    description: string
    price_cents: number
  }>
}

function toEvent(row: EventRow): Event {
  const venue = Array.isArray(row.venue) ? row.venue[0] : row.venue

  if (!venue) {
    throw new Error(`Event ${row.id} has no venue`)
  }

  return {
    id: row.id,
    category: row.category,
    title: row.title,
    description: row.description,
    startsAt: row.starts_at,
    endsAt: row.ends_at,
    venue,
    host: { name: row.host_name },
    goingCount: row.going_count,
    ticketTiers: row.ticketTiers.map((tier) => ({
      id: tier.id,
      name: tier.name,
      description: tier.description,
      priceCents: tier.price_cents,
    })),
  }
}

export class SupabaseEventRepository implements EventRepository {
  constructor(private readonly client: SupabaseClient) {}

  async list(): Promise<Event[]> {
    const { data, error } = await this.client
      .from('events')
      .select('id, category, title, description, starts_at, ends_at, host_name, going_count, venue:venues(name, address), ticketTiers:ticket_tiers(id, name, description, price_cents)')
      .order('starts_at', { ascending: true })

    if (error) throw error
    return (data as EventRow[]).map(toEvent)
  }

  async getById(id: string): Promise<Event | null> {
    const { data, error } = await this.client
      .from('events')
      .select('id, category, title, description, starts_at, ends_at, host_name, going_count, venue:venues(name, address), ticketTiers:ticket_tiers(id, name, description, price_cents)')
      .eq('id', id)
      .maybeSingle()

    if (error) throw error
    return data ? toEvent(data as EventRow) : null
  }
}

export function createSupabaseEventRepository() {
  const url = process.env.SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!url || !serviceRoleKey) return null

  return new SupabaseEventRepository(createClient(url, serviceRoleKey))
}
