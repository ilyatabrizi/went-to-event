import { createClient, type SupabaseClient } from '@supabase/supabase-js'

export type SocialProfile = {
  id: string
  username: string | null
  displayName: string | null
  avatarUrl: string | null
}

export type SocialPerson = {
  id: string
  username: string | null
  displayName: string
  avatarUrl: string | null
}

export type SocialRequest = {
  id: string
  person: SocialPerson
  createdAt: string
}

export type SocialMessage = {
  id: string
  conversationId: string
  senderId: string
  body: string
  createdAt: string
}

export type SocialConversation = {
  id: string
  person: SocialPerson
  lastMessage: SocialMessage | null
  updatedAt: string
}

export class SocialError extends Error {
  constructor(message: string, readonly statusCode: number) {
    super(message)
  }
}

export class SocialService {
  constructor(private readonly database: SupabaseClient) {}

  async overview(userId: string) {
    const [incomingResult, outgoingResult, acceptedFromResult, acceptedToResult] = await Promise.all([
      this.database.from('friend_requests').select('id, sender_id, created_at').eq('recipient_id', userId).eq('status', 'pending').order('created_at', { ascending: false }),
      this.database.from('friend_requests').select('id, recipient_id, created_at').eq('sender_id', userId).eq('status', 'pending').order('created_at', { ascending: false }),
      this.database.from('friend_requests').select('sender_id').eq('recipient_id', userId).eq('status', 'accepted'),
      this.database.from('friend_requests').select('recipient_id').eq('sender_id', userId).eq('status', 'accepted'),
    ])
    const results = [incomingResult, outgoingResult, acceptedFromResult, acceptedToResult]
    const failed = results.find((result) => result.error)
    if (failed?.error) throw failed.error

    const friends = [...(acceptedFromResult.data ?? []).map((row) => row.sender_id), ...(acceptedToResult.data ?? []).map((row) => row.recipient_id)]
    const people = await this.peopleById([
      ...(incomingResult.data ?? []).map((row) => row.sender_id),
      ...(outgoingResult.data ?? []).map((row) => row.recipient_id),
      ...friends,
    ])
    const requests = (rows: { id: string; created_at: string; sender_id?: string; recipient_id?: string }[], key: 'sender_id' | 'recipient_id'): SocialRequest[] => rows.map((row) => ({
      id: row.id,
      person: people.get(row[key]!) ?? this.personFallback(row[key]!),
      createdAt: row.created_at,
    }))

    return {
      friends: friends.map((id) => people.get(id) ?? this.personFallback(id)),
      incomingRequests: requests(incomingResult.data ?? [], 'sender_id'),
      outgoingRequests: requests(outgoingResult.data ?? [], 'recipient_id'),
      conversations: await this.listConversations(userId),
    }
  }

  async searchUsers(userId: string, query: string): Promise<SocialPerson[]> {
    const term = query.trim().replace(/[,%*()]/g, '').slice(0, 50)
    if (term.length < 2) return []
    const pattern = `%${term}%`
    const { data: matchingProfiles, error: matchingError } = await this.database.from('profiles')
      .select('id, username, display_name, avatar_url')
      .neq('id', userId)
      .or(`username.ilike.${pattern},display_name.ilike.${pattern}`)
      .limit(100)
    if (matchingError) throw matchingError
    const profiles = new Map((matchingProfiles ?? []).map((profile) => [profile.id, profile]))
    const { data: candidates, error } = await this.database.from('profiles')
      .select('id, username, display_name, avatar_url')
      .neq('id', userId)
      .limit(1000)
    if (error) throw error
    const rank = (profile: { username: string | null; display_name: string | null }) => Math.min(
      ...[profile.username, profile.display_name].filter((value): value is string => Boolean(value))
        .map((value) => nameMatchScore(value, term)),
    )
    for (const profile of candidates ?? []) {
      if (rank(profile) <= Math.max(2, Math.floor(term.length * 0.4))) profiles.set(profile.id, profile)
    }
    const data = [...profiles.values()].sort((left, right) => rank(left) - rank(right)).slice(0, 20)
    const ids = data.map((profile) => profile.id)
    if (!ids.length) return []
    const { data: identities, error: identityError } = await this.database.from('user_identities').select('database_user_id').in('database_user_id', ids)
    if (identityError) throw identityError
    const activeIds = new Set((identities ?? []).map((identity) => identity.database_user_id))
    return (data ?? []).filter((profile) => activeIds.has(profile.id)).map((profile) => this.personFromProfile(profile))
  }

