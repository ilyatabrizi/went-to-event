import type { Event, EventResponse, EventsResponse } from '../../../packages/shared/src/events'
export type { Event } from '../../../packages/shared/src/events'

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
