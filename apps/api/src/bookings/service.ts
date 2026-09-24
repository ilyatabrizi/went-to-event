import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import type { Booking, CreateBookingInput } from '../../../../packages/shared/src/bookings.js'

export interface BookingService {
  create(userId: string, input: CreateBookingInput): Promise<Booking>
  list(userId: string): Promise<Booking[]>
  get(userId: string, id: string): Promise<Booking | null>
}

type BookingRow = {
  id: string
  event_id: string
  status: Booking['status']
  total_cents: number
  created_at: string
  booking_items: Array<{
    ticket_tier_id: string
    quantity: number
    unit_price_cents: number
  }>
}

function toBooking(row: BookingRow): Booking {
  const item = row.booking_items[0]
  if (!item) throw new Error(`Booking ${row.id} has no item`)

  return {
    id: row.id,
    eventId: row.event_id,
    ticketTierId: item.ticket_tier_id,
    quantity: item.quantity,
    status: row.status,
    totalCents: row.total_cents,
    createdAt: row.created_at,
  }
}

export class SupabaseBookingService implements BookingService {
  constructor(private readonly client: SupabaseClient) {}

  async create(userId: string, input: CreateBookingInput): Promise<Booking> {
    const { data, error } = await this.client.rpc('create_booking', {
      p_user_id: userId,
      p_event_id: input.eventId,
      p_ticket_tier_id: input.ticketTierId,
      p_quantity: input.quantity,
    })

    if (error) throw error

    return {
      id: data.id,
      eventId: data.event_id,
      ticketTierId: data.ticket_tier_id,
      quantity: data.quantity,
      status: data.status,
      totalCents: data.total_cents,
      createdAt: new Date().toISOString(),
    }
  }

  async list(userId: string): Promise<Booking[]> {
    const { data, error } = await this.client
      .from('bookings')
      .select('id, event_id, status, total_cents, created_at, booking_items(ticket_tier_id, quantity, unit_price_cents)')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })

    if (error) throw error
    return (data as BookingRow[]).map(toBooking)
  }

  async get(userId: string, id: string): Promise<Booking | null> {
    const { data, error } = await this.client
      .from('bookings')
      .select('id, event_id, status, total_cents, created_at, booking_items(ticket_tier_id, quantity, unit_price_cents)')
      .eq('user_id', userId)
      .eq('id', id)
      .maybeSingle()

    if (error) throw error
    return data ? toBooking(data as BookingRow) : null
  }
}

export function createBookingService(): BookingService | null {
  const url = process.env.SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !serviceRoleKey) return null

  return new SupabaseBookingService(createClient(url, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
      detectSessionInUrl: false,
    },
  }))
}
