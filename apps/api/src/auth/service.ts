import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import type { AccountUpdate, CurrentUser, ProfileUpdate, UserProfile } from '../../../../packages/shared/src/auth.js'

export interface AuthService {
  getUser(accessToken: string): Promise<CurrentUser | null>
  getProfile?(userId: string): Promise<UserProfile>
  updateProfile?(userId: string, input: ProfileUpdate): Promise<UserProfile>
  updateAccount?(userId: string, input: AccountUpdate): Promise<CurrentUser>
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
