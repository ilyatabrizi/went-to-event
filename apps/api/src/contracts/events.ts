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

export type EventsResponse = {
  data: Event[]
  total: number
}

export type CreateEventInput = {
  category: string
  title: string
  description: string
  startsAt: string
  endsAt: string
  venueName: string
  venueAddress: string
  ticketTiers: Array<Pick<TicketTier, 'name' | 'description' | 'priceCents'>>
}

export type EventResponse = {
  data: Event
}

export interface EventRepository {
  list(): Promise<Event[]>
  getById(id: string): Promise<Event | null>
  create?(userId: string, input: CreateEventInput): Promise<Event>
}
