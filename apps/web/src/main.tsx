import { StrictMode, useState } from 'react'
import { createRoot } from 'react-dom/client'
import { App } from './App'
import { PrivacyPolicy } from './PrivacyPolicy'
import { CookieConsent } from './CookieConsent'
import { AuthProvider } from './auth'
import { languageOptions, type Language } from './i18n'
import './styles.css'

function Root() {
  if (window.location.pathname === '/privacy' || window.location.pathname === '/privacy-policy') {
    return <><PrivacyPolicy /><CookieConsent /></>
  }
  const [language, setLanguage] = useState<Language>(() => {
    const savedLanguage = localStorage.getItem('wte.language.v2')
    return languageOptions.some((option) => option.value === savedLanguage) ? savedLanguage as Language : 'en'
  })
  const [theme, setTheme] = useState<'dark' | 'light'>(() => localStorage.getItem('wte.theme.v1') === 'light' ? 'light' : 'dark')
  document.documentElement.dataset.theme = theme
  const setAppTheme = (nextTheme: 'dark' | 'light') => { setTheme(nextTheme); localStorage.setItem('wte.theme.v1', nextTheme) }
  return (
    <AuthProvider>
      <App language={language} onLanguageChange={setLanguage} theme={theme} onThemeChange={setAppTheme} />
      <CookieConsent />
    </AuthProvider>
  )
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Root />
  </StrictMode>,
)

if ('serviceWorker' in navigator && import.meta.env.PROD) {
  const alreadyControlled = Boolean(navigator.serviceWorker.controller)
  if (alreadyControlled) {
    navigator.serviceWorker.addEventListener('controllerchange', () => window.location.reload(), { once: true })
  }
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {})
  })
}
