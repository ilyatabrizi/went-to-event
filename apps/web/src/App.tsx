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

function isUpcoming(event: Event | undefined) {
  return event ? new Date(event.endsAt).getTime() >= Date.now() : false
}

function Cover({ event }: { event: Event }) {
  return (
    <div className="cover-art" data-category={event.category} aria-hidden="true">
      <span className="cover-glow" />
      <span className="cover-grid" />
    </div>
  )
}

function Navigation({ onBookings, onHome, onExplore, onProfile, active = 'home' }: { onBookings: () => void; onHome: () => void; onExplore: () => void; onProfile: () => void; active?: string }) {
  return (
    <nav className="app-nav" aria-label="Main navigation">
      <button className={`nav-item ${active === 'home' ? 'nav-active' : ''}`} onClick={onHome}>
        <span aria-hidden="true">⌂</span><span>Home</span>
      </button>
      <button className={`nav-item ${active === 'explore' ? 'nav-active' : ''}`} onClick={onExplore}>
        <span aria-hidden="true">⌕</span><span>Explore</span>
      </button>
      <button className={`nav-item ${active === 'bookings' ? 'nav-active' : ''}`} onClick={onBookings}>
        <span aria-hidden="true">▣</span><span>Bookings</span>
      </button>
      <button className={`nav-item ${active === 'profile' ? 'nav-active' : ''}`} onClick={onProfile}>
        <span aria-hidden="true">●</span><span>Profile</span>
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
  const [showExplore, setShowExplore] = useState(false)
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState('All categories')
  const [dateFilter, setDateFilter] = useState('Any date')
  const [priceFilter, setPriceFilter] = useState('Any price')
  const [sort, setSort] = useState('Recommended')
  const [bookings, setBookings] = useState<Booking[]>([])
  const [bookingEvents, setBookingEvents] = useState<Record<string, Event>>({})
  const [bookingsLoading, setBookingsLoading] = useState(false)
  const [bookingsError, setBookingsError] = useState<string | null>(null)
  const [passBooking, setPassBooking] = useState<Booking | null>(null)
  const [passEvent, setPassEvent] = useState<Event | null>(null)
  const [showAuth, setShowAuth] = useState(false)
  const [showProfile, setShowProfile] = useState(false)
  const [savedIds, setSavedIds] = useState<string[]>([])

  useEffect(() => {
    try {
      const stored = JSON.parse(localStorage.getItem('wte.saved-events') ?? '[]')
      if (Array.isArray(stored)) setSavedIds(stored.filter((id): id is string => typeof id === 'string'))
    } catch {
      setSavedIds([])
    }
  }, [])

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
      const eventEntries = await Promise.all(response.data.map(async (booking) => {
        try {
          const event = await getEvent(booking.eventId)
          return [booking.eventId, event.data] as const
        } catch {
          return null
        }
      }))
      setBookingEvents(Object.fromEntries(eventEntries.filter((entry): entry is readonly [string, Event] => entry !== null)))
    } catch (bookingFailure) {
      setBookingsError(bookingFailure instanceof Error ? bookingFailure.message : 'Could not load bookings')
    } finally {
      setBookingsLoading(false)
    }
  }

  function openProfile() {
    setSelectedId(null)
    setShowBookings(false)
    setShowExplore(false)
    setShowProfile(true)
    setPassBooking(null)
    setPassEvent(null)
  }

  function openExplore() {
    setSelectedId(null)
    setShowBookings(false)
    setShowProfile(false)
    setShowExplore(true)
    setPassBooking(null)
    setPassEvent(null)
  }

  function toggleSaved(eventId: string) {
    setSavedIds((current) => {
      const next = current.includes(eventId)
        ? current.filter((id) => id !== eventId)
        : [eventId, ...current]
      localStorage.setItem('wte.saved-events', JSON.stringify(next))
      return next
    })
  }

  function openSavedEvent(eventId: string) {
    setShowProfile(false)
    setSelectedId(eventId)
  }

  async function logout() {
    if (supabase) await supabase.auth.signOut()
    setShowProfile(false)
    setShowBookings(false)
    setShowExplore(false)
    setSelectedId(null)
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

  if (showProfile) {
    if (!session) {
      return (
        <main className="shell auth-shell">
          <button className="back" data-testid="back-from-profile" onClick={() => setShowProfile(false)}>
            <span aria-hidden="true">←</span> Back to events
          </button>
          <header>
            <p className="eyebrow">Your account</p>
            <h1>Sign in to see your profile.</h1>
            <p className="lede">Your profile and bookings live here once you have an account.</p>
          </header>
          <button className="primary-button booking-button" data-testid="profile-sign-in" onClick={() => { setShowProfile(false); setShowAuth(true) }}>
            Sign in or create account
          </button>
        </main>
      )
    }

    return (
      <main className="shell profile-shell">
        <Navigation onHome={() => setShowProfile(false)} onBookings={openBookings} onExplore={openExplore} onProfile={openProfile} active="profile" />
        <header>
          <p className="eyebrow">Your account</p>
          <h1>Your profile</h1>
          <p className="lede">Manage your account and the events you’re going to.</p>
        </header>
        <section className="profile-card" data-testid="profile-card">
          <div className="profile-avatar" aria-hidden="true">{(session.user.email ?? 'U').slice(0, 1).toUpperCase()}</div>
          <div className="profile-identity">
            <span className="label">Signed in as</span>
            <strong>{session.user.email}</strong>
          </div>
          <button className="logout-button" data-testid="logout" onClick={logout}>Log out</button>
        </section>
        <section className="saved-section" aria-label="Saved events">
          <div className="section-heading">
            <h2>Saved events</h2>
            <span>{savedIds.length}</span>
          </div>
          {savedIds.length === 0 ? (
            <div className="empty-state"><h2>No saved events yet.</h2><p>Save an event from its detail page and it will appear here.</p></div>
          ) : (
            <div className="saved-list">
              {savedIds.map((eventId) => {
                const event = events.find((candidate) => candidate.id === eventId)
                if (!event) return null
                return (
                  <div className="saved-event" key={event.id}>
                    <button className="saved-event-main" onClick={() => openSavedEvent(event.id)}>
                      <Cover event={event} />
                      <span><strong>{event.title}</strong><small>{formatDate(event.startsAt)} · {event.venue.name}</small></span>
                    </button>
                    <button className="saved-remove" aria-label={`Remove ${event.title} from saved events`} onClick={() => toggleSaved(event.id)}>×</button>
                  </div>
                )
              })}
            </div>
          )}
        </section>
      </main>
    )
  }

  if (showExplore) {
    const normalizedQuery = query.trim().toLowerCase()
    const filteredEvents = events
      .filter((event) => {
        const searchable = `${event.title} ${event.category} ${event.host.name} ${event.venue.name} ${event.description}`.toLowerCase()
        const lowestPrice = Math.min(...event.ticketTiers.map((tier) => tier.priceCents))
        const eventDate = new Date(event.startsAt)
        const today = new Date()
        const sameDay = eventDate.toDateString() === today.toDateString()
        const withinWeek = eventDate.getTime() >= today.getTime() && eventDate.getTime() <= today.getTime() + 7 * 24 * 60 * 60 * 1000

        return (!normalizedQuery || searchable.includes(normalizedQuery))
          && (category === 'All categories' || event.category === category)
          && (dateFilter === 'Any date' || (dateFilter === 'Today' ? sameDay : withinWeek))
          && (priceFilter === 'Any price'
            || (priceFilter === 'Free' && lowestPrice === 0)
            || (priceFilter === 'Under $25' && lowestPrice < 2500)
            || (priceFilter === 'Under $50' && lowestPrice < 5000))
      })
      .sort((a, b) => {
        if (sort === 'Soonest') return new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime()
        if (sort === 'Most going') return b.goingCount - a.goingCount
        if (sort === 'Price: low to high') return Math.min(...a.ticketTiers.map((tier) => tier.priceCents)) - Math.min(...b.ticketTiers.map((tier) => tier.priceCents))
        return 0
      })

    return (
      <main className="shell">
        <Navigation onHome={() => setShowExplore(false)} onBookings={openBookings} onExplore={openExplore} onProfile={openProfile} active="explore" />
        <header>
          <p className="eyebrow">Discover</p>
          <h1>Explore events.</h1>
          <p className="lede">Search for something worth going to.</p>
        </header>
        <section className="explore-controls" aria-label="Event filters">
          <input
            aria-label="Search events"
            className="explore-search"
            placeholder="Search events, hosts, venues"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
          <div className="filter-grid">
            <label>Category<select aria-label="Category" value={category} onChange={(event) => setCategory(event.target.value)}>
              <option>All categories</option>
              {[...new Set(events.map((event) => event.category))].map((value) => <option key={value}>{value}</option>)}
            </select></label>
            <label>Date<select aria-label="Date" value={dateFilter} onChange={(event) => setDateFilter(event.target.value)}>
              <option>Any date</option><option>Today</option><option>This week</option>
            </select></label>
            <label>Price<select aria-label="Price" value={priceFilter} onChange={(event) => setPriceFilter(event.target.value)}>
              <option>Any price</option><option>Free</option><option>Under $25</option><option>Under $50</option>
            </select></label>
            <label>Sort<select aria-label="Sort" value={sort} onChange={(event) => setSort(event.target.value)}>
              <option>Recommended</option><option>Soonest</option><option>Most going</option><option>Price: low to high</option>
            </select></label>
          </div>
        </section>
        <div className="explore-results-heading">
          <h2>{filteredEvents.length} {filteredEvents.length === 1 ? 'event' : 'events'}</h2>
          {(query || category !== 'All categories' || dateFilter !== 'Any date' || priceFilter !== 'Any price' || sort !== 'Recommended') && (
            <button className="quiet-button" onClick={() => { setQuery(''); setCategory('All categories'); setDateFilter('Any date'); setPriceFilter('Any price'); setSort('Recommended') }}>Clear filters</button>
          )}
        </div>
        {filteredEvents.length ? (
          <section className="events" aria-label="Explore results">
            {filteredEvents.map((event) => (
              <button className="event-card" key={event.id} onClick={() => { setShowExplore(false); setSelectedId(event.id) }}>
                <Cover event={event} />
                <span className="card-copy" data-testid="event-card">
                  <span className="category">{event.category}</span>
                  <h2>{event.title}</h2>
                  <span className="meta">{formatDate(event.startsAt)} · {event.venue.name}</span>
                  <span className="card-footer"><strong>{priceLabel(event)}</strong><span>{event.goingCount} going →</span></span>
                </span>
              </button>
            ))}
          </section>
        ) : (
          <section className="empty-state" data-testid="explore-empty"><h2>No events match.</h2><p>Try a different search or clear one of the filters.</p></section>
        )}
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
        <button
          className="save-event-button"
          aria-pressed={savedIds.includes(selected.id)}
          onClick={() => toggleSaved(selected.id)}
        >
          {savedIds.includes(selected.id) ? '★ Saved event' : '☆ Save event'}
        </button>
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

    const bookingSections: Array<{ title: string; items: Booking[] }> = [
      {
        title: 'Upcoming',
        items: bookings.filter((booking) => isUpcoming(bookingEvents[booking.eventId])),
      },
      {
        title: 'Past',
        items: bookings.filter((booking) => !isUpcoming(bookingEvents[booking.eventId])),
      },
    ]

    return (
      <main className="shell">
        <Navigation onHome={() => setShowBookings(false)} onBookings={openBookings} onExplore={openExplore} onProfile={openProfile} active="bookings" />
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
          <div className="booking-sections">
            {bookingSections.map(({ title, items }) => (
              items.length > 0 && (
                <section className="booking-section" aria-label={`${title} bookings`} key={title}>
                  <div className="section-heading"><h2>{title}</h2><span>{items.length}</span></div>
                  <div className="booking-list">
                    {items.map((booking) => {
                      const event = bookingEvents[booking.eventId]
                      return (
                        <button className="booking-list-item" key={booking.id} onClick={() => openPass(booking)}>
                          <span>
                            <span className="label">{booking.status === 'confirmed' ? 'Confirmed' : booking.status}</span>
                            <strong>{event?.title ?? booking.eventId}</strong>
                            {event && <small>{formatDate(event.startsAt)} · {event.venue.name}</small>}
                          </span>
                          <span><strong>{booking.quantity} ×</strong><span>${(booking.totalCents / 100).toFixed(2)} →</span></span>
                        </button>
                      )
                    })}
                  </div>
                </section>
              )
            ))}
          </div>
        )}
      </main>
    )
  }

  return (
    <main className="shell">
      <Navigation onHome={() => { setShowExplore(false); setShowBookings(false) }} onBookings={openBookings} onExplore={openExplore} onProfile={openProfile} />
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
