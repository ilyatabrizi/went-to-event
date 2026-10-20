import { useEffect, useMemo, useState } from 'react'
import { getHostDashboard, type AuthTokenProvider, type HostDashboardData } from './api'
import { translate, type Language } from './i18n'

export function HostDashboard({ getToken, language, onBack, onCreate, onCheckIn }: {
  getToken: AuthTokenProvider; language: Language; onBack: () => void; onCreate: () => void; onCheckIn: () => void
}) {
  const t = (value: string) => translate(language, value)
  const [data, setData] = useState<HostDashboardData | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [retry, setRetry] = useState(0)
  const [eventId, setEventId] = useState('all')
  const [days, setDays] = useState('30')
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('all')
  const [page, setPage] = useState(0)
  const locale = language === 'fa' ? 'fa-IR' : language
  const money = (cents: number) => new Intl.NumberFormat(locale, { style: 'currency', currency: 'USD', maximumFractionDigits: 2 }).format(cents / 100)
  const number = (value: number) => value.toLocaleString(locale)
  const date = (value: string) => new Date(value).toLocaleDateString(locale, { month: 'short', day: 'numeric' })

  useEffect(() => {
    let active = true
    setLoading(true)
    setError(null)
    getHostDashboard(getToken).then((response) => { if (active) setData(response.data) })
      .catch((failure) => { if (active) setError(failure instanceof Error ? failure.message : 'Could not load host analytics.') })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [getToken, retry])
  useEffect(() => { setPage(0) }, [eventId, days, search, status])

  const analytics = useMemo(() => {
    const now = new Date()
    const start = new Date(now)
    start.setHours(0, 0, 0, 0)
    if (days !== 'all') start.setDate(start.getDate() - (Number(days) - 1))
    const registrations = (data?.registrations ?? []).filter((row) => (eventId === 'all' || row.eventId === eventId)
      && (days === 'all' || new Date(row.createdAt) >= start) && new Date(row.createdAt) <= now)
    const confirmed = registrations.filter((row) => row.status === 'confirmed')
    const tickets = confirmed.reduce((sum, row) => sum + row.quantity, 0)
    const revenue = confirmed.reduce((sum, row) => sum + row.totalCents, 0)
    const checkedIn = confirmed.reduce((sum, row) => sum + row.checkedIn, 0)
    const chartStart = days === 'all' && registrations.length
      ? new Date(registrations.reduce((earliest, row) => Math.min(earliest, new Date(row.createdAt).getTime()), now.getTime())) : start
    chartStart.setHours(0, 0, 0, 0)
    // Calendar-aligned buckets keep the chart correct across daylight-saving changes.
    const span = Math.max(1, Math.round((Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()) - Date.UTC(chartStart.getFullYear(), chartStart.getMonth(), chartStart.getDate())) / 86400000) + 1)
    const bucketDays = Math.max(1, Math.ceil(span / 12))
    const buckets = Array.from({ length: Math.ceil(span / bucketDays) }, (_, index) => {
      const from = new Date(chartStart); from.setDate(from.getDate() + index * bucketDays)
      const to = new Date(from); to.setDate(to.getDate() + bucketDays)
      const rows = confirmed.filter((row) => new Date(row.createdAt) >= from && new Date(row.createdAt) < to)
      return { from: from.toISOString(), revenue: rows.reduce((sum, row) => sum + row.totalCents, 0), tickets: rows.reduce((sum, row) => sum + row.quantity, 0) }
    })
    return { registrations, confirmed, tickets, revenue, checkedIn, buckets }
  }, [data, days, eventId])
  const guests = analytics.registrations.filter((row) => (status === 'all' || row.status === status)
    && `${row.displayName} ${row.username ?? ''} ${row.id}`.toLowerCase().includes(search.toLowerCase().trim()))
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
  const eventName = (id: string) => data?.events.find((event) => event.id === id)?.title ?? id
  const maxRevenue = Math.max(1, ...analytics.buckets.map((bucket) => bucket.revenue))
  const maxTickets = Math.max(1, ...analytics.buckets.map((bucket) => bucket.tickets))
  const checkInRate = analytics.tickets ? Math.round(analytics.checkedIn / analytics.tickets * 100) : 0

  return <main className="shell host-dashboard" dir={language === 'fa' ? 'rtl' : 'ltr'}>
    <div className="host-topbar"><button className="back" onClick={onBack}>← {t('Back to profile')}</button><span className="host-verified">✓ {t('Verified host')}</span></div>
    <header className="host-heading"><div><p className="eyebrow">{t('Host workspace')}</p><h1>{t('Hosting dashboard')}</h1><p>{t('Your events. Your audience. Every detail in view.')}</p></div><div className="host-actions"><button className="ghost-button" onClick={onCheckIn}>{t('Check in guests')}</button><button className="primary-button" onClick={onCreate}>＋ {t('Create an event')}</button></div></header>
    {loading ? <div className="host-loading" role="status">{t('Loading host analytics…')}</div> : error ? <div className="host-card host-error" role="alert"><h2>{t('Could not load host analytics.')}</h2><p>{error}</p><button className="primary-button" onClick={() => setRetry((value) => value + 1)}>{t('Try again')}</button></div> : data && <>
      {!data.events.length ? <section className="host-card host-empty"><span aria-hidden="true">✦</span><h2>{t('Your hosting story starts here.')}</h2><p>{t('Publish your first event to start tracking tickets, registrations, and booked revenue.')}</p><button className="primary-button" onClick={onCreate}>{t('Create an event')}</button></section> : <>
        <section className="host-filters" aria-label={t('Analytics filters')}><label>{t('Event')}<select aria-label={t('Event')} value={eventId} onChange={(event) => setEventId(event.target.value)}><option value="all">{t('All events')}</option>{data.events.map((event) => <option key={event.id} value={event.id}>{event.title}</option>)}</select></label><label>{t('Booking period')}<select aria-label={t('Booking period')} value={days} onChange={(event) => setDays(event.target.value)}><option value="7">{t('Last 7 days')}</option><option value="30">{t('Last 30 days')}</option><option value="90">{t('Last 90 days')}</option><option value="all">{t('All time')}</option></select></label><button className="ghost-button host-refresh" onClick={() => setRetry((value) => value + 1)}>↻ {t('Refresh')}</button></section>
        <div className="host-metrics">
          {[['Booked revenue', money(analytics.revenue), 'Confirmed booking value · USD', '↗'], ['Tickets booked', number(analytics.tickets), 'Tickets in confirmed bookings', '▤'], ['Registered guests', number(new Set(analytics.confirmed.map((row) => row.attendeeId)).size), 'Unique confirmed bookers', '♙'], ['Checked in', number(analytics.checkedIn), `${checkInRate}% ${t('of confirmed tickets')}`, '✓']].map(([label, value, hint, icon]) => <section className="host-card host-metric" key={label}><div><span>{t(label)}</span><span className="host-metric-icon" aria-hidden="true">{icon}</span></div><strong>{value}</strong><small>{t(hint)}</small></section>)}
        </div>
        <p className="host-revenue-note">{t('Booked revenue reflects confirmed bookings. Payment collection, refunds, and payouts are not tracked yet.')}</p>
        <div className="host-charts"><section className="host-card"><div className="host-section-heading"><div><p className="eyebrow">{t('Performance')}</p><h2>{t('Revenue over time')}</h2></div><strong>{money(analytics.revenue)}</strong></div>
          <div className="host-bar-chart" role="img" aria-label={`${t('Revenue over time')}: ${money(analytics.revenue)}`}><div className="host-chart-bars">{analytics.buckets.map((bucket) => <div className="host-chart-column" key={bucket.from}><div className="host-chart-track"><div className="host-chart-bar" style={{ height: `${bucket.revenue / maxRevenue * 100}%` }} title={`${date(bucket.from)}: ${money(bucket.revenue)}`} /></div><span>{date(bucket.from)}</span></div>)}</div></div>
          {!analytics.revenue && <p className="host-chart-empty">{t('No booked revenue in this period.')}</p>}
        </section><section className="host-card"><div className="host-section-heading"><div><p className="eyebrow">{t('Audience')}</p><h2>{t('Ticket activity')}</h2></div><strong>{number(analytics.tickets)}</strong></div><div className="host-bar-chart" role="img" aria-label={`${t('Ticket activity')}: ${number(analytics.tickets)}`}><div className="host-chart-bars">{analytics.buckets.map((bucket) => <div className="host-chart-column" key={bucket.from}><div className="host-chart-track"><div className="host-chart-bar host-chart-bar-tickets" style={{ height: `${bucket.tickets / maxTickets * 100}%` }} title={`${date(bucket.from)}: ${number(bucket.tickets)} ${t('tickets')}`} /></div><span>{date(bucket.from)}</span></div>)}</div></div><p className="host-chart-empty">{t('Tickets grouped by booking date')}</p></section></div>
        <section className="host-card"><div className="host-section-heading"><div><p className="eyebrow">{t('Event portfolio')}</p><h2>{t('Event performance')}</h2></div><span>{number(data.events.filter((event) => eventId === 'all' || event.id === eventId).length)} {t('events')}</span></div><div className="host-table-scroll"><table className="host-table"><thead><tr>{['Event', 'Tickets booked', 'Booked revenue', 'Checked in'].map((label) => <th key={label}>{t(label)}</th>)}</tr></thead><tbody>{data.events.filter((event) => eventId === 'all' || event.id === eventId).sort((a, b) => b.startsAt.localeCompare(a.startsAt)).map((event) => {
          const rows = analytics.confirmed.filter((row) => row.eventId === event.id)
          return <tr key={event.id}><td><button className="host-event-link" onClick={() => setEventId(event.id)}>{event.title}</button><small>{date(event.startsAt)} · {t(new Date(event.endsAt) < new Date() ? 'Past' : 'Upcoming')}</small></td><td>{number(rows.reduce((sum, row) => sum + row.quantity, 0))}</td><td>{money(rows.reduce((sum, row) => sum + row.totalCents, 0))}</td><td>{number(rows.reduce((sum, row) => sum + row.checkedIn, 0))}</td></tr>
        })}</tbody></table></div></section>
        <section className="host-card"><div className="host-section-heading"><div><p className="eyebrow">{t('Guest management')}</p><h2>{t('Registrations')}</h2></div><span>{number(guests.length)} {t('bookings')}</span></div><div className="host-guest-filters"><label><span className="host-sr-only">{t('Search guests')}</span><input type="search" placeholder={t('Search name, username, or booking reference')} value={search} onChange={(event) => setSearch(event.target.value)} /></label><label><span className="host-sr-only">{t('Booking status')}</span><select aria-label={t('Booking status')} value={status} onChange={(event) => setStatus(event.target.value)}><option value="all">{t('All statuses')}</option><option value="confirmed">{t('Confirmed')}</option><option value="pending">{t('Pending')}</option><option value="cancelled">{t('Cancelled')}</option></select></label></div>
          <div className="host-table-scroll"><table className="host-table"><thead><tr>{['Guest', 'Event', 'Tickets', 'Booking value', 'Status', 'Checked in'].map((label) => <th key={label}>{t(label)}</th>)}</tr></thead><tbody>{guests.slice(page * 10, page * 10 + 10).map((row) => <tr key={row.id}><td><strong>{row.displayName}</strong>{row.username && <small>@{row.username}</small>}<small title={row.id}>{date(row.createdAt)} · {row.id.slice(0, 8)}</small></td><td>{eventName(row.eventId)}<small>{row.ticketNames.join(', ')}</small></td><td>{number(row.quantity)}</td><td>{money(row.totalCents)}</td><td><span className={`host-status host-status-${row.status}`}>{t(row.status === 'confirmed' ? 'Confirmed' : row.status === 'pending' ? 'Pending' : 'Cancelled')}</span></td><td>{number(row.checkedIn)} / {number(row.quantity)}</td></tr>)}</tbody></table></div>
          {!guests.length && <p className="host-empty-results">{t('No registrations match these filters.')}</p>}
          {guests.length > 10 && <div className="host-pagination"><button className="ghost-button" disabled={page === 0} onClick={() => setPage((value) => value - 1)}>{t('Previous')}</button><span>{number(page + 1)} / {number(Math.ceil(guests.length / 10))}</span><button className="ghost-button" disabled={(page + 1) * 10 >= guests.length} onClick={() => setPage((value) => value + 1)}>{t('Next')}</button></div>}
        </section>
      </>}
    </>}
  </main>
}
