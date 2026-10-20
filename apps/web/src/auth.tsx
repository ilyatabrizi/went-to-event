import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { createClient, type Session, type SupabaseClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY
export const frontendPreview = import.meta.env.DEV && import.meta.env.MODE === 'preview'
export const supabase: SupabaseClient | null = url && anonKey
  ? createClient(url, anonKey, { auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true, flowType: 'pkce', experimental: { passkey: true } } })
  : null

type AuthContextValue = { loaded: boolean; session: Session | null; getToken: () => Promise<string | null>; signOut: () => Promise<void> }
const AuthContext = createContext<AuthContextValue>({ loaded: false, session: null, getToken: async () => null, signOut: async () => {} })

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [loaded, setLoaded] = useState(false)
  const [session, setSession] = useState<Session | null>(null)
  const sessionRef = useRef<Session | null>(null)
  useEffect(() => {
    if (frontendPreview) {
      const previewSession = { access_token: 'local-preview-token', refresh_token: 'local-preview-refresh', expires_in: 3600, token_type: 'bearer', user: { id: 'preview-user', email: 'preview@example.test', user_metadata: { username: 'preview_guest' } } } as unknown as Session
      sessionRef.current = previewSession
      setSession(previewSession)
      setLoaded(true)
      return
    }
    if (!supabase) { setLoaded(true); return }
    let active = true
    void supabase.auth.getSession().then(({ data }) => {
      if (active) { sessionRef.current = data.session; setSession(data.session) }
    }).catch(() => {}).finally(() => { if (active) setLoaded(true) })
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, next) => {
      if (active) { sessionRef.current = next; setSession(next); setLoaded(true) }
    })
    return () => { active = false; subscription.unsubscribe() }
  }, [])
  const getToken = useCallback(async () => sessionRef.current?.access_token ?? null, [])
  const value = useMemo<AuthContextValue>(() => ({
    loaded, session,
    getToken,
    signOut: async () => { if (!frontendPreview && supabase) await supabase.auth.signOut() },
  }), [loaded, session, getToken])
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() { return useContext(AuthContext) }
export type ApiUser = { id: string; email: string | null }
