import { useEffect, useState } from 'react'
import { addAdminAccount, getAdminMembers, getReviewEvents, removeAdminAccount, reviewEvent, verifyMember, type AdminMember, type ReviewEvent, type AuthTokenProvider } from './api'
import { translate, type Language } from './i18n'

export function AdminPanel({ getToken, language, onUserVerified }: { getToken: AuthTokenProvider; language: Language; onUserVerified: () => void }) {
  const t = (text: string) => translate(language, text)
  const [tab, setTab] = useState<'events' | 'users'>('events')
  const [status, setStatus] = useState('pending')
  const [search, setSearch] = useState('')
  const [query, setQuery] = useState('')
  const [page, setPage] = useState(0)
  const [total, setTotal] = useState(0)
  const [users, setUsers] = useState<AdminMember[]>([])
  const [events, setEvents] = useState<ReviewEvent[]>([])
  const [notes, setNotes] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [revision, setRevision] = useState(0)
  useEffect(() => {
    let active = true
    setLoading(true); setError(''); setEvents([]); setUsers([]); setTotal(0)
    const load = async () => {
      if (tab === 'users') { const data = await getAdminMembers(getToken, query, page); if (active) { setUsers(data.users); setTotal(data.total) } }
      else { const data = await getReviewEvents(getToken, status, page); if (active) { setEvents(data.events); setTotal(data.total) } }
    }
    void load().catch((failure) => { if (active) setError(failure instanceof Error ? failure.message : t('Could not load admin panel.')) })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [getToken, tab, query, status, page, revision])

  async function act(operation: () => Promise<unknown>, message: string, verified = false) {
    setBusy(true); setError(''); setNotice('')
    try { await operation(); setNotice(t(message)); setRevision((value) => value + 1); if (verified) onUserVerified() }
    catch (failure) { setError(failure instanceof Error ? failure.message : t('Could not save this change.')) }
    finally { setBusy(false) }
  }
  const name = (user: AdminMember) => user.displayName || user.username || t('Member')
  return <section className="profile-settings moderation-panel" aria-label={t('Admin panel')}>
    <div className="settings-heading"><span className="label">{t('Admin panel')}</span><button className="quiet-button" disabled={busy || loading} onClick={() => setRevision((value) => value + 1)}>{t('Refresh')}</button></div>
    <div className="moderation-tabs" role="tablist" aria-label={t('Admin sections')}>
      {(['events', 'users'] as const).map((value) => <button key={value} role="tab" aria-selected={tab === value} disabled={busy} onClick={() => { setTab(value); setPage(0); setNotice('') }}>{t(value === 'events' ? 'Events' : 'Users')}</button>)}
    </div>
    {tab === 'events' ? <label className="moderation-filter">{t('Publication status')}<select value={status} disabled={busy} onChange={(event) => { setStatus(event.target.value); setPage(0) }}>
      <option value="pending">{t('Pending approval')}</option><option value="approved">{t('Published')}</option><option value="rejected">{t('Rejected')}</option><option value="all">{t('All events')}</option>
    </select></label> : <form className="admin-search-form" onSubmit={(event) => { event.preventDefault(); setQuery(search); setPage(0) }}>
      <input aria-label={t('Search users')} maxLength={50} value={search} onChange={(event) => setSearch(event.target.value)} placeholder={t('Search name or username')} />
      <button className="primary-button" disabled={busy}>{t('Search')}</button>
    </form>}
    {error && <div role="alert"><p className="error">{error}</p><button className="quiet-button" disabled={busy} onClick={() => setRevision((value) => value + 1)}>{t('Try again')}</button></div>}
    {notice && <p className="moderation-notice" role="status">{notice}</p>}
    {loading ? <p role="status">{t('Loading…')}</p> : <>
      {tab === 'users' ? users.map((user) => <article className="moderation-user" key={user.userId}>
        <div><strong>{name(user)}</strong>{user.username && <span>@{user.username}</span>}<small>{t(user.isAdmin ? 'Admin' : 'Member')} · {t(user.verificationStatus === 'verified' ? 'Verified' : user.verificationStatus === 'pending' ? 'Under review' : 'Not verified')}</small></div>
        <div className="moderation-actions">
          {user.verificationStatus !== 'verified' && <button className="primary-button" disabled={busy} onClick={() => void act(() => verifyMember(getToken, user.userId), 'User verified.', true)}>{t('Verify user')}</button>}
          {!user.isAdmin && <button className="quiet-button" disabled={busy} onClick={() => { if (window.confirm(`${t('Grant admin access to')} ${name(user)}?`)) void act(() => addAdminAccount(getToken, user.userId), 'Admin access granted.') }}>{t('Make admin')}</button>}
          {user.isAdmin && !user.isPrimaryAdmin && <button className="quiet-button" disabled={busy} onClick={() => { if (window.confirm(`${t('Remove admin access from')} ${name(user)}?`)) void act(() => removeAdminAccount(getToken, user.userId), 'Admin access removed.') }}>{t('Remove admin')}</button>}
        </div>
      </article>) : events.map((event) => <article className="moderation-event" key={event.id}>
        <div className="moderation-event-heading"><h3>{event.title}</h3><span className={`moderation-badge moderation-${event.publicationStatus}`}>{t(event.publicationStatus === 'pending' ? 'Pending approval' : event.publicationStatus === 'approved' ? 'Published' : 'Rejected')}</span></div>
        <p className="social-muted">{event.hostName} · {t(event.category)}</p><p className="moderation-description">{event.description}</p>
        <dl><div><dt>{t('Starts')}</dt><dd>{new Date(event.startsAt).toLocaleString(language === 'fa' ? 'fa-IR' : 'en-US')}</dd></div><div><dt>{t('Ends')}</dt><dd>{new Date(event.endsAt).toLocaleString(language === 'fa' ? 'fa-IR' : 'en-US')}</dd></div><div><dt>{t('Venue')}</dt><dd>{event.venue?.name} — {event.venue?.address}</dd></div></dl>
        <ul>{event.ticketTiers.map((tier, index) => <li key={index}>{tier.name} · {new Intl.NumberFormat(language === 'fa' ? 'fa-IR' : 'en-US', { style: 'currency', currency: 'USD' }).format(tier.priceCents / 100)}</li>)}</ul>
        {event.reviewNote && <p>{t('Admin note')}: {event.reviewNote}</p>}
        {event.publicationStatus === 'pending' && <>
          <label className="verification-review-label">{t('Review note (optional)')}<textarea rows={2} maxLength={500} value={notes[event.id] ?? ''} onChange={(change) => setNotes((current) => ({ ...current, [event.id]: change.target.value }))} /></label>
          <div className="moderation-actions"><button className="primary-button" disabled={busy} onClick={() => void act(() => reviewEvent(getToken, event.id, 'approve', notes[event.id] ?? ''), 'Event approved and published.')}>{t('Approve and publish')}</button><button className="quiet-button" disabled={busy} onClick={() => void act(() => reviewEvent(getToken, event.id, 'reject', notes[event.id] ?? ''), 'Event rejected.')}>{t('Reject')}</button></div>
        </>}
      </article>)}
      {!error && total === 0 && <p className="social-muted">{t(tab === 'events' ? 'No events in this queue.' : 'No users found.')}</p>}
      {(total > 20 || page > 0) && <div className="host-pagination"><button className="quiet-button" disabled={busy || page === 0} onClick={() => setPage((value) => value - 1)}>{t('Previous')}</button><span>{page + 1} / {Math.max(1, Math.ceil(total / 20))}</span><button className="quiet-button" disabled={busy || (page + 1) * 20 >= total} onClick={() => setPage((value) => value + 1)}>{t('Next')}</button></div>}
    </>}
  </section>
}
