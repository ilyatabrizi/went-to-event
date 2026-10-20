import type { Booking } from './contracts/bookings'
import type { Event } from './contracts/events'
import type { UserProfile } from './contracts/auth'

const storageKey = 'wte.frontend-preview.v1'

const makeEvent = (id: string, title: string, category: string, hoursFromNow: number, venueName: string, priceCents: number): Event => {
  const startsAt = new Date(Date.now() + hoursFromNow * 60 * 60 * 1000)
  const endsAt = new Date(startsAt.getTime() + 3 * 60 * 60 * 1000)
  return {
    id, title, category,
    description: `A sample ${category.toLowerCase()} gathering for previewing the Went To Event experience.`,
    startsAt: startsAt.toISOString(), endsAt: endsAt.toISOString(),
    venue: { name: venueName, address: 'Downtown, San Francisco', latitude: 37.7749, longitude: -122.4194 },
    host: { name: 'Went To Event' }, goingCount: 24,
    ticketTiers: [{ id: `${id}-standard`, name: 'General admission', description: 'Entry for one', priceCents }],
  }
}

export const previewEvents: Event[] = [
  makeEvent('preview-rooftop', 'Golden Hour on the Roof', 'Music', 4, 'The Meridian Rooftop', 1800),
  makeEvent('preview-gallery', 'After Hours: New Voices', 'Art', 27, 'Northstar Gallery', 0),
  makeEvent('preview-supper', 'A Long Table Dinner', 'Food', 52, 'Juniper House', 3200),
]

const initialProfile: UserProfile = { id: 'preview-user', username: 'preview_guest', displayName: 'Preview Guest', avatarUrl: null }

type PreviewState = { profile: UserProfile; bookings: Booking[]; verification: 'unverified' | 'pending' | 'verified' | 'rejected' | 'suspended' }

function readState(): PreviewState {
  try {
    const value = JSON.parse(localStorage.getItem(storageKey) ?? 'null') as Partial<PreviewState> | null
    if (value?.profile && Array.isArray(value.bookings)) return { profile: value.profile, bookings: value.bookings, verification: value.verification ?? 'unverified' }
  } catch { /* use the initial preview state */ }
  return { profile: initialProfile, bookings: [], verification: 'unverified' }
}

function writeState(state: PreviewState) {
  try { localStorage.setItem(storageKey, JSON.stringify(state)) } catch { /* local storage may be disabled */ }
}

const state = readState()
const ok = <T,>(value: T): T => value

export function previewRequest(path: string, options: RequestInit = {}): unknown {
  const method = (options.method ?? 'GET').toUpperCase()
  const cleanPath = path.split('?')[0]
  const body = options.body ? JSON.parse(String(options.body)) as Record<string, unknown> : {}

  if (cleanPath === '/events' && method === 'GET') return ok({ data: previewEvents, total: previewEvents.length })
  if (cleanPath === '/events' && method === 'POST') {
    const now = new Date()
    const event: Event = {
      id: `preview-created-${Date.now()}`, title: String(body.title ?? 'New preview event'), category: String(body.category ?? 'Music'),
      description: String(body.description ?? ''), startsAt: String(body.startsAt ?? now.toISOString()), endsAt: String(body.endsAt ?? new Date(now.getTime() + 3 * 3600000).toISOString()),
      venue: { name: String(body.venueName ?? 'Preview venue'), address: String(body.venueAddress ?? 'San Francisco') }, host: { name: state.profile.displayName ?? 'Preview Guest' }, goingCount: 0,
      ticketTiers: Array.isArray(body.ticketTiers) ? (body.ticketTiers as Event['ticketTiers']) : [],
    }
    previewEvents.unshift(event)
    return { data: event }
  }
  const eventMatch = cleanPath.match(/^\/events\/([^/]+)$/)
  if (eventMatch && method === 'GET') {
    const event = previewEvents.find((item) => item.id === decodeURIComponent(eventMatch[1]))
    if (event) return { data: event }
  }
  if (/^\/events\/[^/]+\/attendees$/.test(cleanPath)) return { data: [] }

  if (cleanPath === '/bookings' && method === 'GET') return { data: state.bookings }
  if (cleanPath === '/bookings' && method === 'POST') {
    const event = previewEvents.find((item) => item.id === body.eventId)
    const tier = event?.ticketTiers.find((item) => item.id === body.ticketTierId)
    if (!event || !tier) throw new Error('Choose a preview event and ticket tier.')
    const id = `preview-booking-${Date.now()}`
    const booking: Booking = { id, eventId: event.id, ticketTierId: tier.id, quantity: Number(body.quantity ?? 1), status: 'confirmed', totalCents: tier.priceCents * Number(body.quantity ?? 1), createdAt: new Date().toISOString(), showAttendance: Boolean(body.showAttendance), tickets: Array.from({ length: Number(body.quantity ?? 1) }, (_, index) => ({ id: `${id}-${index + 1}`, number: index + 1, qrCode: `PREVIEW-${id}-${index + 1}`, checkedInAt: null })) }
    state.bookings.push(booking); writeState(state)
    return { data: booking }
  }
  const bookingMatch = cleanPath.match(/^\/bookings\/([^/]+)$/)
  if (bookingMatch && method === 'DELETE') {
    state.bookings = state.bookings.filter((item) => item.id !== decodeURIComponent(bookingMatch[1])); writeState(state)
    return { removed: true }
  }

  if (cleanPath === '/me/profile' && method === 'GET') return { profile: state.profile }
  if (cleanPath === '/me/profile' && method === 'PATCH') {
    state.profile = { ...state.profile, ...body }; writeState(state)
    return { profile: state.profile }
  }
  if (cleanPath === '/me/account' && method === 'PATCH') return { user: { id: 'preview-user', email: 'preview@example.test' } }
  if (cleanPath === '/me/profile-picture' && method === 'POST') {
    state.profile = { ...state.profile, avatarUrl: `data:${String(body.contentType ?? 'image/jpeg')};base64,${String(body.data ?? '')}` }; writeState(state)
    return { profile: state.profile }
  }
  if (cleanPath === '/verification' && method === 'GET') return { status: state.verification, request: null }
  if (cleanPath === '/verification' && method === 'POST') { state.verification = 'pending'; writeState(state); return { id: 'preview-verification', status: 'pending' } }
  if (cleanPath === '/social') return { friends: [], incomingRequests: [], outgoingRequests: [], conversations: [] }
  if (cleanPath === '/social/conversations') return { conversations: [] }
  if (/^\/social\/conversations\/[^/]+\/messages/.test(cleanPath)) return { messages: [] }
  if (/^\/social\//.test(cleanPath)) return { users: [], sent: true, updated: true, removed: true }
  if (cleanPath === '/ticket-checkins') return { data: { status: 'checked_in', ticket: { id: 'preview-ticket', number: 1, checkedInAt: new Date().toISOString() }, event: { id: 'preview-event', title: 'Preview event' } } }
  if (cleanPath === '/admin-verification') return { requests: [], canManageAdmins: false, reviewed: true }
  if (cleanPath === '/admin-users' || cleanPath.startsWith('/admin-users/')) return { admins: [], users: [], added: true, removed: true }
  if (cleanPath === '/notifications/push-subscription') return { subscribed: true }
  return {}
}

export function resetPreviewState() {
  localStorage.removeItem(storageKey)
  window.location.reload()
}
