import { useState } from 'react'
import { SignIn, SignUp } from '@clerk/react'

export function AuthPanel() {
  const [mode, setMode] = useState<'sign-in' | 'sign-up'>('sign-in')
  const [username, setUsername] = useState('')
  const validUsername = /^[a-z0-9_]{3,24}$/.test(username)
  const appearance = { elements: {
    rootBox: 'booking-clerk-root',
    card: 'booking-clerk-card',
    headerTitle: 'booking-clerk-title',
    footerAction: 'auth-footer-action-hidden',
  } }

  return (
    <div className="auth-panel">
      <div className="auth-mode-switch" aria-label="Account access">
        <button type="button" className={mode === 'sign-in' ? 'auth-mode-active' : ''} onClick={() => setMode('sign-in')}>Sign in</button>
        <button type="button" className={mode === 'sign-up' ? 'auth-mode-active' : ''} onClick={() => setMode('sign-up')}>Create account</button>
      </div>
      {mode === 'sign-up' ? <>
        <label className="auth-username-field">Choose a username
          <input
            autoComplete="username"
            value={username}
            onChange={(event) => setUsername(event.target.value.toLowerCase())}
            placeholder="your_username"
            minLength={3}
            maxLength={24}
            pattern="[a-z0-9_]{3,24}"
            required
          />
          <small>3–24 lowercase letters, numbers, or underscores. Friends can search this to find you.</small>
        </label>
        {validUsername
          ? <SignUp routing="hash" signInUrl="/" fallbackRedirectUrl="/" unsafeMetadata={{ username }} appearance={appearance} />
          : <p className="auth-username-hint">Enter a valid username to continue creating your account.</p>}
      </> : <SignIn routing="hash" signUpUrl="/" fallbackRedirectUrl="/" appearance={appearance} />}
    </div>
  )
}
