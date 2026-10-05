import type { AccountUpdate, ProfileUpdate, UserProfile } from './contracts/auth'
import type { Booking, CreateBookingInput } from './contracts/bookings'
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
export type CreateEventInput = { category: string; title: string; description: string; startsAt: string; endsAt: string; venueName: string; venueAddress: string; ticketTiers: Array<{ name: string; description: string; priceCents: number }> }

const apiBaseUrl = (import.meta.env.VITE_API_URL as string | undefined)?.replace(/\/$/, '') ?? ''
const apiPath = (path: string) => apiBaseUrl ? `${apiBaseUrl}${path}` : `/api${path}`
export type AuthTokenProvider = () => Promise<string | null>

async function request<T>(path: string): Promise<T> {
  const response = await fetch(apiPath(path))

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

export async function createBooking(getToken: AuthTokenProvider, input: CreateBookingInput) {
  const token = await getToken()
  if (!token) throw new Error('Authentication required')
  const response = await fetch(apiPath('/bookings'), {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(input),
  })

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

async function authenticatedRequest<T>(getToken: AuthTokenProvider, path: string, options: RequestInit = {}) {
  const token = await getToken()
  if (!token) throw new Error('Authentication required')
  const response = await fetch(apiPath(path), {
    ...options,
    headers: {
      'content-type': 'application/json',
      Authorization: `Bearer ${token}`,
      ...options.headers,
    },
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
