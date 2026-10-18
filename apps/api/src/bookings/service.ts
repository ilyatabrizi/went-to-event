import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { createHash, createHmac, randomUUID } from 'node:crypto'
import type { Booking, CreateBookingInput, Ticket, TicketCheckInResult } from '../contracts/bookings.js'

export interface BookingService {
  create(userId: string, input: CreateBookingInput): Promise<Booking>
  friendsAttending(userId: string, eventId: string): Promise<Array<{ id: string; displayName: string; username: string | null; avatarUrl: string | null }>>
  list(userId: string): Promise<Booking[]>
  get(userId: string, id: string): Promise<Booking | null>
  cancel(userId: string, id: string): Promise<boolean>
  verifyTicket(userId: string, qrCode: string): Promise<TicketCheckInResult>
}

type BookingRow = {
  id: string
  event_id: string
  status: Booking['status']
  total_cents: number
  created_at: string
  show_attendance: boolean
  booking_items: Array<{
    ticket_tier_id: string
    quantity: number
    unit_price_cents: number
  }>
}

type TicketRow = {
  id: string
  ticket_number: number
  token_hash: string
  checked_in_at: string | null
}

const QR_PREFIX = 'wte-ticket:v1'
const qrSecret = () => process.env.QR_TICKET_SECRET ?? process.env.CLERK_SECRET_KEY ?? 'development-only-qr-secret'
const hashToken = (token: string) => createHash('sha256').update(token).digest('hex')
const ticketToken = (id: string) => createHmac('sha256', qrSecret()).update(id).digest('hex')
const qrCode = (id: string, token: string) => `${QR_PREFIX}:${id}:${token}`

function parseQrCode(value: string) {
  const parts = value.trim().split(':')
  if (parts.length !== 4 || `${parts[0]}:${parts[1]}` !== QR_PREFIX) return null
  const [, , id, token] = parts
  if (!/^[0-9a-f-]{36}$/i.test(id) || !/^[a-f0-9]{64}$/i.test(token)) return null
  return { id, token }
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
    showAttendance: row.show_attendance,
  }
}

function toTickets(rows: TicketRow[], tokens = new Map<string, string>()): Ticket[] {
  return rows.map((row) => ({
    id: row.id,
    number: row.ticket_number,
    qrCode: tokens.get(row.id) ?? qrCode(row.id, ticketToken(row.id)),
    checkedInAt: row.checked_in_at,
  }))
}

export class SupabaseBookingService implements BookingService {
  constructor(private readonly client: SupabaseClient) {}

  async create(userId: string, input: CreateBookingInput): Promise<Booking> {
    const { data, error } = await this.client.rpc('create_booking', {
      p_user_id: userId,
      p_event_id: input.eventId,
      p_ticket_tier_id: input.ticketTierId,
      p_quantity: input.quantity,
      p_show_attendance: input.showAttendance,
    })

    if (error) throw error

    const ticketRows: TicketRow[] = []
    for (let number = 1; number <= data.quantity; number += 1) {
      const id = randomUUID()
      const token = ticketToken(id)
      const { data: ticket, error: ticketError } = await this.client
        .from('ticket_codes')
        .insert({ id, booking_id: data.id, ticket_number: number, token_hash: hashToken(token) })
        .select('id, ticket_number, token_hash, checked_in_at')
        .single()
      if (ticketError) throw ticketError
      ticketRows.push(ticket as TicketRow)
    }

    return {
      id: data.id,
      eventId: data.event_id,
      ticketTierId: data.ticket_tier_id,
      quantity: data.quantity,
      status: data.status,
      totalCents: data.total_cents,
      createdAt: new Date().toISOString(),
      showAttendance: data.show_attendance,
      tickets: toTickets(ticketRows),
    }
  }

  async list(userId: string): Promise<Booking[]> {
    const { data, error } = await this.client
      .from('bookings')
      .select('id, event_id, status, total_cents, created_at, show_attendance, booking_items(ticket_tier_id, quantity, unit_price_cents)')
      .eq('user_id', userId)
      .neq('status', 'cancelled')
      .order('created_at', { ascending: false })

    if (error) throw error
    const bookings = (data as BookingRow[]).map(toBooking)
    if (!bookings.length) return bookings
    const { data: tickets, error: ticketError } = await this.client
      .from('ticket_codes')
      .select('id, booking_id, ticket_number, token_hash, checked_in_at')
      .in('booking_id', bookings.map((booking) => booking.id))
      .order('ticket_number', { ascending: true })
    if (ticketError) throw ticketError
    const ticketsByBooking = new Map<string, TicketRow[]>()
    ;(tickets ?? []).forEach((ticket) => {
      const rows = ticketsByBooking.get(ticket.booking_id) ?? []
      rows.push(ticket as TicketRow)
      ticketsByBooking.set(ticket.booking_id, rows)
    })
    return bookings.map((booking) => ({ ...booking, tickets: toTickets(ticketsByBooking.get(booking.id) ?? []) }))
  }

