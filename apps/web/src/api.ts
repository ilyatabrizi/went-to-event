import type { Session } from '@supabase/supabase-js'
import type { AccountUpdate, ProfileUpdate, UserProfile } from '../../../packages/shared/src/auth'
import type { Booking, CreateBookingInput } from '../../../packages/shared/src/bookings'
import type { Event, EventResponse, EventsResponse } from '../../../packages/shared/src/events'
export type { Event } from '../../../packages/shared/src/events'
export type { Booking } from '../../../packages/shared/src/bookings'

export type { UserProfile } from '../../../packages/shared/src/auth'

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

export async function getBookings(session: Session) {
  const response = await fetch('/api/me/bookings', {
    headers: { Authorization: `Bearer ${session.access_token}` },
  })

  if (!response.ok) {
    const body = await response.json().catch(() => null) as { error?: string } | null
    throw new Error(body?.error ?? `Request failed: ${response.status}`)
  }

  return response.json() as Promise<{ data: Booking[] }>
}

async function authenticatedRequest<T>(session: Session, path: string, options: RequestInit = {}) {
  const response = await fetch(`/api${path}`, {
    ...options,
    headers: {
      'content-type': 'application/json',
      Authorization: `Bearer ${session.access_token}`,
      ...options.headers,
    },
  })
  const body = await response.json().catch(() => null) as { error?: string } | T | null
  if (!response.ok) throw new Error((body as { error?: string } | null)?.error ?? `Request failed: ${response.status}`)
  return body as T
}

export function getProfile(session: Session) {
  return authenticatedRequest<{ profile: UserProfile }>(session, '/me/profile')
}

export function updateProfile(session: Session, input: ProfileUpdate) {
  return authenticatedRequest<{ profile: UserProfile }>(session, '/me/profile', {
    method: 'PATCH',
    body: JSON.stringify(input),
  })
}

export function updateAccount(session: Session, input: AccountUpdate) {
  return authenticatedRequest<{ user: { id: string; email: string | null } }>(session, '/me/account', {
    method: 'PATCH',
    body: JSON.stringify(input),
  })
}
