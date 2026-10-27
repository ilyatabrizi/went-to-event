import type { AccountUpdate, ProfileUpdate, UserProfile } from './contracts/auth'
import type { Booking, CreateBookingInput, TicketCheckInResult } from './contracts/bookings'
export type { TicketCheckInResult } from './contracts/bookings'
import type { Event, EventResponse, EventsResponse } from './contracts/events'
export type { Event } from './contracts/events'
export type { Booking } from './contracts/bookings'

export type { UserProfile } from './contracts/auth'

export type SocialPerson = { id: string; username: string | null; displayName: string; avatarUrl: string | null }
export type SocialRequest = { id: string; person: SocialPerson; createdAt: string }
export type SocialMessage = { id: string; conversationId: string; senderId: string; body: string; createdAt: string }
export type SocialConversation = { id: string; person: SocialPerson; lastMessage: SocialMessage | null; updatedAt: string }
export type SocialOverview = { friends: SocialPerson[]; incomingRequests: SocialRequest[]; outgoingRequests: SocialRequest[]; conversations: SocialConversation[] }
export type VerificationStatus = 'unverified' | 'pending' | 'verified' | 'rejected' | 'suspended'
export type VerificationState = { status: VerificationStatus; request: { id: string; status: string; message: string; referenceUrl: string | null; reviewNote: string | null; createdAt: string; reviewedAt: string | null } | null }
export type VerificationReviewRequest = { id: string; userId: string; username: string | null; displayName: string | null; email: string | null; message: string; referenceUrl: string | null; createdAt: string }
export type AdminAccount = { userId: string; username: string | null; displayName: string | null; addedAt: string }
export type AdminCandidate = Pick<AdminAccount, 'userId' | 'username' | 'displayName'>
export type CreateEventInput = { category: string; title: string; description: string; startsAt: string; endsAt: string; venueName: string; venueAddress: string; latitude: number; longitude: number; ticketTiers: Array<{ name: string; description: string; priceCents: number }> }
export type EventAttendee = { id: string; displayName: string; username: string | null; avatarUrl: string | null }

const apiBaseUrl = (import.meta.env.VITE_API_URL as string | undefined)?.replace(/\/$/, '') ?? ''
const apiPath = (path: string) => apiBaseUrl ? `${apiBaseUrl}${path}` : `/api${path}`
// Send bookings through the web origin so Safari and privacy-focused browsers
// don't have to make a cross-origin authenticated POST.
const bookingApiPath = (path: string) => import.meta.env.PROD ? `/api${path}` : apiPath(path)
export type AuthTokenProvider = () => Promise<string | null>
const eventsCacheKey = 'wte.events.cache.v1'

export async function getCachedEvents(): Promise<Event[] | null> {
  try {
    const cached = JSON.parse(localStorage.getItem(eventsCacheKey) ?? 'null') as { data?: Event[] } | null
    return Array.isArray(cached?.data) ? cached.data : null
  } catch { return null }
}

async function request<T>(path: string): Promise<T> {
  const response = await fetch(apiPath(path))

  if (!response.ok) {
    throw new Error(`Request failed: ${response.status}`)
  }

  return response.json() as Promise<T>
}

export async function getEvents() {
  const response = await request<EventsResponse>('/events')
  try { localStorage.setItem(eventsCacheKey, JSON.stringify({ savedAt: Date.now(), data: response.data })) } catch { /* storage may be unavailable */ }
  return response
}

export async function getEvent(id: string) {
  return request<EventResponse>(`/events/${encodeURIComponent(id)}`)
}

export function getEventAttendees(getToken: AuthTokenProvider, eventId: string) {
  return authenticatedRequest<{ data: EventAttendee[] }>(getToken, `/events/${encodeURIComponent(eventId)}/attendees`)
}

