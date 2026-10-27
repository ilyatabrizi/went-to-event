import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import type { CreateEventInput, Event, EventRepository } from '../contracts/events.js'

type EventRow = {
  publication_status: 'pending' | 'approved' | 'rejected'
  id: string
  category: string
  title: string
  description: string
  starts_at: string
  ends_at: string
  host_name: string
  going_count: number
  venue: { name: string; address: string; latitude: number | null; longitude: number | null } | Array<{ name: string; address: string; latitude: number | null; longitude: number | null }>
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
    publicationStatus: row.publication_status,
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
  private readonly cacheTtlMs = (() => {
    const configured = Number(process.env.EVENT_CACHE_TTL_MS ?? 15_000)
    return Number.isFinite(configured) ? Math.max(5_000, configured) : 15_000
  })()
  private listCache: { data: Event[]; expiresAt: number } | null = null
  private listInFlight: Promise<Event[]> | null = null
  private readonly eventCache = new Map<string, { data: Event | null; expiresAt: number }>()
  private readonly eventInFlight = new Map<string, Promise<Event | null>>()

  constructor(private readonly client: SupabaseClient) {}

  async list(): Promise<Event[]> {
    if (this.listCache && this.listCache.expiresAt > Date.now()) return this.listCache.data
    if (this.listInFlight) return this.listInFlight

    this.listInFlight = this.loadList()
      .then((data) => {
        this.listCache = { data, expiresAt: Date.now() + this.cacheTtlMs }
        return data
      })
      .finally(() => {
        this.listInFlight = null
      })
    return this.listInFlight
  }

  private async loadList(): Promise<Event[]> {
    const { data, error } = await this.client
      .from('events')
      .select('id, publication_status, category, title, description, starts_at, ends_at, host_name, going_count, venue:venues(name, address, latitude, longitude), ticketTiers:ticket_tiers(id, name, description, price_cents)')
      // Discovery contains only live events from verified hosts. Keep ended
      // events addressable through getById so existing passes remain usable.
      .eq('publication_status', 'approved')
      .gt('ends_at', new Date().toISOString())
      .not('host_user_id', 'is', null)
      .order('starts_at', { ascending: true })

    if (error) throw error
    return (data as EventRow[]).map(toEvent)
  }

  async getById(id: string): Promise<Event | null> {
    const cached = this.eventCache.get(id)
    if (cached && cached.expiresAt > Date.now()) return cached.data
    if (this.eventInFlight.has(id)) return this.eventInFlight.get(id)!

    const request = this.loadById(id)
      .then((data) => {
        this.eventCache.set(id, { data, expiresAt: Date.now() + this.cacheTtlMs * 2 })
        return data
      })
      .finally(() => {
        this.eventInFlight.delete(id)
      })
    this.eventInFlight.set(id, request)
    return request
  }

  private async loadById(id: string, includeUnpublished = false): Promise<Event | null> {
    let query = this.client.from('events')
      .select('id, publication_status, category, title, description, starts_at, ends_at, host_name, going_count, venue:venues(name, address, latitude, longitude), ticketTiers:ticket_tiers(id, name, description, price_cents)')
      .eq('id', id)
    if (!includeUnpublished) query = query.eq('publication_status', 'approved')
    const { data, error } = await query.maybeSingle()

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
      p_latitude: input.latitude,
      p_longitude: input.longitude,
      p_ticket_tiers: input.ticketTiers.map((tier) => ({
        name: tier.name,
        description: tier.description,
        price_cents: tier.priceCents,
      })),
    })
    if (error) throw error
    const created = await this.loadById(eventId as string, true)
    if (!created) throw new Error('Created event could not be loaded')
    this.listCache = null
    this.eventCache.delete(created.id)
    return created
  }
}

export function createSupabaseEventRepository() {
  const url = process.env.SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!url || !serviceRoleKey) return null

  return new SupabaseEventRepository(createClient(url, serviceRoleKey))
}
