import { useState } from 'react'

const consentKey = 'wte.cookie-consent.v1'

type ConsentChoice = 'essential' | 'all'

export function CookieConsent() {
  const [choice, setChoice] = useState<ConsentChoice | null>(() => {
    const saved = localStorage.getItem(consentKey)
    return saved === 'essential' || saved === 'all' ? saved : null
  })

  function saveConsent(nextChoice: ConsentChoice) {
    localStorage.setItem(consentKey, nextChoice)
    setChoice(nextChoice)
  }

  if (choice) return null

  return (
    <aside className="cookie-consent" aria-label="Cookie consent" aria-live="polite">
      <div className="cookie-consent-copy">
        <strong>Cookie preferences</strong>
        <p>Went To Event uses essential browser storage to keep the app working and remember your settings. We do not currently use optional analytics or advertising cookies. Choose whether to allow optional cookies if we add them later. <a href="/privacy">Privacy policy</a></p>
      </div>
      <div className="cookie-consent-actions">
        <button type="button" className="cookie-essential" onClick={() => saveConsent('essential')}>Essential only</button>
        <button type="button" className="cookie-accept" onClick={() => saveConsent('all')}>Allow optional</button>
      </div>
    </aside>
  )
}
