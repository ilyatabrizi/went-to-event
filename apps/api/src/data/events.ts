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

export const events: Event[] = [
  {
    id: 'event-1',
    category: 'Nightlife',
    title: 'Warehouse Sessions Vol. 9',
    description:
      'Four rooms, one raw industrial shell on the waterfront. House and techno until sunrise.',
    startsAt: '2026-09-25T21:00:00-07:00',
    endsAt: '2026-09-26T03:00:00-07:00',
    venue: {
      name: 'Pier 70',
      address: '420 22nd St, Dogpatch, San Francisco',
    },
    host: {
      name: 'Substrata Collective',
    },
    goingCount: 214,
    ticketTiers: [
      {
        id: 'tier-1',
        name: 'General Admission',
        description: 'Entry after 9 PM',
        priceCents: 2500,
      },
      {
        id: 'tier-2',
        name: 'Early + Drink',
        description: 'Entry plus house cocktail',
        priceCents: 3800,
      },
    ],
  },
  {
    id: 'event-2',
    category: 'Wellness',
    title: 'Sunrise Rooftop Yoga',
    description:
      'Start the weekend above the fog with a slow vinyasa flow. All levels welcome.',
    startsAt: '2026-09-26T07:00:00-07:00',
    endsAt: '2026-09-26T08:15:00-07:00',
    venue: {
      name: 'The Assembly Rooftop',
      address: '150 Valencia St, San Francisco',
    },
    host: {
      name: 'The Assembly',
    },
    goingCount: 42,
    ticketTiers: [
      {
        id: 'tier-3',
        name: 'RSVP',
        description: 'Free entry; mats provided',
        priceCents: 0,
      },
    ],
  },
  {
    id: 'event-3',
    category: 'Food',
    title: 'Third Culture Supper Club',
    description:
      'A five-course communal dinner tracing one chef’s diasporic memory across three continents.',
    startsAt: '2026-09-26T19:30:00-07:00',
    endsAt: '2026-09-26T22:30:00-07:00',
    venue: {
      name: 'Mission Kitchen',
      address: '2820 Mission St, San Francisco',
    },
    host: {
      name: 'Mira Okafor',
    },
    goingCount: 28,
    ticketTiers: [
      {
        id: 'tier-4',
        name: 'Communal Seat',
        description: 'Five courses plus wine pairing',
        priceCents: 6500,
      },
    ],
  },
]
