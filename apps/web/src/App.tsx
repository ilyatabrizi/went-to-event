import { useEffect, useState } from 'react'
import type { Session } from '@supabase/supabase-js'
import { createBooking, getEvent, getEvents, type Booking, type Event } from './api'
import { AuthPanel } from './AuthPanel'
import { supabase } from './auth'

function formatDate(value: string) {
  return new Intl.DateTimeFormat('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(value))
}

function priceLabel(event: Event) {
  const lowest = Math.min(...event.ticketTiers.map((tier) => tier.priceCents))
  return lowest === 0 ? 'Free' : `From $${(lowest / 100).toFixed(0)}`
}

function Cover({ event }: { event: Event }) {
  return (
    <div className="cover-art" data-category={event.category} aria-hidden="true">
      <span className="cover-glow" />
      <span className="cover-grid" />
    </div>
  )
}

export function App() {
  const [events, setEvents] = useState<Event[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [selected, setSelected] = useState<Event | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [selectedTierId, setSelectedTierId] = useState<string | null>(null)
  const [quantity, setQuantity] = useState(1)
  const [booking, setBooking] = useState<Booking | null>(null)
  const [bookingBusy, setBookingBusy] = useState(false)
  const [bookingError, setBookingError] = useState<string | null>(null)

  useEffect(() => {
    if (!supabase) return

    supabase.auth.getSession().then(({ data }) => setSession(data.session))
    const { data: listener } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession)
    })

    return () => listener.subscription.unsubscribe()
  }, [])

  useEffect(() => {
    getEvents()
      .then((response) => setEvents(response.data))
      .catch(() => setError('Could not load events. Is the API running?'))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    if (!selectedId) {
      setSelected(null)
      return
    }

    getEvent(selectedId)
      .then((response) => {
        setSelected(response.data)
        setSelectedTierId(response.data.ticketTiers[0]?.id ?? null)
        setQuantity(1)
        setBooking(null)
        setBookingError(null)
      })
      .catch(() => setError('Could not load that event.'))
  }, [selectedId])

  async function submitBooking() {
    if (!selected || !session || !selectedTierId) return

    setBookingBusy(true)
    setBookingError(null)

    try {
      const response = await createBooking(session, {
        eventId: selected.id,
        ticketTierId: selectedTierId,
        quantity,
      })
      setBooking(response.data)
    } catch (bookingFailure) {
      setBookingError(bookingFailure instanceof Error ? bookingFailure.message : 'Could not create booking')
    } finally {
      setBookingBusy(false)
    }
  }

  if (selected) {
    return (
      <main className="shell">
        <button className="back" data-testid="back-to-events" onClick={() => setSelectedId(null)}>
          <span aria-hidden="true">←</span> Back to events
        </button>
        <div className="detail-hero">
          <Cover event={selected} />
          <div className="detail-hero-copy">
            <p className="eyebrow">{selected.category}</p>
            <h1 data-testid="event-detail-title">{selected.title}</h1>
          </div>
        </div>
        <p className="lede">{selected.description}</p>
        <section className="detail-card">
          <div>
            <span className="label">When</span>
            <strong>{formatDate(selected.startsAt)}</strong>
          </div>
          <div>
            <span className="label">Where</span>
            <strong>{selected.venue.name}</strong>
            <span>{selected.venue.address}</span>
          </div>
          <div>
            <span className="label">Hosted by</span>
            <strong>{selected.host.name}</strong>
          </div>
        </section>
        <div className="section-heading">
          <h2>Tickets</h2>
          <span>{selected.goingCount} going</span>
        </div>
        <div className="tiers">
          {selected.ticketTiers.map((tier) => (
            <button
              className={`tier tier-option ${selectedTierId === tier.id ? 'tier-selected' : ''}`}
              key={tier.id}
              aria-pressed={selectedTierId === tier.id}
              onClick={() => {
                setSelectedTierId(tier.id)
                setBooking(null)
                setBookingError(null)
              }}
            >
              <div>
                <strong>{tier.name}</strong>
                <span>{tier.description}</span>
              </div>
              <strong>{tier.priceCents === 0 ? 'Free' : `$${(tier.priceCents / 100).toFixed(0)}`}</strong>
            </button>
          ))}
        </div>
        {booking ? (
          <section className="booking-confirmation" data-testid="booking-confirmation">
            <span className="eyebrow">Confirmed</span>
            <h2>You’re going.</h2>
            <p>Booking reference</p>
            <strong>{booking.id}</strong>
            <span>{booking.quantity} ticket{booking.quantity === 1 ? '' : 's'} · ${(booking.totalCents / 100).toFixed(2)}</span>
          </section>
        ) : (
          <section className="booking-panel">
            <div className="booking-row">
              <div>
                <span className="label">Quantity</span>
                <strong>{quantity} ticket{quantity === 1 ? '' : 's'}</strong>
              </div>
              <div className="quantity-stepper" aria-label="Ticket quantity">
                <button aria-label="Decrease quantity" disabled={quantity === 1} onClick={() => setQuantity((value) => Math.max(1, value - 1))}>−</button>
                <span>{quantity}</span>
                <button aria-label="Increase quantity" disabled={quantity === 10} onClick={() => setQuantity((value) => Math.min(10, value + 1))}>+</button>
              </div>
            </div>
            {session ? (
              <button className="primary-button booking-button" disabled={bookingBusy || !selectedTierId} onClick={submitBooking}>
                {bookingBusy ? 'Confirming…' : 'Confirm booking'}
              </button>
            ) : (
              <p className="booking-hint">Sign in above before booking your ticket.</p>
            )}
            {bookingError && <p className="error">{bookingError}</p>}
          </section>
        )}
      </main>
    )
  }

  return (
    <main className="shell">
      <header>
        <p className="eyebrow">San Francisco</p>
        <h1>What’s happening?</h1>
        <p className="lede">Find something worth going to.</p>
      </header>
      <AuthPanel />
      {error && <p className="error">{error}</p>}
      {loading ? (
        <p>Loading events…</p>
      ) : (
        <section className="events" aria-label="Events">
          {events.map((event) => (
            <button className="event-card" key={event.id} onClick={() => setSelectedId(event.id)}>
              <Cover event={event} />
              <span className="card-copy" data-testid="event-card">
                <span className="category">{event.category}</span>
                <h2>{event.title}</h2>
                <span className="meta">{formatDate(event.startsAt)} · {event.venue.name}</span>
                <span className="card-footer">
                  <strong>{priceLabel(event)}</strong>
                  <span>{event.goingCount} going <span aria-hidden="true">→</span></span>
                </span>
              </span>
            </button>
          ))}
        </section>
      )}
    </main>
  )
}
