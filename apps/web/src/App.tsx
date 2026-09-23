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
        <button className="back" onClick={() => setSelectedId(null)}>
          ← Back to events
        </button>
        <p className="eyebrow">{selected.category}</p>
        <h1>{selected.title}</h1>
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
        <h2>Tickets</h2>
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
              <span className="category">{event.category}</span>
              <h2>{event.title}</h2>
              <span>{formatDate(event.startsAt)} · {event.venue.name}</span>
              <strong>{priceLabel(event)}</strong>
            </button>
          ))}
        </section>
      )}
    </main>
  )
}
