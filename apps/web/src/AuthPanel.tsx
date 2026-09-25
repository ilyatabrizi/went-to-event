import { useEffect, useState } from 'react'
import type { Session } from '@supabase/supabase-js'
import { getApiUser, supabase, type ApiUser } from './auth'

type Mode = 'sign-in' | 'sign-up'

export function AuthPanel({ onAuthenticated, page = false }: { onAuthenticated?: () => void; page?: boolean }) {
  const [session, setSession] = useState<Session | null>(null)
  const [apiUser, setApiUser] = useState<ApiUser | null>(null)
  const [mode, setMode] = useState<Mode>('sign-in')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [message, setMessage] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (!supabase) return

    supabase.auth.getSession().then(({ data }) => setSession(data.session))
    const { data: listener } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession)
    })

    return () => listener.subscription.unsubscribe()
  }, [])

  useEffect(() => {
    if (!session) {
      setApiUser(null)
      return
    }

    getApiUser(session)
      .then(setApiUser)
      .catch(() => setMessage('Signed in, but the API could not verify the session.'))
  }, [session])

  useEffect(() => {
    if (session && onAuthenticated) onAuthenticated()
  }, [onAuthenticated, session])

  if (!supabase) {
    return (
      <aside className={`auth-panel auth-panel-muted ${page ? 'auth-page-card' : ''}`}>
        <span className="label">Account</span>
        <p>Add `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` to `apps/web/.env` to enable sign in.</p>
      </aside>
    )
  }

  const client = supabase

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setBusy(true)
    setMessage(null)

    const result = mode === 'sign-in'
      ? await client.auth.signInWithPassword({ email, password })
      : await client.auth.signUp({ email, password })

    if (result.error) {
      setMessage(result.error.message)
    } else if (mode === 'sign-up' && !result.data.session) {
      setMessage('Check your email to confirm your account.')
    } else {
      setMessage('Signed in successfully.')
    }

    setBusy(false)
  }

  async function signOut() {
    await client.auth.signOut()
    setMessage('Signed out.')
  }

  if (session) {
    return (
      <aside className={`auth-panel ${page ? 'auth-page-card' : ''}`}>
        <div>
          <span className="label">Signed in</span>
          <strong>{apiUser?.email ?? session.user.email}</strong>
        </div>
        <button className="quiet-button" onClick={signOut}>Sign out</button>
        {message && <small>{message}</small>}
      </aside>
    )
  }

  return (
    <aside className={`auth-panel ${page ? 'auth-page-card' : ''}`}>
      <div className="auth-heading">
        <div>
          <span className="label">Your account</span>
          <strong>{mode === 'sign-in' ? 'Welcome back' : 'Join Went To Event'}</strong>
        </div>
        <button className="quiet-button" onClick={() => setMode(mode === 'sign-in' ? 'sign-up' : 'sign-in')}>
          {mode === 'sign-in' ? 'Create account' : 'Sign in'}
        </button>
      </div>
      <form onSubmit={submit} className="auth-form">
        <input aria-label="Email" type="email" placeholder="Email" value={email} onChange={(event) => setEmail(event.target.value)} required />
        <input aria-label="Password" type="password" placeholder="Password" value={password} onChange={(event) => setPassword(event.target.value)} minLength={6} required />
        <button className="primary-button" disabled={busy}>{busy ? 'Working…' : mode === 'sign-in' ? 'Sign in' : 'Create account'}</button>
      </form>
      {message && <small>{message}</small>}
    </aside>
  )
}
