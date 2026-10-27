import { useState, type FormEvent } from 'react'
import { createEvent, type AuthTokenProvider, type Event } from './api'
import { translate, type Language } from './i18n'
import { LocationMap, type Coordinates } from './LocationMap'

const steps = ['The basics', 'When', 'Where', 'Entry']
const categories = ['Arts', 'Community', 'Food', 'Music', 'Nightlife', 'Wellness', 'Other']

function localDateTime(value: Date) {
  return new Date(value.getTime() - value.getTimezoneOffset() * 60_000).toISOString().slice(0, 16)
}

function initialForm() {
  const starts = new Date(Date.now() + 24 * 60 * 60 * 1000)
  starts.setMinutes(0, 0, 0)
  const ends = new Date(starts.getTime() + 2 * 60 * 60 * 1000)
  return {
    category: 'Nightlife',
    title: '',
    description: '',
    startsAt: localDateTime(starts),
    endsAt: localDateTime(ends),
    venueName: '',
    venueAddress: '',
    latitude: null as number | null,
    longitude: null as number | null,
    ticketName: 'General admission',
    ticketDescription: 'Entry to the event',
    paid: false,
    price: '25',
  }
}

export function EventCreationPanel({ getToken, onCreated, onCancel, language }: { getToken: AuthTokenProvider; onCreated: (event: Event) => void; onCancel: () => void; language: Language }) {
  const t = (text: string) => translate(language, text)
  const [step, setStep] = useState(0)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [form, setForm] = useState(initialForm)

  function update<K extends keyof ReturnType<typeof initialForm>>(field: K, value: ReturnType<typeof initialForm>[K]) {
    setForm((current) => ({ ...current, [field]: value }))
  }

  function stepIsValid(currentStep: number) {
    if (currentStep === 0) return form.title.trim().length >= 4 && form.description.trim().length >= 1
    if (currentStep === 1) {
      const startsAt = new Date(form.startsAt).getTime()
      const endsAt = new Date(form.endsAt).getTime()
      return Number.isFinite(startsAt) && Number.isFinite(endsAt) && startsAt > Date.now() && endsAt > startsAt
    }
    if (currentStep === 2) return form.venueName.trim().length >= 2 && form.venueAddress.trim().length >= 4 && form.latitude !== null && form.longitude !== null
    const price = Number(form.price)
    return form.ticketName.trim().length >= 2 && form.ticketDescription.trim().length >= 2
      && (!form.paid || (Number.isFinite(price) && price > 0 && price <= 100000))
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)
    if (!stepIsValid(step)) {
      setError(step === 1 ? t('Choose a future start and end time.') : t('Complete the required fields to continue.'))
      return
    }
    if (step < steps.length - 1) {
      setStep((current) => current + 1)
      return
    }

    setBusy(true)
    try {
      const { data } = await createEvent(getToken, {
        category: form.category,
        title: form.title.trim(),
        description: form.description.trim(),
        startsAt: new Date(form.startsAt).toISOString(),
        endsAt: new Date(form.endsAt).toISOString(),
        venueName: form.venueName.trim(),
        venueAddress: form.venueAddress.trim(),
        latitude: form.latitude!,
        longitude: form.longitude!,
        ticketTiers: [{
          name: form.ticketName.trim(),
          description: form.ticketDescription.trim(),
          priceCents: form.paid ? Math.round(Number(form.price) * 100) : 0,
        }],
      })
      onCreated(data)
      setStep(0)
      setForm(initialForm())
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : t('Could not create this event.'))
    } finally {
      setBusy(false)
    }
  }

  const previewDate = form.startsAt
    ? new Intl.DateTimeFormat('en-US', { weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }).format(new Date(form.startsAt))
    : t('Date to be decided')

  return (
    <main className="shell event-creation-page">
      <button className="back" onClick={onCancel}><span aria-hidden="true">←</span> {t('Back to profile')}</button>
      <header className="event-creation-header">
        <p className="eyebrow">{t('Verified account')}</p>
        <h1>{t('Create an event')}</h1>
        <p className="lede">{t('Every event is reviewed by an admin before it goes live.')}</p>
      </header>
      <section className="profile-settings verification-event-section" aria-label={t('Create an event')}>
        <div className="event-create-layout">
          <form className="profile-form event-create-form" onSubmit={submit}>
            <div className="event-stepper" aria-label={`${t('Step')} ${step + 1} ${t('of')} ${steps.length}`}>
              {steps.map((label, index) => <span className={index <= step ? 'event-step-on' : ''} key={label} />)}
            </div>
            <div className="event-step-heading"><span className="label">{t('Step')} {step + 1} {t('of')} {steps.length}</span><h3>{t(steps[step])}</h3></div>

            {step === 0 && <>
              <label>{t('What is it called?')}
              <input required minLength={4} maxLength={120} value={form.title} onChange={(event) => update('title', event.target.value)} placeholder={t('Warehouse Sessions Vol. 10')} />
              </label>
              <fieldset className="event-category-field">
                <legend>{t('What kind of event?')}</legend>
                <div className="event-category-options">{categories.map((category) => <button className={form.category === category ? 'event-category-selected' : ''} key={category} type="button" aria-pressed={form.category === category} onClick={() => update('category', category)}>{t(category)}</button>)}</div>
              </fieldset>
              <label>{t('Tell people what to expect')}
                <textarea required minLength={1} maxLength={2000} rows={4} value={form.description} onChange={(event) => update('description', event.target.value)} placeholder={t('Give people a feel for the event, the atmosphere, and what to expect.')} />
                <small>{t('A clear description helps guests decide if it’s for them.')}</small>
              </label>
            </>}

            {step === 1 && <>
              <p className="event-step-copy">{t('Pick a start and end time. Guests will see these in their local time zone.')}</p>
              <label>{t('Starts')}<input type="datetime-local" required value={form.startsAt} onChange={(event) => update('startsAt', event.target.value)} /></label>
              <label>{t('Ends')}<input type="datetime-local" required value={form.endsAt} onChange={(event) => update('endsAt', event.target.value)} /></label>
              {new Date(form.endsAt) <= new Date(form.startsAt) && <small className="event-field-hint">{t('The end time must be after the start time.')}</small>}
            </>}

            {step === 2 && <>
              <label>{t('Venue name')}<input required minLength={2} maxLength={120} value={form.venueName} onChange={(event) => update('venueName', event.target.value)} placeholder={t('Pier 70')} /></label>
              <p className="event-step-copy">{t('Tap the map to place the event. We will fill in the address automatically.')}</p>
              <LocationMap value={form.latitude !== null && form.longitude !== null ? { latitude: form.latitude, longitude: form.longitude } : null} onSelect={(coordinates: Coordinates, address) => { update('latitude', coordinates.latitude); update('longitude', coordinates.longitude); if (address) update('venueAddress', address) }} label={t('Choose event location')} />
              <label>{t('Address')}<input required readOnly minLength={4} maxLength={240} value={form.venueAddress} placeholder={t('Select a point on the map')} /></label>
              {form.latitude === null && <small className="event-field-hint">{t('Choose a point on the map to continue.')}</small>}
            </>}

            {step === 3 && <>
              <fieldset className="event-ticket-type">
                <legend>{t('Is it free or ticketed?')}</legend>
                <div className="event-ticket-options">
                  <button className={!form.paid ? 'event-category-selected' : ''} type="button" aria-pressed={!form.paid} onClick={() => update('paid', false)}>{t('Free')}</button>
                  <button className={form.paid ? 'event-category-selected' : ''} type="button" aria-pressed={form.paid} onClick={() => update('paid', true)}>{t('Ticketed')}</button>
                </div>
              </fieldset>
              {form.paid && <label>{t('Price per ticket (USD)')}<input type="number" min="0.01" max="100000" step="0.01" required value={form.price} onChange={(event) => update('price', event.target.value)} placeholder="25" /></label>}
              <label>{t('Ticket name')}<input required minLength={2} maxLength={60} value={form.ticketName} onChange={(event) => update('ticketName', event.target.value)} placeholder={t('General admission')} /></label>
              <label>{t('Ticket details')}<input required minLength={2} maxLength={240} value={form.ticketDescription} onChange={(event) => update('ticketDescription', event.target.value)} placeholder={t('Entry to the event')} /></label>
            </>}

            {error && <p className="error" role="alert">{error}</p>}
            <div className="event-create-actions">
              {step > 0 && <button className="quiet-button" type="button" disabled={busy} onClick={() => { setError(null); setStep((current) => current - 1) }}>{t('Back')}</button>}
              <button className="primary-button" type="submit" disabled={busy || !stepIsValid(step)}>{busy ? t('Submitting…') : step === steps.length - 1 ? t('Submit for approval') : t('Continue')}</button>
              <button className="quiet-button" type="button" disabled={busy} onClick={onCancel}>{t('Cancel')}</button>
            </div>
          </form>

          <aside className="event-live-preview" aria-label={t('Live event preview')}>
            <p className="label">{t('How it will look')}</p>
            <article className="event-preview-card">
              <div className="cover-art" data-category={form.category} aria-hidden="true">
                <span className="cover-glow" /><span className="cover-grid" />
                <span className="event-preview-category">{form.category}</span>
                <strong>{form.title || t('Your event')}</strong>
              </div>
              <div className="event-preview-details">
                <span>{previewDate}</span>
                <span>{form.venueName || t('Venue to be decided')}</span>
                <strong>{!form.paid || !Number(form.price) ? t('Free') : `${t('From')} $${Number(form.price).toFixed(2)}`}</strong>
              </div>
            </article>
            <p className="event-preview-note">{t('Your event will appear in Explore after an admin approves it.')}</p>
          </aside>
        </div>
      </section>
    </main>
  )
}
