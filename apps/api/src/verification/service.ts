import { createClient, type SupabaseClient } from '@supabase/supabase-js'

export type VerificationStatus = 'unverified' | 'pending' | 'verified' | 'rejected' | 'suspended'
export type VerificationDecision = 'approve' | 'reject'

export type VerificationRequest = {
  id: string
  userId: string
  username: string | null
  displayName: string | null
  email: string | null
  message: string
  referenceUrl: string | null
  createdAt: string
}

export type AdminAccount = {
  userId: string
  username: string | null
  displayName: string | null
  addedAt: string
}

export type AdminCandidate = Omit<AdminAccount, 'addedAt'>

export class VerificationError extends Error {
  constructor(message: string, readonly statusCode: number) {
    super(message)
  }
}

export class AccountVerificationService {
  constructor(private readonly database: SupabaseClient) {}

  async status(userId: string) {
    const { data: profile, error: profileError } = await this.database.from('profiles')
      .select('verification_status').eq('id', userId).maybeSingle()
    if (profileError) throw profileError
    const { data: request, error } = await this.database.from('account_verification_requests')
      .select('id, status, message, reference_url, review_note, created_at, reviewed_at')
      .eq('user_id', userId).order('created_at', { ascending: false }).limit(1).maybeSingle()
    if (error) throw error
    return {
      status: (profile?.verification_status ?? 'unverified') as VerificationStatus,
      request: request ? {
        id: request.id,
        status: request.status,
        message: request.message,
        referenceUrl: request.reference_url,
        reviewNote: request.review_note,
        createdAt: request.created_at,
        reviewedAt: request.reviewed_at,
      } : null,
    }
  }

  async submit(userId: string, input: { message: string; referenceUrl: string | null }) {
    const current = await this.status(userId)
    if (current.status === 'verified') throw new VerificationError('This account is already verified.', 409)
    if (current.status === 'pending') throw new VerificationError('Your verification request is already under review.', 409)
    const { data, error } = await this.database.rpc('submit_account_verification', {
      p_user_id: userId,
      p_message: input.message,
      p_reference_url: input.referenceUrl,
    })
    if (error?.code === '23505' || error?.code === 'P0001') throw new VerificationError('A verification request is already under review.', 409)
    if (error) throw error
    return { id: data as string, status: 'pending' as const }
  }

  async pendingRequests(): Promise<VerificationRequest[]> {
    const { data, error } = await this.database.from('account_verification_requests')
      .select('id, user_id, message, reference_url, created_at, profile:profiles(username, display_name)')
      .eq('status', 'pending').order('created_at', { ascending: true })
    if (error) throw error
    const userIds = (data ?? []).map((row) => row.user_id)
    const { data: identities, error: identityError } = userIds.length
      ? await this.database.from('user_identities').select('database_user_id, email').in('database_user_id', userIds)
      : { data: [], error: null }
    if (identityError) throw identityError
    const emailByUserId = new Map((identities ?? []).map((identity) => [identity.database_user_id, identity.email]))
    return (data ?? []).map((row) => {
      const profile = Array.isArray(row.profile) ? row.profile[0] : row.profile
      return {
        id: row.id,
        userId: row.user_id,
        username: profile?.username ?? null,
        displayName: profile?.display_name ?? null,
        email: emailByUserId.get(row.user_id) ?? null,
        message: row.message,
        referenceUrl: row.reference_url,
        createdAt: row.created_at,
      }
    })
  }

  async review(requestId: string, reviewerId: string, decision: VerificationDecision, note: string | null) {
    const { error } = await this.database.rpc('review_account_verification', {
      p_request_id: requestId,
      p_reviewer_id: reviewerId,
      p_approved: decision === 'approve',
      p_review_note: note,
    })
    if (error?.code === 'P0001' || error?.code === '02000') throw new VerificationError('This request is no longer pending.', 409)
    if (error) throw error
    return { reviewed: true }
  }

  async isVerified(userId: string) {
    const { data, error } = await this.database.from('profiles').select('verification_status').eq('id', userId).maybeSingle()
    if (error) throw error
    return data?.verification_status === 'verified'
  }

