import type { Event } from '../contracts/events.js'

// Keep the fallback catalog deliberately in the future so reminder flows can
// be tested without having to edit dates by hand.
export const events: Event[] = [
  {
    id: 'event-1',
    category: 'Nightlife',
    title: 'Warehouse Sessions: Autumn Opening',
    description:
      'House and techno in a raw industrial space, with local selectors and a late-night courtyard set.',
    startsAt: '2026-10-03T20:30:00+03:30',
    endsAt: '2026-10-04T01:30:00+03:30',
    venue: {
      name: 'Aras Warehouse',
      address: 'Valiasr St, Tabriz',
    },
    host: {
      name: 'Substrata Collective',
    },
    goingCount: 86,
    ticketTiers: [
      {
        id: 'tier-1',
        name: 'General Admission',
        description: 'Entry after 8:30 PM',
        priceCents: 2500,
      },
      {
        id: 'tier-2',
        name: 'Early + Drink',
        description: 'Entry plus one welcome drink',
        priceCents: 3800,
      },
    ],
  },
  {
    id: 'event-2',
    category: 'Wellness',
    title: 'Sunrise Rooftop Yoga',
    description:
      'A slow vinyasa flow above the city. All levels are welcome and mats are provided.',
    startsAt: '2026-10-07T07:30:00+03:30',
    endsAt: '2026-10-07T08:45:00+03:30',
    venue: {
      name: 'The Assembly Rooftop',
      address: 'Shariati St, Tabriz',
    },
    host: {
      name: 'The Assembly',
    },
    goingCount: 31,
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
      'A five-course communal dinner tracing one chef’s family recipes across three generations.',
    startsAt: '2026-10-12T19:30:00+03:30',
    endsAt: '2026-10-12T22:30:00+03:30',
    venue: {
      name: 'Meydan Kitchen',
      address: 'Meydan St, Tabriz',
    },
    host: {
      name: 'Mira Okafor',
    },
    goingCount: 24,
    ticketTiers: [
      {
        id: 'tier-4',
        name: 'Communal Seat',
        description: 'Five courses with a non-alcoholic pairing',
        priceCents: 6500,
      },
    ],
  },
  {
    id: 'event-4',
    category: 'Arts',
    title: 'Light / Sound Installation Night',
    description:
      'An immersive evening of projected light, ambient sound, and experimental performance.',
    startsAt: '2026-10-20T18:00:00+03:30',
    endsAt: '2026-10-20T21:30:00+03:30',
    venue: {
      name: 'House of Art',
      address: 'Shahnaz St, Tabriz',
    },
    host: {
      name: 'Northwest Art Lab',
    },
    goingCount: 57,
    ticketTiers: [
      {
        id: 'tier-5',
        name: 'General Entry',
        description: 'Access to the full installation',
        priceCents: 1800,
      },
    ],
  },
  {
    id: 'event-5',
    category: 'Community',
    title: 'Autumn Night Market',
    description:
      'A relaxed evening market with makers, small plates, live music, and a late October sky.',
    startsAt: '2026-10-29T18:30:00+03:30',
    endsAt: '2026-10-29T22:00:00+03:30',
    venue: {
      name: 'El Goli Park',
      address: 'El Goli Blvd, Tabriz',
    },
    host: {
      name: 'Tabriz Makers',
    },
    goingCount: 112,
    ticketTiers: [
      {
        id: 'tier-6',
        name: 'Entry',
        description: 'Market entry and live music',
        priceCents: 1200,
      },
    ],
  },
]
