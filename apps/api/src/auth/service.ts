import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import type { CurrentUser } from '../../../../packages/shared/src/auth.js'

export interface AuthService {
  getUser(accessToken: string): Promise<CurrentUser | null>
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