export async function createBooking(getToken: AuthTokenProvider, input: CreateBookingInput) {
  let tokenTimeout: number | undefined
  const token = await Promise.race([
    getToken(),
    new Promise<string | null>((_, reject) => {
      tokenTimeout = window.setTimeout(() => reject(new Error('Could not prepare your booking session. Please sign in again.')), 10_000)
    }),
  ]).finally(() => { if (tokenTimeout !== undefined) window.clearTimeout(tokenTimeout) })
  if (!token) throw new Error('Authentication required')
  const controller = new AbortController()
  const timeout = window.setTimeout(() => controller.abort(), 15_000)
  let response: Response
  try {
    response = await fetch(bookingApiPath('/bookings'), {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(input),
      signal: controller.signal,
    })
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') throw new Error('Booking confirmation timed out. Please try again.')
    throw error
  } finally {
    window.clearTimeout(timeout)
  }

  if (!response.ok) {
    const body = await response.json().catch(() => null) as { error?: string } | null
    throw new Error(body?.error ?? `Request failed: ${response.status}`)
  }

  return response.json() as Promise<{ data: Booking }>
}

export async function getBookings(getToken: AuthTokenProvider) {
  const token = await getToken()
  if (!token) throw new Error('Authentication required')
  const response = await fetch(apiPath('/bookings'), {
    headers: { Authorization: `Bearer ${token}` },
  })

  if (!response.ok) {
    const body = await response.json().catch(() => null) as { error?: string } | null
    throw new Error(body?.error ?? `Request failed: ${response.status}`)
  }

  return response.json() as Promise<{ data: Booking[] }>
}

export function cancelBooking(getToken: AuthTokenProvider, bookingId: string) {
  return authenticatedRequest<{ removed: boolean }>(getToken, `/bookings/${encodeURIComponent(bookingId)}`, { method: 'DELETE' })
}

export function verifyTicket(getToken: AuthTokenProvider, qrCode: string) {
  return authenticatedRequest<{ data: TicketCheckInResult }>(getToken, '/ticket-checkins', {
    method: 'POST',
    body: JSON.stringify({ qrCode }),
  })
}

async function authenticatedRequest<T>(getToken: AuthTokenProvider, path: string, options: RequestInit = {}) {
  const token = await getToken()
  if (!token) throw new Error('Authentication required')
  const headers = new Headers(options.headers)
  headers.set('Authorization', `Bearer ${token}`)
  if (options.body != null && !headers.has('content-type')) headers.set('content-type', 'application/json')
  const response = await fetch(apiPath(path), {
    ...options,
    headers,
  })
  const body = await response.json().catch(() => null) as { error?: string } | T | null
  if (!response.ok) throw new Error((body as { error?: string } | null)?.error ?? `Request failed: ${response.status}`)
  return body as T
}

export function getProfile(getToken: AuthTokenProvider) {
  return authenticatedRequest<{ profile: UserProfile }>(getToken, '/me/profile')
}

export function updateProfile(getToken: AuthTokenProvider, input: ProfileUpdate) {
  return authenticatedRequest<{ profile: UserProfile }>(getToken, '/me/profile', {
    method: 'PATCH',
    body: JSON.stringify(input),
  })
}

export function updateAccount(getToken: AuthTokenProvider, input: AccountUpdate) {
  return authenticatedRequest<{ user: { id: string; email: string | null } }>(getToken, '/me/account', {
    method: 'PATCH',
    body: JSON.stringify(input),
  })
}

export function uploadProfilePicture(getToken: AuthTokenProvider, data: string, contentType: 'image/jpeg' | 'image/png' | 'image/webp') {
  return authenticatedRequest<{ profile: UserProfile }>(getToken, '/me/profile-picture', {
    method: 'POST',
    body: JSON.stringify({ data, contentType }),
  })
}

export function getSocialOverview(getToken: AuthTokenProvider) {
  return authenticatedRequest<SocialOverview>(getToken, '/social')
}

export function getSocialConversations(getToken: AuthTokenProvider) {
  return authenticatedRequest<{ conversations: SocialConversation[] }>(getToken, '/social/conversations')
}

export function getVerificationStatus(getToken: AuthTokenProvider) {
  return authenticatedRequest<VerificationState>(getToken, '/verification')
}

