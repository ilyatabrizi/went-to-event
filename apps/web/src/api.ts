export type TicketTier = {
  id: string
  name: string
  description: string
  priceCents: number
}

export type Event = {
  id: string
  category: string
  title: string
  description: string
  startsAt: string
  endsAt: string
  venue: {
    name: string
    address: string
  }
  host: {
    name: string
  }
  goingCount: number
  ticketTiers: TicketTier[]
}

type EventsResponse = {
  data: Event[]
  total: number
}

type EventResponse = {
  data: Event
}

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