  async get(userId: string, id: string): Promise<Booking | null> {
    const { data, error } = await this.client
      .from('bookings')
      .select('id, event_id, status, total_cents, created_at, show_attendance, booking_items(ticket_tier_id, quantity, unit_price_cents)')
      .eq('user_id', userId)
      .eq('id', id)
      .maybeSingle()

    if (error) throw error
    if (!data) return null
    const booking = toBooking(data as BookingRow)
    const { data: tickets, error: ticketError } = await this.client
      .from('ticket_codes')
      .select('id, ticket_number, token_hash, checked_in_at')
      .eq('booking_id', id)
      .order('ticket_number', { ascending: true })
    if (ticketError) throw ticketError
    return { ...booking, tickets: toTickets((tickets ?? []) as TicketRow[]) }
  }

  async friendsAttending(userId: string, eventId: string) {
    const [from, to] = await Promise.all([
      this.client.from('friend_requests').select('sender_id').eq('recipient_id', userId).eq('status', 'accepted'),
      this.client.from('friend_requests').select('recipient_id').eq('sender_id', userId).eq('status', 'accepted'),
    ])
    if (from.error) throw from.error
    if (to.error) throw to.error
    const friendIds = [...new Set([...(from.data ?? []).map((row) => row.sender_id), ...(to.data ?? []).map((row) => row.recipient_id)])]
    if (!friendIds.length) return []
    const { data: bookings, error: bookingError } = await this.client.from('bookings').select('user_id').eq('event_id', eventId).eq('status', 'confirmed').eq('show_attendance', true).in('user_id', friendIds)
    if (bookingError) throw bookingError
    const attendeeIds = [...new Set((bookings ?? []).map((row) => row.user_id))]
    if (!attendeeIds.length) return []
    const { data: profiles, error: profileError } = await this.client.from('profiles').select('id, display_name, username, avatar_url').in('id', attendeeIds)
    if (profileError) throw profileError
    return (profiles ?? []).map((profile) => ({ id: profile.id, displayName: profile.display_name ?? profile.username ?? 'Went To Event member', username: profile.username, avatarUrl: profile.avatar_url }))
  }

  async cancel(userId: string, id: string): Promise<boolean> {
    const { data, error } = await this.client
      .from('bookings')
      .update({ status: 'cancelled' })
      .eq('id', id)
      .eq('user_id', userId)
      .in('status', ['pending', 'confirmed'])
      .select('id')
      .maybeSingle()
    if (error) throw error
    return Boolean(data)
  }

  async verifyTicket(userId: string, value: string): Promise<TicketCheckInResult> {
    const parsed = parseQrCode(value)
    if (!parsed) throw new Error('Invalid QR code')

    const { data: ticket, error: ticketError } = await this.client
      .from('ticket_codes')
      .select('id, booking_id, ticket_number, token_hash, checked_in_at')
      .eq('id', parsed.id)
      .eq('token_hash', hashToken(parsed.token))
      .maybeSingle()
    if (ticketError) throw ticketError
    if (!ticket) throw new Error('Ticket not found')
    if (hashToken(parsed.token) !== ticket.token_hash) throw new Error('Ticket not found')

    const { data: booking, error: bookingError } = await this.client
      .from('bookings')
      .select('id, event_id, status')
      .eq('id', ticket.booking_id)
      .maybeSingle()
    if (bookingError) throw bookingError
    if (!booking || booking.status !== 'confirmed') throw new Error('Booking is not valid')

    const { data: event, error: eventError } = await this.client
      .from('events')
      .select('id, title, host_user_id')
      .eq('id', booking.event_id)
      .maybeSingle()
    if (eventError) throw eventError
    if (!event || event.host_user_id !== userId) throw new Error('Only the event host can check in tickets')

    if (ticket.checked_in_at) {
      return {
        status: 'already_checked_in',
        ticket: { id: ticket.id, number: ticket.ticket_number, checkedInAt: ticket.checked_in_at },
        event: { id: event.id, title: event.title },
      }
    }

    const checkedInAt = new Date().toISOString()
    const { data: updated, error: updateError } = await this.client
      .from('ticket_codes')
      .update({ checked_in_at: checkedInAt, checked_in_by: userId })
      .eq('id', ticket.id)
      .is('checked_in_at', null)
      .select('id, ticket_number, checked_in_at')
      .maybeSingle()
    if (updateError) throw updateError
    if (!updated) {
      const { data: current, error: currentError } = await this.client
        .from('ticket_codes').select('id, ticket_number, checked_in_at').eq('id', ticket.id).single()
      if (currentError) throw currentError
      return { status: 'already_checked_in', ticket: { id: current.id, number: current.ticket_number, checkedInAt: current.checked_in_at }, event: { id: event.id, title: event.title } }
    }
    return {
      status: 'checked_in',
      ticket: { id: updated.id, number: updated.ticket_number, checkedInAt: updated.checked_in_at },
      event: { id: event.id, title: event.title },
    }
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