  async isAdmin(clerkUserId: string) {
    const { data, error } = await this.database.from('app_admins').select('clerk_user_id')
      .eq('clerk_user_id', clerkUserId).maybeSingle()
    if (error) throw error
    return Boolean(data)
  }

  async listAdmins(): Promise<AdminAccount[]> {
    const { data, error } = await this.database.from('app_admins')
      .select('clerk_user_id, created_at').order('created_at', { ascending: true })
    if (error) throw error
    const clerkIds = (data ?? []).map((row) => row.clerk_user_id)
    if (!clerkIds.length) return []
    const { data: identities, error: identityError } = await this.database.from('user_identities')
      .select('clerk_user_id, database_user_id').in('clerk_user_id', clerkIds)
    if (identityError) throw identityError
    const databaseIds = (identities ?? []).map((identity) => identity.database_user_id)
    const { data: profiles, error: profileError } = databaseIds.length
      ? await this.database.from('profiles').select('id, username, display_name').in('id', databaseIds)
      : { data: [], error: null }
    if (profileError) throw profileError
    const profileById = new Map((profiles ?? []).map((profile) => [profile.id, profile]))
    const databaseIdByClerkId = new Map((identities ?? []).map((identity) => [identity.clerk_user_id, identity.database_user_id]))
    return (data ?? []).flatMap((row) => {
      const databaseUserId = databaseIdByClerkId.get(row.clerk_user_id)
      if (!databaseUserId) return []
      const profile = profileById.get(databaseUserId)
      return {
        userId: databaseUserId,
        username: profile?.username ?? null,
        displayName: profile?.display_name ?? null,
        addedAt: row.created_at,
      } satisfies AdminAccount
    })
  }

  async searchAdminCandidates(query: string): Promise<AdminCandidate[]> {
    const term = query.trim().replace(/[^\p{L}\p{N}_\s-]/gu, '').slice(0, 50)
    if (term.length < 2) return []
    const pattern = `%${term}%`
    const { data: profiles, error } = await this.database.from('profiles')
      .select('id, username, display_name')
      .or(`username.ilike.${pattern},display_name.ilike.${pattern}`)
      .limit(20)
    if (error) throw error
    const databaseIds = (profiles ?? []).map((profile) => profile.id)
    if (!databaseIds.length) return []
    const { data: identities, error: identityError } = await this.database.from('user_identities')
      .select('database_user_id').in('database_user_id', databaseIds)
    if (identityError) throw identityError
    const activeIds = new Set((identities ?? []).map((identity) => identity.database_user_id))
    return (profiles ?? []).filter((profile) => activeIds.has(profile.id)).map((profile) => ({
      userId: profile.id,
      username: profile.username,
      displayName: profile.display_name,
    }))
  }

  async grantAdmin(databaseUserId: string, actorId: string) {
    const { data: identity, error: identityError } = await this.database.from('user_identities')
      .select('clerk_user_id').eq('database_user_id', databaseUserId).maybeSingle()
    if (identityError) throw identityError
    if (!identity) throw new VerificationError('User not found.', 404)
    const { error } = await this.database.from('app_admins').upsert({ clerk_user_id: identity.clerk_user_id, added_by: actorId }, { onConflict: 'clerk_user_id', ignoreDuplicates: true })
    if (error) throw error
    return { added: true }
  }

  async revokeAdmin(databaseUserId: string) {
    const { data: identity, error: identityError } = await this.database.from('user_identities')
      .select('clerk_user_id').eq('database_user_id', databaseUserId).maybeSingle()
    if (identityError) throw identityError
    if (!identity) throw new VerificationError('User not found.', 404)
    const { error } = await this.database.from('app_admins').delete().eq('clerk_user_id', identity.clerk_user_id)
    if (error) throw error
    return { removed: true }
  }
}

export function createAccountVerificationService() {
  const url = process.env.SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !serviceRoleKey) return null
  return new AccountVerificationService(createClient(url, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false },
  }))
}
