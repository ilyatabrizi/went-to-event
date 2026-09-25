import { useEffect, useState } from 'react'
import type { Session } from '@supabase/supabase-js'
import { createBooking, getBookings, getEvent, getEvents, type Booking, type Event } from './api'
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

function Navigation({ onBookings, onHome }: { onBookings: () => void; onHome: () => void }) {
  return (
    <nav className="app-nav" aria-label="Main navigation">
      <button className="nav-item nav-active" onClick={onHome}>
        <span aria-hidden="true">⌂</span><span>Home</span>
      </button>
      <button className="nav-item" onClick={onBookings}>
        <span aria-hidden="true">▣</span><span>Bookings</span>
      </button>
    </nav>
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
  const [showBookings, setShowBookings] = useState(false)
  const [bookings, setBookings] = useState<Booking[]>([])
  const [bookingsLoading, setBookingsLoading] = useState(false)
  const [bookingsError, setBookingsError] = useState<string | null>(null)
  const [passBooking, setPassBooking] = useState<Booking | null>(null)
  const [passEvent, setPassEvent] = useState<Event | null>(null)
  const [showAuth, setShowAuth] = useState(false)

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

  async function openBookings() {
    if (!session) return

    setSelectedId(null)
    setPassBooking(null)
    setPassEvent(null)
    setShowBookings(true)
    setBookingsLoading(true)
    setBookingsError(null)

    try {
      const response = await getBookings(session)
      setBookings(response.data)
    } catch (bookingFailure) {
      setBookingsError(bookingFailure instanceof Error ? bookingFailure.message : 'Could not load bookings')
    } finally {
      setBookingsLoading(false)
    }
  }

  async function openPass(bookingToOpen: Booking) {
    setPassBooking(bookingToOpen)
    setPassEvent(null)

    try {
      const response = await getEvent(bookingToOpen.eventId)
      setPassEvent(response.data)
    } catch {
      setBookingsError('Could not load the event for this booking.')
    }
  }

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

  if (showAuth) {
    return (
      <main className="shell auth-shell">
        <button className="back" data-testid="back-from-auth" onClick={() => setShowAuth(false)}>
          <span aria-hidden="true">←</span> Back to event
        </button>
        <header>
          <p className="eyebrow">One more step</p>
          <h1>Sign in to book.</h1>
          <p className="lede">Create an account or sign in to keep your tickets and passes together.</p>
        </header>
        <AuthPanel page onAuthenticated={() => setShowAuth(false)} />
      </main>
    )
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
              <button className="primary-button booking-button" data-testid="sign-in-to-book" onClick={() => setShowAuth(true)}>
                Sign in to book
              </button>
            )}
            {bookingError && <p className="error">{bookingError}</p>}
          </section>
        )}
      </main>
    )
  }

  if (showBookings) {
    if (passBooking) {
      return (
        <main className="shell">
          <button className="back" data-testid="back-to-bookings" onClick={() => setPassBooking(null)}>
            <span aria-hidden="true">←</span> Back to bookings
          </button>
          <section className="pass-card" data-testid="booking-pass">
            <div className="pass-mark">e.</div>
            <span className="eyebrow">Confirmed pass</span>
            <h1>{passEvent?.title ?? 'Your event pass'}</h1>
            {passEvent && (
              <div className="pass-details">
                <div><span className="label">When</span><strong>{formatDate(passEvent.startsAt)}</strong></div>
                <div><span className="label">Where</span><strong>{passEvent.venue.name}</strong></div>
              </div>
            )}
            <div className="pass-code" aria-label="Booking reference">{passBooking.id.slice(0, 8).toUpperCase()}</div>
            <div className="pass-footer">
              <span>{passBooking.quantity} ticket{passBooking.quantity === 1 ? '' : 's'}</span>
              <strong>${(passBooking.totalCents / 100).toFixed(2)}</strong>
            </div>
          </section>
        </main>
      )
    }

    return (
      <main className="shell">
        <Navigation onHome={() => setShowBookings(false)} onBookings={openBookings} />
        <button className="back" data-testid="back-to-events-from-bookings" onClick={() => setShowBookings(false)}>
          <span aria-hidden="true">←</span> Back to events
        </button>
        <header>
          <p className="eyebrow">Your account</p>
          <h1>Your bookings</h1>
          <p className="lede">Your confirmed nights, all in one place.</p>
        </header>
        {bookingsError && <p className="error">{bookingsError}</p>}
        {bookingsLoading ? <p>Loading bookings…</p> : bookings.length === 0 ? (
          <section className="empty-state"><h2>No bookings yet.</h2><p>Find an event worth going to and your pass will appear here.</p></section>
        ) : (
          <section className="booking-list" aria-label="Your bookings">
            {bookings.map((booking) => (
              <button className="booking-list-item" key={booking.id} onClick={() => openPass(booking)}>
                <span><span className="label">Confirmed</span><strong>{booking.eventId}</strong></span>
                <span><strong>{booking.quantity} ×</strong><span>${(booking.totalCents / 100).toFixed(2)} →</span></span>
              </button>
            ))}
          </section>
        )}
      </main>
    )
  }

  return (
    <main className="shell">
      <Navigation onHome={() => setShowBookings(false)} onBookings={openBookings} />
      <header>
        <p className="eyebrow">San Francisco</p>
        <h1>What’s happening?</h1>
        <p className="lede">Find something worth going to.</p>
      </header>
      {session && <button className="bookings-link" data-testid="open-bookings" onClick={openBookings}>Your bookings <span aria-hidden="true">→</span></button>}
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
