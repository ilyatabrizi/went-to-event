import { StrictMode, useState } from 'react'
import { createRoot } from 'react-dom/client'
import { App } from './App'
import { AuthProvider } from './auth'
import { languageOptions, type Language } from './i18n'
import './styles.css'

function Root() {
  const [language, setLanguage] = useState<Language>(() => {
    const savedLanguage = localStorage.getItem('wte.language.v2')
    return languageOptions.some((option) => option.value === savedLanguage) ? savedLanguage as Language : 'fa'
  })
  const [theme, setTheme] = useState<'dark' | 'light'>(() => localStorage.getItem('wte.theme.v1') === 'light' ? 'light' : 'dark')
  document.documentElement.dataset.theme = theme
  const setAppTheme = (nextTheme: 'dark' | 'light') => { setTheme(nextTheme); localStorage.setItem('wte.theme.v1', nextTheme) }
  return (
    <AuthProvider>
      <App language={language} onLanguageChange={setLanguage} theme={theme} onThemeChange={setAppTheme} />
    </AuthProvider>
  )
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Root />
  </StrictMode>,
)

if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {})
  })
}
