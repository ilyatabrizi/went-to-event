import { useEffect, useState } from 'react'
import { getEvent, getEvents, type Event } from './api'

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
      .then((response) => setSelected(response.data))
      .catch(() => setError('Could not load that event.'))
  }, [selectedId])

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
            <div className="tier" key={tier.id}>
              <div>
                <strong>{tier.name}</strong>
                <span>{tier.description}</span>
              </div>
              <strong>{tier.priceCents === 0 ? 'Free' : `$${(tier.priceCents / 100).toFixed(0)}`}</strong>
            </div>
          ))}
        </div>
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
