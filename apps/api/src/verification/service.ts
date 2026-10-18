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
      ? await this.database.from('auth_user_identities').select('database_user_id, email').in('database_user_id', userIds)
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

  async isAdmin(authUserId: string) {
    const { data, error } = await this.database.from('app_admins').select('clerk_user_id')
      .eq('clerk_user_id', authUserId).maybeSingle()
    if (error) throw error
    if (data) return true
    const databaseUserId = await this.databaseUserIdForAuthUser(authUserId)
    if (!databaseUserId) return false
    const legacyIds = await this.legacyAuthIdsForDatabaseUser(databaseUserId)
    if (!legacyIds.length) return false
    const legacyAdmin = await this.database.from('app_admins').select('clerk_user_id')
      .in('clerk_user_id', legacyIds).limit(1).maybeSingle()
    if (legacyAdmin.error) throw legacyAdmin.error
    return Boolean(legacyAdmin.data)
  }

  async isPrimaryAdmin(authUserId: string, configuredIds: string[]) {
    if (configuredIds.includes(authUserId)) return true
    const databaseUserId = await this.databaseUserIdForAuthUser(authUserId)
    if (!databaseUserId) return false
    const legacyIds = await this.legacyAuthIdsForDatabaseUser(databaseUserId)
    return legacyIds.some((id) => configuredIds.includes(id))
  }

  private async databaseUserIdForAuthUser(authUserId: string) {
    if (!/^[0-9a-f-]{36}$/i.test(authUserId)) return null
    const { data, error } = await this.database.from('auth_user_identities').select('database_user_id')
      .eq('auth_user_id', authUserId).maybeSingle()
    if (error) throw error
    return data?.database_user_id ?? authUserId
  }

  private async legacyAuthIdsForDatabaseUser(databaseUserId: string) {
    const { data, error } = await this.database.from('user_identities').select('clerk_user_id')
      .eq('database_user_id', databaseUserId)
    if (error) throw error
    return (data ?? []).map((identity) => identity.clerk_user_id)
  }

  async listAdmins(): Promise<AdminAccount[]> {
    const { data, error } = await this.database.from('app_admins')
      .select('clerk_user_id, created_at').order('created_at', { ascending: true })
    if (error) throw error
    const authIds = (data ?? []).map((row) => row.clerk_user_id)
    if (!authIds.length) return []
    const uuidIds = authIds.filter((id) => /^[0-9a-f-]{36}$/i.test(id))
    const { data: identities, error: identityError } = uuidIds.length
      ? await this.database.from('auth_user_identities').select('auth_user_id, database_user_id').in('auth_user_id', uuidIds)
      : { data: [], error: null }
    if (identityError) throw identityError
    const { data: legacyIdentities, error: legacyError } = await this.database.from('user_identities')
      .select('clerk_user_id, database_user_id').in('clerk_user_id', authIds)
    if (legacyError) throw legacyError
    const databaseIdByAuthId = new Map<string, string>([
      ...(identities ?? []).map((identity) => [identity.auth_user_id, identity.database_user_id] as [string, string]),
      ...(legacyIdentities ?? []).map((identity) => [identity.clerk_user_id, identity.database_user_id] as [string, string]),
    ])
    for (const id of authIds) if (!databaseIdByAuthId.has(id)) databaseIdByAuthId.set(id, id)
    const databaseIds = [...new Set(databaseIdByAuthId.values())]
    const { data: profiles, error: profileError } = databaseIds.length
      ? await this.database.from('profiles').select('id, username, display_name').in('id', databaseIds)
      : { data: [], error: null }
    if (profileError) throw profileError
    const profileById = new Map((profiles ?? []).map((profile) => [profile.id, profile]))
    return (data ?? []).flatMap((row) => {
      const databaseUserId = databaseIdByAuthId.get(row.clerk_user_id)
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
    return (profiles ?? []).map((profile) => ({
      userId: profile.id,
      username: profile.username,
      displayName: profile.display_name,
    }))
  }

  async grantAdmin(databaseUserId: string, actorId: string) {
    const { data: identity, error: identityError } = await this.database.from('auth_user_identities')
      .select('auth_user_id').eq('database_user_id', databaseUserId).maybeSingle()
    if (identityError) throw identityError
    const authUserId = identity?.auth_user_id ?? (/^[0-9a-f-]{36}$/i.test(databaseUserId) ? databaseUserId : null)
    if (!authUserId) throw new VerificationError('User must be linked to a Supabase Auth account before admin access can be granted.', 409)
    const { error } = await this.database.from('app_admins').upsert({ clerk_user_id: authUserId, added_by: actorId }, { onConflict: 'clerk_user_id', ignoreDuplicates: true })
    if (error) throw error
    return { added: true }
  }

  async revokeAdmin(databaseUserId: string) {
    const { data: identity, error: identityError } = await this.database.from('auth_user_identities')
      .select('auth_user_id').eq('database_user_id', databaseUserId).maybeSingle()
    if (identityError) throw identityError
    const authUserId = identity?.auth_user_id ?? (/^[0-9a-f-]{36}$/i.test(databaseUserId) ? databaseUserId : null)
    if (!authUserId) throw new VerificationError('User must be linked to a Supabase Auth account before admin access can be changed.', 409)
    const { error } = await this.database.from('app_admins').delete().eq('clerk_user_id', authUserId)
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
