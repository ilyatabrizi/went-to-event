import { useEffect, useState, type FormEvent } from 'react'
import {
  addAdminAccount,
  downloadBusinessLeadsCsv,
  getAdminAccounts,
  getAdminVerificationRequests,
  getVerificationStatus,
  removeAdminAccount,
  requestAccountVerification,
  reviewAccountVerification,
  searchAdminCandidates,
  type AdminAccount,
  type AdminCandidate,
  type AuthTokenProvider,
  type Event,
  type VerificationReviewRequest,
  type VerificationState,
} from './api'
import { EventCreationPanel } from './EventCreationPanel'
import { translate, type Language } from './i18n'

function verificationLabel(status: VerificationState['status'], t: (text: string) => string) {
  return status === 'verified' ? t('Verified') : status === 'pending' ? t('Under review') : status === 'rejected' ? t('Not approved') : status === 'suspended' ? t('Suspended') : t('Not verified')
}

export function VerificationPanel({ getToken, onEventCreated, language }: { getToken: AuthTokenProvider; onEventCreated: (event: Event) => void; language: Language }) {
  const t = (text: string) => translate(language, text)
  const [state, setState] = useState<VerificationState | null>(null)
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState('')
  const [referenceUrl, setReferenceUrl] = useState('')
  const [isAdmin, setIsAdmin] = useState(false)
  const [canManageAdmins, setCanManageAdmins] = useState(false)
  const [adminRequests, setAdminRequests] = useState<VerificationReviewRequest[]>([])
  const [admins, setAdmins] = useState<AdminAccount[]>([])
  const [adminSearch, setAdminSearch] = useState('')
  const [adminCandidates, setAdminCandidates] = useState<AdminCandidate[]>([])
  const [adminSearchComplete, setAdminSearchComplete] = useState(false)
  const [adminSearchBusy, setAdminSearchBusy] = useState(false)
  const [reviewNotes, setReviewNotes] = useState<Record<string, string>>({})
  const [exportingLeads, setExportingLeads] = useState(false)

  useEffect(() => {
    let cancelled = false
    getVerificationStatus(getToken)
      .then((next) => { if (!cancelled) setState(next) })
      .catch((failure) => { if (!cancelled) setError(failure instanceof Error ? failure.message : t('Could not load verification status.')) })
      .finally(() => { if (!cancelled) setLoading(false) })
    getAdminVerificationRequests(getToken)
      .then(async ({ requests, canManageAdmins: canManage }) => {
        if (cancelled) return
        setIsAdmin(true)
        setAdminRequests(requests)
        setCanManageAdmins(canManage)
        if (canManage) {
          const { admins: currentAdmins } = await getAdminAccounts(getToken)
          if (!cancelled) setAdmins(currentAdmins)
        }
      })
      .catch(() => {})
    return () => { cancelled = true }
  }, [getToken])

  async function submitRequest(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setBusy(true)
    setError(null)
    try {
      await requestAccountVerification(getToken, { message: message.trim(), ...(referenceUrl.trim() ? { referenceUrl: referenceUrl.trim() } : {}) })
      const next = await getVerificationStatus(getToken)
      setState(next)
      setMessage('')
      setReferenceUrl('')
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : t('Could not submit the verification request.'))
    } finally {
      setBusy(false)
    }
  }

  async function reviewRequest(requestId: string, decision: 'approve' | 'reject') {
    setBusy(true)
    setError(null)
    try {
      await reviewAccountVerification(getToken, requestId, decision, reviewNotes[requestId] ?? '')
      setAdminRequests((current) => current.filter((request) => request.id !== requestId))
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : t('Could not review this request.'))
    } finally {
      setBusy(false)
    }
  }

  async function searchForAdmins(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setAdminSearchBusy(true)
    setError(null)
    try {
      const { users } = await searchAdminCandidates(getToken, adminSearch.trim())
      setAdminCandidates(users.filter((candidate) => !admins.some((admin) => admin.userId === candidate.userId)))
      setAdminSearchComplete(true)
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : t('Could not search for users.'))
    } finally {
      setAdminSearchBusy(false)
    }
  }

  async function grantAdmin(candidate: AdminCandidate) {
    setBusy(true)
    setError(null)
    try {
      await addAdminAccount(getToken, candidate.userId)
      const { admins: currentAdmins } = await getAdminAccounts(getToken)
      setAdmins(currentAdmins)
      setAdminCandidates((current) => current.filter((user) => user.userId !== candidate.userId))
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : t('Could not add this admin.'))
    } finally {
      setBusy(false)
    }
  }

  async function revokeAdmin(admin: AdminAccount) {
    if (!window.confirm(`${t('Remove admin access from')} ${admin.displayName || admin.username || t('this account')}?`)) return
    setBusy(true)
    setError(null)
    try {
      await removeAdminAccount(getToken, admin.userId)
      setAdmins((current) => current.filter((currentAdmin) => currentAdmin.userId !== admin.userId))
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : t('Could not remove this admin.'))
    } finally {
      setBusy(false)
    }
  }

  async function exportBusinessLeads() {
    setExportingLeads(true)
    setError(null)
    try {
      const { blob, filename } = await downloadBusinessLeadsCsv(getToken)
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = filename
      link.click()
      URL.revokeObjectURL(url)
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : t('Could not download company inquiries.'))
    } finally {
      setExportingLeads(false)
    }
  }

  if (loading) return <section className="profile-settings"><p className="profile-loading">{t('Loading verification…')}</p></section>

  return (
    <>
      <section id="account-verification-panel" className="profile-settings verification-card" aria-label={t('Account verification')}>
        <div className="settings-heading"><span className="label">{t('Account verification')}</span><span>{state ? verificationLabel(state.status, t) : t('Unavailable')}</span></div>
        {state?.status === 'verified' ? <>
          <p>{t('Your account has been verified. You can add events.')}</p>
          <EventCreationPanel getToken={getToken} onCreated={onEventCreated} language={language} />
        </> : state?.status === 'pending' ? <>
          <p>{t('Your request is waiting for a manual review. We’ll update this page when it’s reviewed.')}</p>
          {state.request?.referenceUrl && <a href={state.request.referenceUrl} target="_blank" rel="noreferrer">{t('Submitted reference')}</a>}
        </> : state?.status === 'suspended' ? <p>{t('Verification access is currently suspended. Contact support if you think this is a mistake.')}</p> : <>
          {state?.request?.reviewNote && <p className="verification-review-note">{t('Admin note')}: {state.request.reviewNote}</p>}
          <p>{t('Tell us about your events and share a public link an admin can use to review your account. Please don’t submit identity documents here.')}</p>
          <form className="profile-form" onSubmit={submitRequest}>
            <label>{t('Why should your account be verified?')}<textarea required minLength={20} maxLength={1000} rows={4} value={message} onChange={(event) => setMessage(event.target.value)} placeholder={t('Tell us what kinds of events you plan to host.')} /></label>
            <label>{t('Website or public reference link (optional)')}<input type="url" maxLength={500} value={referenceUrl} onChange={(event) => setReferenceUrl(event.target.value)} placeholder={t('https://…')} /></label>
            <button className="primary-button" disabled={busy}>{busy ? t('Submitting…') : state?.status === 'rejected' ? t('Request another review') : t('Request verification')}</button>
          </form>
        </>}
        {error && <p className="error" role="alert">{error}</p>}
      </section>
      {isAdmin && <section className="profile-settings verification-admin" aria-label={t('Admin review queue')}>
        <div className="settings-heading"><span className="label">{t('Admin review queue')}</span><span>{adminRequests.length} {t('pending')}</span></div>
        {adminRequests.length ? adminRequests.map((request) => (
          <article className="verification-request" key={request.id}>
            <div className="verification-request-heading">
              <strong>{request.displayName || request.username || 'Went To Event member'}</strong>
              {request.username && <span>@{request.username}</span>}
              {request.email && <span>{request.email}</span>}
              <small>{new Intl.DateTimeFormat(language === 'fa' ? 'fa-IR' : 'en-US').format(new Date(request.createdAt))}</small>
            </div>
            <p>{request.message}</p>
            {request.referenceUrl && <a href={request.referenceUrl} target="_blank" rel="noreferrer">{t('Open public reference')}</a>}
            <label className="verification-review-label">{t('Review note (optional)')}<input maxLength={500} value={reviewNotes[request.id] ?? ''} onChange={(event) => setReviewNotes((current) => ({ ...current, [request.id]: event.target.value }))} placeholder={t('Shown to the applicant if rejected')} /></label>
            <div className="event-create-actions">
              <button className="primary-button" disabled={busy} onClick={() => reviewRequest(request.id, 'approve')}>{t('Approve')}</button>
              <button className="quiet-button" disabled={busy} onClick={() => reviewRequest(request.id, 'reject')}>{t('Reject')}</button>
            </div>
          </article>
        )) : <p className="social-muted">{t('No requests need review.')}</p>}
      </section>}
      {isAdmin && <section className="profile-settings verification-admin" aria-label={t('Company inquiry export')}>
        <div className="settings-heading"><span className="label">{t('Company inquiries')}</span></div>
        <p className="social-muted">{t('Download submitted company contact details as a CSV file. This export is available only to admins.')}</p>
        <button className="primary-button" type="button" disabled={exportingLeads} onClick={exportBusinessLeads}>{exportingLeads ? t('Preparing CSV…') : t('Download CSV')}</button>
      </section>}
      {canManageAdmins && <section className="profile-settings verification-admin" aria-label={t('Admin account management')}>
        <div className="settings-heading"><span className="label">{t('Manage admins')}</span><span>{admins.length} {t('added')}</span></div>
        <p className="social-muted">{t('Your primary admin account can grant or remove admin access. Search by a member’s name or username.')}</p>
        <form className="admin-search-form" onSubmit={searchForAdmins}>
          <input aria-label={t('Search members to make admins')} minLength={2} value={adminSearch} onChange={(event) => setAdminSearch(event.target.value)} placeholder={t('Search name or username')} />
          <button className="primary-button" disabled={adminSearchBusy || adminSearch.trim().length < 2}>{adminSearchBusy ? t('Searching…') : t('Search')}</button>
        </form>
        {adminCandidates.map((candidate) => <article className="admin-account-row" key={candidate.userId}>
          <div><strong>{candidate.displayName || candidate.username || 'Went To Event member'}</strong>{candidate.username && <span>@{candidate.username}</span>}</div>
          <button className="quiet-button" disabled={busy} onClick={() => grantAdmin(candidate)}>{t('Make admin')}</button>
        </article>)}
        {adminSearchComplete && adminCandidates.length === 0 && <p className="social-muted">{t('No available members found.')}</p>}
        <div className="admin-account-list">
          {admins.map((admin) => <article className="admin-account-row" key={admin.userId}>
            <div><strong>{admin.displayName || admin.username || 'Went To Event member'}</strong>{admin.username && <span>@{admin.username}</span>}</div>
            <button className="quiet-button" disabled={busy} onClick={() => revokeAdmin(admin)}>{t('Remove admin')}</button>
          </article>)}
          {!admins.length && <p className="social-muted">{t('No additional admins yet.')}</p>}
        </div>
      </section>}
    </>
  )
}