  async sendRequest(senderId: string, recipientId: string) {
    if (!recipientId || recipientId === senderId) throw new SocialError('Choose another user.', 400)
    const target = await this.profileById(recipientId)
    if (!target) throw new SocialError('User not found.', 404)
    if (await this.areFriends(senderId, recipientId)) throw new SocialError('You are already friends.', 409)

    const [outgoing, incoming] = await Promise.all([
      this.database.from('friend_requests').select('id').eq('sender_id', senderId).eq('recipient_id', recipientId).eq('status', 'pending').maybeSingle(),
      this.database.from('friend_requests').select('id').eq('sender_id', recipientId).eq('recipient_id', senderId).eq('status', 'pending').maybeSingle(),
    ])
    if (outgoing.error) throw outgoing.error
    if (incoming.error) throw incoming.error
    if (incoming.data) throw new SocialError('This person already sent you a request.', 409)
    if (outgoing.data) throw new SocialError('Friend request already sent.', 409)

    const { error } = await this.database.from('friend_requests').insert({ sender_id: senderId, recipient_id: recipientId })
    if (error?.code === '23505') throw new SocialError('A friend request is already pending.', 409)
    if (error) throw error
    return { sent: true }
  }

  async respondToRequest(userId: string, requestId: string, action: 'accept' | 'decline') {
    const { data: request, error: lookupError } = await this.database.from('friend_requests')
      .select('id, sender_id, recipient_id, status').eq('id', requestId).maybeSingle()
    if (lookupError) throw lookupError
    if (!request || request.recipient_id !== userId || request.status !== 'pending') throw new SocialError('Friend request not found.', 404)
    const { error } = await this.database.from('friend_requests')
      .update({ status: action === 'accept' ? 'accepted' : 'declined', updated_at: new Date().toISOString() })
      .eq('id', requestId)
    if (error?.code === '23505') throw new SocialError('You are already friends.', 409)
    if (error) throw error
    return { updated: true }
  }

  async createConversation(userId: string, friendId: string) {
    if (!await this.areFriends(userId, friendId)) throw new SocialError('You can only message accepted friends.', 403)
    const directKey = [userId, friendId].sort().join(':')
    let { data: conversation, error } = await this.database.from('conversations')
      .select('id').eq('direct_key', directKey).maybeSingle()
    if (error) throw error
    if (!conversation) {
      const inserted = await this.database.from('conversations').insert({ direct_key: directKey }).select('id').single()
      if (inserted.error?.code === '23505') {
        const existing = await this.database.from('conversations').select('id').eq('direct_key', directKey).single()
        conversation = existing.data
        error = existing.error
      } else {
        conversation = inserted.data
        error = inserted.error
      }
    }
    if (error || !conversation) throw error ?? new Error('Could not create conversation')
    const { error: membersError } = await this.database.from('conversation_members').upsert([
      { conversation_id: conversation.id, user_id: userId },
      { conversation_id: conversation.id, user_id: friendId },
    ], { onConflict: 'conversation_id,user_id', ignoreDuplicates: true })
    if (membersError) throw membersError
    return { id: conversation.id }
  }

  async listMessages(userId: string, conversationId: string, before?: string) {
    await this.requireMembership(userId, conversationId)
    let query = this.database.from('messages').select('id, conversation_id, sender_id, body, created_at')
      .eq('conversation_id', conversationId).order('created_at', { ascending: false }).limit(50)
    if (before) query = query.lt('created_at', before)
    const { data, error } = await query
    if (error) throw error
    const { error: readError } = await this.database.from('conversation_members')
      .update({ last_read_at: new Date().toISOString() }).eq('conversation_id', conversationId).eq('user_id', userId)
    if (readError) throw readError
    return { messages: (data ?? []).reverse().map((row) => this.messageFromRow(row)) }
  }

  async sendMessage(userId: string, conversationId: string, body: string) {
    const text = body.trim()
    if (!text || text.length > 4000) throw new SocialError('Messages must be between 1 and 4,000 characters.', 400)
    await this.requireMembership(userId, conversationId)
    const { data, error } = await this.database.from('messages')
      .insert({ conversation_id: conversationId, sender_id: userId, body: text })
      .select('id, conversation_id, sender_id, body, created_at').single()
    if (error) throw error
    const sentAt = data.created_at
    const [conversationResult, memberResult] = await Promise.all([
      this.database.from('conversations').update({ updated_at: sentAt }).eq('id', conversationId),
      this.database.from('conversation_members').update({ last_read_at: sentAt }).eq('conversation_id', conversationId).eq('user_id', userId),
    ])
    if (conversationResult.error) throw conversationResult.error
    if (memberResult.error) throw memberResult.error
    return { message: this.messageFromRow(data) }
  }

