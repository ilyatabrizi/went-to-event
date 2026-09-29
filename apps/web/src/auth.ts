import { createClient, type Session } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY
const apiBaseUrl = (import.meta.env.VITE_API_URL as string | undefined)?.replace(/\/$/, '') ?? ''
const apiPath = (path: string) => apiBaseUrl ? `${apiBaseUrl}${path}` : `/api${path}`

export const supabase = url && anonKey
  ? createClient(url, anonKey)
  : null

export type ApiUser = {
  id: string
  email: string | null
}

export async function getApiUser(session: Session): Promise<ApiUser> {
  const response = await fetch(apiPath('/me'), {
    headers: { Authorization: `Bearer ${session.access_token}` },
  })

  if (!response.ok) {
    throw new Error('The API rejected the current session')
  }

  const body = await response.json() as { user: ApiUser }
  return body.user
}
