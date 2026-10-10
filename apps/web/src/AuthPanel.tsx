import { useState } from 'react'
import { SignIn, SignUp } from '@clerk/react'
import { translate, type Language } from './i18n'

const hobbyOptions = ['Music', 'Food', 'Art', 'Sports', 'Travel', 'Talks']

export function AuthPanel({ language }: { language: Language }) {
  const t = (text: string) => translate(language, text)
  const [mode, setMode] = useState<'sign-in' | 'sign-up'>('sign-in')
  const [username, setUsername] = useState('')
  const [phoneNumber, setPhoneNumber] = useState('')
  const [hobbies, setHobbies] = useState<string[]>([])
  const validUsername = /^[a-z0-9_]{3,24}$/.test(username)
  const appearance = {
    variables: {
      colorPrimary: '#ff5b3d',
      colorBackground: '#161418',
      colorInputBackground: '#0f0e11',
      colorInputText: '#f4f1ec',
      colorText: '#f4f1ec',
      colorTextSecondary: '#8a848f',
      colorNeutral: '#f4f1ec',
      borderRadius: '16px',
      fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, sans-serif',
      fontSize: '14px',
    },
    elements: {
      rootBox: 'booking-clerk-root',
      card: 'booking-clerk-card',
      headerTitle: 'booking-clerk-title',
      headerSubtitle: 'booking-clerk-subtitle',
      formFieldLabel: 'booking-clerk-label',
      formFieldInput: 'booking-clerk-input',
      formButtonPrimary: 'booking-clerk-primary',
      socialButtonsBlockButton: 'booking-clerk-social-button',
      dividerLine: 'booking-clerk-divider-line',
      dividerText: 'booking-clerk-divider-text',
      footerAction: 'auth-footer-action-hidden',
      footer: 'booking-clerk-footer',
      footerActionLink: 'booking-clerk-link',
      formFieldErrorText: 'booking-clerk-error',
      alertText: 'booking-clerk-error',
    },
  }

  return (
    <div className="auth-panel">
      <div className="auth-mode-switch" aria-label={t('Account access')}>
        <button type="button" className={mode === 'sign-in' ? 'auth-mode-active' : ''} onClick={() => setMode('sign-in')}>{t('Sign in')}</button>
        <button type="button" className={mode === 'sign-up' ? 'auth-mode-active' : ''} onClick={() => setMode('sign-up')}>{t('Create account')}</button>
      </div>
      {mode === 'sign-up' ? <>
        <div className="auth-welcome">
          <p className="auth-welcome-kicker">{t('Welcome to your people')}</p>
          <strong>{hobbies.length ? t('We’ll tailor your event picks.') : t('Tell us what you love.')}</strong>
          <small>{t('A few details help us make Went To Event feel like yours.')}</small>
        </div>
        <label className="auth-username-field">{t('Choose a username')}
          <input
            autoComplete="username"
            value={username}
            onChange={(event) => setUsername(event.target.value.toLowerCase())}
            placeholder={t('your_username')}
            minLength={3}
            maxLength={24}
            pattern="[a-z0-9_]{3,24}"
            required
          />
          <small>{t('3–24 lowercase letters, numbers, or underscores. Friends can search this to find you.')}</small>
        </label>
        <label className="auth-username-field">{t('Phone number')} <span className="auth-optional">{t('Optional')}</span>
          <input type="tel" inputMode="tel" autoComplete="tel" value={phoneNumber} onChange={(event) => setPhoneNumber(event.target.value)} placeholder={t('+98 912 345 6789')} />
          <small>{t('Useful for event reminders and account recovery.')}</small>
        </label>
        <fieldset className="auth-hobbies">
          <legend>{t('What are you into?')} <span className="auth-optional">{t('Optional')}</span></legend>
          <div className="auth-hobby-options">
            {hobbyOptions.map((hobby) => {
              const selected = hobbies.includes(hobby)
              return <button type="button" key={hobby} className={selected ? 'auth-hobby auth-hobby-selected' : 'auth-hobby'} onClick={() => setHobbies((current) => selected ? current.filter((item) => item !== hobby) : [...current, hobby])} aria-pressed={selected}>{t(hobby)}</button>
            })}
          </div>
        </fieldset>
        {validUsername
          ? <SignUp routing="hash" signInUrl="/demo" fallbackRedirectUrl="/demo" unsafeMetadata={{ username, phoneNumber: phoneNumber.trim() || undefined, hobbies }} appearance={appearance} />
          : <p className="auth-username-hint">{t('Enter a valid username to continue creating your account.')}</p>}
      </> : <SignIn routing="hash" signUpUrl="/demo" fallbackRedirectUrl="/demo" appearance={appearance} />}
    </div>
  )
}