  private async listConversations(userId: string): Promise<SocialConversation[]> {
    const { data: memberships, error } = await this.database.from('conversation_members')
      .select('conversation_id').eq('user_id', userId)
    if (error) throw error
    const conversationIds = (memberships ?? []).map((membership) => membership.conversation_id)
    if (!conversationIds.length) return []
    const { data: conversations, error: conversationsError } = await this.database.from('conversations')
      .select('id, updated_at').in('id', conversationIds).order('updated_at', { ascending: false })
    if (conversationsError) throw conversationsError
    const { data: otherMembers, error: membersError } = await this.database.from('conversation_members')
      .select('conversation_id, user_id').in('conversation_id', conversationIds).neq('user_id', userId)
    if (membersError) throw membersError
    const people = await this.peopleById((otherMembers ?? []).map((member) => member.user_id))
    return Promise.all((conversations ?? []).map(async (conversation) => {
      const { data: lastMessages, error: messageError } = await this.database.from('messages')
        .select('id, conversation_id, sender_id, body, created_at').eq('conversation_id', conversation.id)
        .order('created_at', { ascending: false }).limit(1)
      if (messageError) throw messageError
      const member = (otherMembers ?? []).find((candidate) => candidate.conversation_id === conversation.id)
      return {
        id: conversation.id,
        person: member ? people.get(member.user_id) ?? this.personFallback(member.user_id) : this.personFallback(''),
        lastMessage: lastMessages?.[0] ? this.messageFromRow(lastMessages[0]) : null,
        updatedAt: conversation.updated_at,
      }
    }))
  }

  private async areFriends(firstId: string, secondId: string) {
    const [left, right] = await Promise.all([
      this.database.from('friend_requests').select('id').eq('sender_id', firstId).eq('recipient_id', secondId).eq('status', 'accepted').maybeSingle(),
      this.database.from('friend_requests').select('id').eq('sender_id', secondId).eq('recipient_id', firstId).eq('status', 'accepted').maybeSingle(),
    ])
    if (left.error) throw left.error
    if (right.error) throw right.error
    return Boolean(left.data || right.data)
  }

  private async requireMembership(userId: string, conversationId: string) {
    const { data, error } = await this.database.from('conversation_members').select('conversation_id')
      .eq('conversation_id', conversationId).eq('user_id', userId).maybeSingle()
    if (error) throw error
    if (!data) throw new SocialError('Conversation not found.', 404)
  }

  private async peopleById(ids: string[]) {
    const uniqueIds = [...new Set(ids)]
    const profiles = new Map<string, SocialPerson>()
    if (!uniqueIds.length) return profiles
    const { data, error } = await this.database.from('profiles').select('id, username, display_name, avatar_url').in('id', uniqueIds)
    if (error) throw error
    for (const row of data ?? []) profiles.set(row.id, this.personFromProfile(row))
    return profiles
  }

  private async profileById(userId: string) {
    const { data, error } = await this.database.from('profiles').select('id, username, display_name, avatar_url').eq('id', userId).maybeSingle()
    if (error) throw error
    if (data) return this.personFromProfile(data)
    const { data: identity, error: identityError } = await this.database.from('user_identities').select('database_user_id').eq('database_user_id', userId).maybeSingle()
    if (identityError) throw identityError
    return identity ? this.personFallback(userId) : null
  }

  private personFromProfile(profile: { id: string; username: string | null; display_name: string | null; avatar_url: string | null }): SocialPerson {
    return { id: profile.id, username: profile.username, displayName: profile.display_name || profile.username || 'Went To Event member', avatarUrl: profile.avatar_url }
  }

  private personFallback(id: string): SocialPerson {
    return { id, username: null, displayName: 'Went To Event member', avatarUrl: null }
  }

  private messageFromRow(row: { id: string; conversation_id: string; sender_id: string; body: string; created_at: string }): SocialMessage {
    return { id: row.id, conversationId: row.conversation_id, senderId: row.sender_id, body: row.body, createdAt: row.created_at }
  }
}

function nameMatchScore(value: string, query: string) {
  const normalizedValue = value.toLocaleLowerCase().trim()
  const normalizedQuery = query.toLocaleLowerCase().trim()
  if (normalizedValue === normalizedQuery) return 0
  if (normalizedValue.startsWith(normalizedQuery)) return 0.25
  if (normalizedValue.includes(normalizedQuery)) return 0.5
  const distance = (left: string, right: string) => {
    let previous = Array.from({ length: right.length + 1 }, (_, index) => index)
    for (let row = 1; row <= left.length; row++) {
      const current = [row]
      for (let column = 1; column <= right.length; column++) {
        current[column] = Math.min(
          current[column - 1] + 1,
          previous[column] + 1,
          previous[column - 1] + (left[row - 1] === right[column - 1] ? 0 : 1),
        )
      }
      previous = current
    }
    return previous[right.length]
  }
  const words = normalizedValue.split(/\s+/)
  return Math.min(distance(normalizedValue, normalizedQuery), ...words.map((word) => distance(word, normalizedQuery)))
}

export function createSocialService() {
  const url = process.env.SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !serviceRoleKey) return null
  return new SocialService(createClient(url, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false },
  }))
}
