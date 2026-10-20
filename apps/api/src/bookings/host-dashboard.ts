import { createClient, type SupabaseClient } from '@supabase/supabase-js'

export type HostDashboard = {
  events: Array<{ id: string; title: string; startsAt: string; endsAt: string }>
  registrations: Array<{
    id: string; eventId: string; attendeeId: string; displayName: string; username: string | null
    status: 'pending' | 'confirmed' | 'cancelled'; totalCents: number; quantity: number
    createdAt: string; checkedIn: number; ticketNames: string[]
  }>
}
export interface HostDashboardService { overview(userId: string): Promise<HostDashboard> }

// Supabase caps each response; page every query so analytics never silently truncate.
async function allRows<T>(query: (from: number, to: number) => PromiseLike<{ data: T[] | null; error: unknown }>): Promise<T[]> {
  const rows: T[] = []
  for (let from = 0; ; from += 500) {
    const { data, error } = await query(from, from + 499)
    if (error) throw error
    rows.push(...(data ?? []))
    if (!data || data.length < 500) return rows
  }
}

export class SupabaseHostDashboardService implements HostDashboardService {
  constructor(private readonly client: SupabaseClient) {}
  async overview(userId: string): Promise<HostDashboard> {
    const events = await allRows((from, to) => this.client.from('events')
      .select('id, title, starts_at, ends_at').eq('host_user_id', userId).order('id').range(from, to))
    if (!events.length) return { events: [], registrations: [] }
    // Ownership is enforced in the database query, never taken from request input.
    const bookings = await allRows((from, to) => this.client.from('bookings')
      .select('id, event_id, user_id, status, total_cents, created_at, events!inner(host_user_id), booking_items(quantity, ticket_tiers(name)), ticket_codes(checked_in_at)')
      .eq('events.host_user_id', userId).order('id').range(from, to))
    const ids = [...new Set(bookings.map((row) => row.user_id))]
    const profiles = new Map<string, { display_name: string | null; username: string | null }>()
    for (let start = 0; start < ids.length; start += 100) {
      const rows = await allRows((from, to) => this.client.from('profiles').select('id, display_name, username')
        .in('id', ids.slice(start, start + 100)).order('id').range(from, to))
      rows.forEach((row) => profiles.set(row.id, row))
    }
    return {
      events: events.map((row) => ({ id: row.id, title: row.title, startsAt: row.starts_at, endsAt: row.ends_at })),
      registrations: bookings.map((row) => {
        const profile = profiles.get(row.user_id)
        return {
          id: row.id, eventId: row.event_id, attendeeId: row.user_id,
          displayName: profile?.display_name || profile?.username || 'Went To Event member', username: profile?.username ?? null,
          status: row.status, totalCents: row.total_cents, createdAt: row.created_at,
          quantity: row.booking_items.reduce((sum, item) => sum + item.quantity, 0),
          checkedIn: row.status === 'confirmed' ? row.ticket_codes.filter((ticket) => ticket.checked_in_at).length : 0,
          ticketNames: row.booking_items.flatMap((item) => {
            const tiers = item.ticket_tiers as unknown as { name: string } | null
            return tiers ? [tiers.name] : []
          }),
        }
      }),
    }
  }
}

export function createHostDashboardService(): HostDashboardService | null {
  const url = process.env.SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  return url && key ? new SupabaseHostDashboardService(createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  })) : null
}
