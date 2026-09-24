import type { Session } from '@supabase/supabase-js'
import type { Booking, CreateBookingInput } from '../../../packages/shared/src/bookings'
import type { Event, EventResponse, EventsResponse } from '../../../packages/shared/src/events'
export type { Event } from '../../../packages/shared/src/events'
export type { Booking } from '../../../packages/shared/src/bookings'

async function request<T>(path: string): Promise<T> {
  const response = await fetch(`/api${path}`)

  if (!response.ok) {
    throw new Error(`Request failed: ${response.status}`)
  }

  return response.json() as Promise<T>
}

export async function getEvents() {
  return request<EventsResponse>('/events')
}

export async function getEvent(id: string) {
  return request<EventResponse>(`/events/${encodeURIComponent(id)}`)
}

export async function createBooking(session: Session, input: CreateBookingInput) {
  const response = await fetch('/api/bookings', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      Authorization: `Bearer ${session.access_token}`,
    },
    body: JSON.stringify(input),
  })

  if (!response.ok) {
    const body = await response.json().catch(() => null) as { error?: string } | null
    throw new Error(body?.error ?? `Request failed: ${response.status}`)
  }

  return response.json() as Promise<{ data: Booking }>
}
