import { useState } from 'react'
import { supabase } from './auth'
import { translate, type Language } from './i18n'

const hobbyOptions = ['Music', 'Food', 'Art', 'Sports', 'Travel', 'Talks']

export function AuthPanel({ language, onAuthenticated }: { language: Language; onAuthenticated: () => void }) {
  const t = (text: string) => translate(language, text)
  const [mode, setMode] = useState<'sign-in' | 'sign-up'>('sign-in')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [username, setUsername] = useState('')
  const [phoneNumber, setPhoneNumber] = useState('')
  const [hobbies, setHobbies] = useState<string[]>([])
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  const validUsername = /^[a-z0-9_]{3,24}$/.test(username)

  async function submit(event: React.FormEvent) {
    event.preventDefault()
    if (!supabase) { setMessage(t('Authentication is not configured')); return }
    setBusy(true); setMessage('')
    try {
      if (mode === 'sign-up') {
        const { data, error } = await supabase.auth.signUp({ email: email.trim().toLowerCase(), password, options: { emailRedirectTo: window.location.origin, data: { username, phoneNumber: phoneNumber.trim() || null, hobbies } } })
        if (error) throw error
        if (data.session) onAuthenticated()
        else setMessage(t('Check your email to confirm your account, then sign in.'))
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email: email.trim().toLowerCase(), password })
        if (error) throw error
        onAuthenticated()
      }
    } catch (error) { setMessage(error instanceof Error ? error.message : t('Could not sign in')) }
    finally { setBusy(false) }
  }

  async function resetPassword() {
    if (!supabase || !email) { setMessage(t('Enter your email address first.')); return }
    setBusy(true); setMessage('')
    try { const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: window.location.origin }); if (error) throw error; setMessage(t('Password reset instructions sent.')) }
    catch (error) { setMessage(error instanceof Error ? error.message : t('Could not send password reset email')) }
    finally { setBusy(false) }
  }

  return (
    <div className="auth-panel">
      <div className="auth-mode-switch" aria-label={t('Account access')}>
        <button type="button" className={mode === 'sign-in' ? 'auth-mode-active' : ''} onClick={() => { setMode('sign-in'); setMessage('') }}>{t('Sign in')}</button>
        <button type="button" className={mode === 'sign-up' ? 'auth-mode-active' : ''} onClick={() => { setMode('sign-up'); setMessage('') }}>{t('Create account')}</button>
      </div>
      <form className="profile-form" onSubmit={submit}>
        {mode === 'sign-up' && <>
          <div className="auth-welcome"><p className="auth-welcome-kicker">{t('Welcome to your people')}</p><strong>{t('Tell us what you love.')}</strong><small>{t('A few details help us make Went To Event feel like yours.')}</small></div>
          <label>{t('Choose a username')}<input autoComplete="username" value={username} onChange={(e) => setUsername(e.target.value.toLowerCase())} minLength={3} maxLength={24} required /><small>{t('3–24 lowercase letters, numbers, or underscores.')}</small></label>
          <label>{t('Phone number')} <span className="auth-optional">{t('Optional')}</span><input type="tel" autoComplete="tel" value={phoneNumber} onChange={(e) => setPhoneNumber(e.target.value)} /></label>
          <fieldset className="auth-hobbies"><legend>{t('What are you into?')} <span className="auth-optional">{t('Optional')}</span></legend><div className="auth-hobby-options">{hobbyOptions.map((hobby) => { const selected = hobbies.includes(hobby); return <button type="button" key={hobby} className={selected ? 'auth-hobby auth-hobby-selected' : 'auth-hobby'} onClick={() => setHobbies((items) => selected ? items.filter((item) => item !== hobby) : [...items, hobby])} aria-pressed={selected}>{t(hobby)}</button> })}</div></fieldset>
        </>}
        <label>{t('Email address')}<input type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} /></label>
        <label>{t('Password')}<input type="password" autoComplete={mode === 'sign-in' ? 'current-password' : 'new-password'} minLength={8} required value={password} onChange={(e) => setPassword(e.target.value)} /></label>
        {message && <p className="error" role="alert">{message}</p>}
        <button className="primary-button" disabled={busy || (mode === 'sign-up' && !validUsername)}>{busy ? t('Loading…') : mode === 'sign-in' ? t('Sign in') : t('Create account')}</button>
      </form>
      {mode === 'sign-in' && <button className="quiet-button" type="button" disabled={busy} onClick={() => void resetPassword()}>{t('Forgot password?')}</button>}
    </div>
  )
}