export function requestAccountVerification(getToken: AuthTokenProvider, input: { message: string; referenceUrl?: string }) {
  return authenticatedRequest<{ id: string; status: 'pending' }>(getToken, '/verification', { method: 'POST', body: JSON.stringify(input) })
}

export function getAdminVerificationRequests(getToken: AuthTokenProvider) {
  return authenticatedRequest<{ requests: VerificationReviewRequest[]; canManageAdmins: boolean }>(getToken, '/admin-verification')
}

export async function downloadBusinessLeadsCsv(getToken: AuthTokenProvider) {
  const token = await getToken()
  if (!token) throw new Error('Authentication required')
  const response = await fetch(apiPath('/admin-business-leads/export.csv'), {
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!response.ok) {
    const body = await response.json().catch(() => null) as { error?: string } | null
    throw new Error(body?.error ?? `Request failed: ${response.status}`)
  }
  const disposition = response.headers.get('Content-Disposition')
  const filename = disposition?.match(/filename="?([^";]+)"?/i)?.[1] ?? 'business-leads.csv'
  return { blob: await response.blob(), filename }
}

export function reviewAccountVerification(getToken: AuthTokenProvider, requestId: string, decision: 'approve' | 'reject', note: string) {
  return authenticatedRequest<{ reviewed: boolean }>(getToken, '/admin-verification', { method: 'PATCH', body: JSON.stringify({ requestId, decision, note }) })
}

export function getAdminAccounts(getToken: AuthTokenProvider) {
  return authenticatedRequest<{ admins: AdminAccount[] }>(getToken, '/admin-users')
}

export function searchAdminCandidates(getToken: AuthTokenProvider, query: string) {
  return authenticatedRequest<{ users: AdminCandidate[] }>(getToken, `/admin-users/search?q=${encodeURIComponent(query)}`)
}

export function addAdminAccount(getToken: AuthTokenProvider, userId: string) {
  return authenticatedRequest<{ added: boolean }>(getToken, '/admin-users', { method: 'POST', body: JSON.stringify({ userId }) })
}

export function removeAdminAccount(getToken: AuthTokenProvider, userId: string) {
  return authenticatedRequest<{ removed: boolean }>(getToken, `/admin-users/${encodeURIComponent(userId)}`, { method: 'DELETE' })
}

export function createEvent(getToken: AuthTokenProvider, input: CreateEventInput) {
  return authenticatedRequest<{ data: Event }>(getToken, '/events', { method: 'POST', body: JSON.stringify(input) })
}

export function searchSocialUsers(getToken: AuthTokenProvider, query: string) {
  return authenticatedRequest<{ users: SocialPerson[] }>(getToken, `/social/users?q=${encodeURIComponent(query)}`)
}

export function sendFriendRequest(getToken: AuthTokenProvider, recipientId: string) {
  return authenticatedRequest<{ sent: boolean }>(getToken, '/social/requests', { method: 'POST', body: JSON.stringify({ recipientId }) })
}

export function respondToFriendRequest(getToken: AuthTokenProvider, id: string, action: 'accept' | 'decline') {
  return authenticatedRequest<{ updated: boolean }>(getToken, `/social/requests/${encodeURIComponent(id)}`, { method: 'PATCH', body: JSON.stringify({ action }) })
}

export function removeFriend(getToken: AuthTokenProvider, friendId: string) {
  return authenticatedRequest<{ removed: boolean }>(getToken, `/social/friends/${encodeURIComponent(friendId)}`, { method: 'DELETE' })
}

export function createDirectConversation(getToken: AuthTokenProvider, friendId: string) {
  return authenticatedRequest<{ id: string }>(getToken, '/social/conversations', { method: 'POST', body: JSON.stringify({ friendId }) })
}

export function getConversationMessages(getToken: AuthTokenProvider, conversationId: string, before?: string) {
  const query = before ? `?before=${encodeURIComponent(before)}` : ''
  return authenticatedRequest<{ messages: SocialMessage[] }>(getToken, `/social/conversations/${encodeURIComponent(conversationId)}/messages${query}`)
}

