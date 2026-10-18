import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import type { AccountUpdate, CurrentUser, ProfilePictureUpload, ProfileUpdate, UserProfile } from '../contracts/auth.js'

export interface AuthService {
  getUser(accessToken: string): Promise<CurrentUser | null>
  getProfile?(userId: string): Promise<UserProfile>
  updateProfile?(userId: string, input: ProfileUpdate): Promise<UserProfile>
  updateAccount?(userId: string, input: AccountUpdate, authId?: string): Promise<CurrentUser>
  uploadProfilePicture?(userId: string, input: ProfilePictureUpload): Promise<UserProfile>
}

export class SupabaseAuthService implements AuthService {
  private readonly identityCache = new Map<string, { databaseUserId: string; expiresAt: number }>()
  private readonly identityLookups = new Map<string, Promise<string>>()

  constructor(private readonly client: SupabaseClient) {}

  async getUser(accessToken: string): Promise<CurrentUser | null> {
    let claims
    try {
      const { data, error } = await this.client.auth.getClaims(accessToken)
      if (error) return null
      claims = data?.claims
    } catch {
      return null
    }
    if (!claims || typeof claims.sub !== 'string' || typeof claims.exp !== 'number' || claims.exp * 1000 <= Date.now()) return null

    const appDatabaseUserId = typeof claims.app_metadata === 'object' && claims.app_metadata && typeof claims.app_metadata.database_user_id === 'string'
      ? claims.app_metadata.database_user_id : null
    const databaseUserId = appDatabaseUserId ?? await this.resolveDatabaseUserId(claims.sub)

    return {
      id: databaseUserId,
      authId: claims.sub,
      email: typeof claims.email === 'string' ? claims.email : null,
    }
  }

  private async resolveDatabaseUserId(authUserId: string) {
    const cached = this.identityCache.get(authUserId)
    if (cached && cached.expiresAt > Date.now()) return cached.databaseUserId
    if (cached) this.identityCache.delete(authUserId)
    const inFlight = this.identityLookups.get(authUserId)
    if (inFlight) return inFlight

    const lookup = (async () => {
      let databaseUserId = authUserId
      try {
        const { data, error } = await this.client.from('auth_user_identities').select('database_user_id')
          .eq('auth_user_id', authUserId).maybeSingle()
        if (!error && data?.database_user_id) databaseUserId = data.database_user_id
      } catch {
        // The signed Auth UUID remains a safe fallback when identity lookup is temporarily unavailable.
      }
      if (this.identityCache.size >= 1000) this.identityCache.clear()
      this.identityCache.set(authUserId, { databaseUserId, expiresAt: Date.now() + 5 * 60_000 })
      return databaseUserId
    })().finally(() => this.identityLookups.delete(authUserId))
    this.identityLookups.set(authUserId, lookup)
    return lookup
  }

  async getProfile(userId: string): Promise<UserProfile> {
    const { data, error } = await this.client
      .from('profiles')
      .select('id, username, display_name, avatar_url')
      .eq('id', userId)
      .maybeSingle()

    if (error) throw error
    return {
      id: userId,
      username: data?.username ?? null,
      displayName: data?.display_name ?? null,
      avatarUrl: data?.avatar_url ?? null,
    }
  }

  async updateProfile(userId: string, input: ProfileUpdate): Promise<UserProfile> {
    const { data, error } = await this.client
      .from('profiles')
      .upsert({
        id: userId,
        ...(input.username !== undefined ? { username: input.username } : {}),
        ...(input.displayName !== undefined ? { display_name: input.displayName } : {}),
        ...(input.avatarUrl !== undefined ? { avatar_url: input.avatarUrl } : {}),
        updated_at: new Date().toISOString(),
      })
      .select('id, username, display_name, avatar_url')
      .single()

    if (error) throw error
    return {
      id: data.id,
      username: data.username ?? null,
      displayName: data.display_name ?? null,
      avatarUrl: data.avatar_url ?? null,
    }
  }

  async updateAccount(userId: string, input: AccountUpdate, authId = userId): Promise<CurrentUser> {
    const { data, error } = await this.client.auth.admin.updateUserById(authId, {
      ...(input.email ? { email: input.email } : {}),
      ...(input.password ? { password: input.password } : {}),
    })

    if (error || !data.user) throw error ?? new Error('Could not update account')
    return { id: data.user.id, email: data.user.email ?? null }
  }

  async uploadProfilePicture(userId: string, input: ProfilePictureUpload): Promise<UserProfile> {
    const extension = input.contentType.split('/')[1]
    const path = `${userId}/${crypto.randomUUID()}.${extension}`
    const { error } = await this.client.storage.from('profile-pictures').upload(
      path,
      Buffer.from(input.data, 'base64'),
      { contentType: input.contentType, upsert: false },
    )
    if (error) throw error

    const { data } = this.client.storage.from('profile-pictures').getPublicUrl(path)
    return this.updateProfile(userId, { avatarUrl: data.publicUrl })
  }
}

export function createAuthService(): AuthService | null {
  const url = process.env.SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !serviceRoleKey) return null

  return new SupabaseAuthService(createClient(url, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
      detectSessionInUrl: false,
    },
  }))
}
