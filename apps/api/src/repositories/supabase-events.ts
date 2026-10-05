import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import type { CreateEventInput, Event, EventRepository } from '../contracts/events.js'

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

  async create(userId: string, input: CreateEventInput): Promise<Event> {
    const { data: eventId, error } = await this.client.rpc('create_event_for_verified_user', {
      p_user_id: userId,
      p_category: input.category,
      p_title: input.title,
      p_description: input.description,
      p_starts_at: input.startsAt,
      p_ends_at: input.endsAt,
      p_venue_name: input.venueName,
      p_venue_address: input.venueAddress,
      p_ticket_tiers: input.ticketTiers.map((tier) => ({
        name: tier.name,
        description: tier.description,
        price_cents: tier.priceCents,
      })),
    })
    if (error) throw error
    const created = await this.getById(eventId as string)
    if (!created) throw new Error('Created event could not be loaded')
    return created
  }
}

export function createSupabaseEventRepository() {
  const url = process.env.SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!url || !serviceRoleKey) return null

  return new SupabaseEventRepository(createClient(url, serviceRoleKey))
}
