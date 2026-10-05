import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { createClerkClient, verifyToken } from '@clerk/backend'
import type { AccountUpdate, CurrentUser, ProfilePictureUpload, ProfileUpdate, UserProfile } from '../contracts/auth.js'

export interface AuthService {
  getUser(accessToken: string): Promise<CurrentUser | null>
  getProfile?(userId: string): Promise<UserProfile>
  updateProfile?(userId: string, input: ProfileUpdate): Promise<UserProfile>
  updateAccount?(userId: string, input: AccountUpdate): Promise<CurrentUser>
  uploadProfilePicture?(userId: string, input: ProfilePictureUpload): Promise<UserProfile>
}

export class SupabaseAuthService implements AuthService {
  constructor(private readonly client: SupabaseClient) {}

  async getUser(accessToken: string): Promise<CurrentUser | null> {
    const { data, error } = await this.client.auth.getUser(accessToken)

    if (error || !data.user) return null

    return {
      id: data.user.id,
      email: data.user.email ?? null,
    }
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

  async updateAccount(userId: string, input: AccountUpdate): Promise<CurrentUser> {
    const { data, error } = await this.client.auth.admin.updateUserById(userId, {
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

export class ClerkAuthService implements AuthService {
  private readonly clerk

  constructor(private readonly database: SupabaseClient, secretKey: string) {
    this.clerk = createClerkClient({ secretKey })
  }

  async getUser(accessToken: string): Promise<CurrentUser | null> {
    let verified: Awaited<ReturnType<typeof verifyToken>>
    try {
      verified = await verifyToken(accessToken, {
        secretKey: process.env.CLERK_SECRET_KEY,
        authorizedParties: (process.env.CLERK_AUTHORIZED_PARTIES ?? 'http://localhost:5173,http://127.0.0.1:5173,https://wenttoevent.com,https://www.wenttoevent.com').split(',').map((value) => value.trim()),
      })
    } catch {
      return null
    }

    if (!verified.sub) return null
    const clerkUser = await this.clerk.users.getUser(verified.sub)
    const email = clerkUser.primaryEmailAddress?.emailAddress ?? clerkUser.emailAddresses[0]?.emailAddress ?? null
    const displayName = [clerkUser.firstName, clerkUser.lastName].filter(Boolean).join(' ') || clerkUser.username || null
    const signupUsername = typeof clerkUser.unsafeMetadata?.username === 'string'
      ? clerkUser.unsafeMetadata.username.toLowerCase()
      : null

    const { data: existing } = await this.database
      .from('user_identities')
      .select('database_user_id, email')
      .eq('clerk_user_id', verified.sub)
      .maybeSingle()

    if (existing) {
      await this.ensureProfile(existing.database_user_id, displayName, signupUsername)
      return { id: existing.database_user_id, authId: verified.sub, email: email ?? existing.email ?? null }
    }

    let databaseUserId = verified.sub
    let legacySupabaseUserId: string | null = null
    if (email) {
      const legacy = await this.findLegacyUser(email)
      if (legacy) {
        databaseUserId = legacy.id
        legacySupabaseUserId = legacy.id
      }
    }

    await this.database.from('user_identities').upsert({
      clerk_user_id: verified.sub,
      database_user_id: databaseUserId,
      legacy_supabase_user_id: legacySupabaseUserId,
      email,
    }, { onConflict: 'clerk_user_id' })

    await this.ensureProfile(databaseUserId, displayName, signupUsername)

    return { id: databaseUserId, authId: verified.sub, email }
  }

  private async ensureProfile(userId: string, displayName: string | null, signupUsername: string | null) {
    const { error } = await this.database.from('profiles').upsert(
      { id: userId, ...(displayName ? { display_name: displayName } : {}) },
      { onConflict: 'id', ignoreDuplicates: true },
    )
    if (error) throw error
    if (signupUsername && /^[a-z0-9_]{3,24}$/.test(signupUsername)) {
      const { error: usernameError } = await this.database.from('profiles').update({ username: signupUsername })
        .eq('id', userId).is('username', null)
      if (usernameError && usernameError.code !== '23505') throw usernameError
    }
  }

  private async findLegacyUser(email: string) {
    const result = await this.database.auth.admin.listUsers({ page: 1, perPage: 100 })
    return result.data.users.find((user) => user.email?.toLowerCase() === email.toLowerCase()) ?? null
  }

  async getProfile(userId: string) { return new SupabaseAuthService(this.database).getProfile(userId) }
  async updateProfile(userId: string, input: ProfileUpdate) { return new SupabaseAuthService(this.database).updateProfile(userId, input) }
  async uploadProfilePicture(userId: string, input: ProfilePictureUpload) { return new SupabaseAuthService(this.database).uploadProfilePicture(userId, input) }

  async updateAccount(userId: string, input: AccountUpdate): Promise<CurrentUser> {
    const { data: identity } = await this.database.from('user_identities').select('clerk_user_id').eq('database_user_id', userId).maybeSingle()
    if (!identity) throw new Error('Could not find Clerk identity')

    if (input.password) await this.clerk.users.updateUser(identity.clerk_user_id, { password: input.password })
    if (input.email) {
      const email = await this.clerk.emailAddresses.createEmailAddress({ userId: identity.clerk_user_id, emailAddress: input.email, primary: true })
      await this.clerk.emailAddresses.updateEmailAddress(email.id, { primary: true })
    }
    const user = await this.clerk.users.getUser(identity.clerk_user_id)
    return { id: userId, authId: identity.clerk_user_id, email: user.primaryEmailAddress?.emailAddress ?? null }
  }
}

export function createAuthService(): AuthService | null {
  const url = process.env.SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  const clerkSecretKey = process.env.CLERK_SECRET_KEY

  if (!url || !serviceRoleKey || !clerkSecretKey) return null

  return new ClerkAuthService(createClient(url, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
      detectSessionInUrl: false,
    },
  }), clerkSecretKey)
}