export function postConversationMessage(getToken: AuthTokenProvider, conversationId: string, body: string) {
  return authenticatedRequest<{ message: SocialMessage }>(getToken, `/social/conversations/${encodeURIComponent(conversationId)}/messages`, { method: 'POST', body: JSON.stringify({ body }) })
}

export function enablePushNotifications(getToken: AuthTokenProvider) {
  return subscribeToPush(getToken)
}

async function subscribeToPush(getToken: AuthTokenProvider) {
  if (!('serviceWorker' in navigator) || !('PushManager' in window) || !('Notification' in window)) throw new Error('Notifications are not supported on this device.')
  const publicKey = import.meta.env.VITE_VAPID_PUBLIC_KEY as string | undefined
  if (!publicKey) throw new Error('Notifications are not configured yet.')
  const permission = Notification.permission === 'default' ? await Notification.requestPermission() : Notification.permission
  if (permission !== 'granted') throw new Error('Notifications are disabled. Enable them in your device settings.')
  const registration = await navigator.serviceWorker.ready
  const existing = await registration.pushManager.getSubscription()
  const subscription = existing ?? await registration.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: decodeVapidKey(publicKey) })
  return authenticatedRequest<{ subscribed: boolean }>(getToken, '/notifications/push-subscription', {
    method: 'POST',
    body: JSON.stringify(subscription.toJSON()),
  })
}

function decodeVapidKey(value: string) {
  const padding = '='.repeat((4 - value.length % 4) % 4)
  const base64 = (value + padding).replace(/-/g, '+').replace(/_/g, '/')
  const raw = window.atob(base64)
  return Uint8Array.from(raw, (character) => character.charCodeAt(0))
}

export type HostDashboardData = {
  events: Array<{ id: string; title: string; startsAt: string; endsAt: string; publicationStatus?: string; reviewNote?: string | null }>
  registrations: Array<{
    id: string; eventId: string; attendeeId: string; displayName: string; username: string | null
    status: 'pending' | 'confirmed' | 'cancelled'; totalCents: number; quantity: number
    createdAt: string; checkedIn: number; ticketNames: string[]
  }>
}

export function getHostDashboard(getToken: AuthTokenProvider) {
  return authenticatedRequest<{ data: HostDashboardData }>(getToken, '/host-dashboard')
}

export type AdminMember = { userId: string; username: string | null; displayName: string | null; verificationStatus: VerificationStatus; isAdmin: boolean; isPrimaryAdmin: boolean }
export type ReviewEvent = { id: string; title: string; description: string; category: string; startsAt: string; endsAt: string; hostName: string; hostUserId: string | null; publicationStatus: 'pending' | 'approved' | 'rejected'; reviewNote: string | null; reviewedAt: string | null; venue: { name: string; address: string }; ticketTiers: Array<{ name: string; priceCents: number }> }
export function getAdminMembers(getToken: AuthTokenProvider, query: string, page: number) {
  return authenticatedRequest<{ users: AdminMember[]; total: number }>(getToken, `/admin-members?q=${encodeURIComponent(query)}&page=${page}`)
}
export function verifyMember(getToken: AuthTokenProvider, userId: string) {
  return authenticatedRequest<{ verified: boolean }>(getToken, '/admin-members', { method: 'PATCH', body: JSON.stringify({ userId }) })
}
export function getReviewEvents(getToken: AuthTokenProvider, status: string, page: number) {
  return authenticatedRequest<{ events: ReviewEvent[]; total: number }>(getToken, `/admin-events?status=${status}&page=${page}`)
}
export function reviewEvent(getToken: AuthTokenProvider, eventId: string, decision: 'approve' | 'reject', note: string) {
  return authenticatedRequest<{ reviewed: boolean }>(getToken, '/admin-events', { method: 'PATCH', body: JSON.stringify({ eventId, decision, note }) })
}
