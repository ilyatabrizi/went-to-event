import type { Event } from '../contracts/events.js'

// Sample catalogue for local previews. November additions are fictional demo events;
// attendance starts at zero and is never presented as real traction.
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
  // November 2026 presentation catalogue. Keep existing events and ticket IDs intact.
  {
    "id": "demo-nov-2026-1",
    "publicationStatus": "approved",
    "category": "Nightlife",
    "title": "AFTERHOURS: The City Is Our Stage",
    "description": "An after-dark takeover with underground selectors, immersive lighting, and a courtyard finale. Come for the first beat and stay for the last encore.",
    "startsAt": "2026-11-06T20:30:00+03:30",
    "endsAt": "2026-11-07T01:30:00+03:30",
    "venue": {
      "name": "Aras Warehouse",
      "address": "Valiasr St, Tabriz",
      "latitude": 38.073,
      "longitude": 46.299
    },
    "host": {
      "name": "Substrata Collective"
    },
    "goingCount": 0,
    "ticketTiers": [
      {
        "id": "demo-nov-2026-tier-1",
        "name": "General Admission",
        "description": "Full access to the music and courtyard sets",
        "priceCents": 2500
      }
    ]
  },
  {
    "id": "demo-nov-2026-2",
    "publicationStatus": "approved",
    "category": "Wellness",
    "title": "GOLDEN HOUR SOCIETY: Rise Above the Noise",
    "description": "Start above the skyline with a guided rooftop flow, breathwork, and a slow breakfast with new friends. All levels welcome; mats provided.",
    "startsAt": "2026-11-08T07:30:00+03:30",
    "endsAt": "2026-11-08T09:30:00+03:30",
    "venue": {
      "name": "The Assembly Rooftop",
      "address": "Shariati St, Tabriz",
      "latitude": 38.071,
      "longitude": 46.298
    },
    "host": {
      "name": "The Assembly"
    },
    "goingCount": 0,
    "ticketTiers": [
      {
        "id": "demo-nov-2026-tier-2",
        "name": "RSVP",
        "description": "Rooftop session, mat, and breakfast",
        "priceCents": 0
      }
    ]
  },
  {
    "id": "demo-nov-2026-3",
    "publicationStatus": "approved",
    "category": "Food",
    "title": "THE MAIN CHARACTER TABLE: A Supper Club",
    "description": "One long table, five courses, and stories worth staying for. An intimate dinner celebrating local ingredients with a contemporary tasting menu and non-alcoholic pairings.",
    "startsAt": "2026-11-13T19:30:00+03:30",
    "endsAt": "2026-11-13T22:30:00+03:30",
    "venue": {
      "name": "Meydan Kitchen",
      "address": "Meydan St, Tabriz",
      "latitude": 38.079,
      "longitude": 46.293
    },
    "host": {
      "name": "Meydan Supper Society"
    },
    "goingCount": 0,
    "ticketTiers": [
      {
        "id": "demo-nov-2026-tier-3",
        "name": "A Seat at the Table",
        "description": "Five courses and non-alcoholic pairings",
        "priceCents": 6500
      }
    ]
  },
  {
    "id": "demo-nov-2026-4",
    "publicationStatus": "approved",
    "category": "Arts",
    "title": "NO SMALL ENTRANCE: Light, Sound & Spectacle",
    "description": "Step inside a live collision of projection art, spatial sound, and experimental performance. Explore the installations, meet the artists, and catch the closing live set.",
    "startsAt": "2026-11-20T18:00:00+03:30",
    "endsAt": "2026-11-20T22:00:00+03:30",
    "venue": {
      "name": "House of Art",
      "address": "Shahnaz St, Tabriz",
      "latitude": 38.073,
      "longitude": 46.295
    },
    "host": {
      "name": "Northwest Art Lab"
    },
    "goingCount": 0,
    "ticketTiers": [
      {
        "id": "demo-nov-2026-tier-4",
        "name": "Full Experience",
        "description": "All installations and live performances",
        "priceCents": 1800
      }
    ]
  },
  {
    "id": "demo-nov-2026-5",
    "publicationStatus": "approved",
    "category": "Community",
    "title": "THE GRAND LINK-UP: Makers After Dark",
    "description": "A night market for the creatively restless. Discover independent makers, street food, live music, and hands-on pop-ups around the park.",
    "startsAt": "2026-11-27T17:30:00+03:30",
    "endsAt": "2026-11-27T22:00:00+03:30",
    "venue": {
      "name": "El Goli Park",
      "address": "El Goli Blvd, Tabriz",
      "latitude": 38.025,
      "longitude": 46.365
    },
    "host": {
      "name": "Tabriz Makers"
    },
    "goingCount": 0,
    "ticketTiers": [
      {
        "id": "demo-nov-2026-tier-5",
        "name": "Market Pass",
        "description": "Market entry, live music, and creative pop-ups",
        "priceCents": 1200
      }
    ]
  },
]
