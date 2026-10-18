import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react'
import type { BrowserQRCodeReader, IScannerControls } from '@zxing/browser'
import { verifyTicket, type AuthTokenProvider, type TicketCheckInResult } from './api'
import { translate, type Language } from './i18n'

export function CheckInPanel({ getToken, onBack, navigation, language }: { getToken: AuthTokenProvider; onBack: () => void; navigation: ReactNode; language: Language }) {
  const t = (text: string) => translate(language, text)
  const [value, setValue] = useState('')
  const [result, setResult] = useState<TicketCheckInResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [scanning, setScanning] = useState(false)
  const [scannerReady, setScannerReady] = useState(false)
  const video = useRef<HTMLVideoElement>(null)
  const stream = useRef<MediaStream | null>(null)
  const scanner = useRef<IScannerControls | null>(null)
  const reader = useRef<BrowserQRCodeReader | null>(null)

  const stopScanner = useCallback(() => {
    scanner.current?.stop()
    scanner.current = null
    stream.current?.getTracks().forEach((track) => track.stop())
    stream.current = null
    if (video.current) video.current.srcObject = null
    setScanning(false)
  }, [])

  useEffect(() => stopScanner, [stopScanner])

  useEffect(() => {
    let active = true
    void import('@zxing/browser').then(({ BrowserQRCodeReader }) => {
      if (!active) return
      reader.current = new BrowserQRCodeReader()
      setScannerReady(true)
    }).catch(() => {
      if (active) setError(t('Camera scanning is not supported here. Paste the QR value below instead.'))
    })
    return () => { active = false }
  }, [])

  async function check(valueToVerify = value) {
    const qrCode = valueToVerify.trim()
    if (!qrCode || busy) return
    setBusy(true)
    setError(null)
    setResult(null)
    try {
      const response = await verifyTicket(getToken, qrCode)
      setResult(response.data)
      setValue('')
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : t('Could not verify this ticket.'))
    } finally {
      setBusy(false)
    }
  }

  async function startScanner() {
    if (!navigator.mediaDevices?.getUserMedia) {
      setError(t('Camera access is not available. Paste the QR value below instead.'))
      return
    }
    setError(null)
    try {
      if (!video.current) return
      if (!reader.current) return
      scanner.current = await reader.current.decodeFromConstraints(
        { video: { facingMode: { ideal: 'environment' } }, audio: false },
        video.current,
        (result) => {
          if (!result) return
          const scanned = result.getText()
          stopScanner()
          setValue(scanned)
          void check(scanned)
        },
      )
      stream.current = video.current.srcObject as MediaStream | null
      setScanning(true)
    } catch {
      setError(t('Camera access was denied or unavailable. Paste the QR value below instead.'))
      stopScanner()
    }
  }

  return (
    <main className="shell checkin-shell">
      {navigation}
      <button className="back" onClick={onBack}><span aria-hidden="true">←</span> {t('Back to profile')}</button>
      <header className="checkin-header">
        <p className="eyebrow">{t('Host tools')}</p>
        <h1>{t('Check in guests')}</h1>
        <p className="lede">{t('Scan a ticket once. We’ll mark it at the door and stop duplicate entry.')}</p>
      </header>
      <section className="checkin-card">
        <div className="checkin-camera-wrap">
          <video ref={video} className={`checkin-camera ${scanning ? 'checkin-camera-on' : ''}`} playsInline muted aria-label={t('Ticket QR camera')} />
          {!scanning && <div className="checkin-camera-empty"><span aria-hidden="true">⌁</span><strong>{t('Ready to scan')}</strong><small>{t('Use the attendee’s QR pass in front of the camera.')}</small></div>}
          {scanning && <span className="checkin-frame" aria-hidden="true" />}
        </div>
        <div className="checkin-actions">
          <button className="primary-button" type="button" onClick={startScanner} disabled={!scannerReady || scanning || busy}>{scanning ? t('Scanning…') : scannerReady ? t('Open camera') : t('Preparing camera…')}</button>
          {scanning && <button className="secondary-button" type="button" onClick={stopScanner}>{t('Stop camera')}</button>}
        </div>
        <div className="checkin-divider"><span>{t('or enter a QR value')}</span></div>
        <form className="checkin-manual" onSubmit={(event) => { event.preventDefault(); void check() }}>
          <input value={value} onChange={(event) => setValue(event.target.value)} placeholder={t('wte-ticket:v1:…')} aria-label={t('Ticket QR value')} autoComplete="off" />
          <button className="quiet-button" type="submit" disabled={busy || !value.trim()}>{busy ? t('Checking…') : t('Verify')}</button>
        </form>
      </section>
      {error && <p className="error" role="alert">{error}</p>}
      {result && <section className={`checkin-result ${result.status === 'already_checked_in' ? 'checkin-result-used' : ''}`} role="status">
        <span className="checkin-result-icon" aria-hidden="true">{result.status === 'already_checked_in' ? '!' : '✓'}</span>
        <div><strong>{result.status === 'already_checked_in' ? t('Already checked in') : t('Entry approved')}</strong><p>{result.event.title} · {t('Ticket')} {result.ticket.number}</p><small>{new Date(result.ticket.checkedInAt).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}</small></div>
      </section>}
    </main>
  )
}
