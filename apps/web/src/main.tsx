import { ClerkProvider } from '@clerk/react'
import { frFR, itIT, trTR } from '@clerk/localizations'
import { StrictMode, useState } from 'react'
import { createRoot } from 'react-dom/client'
import { App } from './App'
import { languageOptions, type Language } from './i18n'
import './styles.css'

function Root() {
  const [language, setLanguage] = useState<Language>(() => {
    const savedLanguage = localStorage.getItem('wte.language')
    return languageOptions.some((option) => option.value === savedLanguage) ? savedLanguage as Language : 'en'
  })
  const localization = language === 'tr' ? trTR : language === 'fr' ? frFR : language === 'it' ? itIT : undefined

  return (
    <ClerkProvider afterSignOutUrl="/demo" localization={localization}>
      <App language={language} onLanguageChange={setLanguage} />
    </ClerkProvider>
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
