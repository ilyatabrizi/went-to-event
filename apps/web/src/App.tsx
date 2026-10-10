import { useCallback, useEffect, useRef, useState } from 'react'
import { useAuth, useUser } from '@clerk/react'
import QRCode from 'qrcode'
import { createBooking, getBookings, getEvent, getEvents, getProfile, updateAccount, updateProfile, uploadProfilePicture, type Booking, type Event, type UserProfile } from './api'
import { AuthPanel } from './AuthPanel'
import { SocialPanel } from './SocialPanel'
import { CheckInPanel } from './CheckInPanel'
import { VerificationPanel } from './VerificationPanel'
import { languageOptions, translate, type Language } from './i18n'

type WebSession = { user: { email: string | null } }

function formatDate(value: string) {
  const locale = ({ fa: 'fa-IR', tr: 'tr-TR', fr: 'fr-FR', it: 'it-IT' } as const)[document.documentElement.lang as 'fa' | 'tr' | 'fr' | 'it'] ?? 'en-US'
  return new Intl.DateTimeFormat(locale, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(value))
}

function formatBookingDate(value: string) {
  const locale = ({ fa: 'fa-IR', tr: 'tr-TR', fr: 'fr-FR', it: 'it-IT' } as const)[document.documentElement.lang as 'fa' | 'tr' | 'fr' | 'it'] ?? 'en-US'
  return new Intl.DateTimeFormat(locale, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value))
}

function priceLabel(event: Event, language: Language = 'en') {
  const lowest = Math.min(...event.ticketTiers.map((tier) => tier.priceCents))
  return lowest === 0 ? translate(language, 'Free') : `${translate(language, 'From')} $${(lowest / 100).toFixed(0)}`
}

function isUpcoming(event: Event | undefined) {
  return event ? new Date(event.endsAt).getTime() >= Date.now() : false
}

type BrowserReminder = {
  notifyAt: number
  title: string
  venue: string
}

const reminderStorageKey = 'wte.event-reminders'

async function cropProfilePicture(file: File) {
  const source = URL.createObjectURL(file)
  try {
    const image = await new Promise<HTMLImageElement>((resolve, reject) => {
      const loaded = new Image()
      loaded.onload = () => resolve(loaded)
      loaded.onerror = () => reject(new Error('Could not read that image'))
      loaded.src = source
    })
    const side = Math.min(image.naturalWidth, image.naturalHeight)
    const canvas = document.createElement('canvas')
    canvas.width = 512
    canvas.height = 512
    const context = canvas.getContext('2d')
    if (!context) throw new Error('Your browser cannot process images')
    context.drawImage(image, (image.naturalWidth - side) / 2, (image.naturalHeight - side) / 2, side, side, 0, 0, 512, 512)
    return canvas.toDataURL('image/jpeg', .86).split(',')[1]
  } finally {
    URL.revokeObjectURL(source)
  }
}

function Cover({ event }: { event: Event }) {
  return (
    <div className="cover-art" data-category={event.category} aria-hidden="true">
      <span className="cover-glow" />
      <span className="cover-grid" />
    </div>
  )
}

function TicketQr({ ticket, language }: { ticket: NonNullable<Booking['tickets']>[number]; language: Language }) {
  const [src, setSrc] = useState('')
  useEffect(() => {
    QRCode.toDataURL(ticket.qrCode, { margin: 1, width: 220, errorCorrectionLevel: 'M', color: { dark: '#0b0a0c', light: '#f7f2e9' } })
      .then(setSrc)
      .catch(() => setSrc(''))
  }, [ticket.qrCode])
  const t = (text: string) => translate(language, text)
  return <div className="pass-ticket-qr"><div className="pass-ticket-qr-image">{src ? <img src={src} alt={`${t('Ticket')} ${ticket.number} ${t('QR code')}`} /> : <span>{t('Loading…')}</span>}</div><span>{t('Ticket')} {ticket.number}{ticket.checkedInAt ? ` · ${t('Checked in')}` : ''}</span></div>
}

function Navigation({ onBookings, onHome, onExplore, onProfile, onChat, active = 'home', language }: { onBookings: () => void; onHome: () => void; onExplore: () => void; onProfile: () => void; onChat: () => void; active?: string; language: Language }) {
  const t = (text: string) => translate(language, text)
  const icon = (name: 'home' | 'explore' | 'went' | 'chat' | 'profile') => {
    const paths = {
      home: <><path d="m3 10 9-7 9 7"/><path d="M5 9v11h14V9M9 20v-6h6v6"/></>,
      explore: <><circle cx="12" cy="12" r="9"/><path d="m15.5 8.5-2 5-5 2 2-5 5-2Z"/></>,
      went: <><path d="M3 8a2 2 0 0 0 0 4v3a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-3a2 2 0 0 0 0-4V7a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v1Z"/><path d="M13 5v2m0 3v2m0 3v2"/></>,
      chat: <><path d="M21 11.5a8.4 8.4 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.4 8.4 0 0 1-3.8-.9L3 21l1.9-5.7a8.4 8.4 0 0 1-.9-3.8A8.5 8.5 0 0 1 8.7 3.9a8.4 8.4 0 0 1 3.8-.9h.5a8.5 8.5 0 0 1 8 8v.5Z"/></>,
      profile: <><circle cx="12" cy="8" r="4"/><path d="M5 21a7 7 0 0 1 14 0"/></>,
    }
    return <svg className="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{paths[name]}</svg>
  }
  return (
    <nav className="app-nav" aria-label={t('Main navigation')}>
      <button className={`nav-item ${active === 'home' ? 'nav-active' : ''}`} onClick={onHome}>
        {icon('home')}<span>{t('Home')}</span>
      </button>
      <button className={`nav-item ${active === 'explore' ? 'nav-active' : ''}`} onClick={onExplore}>
        {icon('explore')}<span>{t('Explore')}</span>
      </button>
      <button className={`nav-item ${active === 'bookings' ? 'nav-active' : ''}`} onClick={onBookings}>
        {icon('went')}<span>{t('Went')}</span>
      </button>
      <button className={`nav-item ${active === 'chat' ? 'nav-active' : ''}`} onClick={onChat}>
        {icon('chat')}<span>{t('Chat')}</span>
      </button>
      <button className={`nav-item ${active === 'profile' ? 'nav-active' : ''}`} onClick={onProfile}>
        {icon('profile')}<span>{t('Profile')}</span>
      </button>
    </nav>
  )
}

export function App({ language = 'en', onLanguageChange }: { language?: Language; onLanguageChange?: (language: Language) => void }) {
  if (window.location.pathname === '/') {
    return <iframe className="business-landing-frame" src="/business-join/index.html" title="Went To Event business sign-up" />
  }
  return <ProductApp language={language} onLanguageChange={onLanguageChange} />
}

function ProductApp({ language, onLanguageChange }: { language: Language; onLanguageChange?: (language: Language) => void }) {
  const { isLoaded: authLoaded, isSignedIn, getToken, signOut } = useAuth()
  const { user } = useUser()
  const session: WebSession | null = isSignedIn ? { user: { email: user?.primaryEmailAddress?.emailAddress ?? null } } : null
  const authToken = useCallback(() => getToken(), [getToken])
  const t = (text: string) => translate(language, text)
  const [events, setEvents] = useState<Event[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [selected, setSelected] = useState<Event | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
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
  const [profileTab, setProfileTab] = useState<'saved' | 'going' | 'account'>('saved')
  const [showSocial, setShowSocial] = useState(false)
  const [showCheckIn, setShowCheckIn] = useState(false)
  const [savedIds, setSavedIds] = useState<string[]>([])
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [usernameSetupStatus, setUsernameSetupStatus] = useState<'idle' | 'checking' | 'required' | 'complete'>('idle')
  const [profileLoading, setProfileLoading] = useState(false)
  const [profileBusy, setProfileBusy] = useState(false)
  const [pictureUploading, setPictureUploading] = useState(false)
  const [profileError, setProfileError] = useState<string | null>(null)
  const [profileNotice, setProfileNotice] = useState<string | null>(null)
  const [profileForm, setProfileForm] = useState({ username: '', displayName: '', avatarUrl: '' })
  const [accountForm, setAccountForm] = useState({ email: '', password: '' })
  const [reminders, setReminders] = useState<Record<string, BrowserReminder>>({})
  const [reminderError, setReminderError] = useState<string | null>(null)
  const reminderTimers = useRef<Record<string, number>>({})

  useEffect(() => {
    document.documentElement.lang = language
    document.documentElement.dir = language === 'fa' ? 'rtl' : 'ltr'
    localStorage.setItem('wte.language', language)
  }, [language])

  useEffect(() => {
    try {
      const stored = JSON.parse(localStorage.getItem('wte.saved-events') ?? '[]')
      if (Array.isArray(stored)) setSavedIds(stored.filter((id): id is string => typeof id === 'string'))
    } catch {
      setSavedIds([])
    }
  }, [])

  useEffect(() => {
    try {
      const stored = JSON.parse(localStorage.getItem(reminderStorageKey) ?? '{}')
      if (stored && typeof stored === 'object') setReminders(stored)
    } catch {
      setReminders({})
    }
  }, [])

  useEffect(() => {
    Object.entries(reminders).forEach(([bookingId, reminder]) => {
      if (reminderTimers.current[bookingId]) window.clearTimeout(reminderTimers.current[bookingId])
      const delay = reminder.notifyAt - Date.now()
      if (delay <= 0) return

      reminderTimers.current[bookingId] = window.setTimeout(() => {
        if ('Notification' in window && Notification.permission === 'granted') {
          new Notification('Your event is coming up', {
            body: `${reminder.title} starts in about one hour at ${reminder.venue}.`,
          })
        }
        setReminders((current) => {
          const next = { ...current }
          delete next[bookingId]
          localStorage.setItem(reminderStorageKey, JSON.stringify(next))
          return next
        })
      }, delay)
    })

    return () => {
      Object.values(reminderTimers.current).forEach((timer) => window.clearTimeout(timer))
    }
  }, [reminders])

  useEffect(() => {
    getEvents()
      .then((response) => setEvents(response.data))
      .catch(() => setError(t('Could not load events. Is the API running?')))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    if (!isSignedIn) {
      setUsernameSetupStatus('idle')
      return
    }
    let cancelled = false
    setUsernameSetupStatus('checking')
    getProfile(authToken)
      .then(({ profile: nextProfile }) => {
        if (cancelled) return
        setProfile(nextProfile)
        setProfileForm({ username: nextProfile.username ?? '', displayName: nextProfile.displayName ?? '', avatarUrl: nextProfile.avatarUrl ?? '' })
        setUsernameSetupStatus(nextProfile.username ? 'complete' : 'required')
      })
      .catch((failure) => {
        if (cancelled) return
        setProfileError(failure instanceof Error ? failure.message : t('Could not load your profile'))
        setUsernameSetupStatus('required')
      })
    return () => { cancelled = true }
  }, [authToken, isSignedIn])

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
      .catch(() => setError(t('Could not load that event.')))
  }, [selectedId])

  async function openBookings() {
    if (!session) return

    setSelectedId(null)
    setShowProfile(false)
    setShowSocial(false)
    setShowExplore(false)
    setPassBooking(null)
    setPassEvent(null)
    setShowBookings(true)
    setBookingsLoading(true)
    setBookingsError(null)

    try {
      const response = await getBookings(authToken)
      setBookings(response.data)
      const loadedEvents = Object.fromEntries(events.map((event) => [event.id, event]))
      setBookingEvents(Object.fromEntries(response.data
        .map((booking) => loadedEvents[booking.eventId] ? [booking.eventId, loadedEvents[booking.eventId]] as const : null)
        .filter((entry): entry is readonly [string, Event] => entry !== null)))
    } catch (bookingFailure) {
      setBookingsError(bookingFailure instanceof Error ? bookingFailure.message : t('Could not load bookings'))
    } finally {
      setBookingsLoading(false)
    }
  }

  function openProfile() {
    setSelectedId(null)
    setShowBookings(false)
    setShowExplore(false)
    setShowSocial(false)
    setShowProfile(true)
    setPassBooking(null)
    setPassEvent(null)
    setProfileError(null)
    setProfileNotice(null)
    if (session) {
      setProfileLoading(true)
      setBookingsLoading(true)
      Promise.all([getProfile(authToken), getBookings(authToken)])
        .then(async ([{ profile: nextProfile }, bookingResponse]) => {
          setProfile(nextProfile)
          setProfileForm({ username: nextProfile.username ?? '', displayName: nextProfile.displayName ?? '', avatarUrl: nextProfile.avatarUrl ?? '' })
          setBookings(bookingResponse.data)
          const loadedEvents: Record<string, Event> = Object.fromEntries(events.map((event) => [event.id, event]))
          const missingEventIds = [...new Set(bookingResponse.data.map((booking) => booking.eventId).filter((id) => !loadedEvents[id]))]
          const missingEvents = await Promise.all(missingEventIds.map(async (id) => {
            try { return (await getEvent(id)).data } catch { return null }
          }))
          missingEvents.forEach((event) => { if (event) loadedEvents[event.id] = event })
          setBookingEvents(loadedEvents)
        })
        .catch((failure) => setProfileError(failure instanceof Error ? failure.message : t('Could not load your profile')))
        .finally(() => { setProfileLoading(false); setBookingsLoading(false) })
    }
  }

  async function saveProfile(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!session) return
    setProfileBusy(true)
    setProfileError(null)
    setProfileNotice(null)
    try {
      const response = await updateProfile(authToken, profileForm)
      setProfile(response.profile)
      setProfileForm({ username: response.profile.username ?? '', displayName: response.profile.displayName ?? '', avatarUrl: response.profile.avatarUrl ?? '' })
      setProfileNotice(t('Profile updated.'))
    } catch (failure) {
      setProfileError(failure instanceof Error ? failure.message : t('Could not update profile'))
    } finally {
      setProfileBusy(false)
    }
  }

  async function saveSignupUsername(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const username = profileForm.username.trim().toLowerCase()
    if (!/^[a-z0-9_]{3,24}$/.test(username)) {
      setProfileError(t('Username must be 3–24 characters using lowercase letters, numbers, or underscores.'))
      return
    }
    setProfileBusy(true)
    setProfileError(null)
    try {
      const response = await updateProfile(authToken, { username })
      setProfile(response.profile)
      setProfileForm((current) => ({ ...current, username: response.profile.username ?? username }))
      setUsernameSetupStatus('complete')
      setShowAuth(false)
    } catch (failure) {
      setProfileError(failure instanceof Error ? failure.message : t('Could not save your username'))
    } finally {
      setProfileBusy(false)
    }
  }

  async function saveAccount(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!session || (!accountForm.email && !accountForm.password)) return
    setProfileBusy(true)
    setProfileError(null)
    setProfileNotice(null)
    try {
      const response = await updateAccount(authToken, { ...(accountForm.email ? { email: accountForm.email } : {}), ...(accountForm.password ? { password: accountForm.password } : {}) })
      setAccountForm({ email: '', password: '' })
      setProfileNotice(response.user.email ? t('Account updated. Check your email if confirmation is required.') : t('Account updated.'))
    } catch (failure) {
      setProfileError(failure instanceof Error ? failure.message : t('Could not update account'))
    } finally {
      setProfileBusy(false)
    }
  }

  async function handlePictureUpload(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file || !session) return
    if (!file.type.startsWith('image/')) {
      setProfileError(t('Choose an image file.'))
      return
    }
    setPictureUploading(true)
    setProfileError(null)
    setProfileNotice(null)
    try {
      const data = await cropProfilePicture(file)
      const response = await uploadProfilePicture(authToken, data, 'image/jpeg')
      setProfile(response.profile)
      setProfileForm((current) => ({ ...current, avatarUrl: response.profile.avatarUrl ?? '' }))
      setProfileNotice(t('Profile picture updated.'))
    } catch (failure) {
      setProfileError(failure instanceof Error ? failure.message : t('Could not upload profile picture'))
    } finally {
      setPictureUploading(false)
    }
  }

  function openExplore() {
    setSelectedId(null)
    setShowBookings(false)
    setShowProfile(false)
    setShowSocial(false)
    setShowExplore(true)
    setPassBooking(null)
    setPassEvent(null)
  }

  function openSocial() {
    if (!session) {
      setShowProfile(true)
      return
    }
    setSelectedId(null)
    setShowBookings(false)
    setShowExplore(false)
    setShowProfile(false)
    setShowSocial(true)
    setPassBooking(null)
    setPassEvent(null)
  }

  function openCheckIn() {
    if (!session) {
      setShowProfile(true)
      return
    }
    setSelectedId(null)
    setShowBookings(false)
    setShowExplore(false)
    setShowProfile(false)
    setShowSocial(false)
    setShowCheckIn(true)
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

  async function toggleReminder(bookingToRemind: Booking, event: Event) {
    setReminderError(null)
    if (reminders[bookingToRemind.id]) {
      setReminders((current) => {
        const next = { ...current }
        delete next[bookingToRemind.id]
        localStorage.setItem(reminderStorageKey, JSON.stringify(next))
        return next
      })
      return
    }

    const notifyAt = new Date(event.startsAt).getTime() - 60 * 60 * 1000
    if (notifyAt <= Date.now() + 5000) {
      setReminderError('This event starts in less than one hour, so a reminder cannot be scheduled.')
      return
    }
    if (!('Notification' in window)) {
      setReminderError('This browser does not support notifications. Try the iOS app for event reminders.')
      return
    }

    const permission = Notification.permission === 'default'
      ? await Notification.requestPermission()
      : Notification.permission
    if (permission !== 'granted') {
      setReminderError('Notifications are disabled. Enable them in your browser settings to use reminders.')
      return
    }

    const next = {
      ...reminders,
      [bookingToRemind.id]: { notifyAt, title: event.title, venue: event.venue.name },
    }
    setReminders(next)
    localStorage.setItem(reminderStorageKey, JSON.stringify(next))
  }

  function openSavedEvent(eventId: string) {
    setShowProfile(false)
    setSelectedId(eventId)
  }

  async function logout() {
    await signOut()
    setShowProfile(false)
    setShowBookings(false)
    setShowExplore(false)
    setSelectedId(null)
  }

  async function openPass(bookingToOpen: Booking) {
    setPassBooking(bookingToOpen)
    setPassEvent(null)

    try {
      const loadedEvent = events.find((event) => event.id === bookingToOpen.eventId)
      if (loadedEvent) {
        setPassEvent(loadedEvent)
        return
      }
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
      const response = await createBooking(authToken, {
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

  if (session && usernameSetupStatus === 'checking') {
    return <LoadingScreen />
  }

  if (session && usernameSetupStatus === 'required') {
    return (
      <main className="shell auth-shell username-setup-page">
        <section className="username-setup" aria-labelledby="username-setup-title">
          <p className="eyebrow">{t('One last thing')}</p>
          <h1 id="username-setup-title">{t('Choose your username.')}</h1>
          <p className="lede">{t('Friends can search this username to find and add you.')}</p>
          <form className="profile-form" onSubmit={saveSignupUsername}>
            <label>{t('Username')}
              <input autoComplete="username" required minLength={3} maxLength={24} pattern="[a-z0-9_]{3,24}" value={profileForm.username} onChange={(event) => setProfileForm((current) => ({ ...current, username: event.target.value.toLowerCase() }))} placeholder={t('your_username')} />
              <small>{t('3–24 lowercase letters, numbers, or underscores.')}</small>
            </label>
            {profileError && <p className="error" role="alert">{profileError}</p>}
            <button className="primary-button" disabled={profileBusy}>{profileBusy ? t('Saving…') : t('Continue')}</button>
          </form>
        </section>
      </main>
    )
  }

  if (showAuth) {
    if (!authLoaded) return <LoadingScreen />
    return (
      <main className="shell auth-shell">
        <button className="back" data-testid="back-from-auth" onClick={() => setShowAuth(false)}>
          <span aria-hidden="true">←</span> {t('Back to event')}
        </button>
        <section className="auth-content" aria-labelledby="booking-auth-title">
          <header>
            <p className="eyebrow">{t('One more step')}</p>
            <h1 id="booking-auth-title">{t('Sign in to book.')}</h1>
            <p className="lede">{t('Create an account or sign in to keep your tickets and passes together.')}</p>
          </header>
          <AuthPanel language={language} />
        </section>
      </main>
    )
  }

  if (showSocial && session) {
    return (
      <SocialPanel
        getToken={authToken}
        onBack={openProfile}
        language={language}
        navigation={<Navigation onHome={() => { setShowSocial(false); setSelectedId(null) }} onBookings={openBookings} onExplore={openExplore} onProfile={openProfile} onChat={openSocial} active="chat" language={language} />}
      />
    )
  }

  if (showCheckIn && session) {
    return <CheckInPanel getToken={authToken} onBack={() => { setShowCheckIn(false); setShowProfile(true) }} language={language} navigation={<Navigation onHome={() => { setShowCheckIn(false); setSelectedId(null) }} onBookings={openBookings} onExplore={openExplore} onProfile={openProfile} onChat={openSocial} active="profile" language={language} />} />
  }

  if (showProfile) {
    if (!session) {
      return (
        <main className="shell auth-shell profile-auth-page">
          <button className="back" data-testid="back-from-profile" onClick={() => setShowProfile(false)}>
            <span aria-hidden="true">←</span> {t('Back to events')}
          </button>
          <section className="profile-auth-content" aria-labelledby="profile-auth-title">
            <header>
              <p className="eyebrow">{t('Your account')}</p>
              <h1 id="profile-auth-title">{t('Sign in to see your profile.')}</h1>
              <p className="lede">{t('Your profile and bookings live here once you have an account.')}</p>
            </header>
            <button className="primary-button booking-button" data-testid="profile-sign-in" onClick={() => { setShowProfile(false); setShowAuth(true) }}>
              {t('Sign in or create account')}
            </button>
          </section>
        </main>
      )
    }

    return (
      <main className="shell profile-shell">
        <Navigation onHome={() => setShowProfile(false)} onBookings={openBookings} onExplore={openExplore} onProfile={openProfile} onChat={openSocial} active="profile" language={language} />
        <section className="profile-card profile-hero" data-testid="profile-card">
          {profile?.avatarUrl ? <img className="profile-avatar profile-avatar-image" src={profile.avatarUrl} alt="" /> : <div className="profile-avatar" aria-hidden="true">{(profile?.displayName ?? session.user.email ?? 'U').slice(0, 1).toUpperCase()}</div>}
          <div className="profile-identity">
            <strong>{profile?.displayName || 'Your name'}</strong>
            <span>{profile?.username ? `@${profile.username}` : session.user.email}</span>
          </div>
        </section>
        {profileLoading && <p className="profile-loading">{t('Loading your profile…')}</p>}
        <section className="profile-counts" aria-label={t('Your activity')}>
          <div><strong>{savedIds.length}</strong><span>{t('saved')}</span></div>
          <div><strong>{bookings.filter((item) => isUpcoming(bookingEvents[item.eventId])).length}</strong><span>{t('upcoming')}</span></div>
          <div><strong>{Object.keys(reminders).length}</strong><span>{t('reminders')}</span></div>
        </section>
        <section className="profile-dock-actions" aria-label={t('Profile')}>
          <button className="profile-publish-button" onClick={() => { setProfileTab('account'); window.setTimeout(() => document.getElementById('account-verification-panel')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 80) }}><span aria-hidden="true">＋</span>{t('Publish an event')}</button>
          <button className="profile-utility-button" aria-label={t('Account settings')} onClick={() => setProfileTab('account')}>⚙</button>
        </section>
        <button className="checkin-entry-button" onClick={openCheckIn}><span aria-hidden="true">⌾</span><span><strong>{t('Check in guests')}</strong><small>{t('Scan tickets for an event you host')}</small></span><span aria-hidden="true">→</span></button>
        <button className="profile-membership-card" onClick={() => setProfileTab('account')}>
          <span className="profile-membership-icon" aria-hidden="true">✦</span>
          <span><strong>{t('Host with Went To Event')}</strong><small>{t('Verification and event tools live in your account.')}</small></span>
          <span className="profile-membership-arrow" aria-hidden="true">→</span>
        </button>
        <div className="profile-segmented" role="tablist" aria-label={t('Profile sections')}>
          <button role="tab" aria-selected={profileTab === 'saved'} className={profileTab === 'saved' ? 'profile-segment-active' : ''} onClick={() => setProfileTab('saved')}>{t('Saved')}{savedIds.length ? ` · ${savedIds.length}` : ''}</button>
          <button role="tab" aria-selected={profileTab === 'going'} className={profileTab === 'going' ? 'profile-segment-active' : ''} onClick={() => setProfileTab('going')}>{t('Going')}{bookings.length ? ` · ${bookings.length}` : ''}</button>
          <button role="tab" aria-selected={profileTab === 'account'} className={profileTab === 'account' ? 'profile-segment-active' : ''} onClick={() => setProfileTab('account')}>{t('Account')}</button>
        </div>
        {profileTab === 'saved' && <section className="profile-tab-content" role="tabpanel" aria-label={t('Saved events')}>
          {savedIds.length === 0 ? (
            <div className="empty-state"><h2>{t('Nothing saved')}</h2><p>{t('Tap the bookmark on any event and it waits for you here.')}</p><button className="primary-button" onClick={openExplore}>{t('Find events')}</button></div>
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
                    <button className="saved-remove" aria-label={`${t('Remove from saved events')}: ${event.title}`} onClick={() => toggleSaved(event.id)}>×</button>
                  </div>
                )
              })}
            </div>
          )}
        </section>}
        {profileTab === 'going' && <section className="profile-tab-content" role="tabpanel" aria-label={t('Going to events')}>
          {bookingsLoading ? <p className="profile-loading">{t('Loading bookings…')}</p> : bookings.length === 0 ? (
            <div className="empty-state"><h2>{t('Nothing booked')}</h2><p>{t('Book something and it will appear here with your event pass.')}</p><button className="primary-button" onClick={openExplore}>{t('Find events')}</button></div>
          ) : <div className="booking-list">
            {bookings.map((booking) => {
              const event = bookingEvents[booking.eventId]
              return <button className="booking-list-item" key={booking.id} onClick={() => { setProfileTab('saved'); void openPass(booking); setShowProfile(false); setShowBookings(true) }}>
                <span><span className="label">{t(event && isUpcoming(event) ? 'Upcoming' : 'Past')} · {t(booking.status === 'confirmed' ? 'Confirmed' : booking.status)}</span><strong>{event?.title ?? booking.eventId}</strong>{event && <small>{formatDate(event.startsAt)} · {event.venue.name}</small>}</span>
                <span><strong>{booking.quantity} ×</strong><span>${(booking.totalCents / 100).toFixed(2)} →</span></span>
              </button>
            })}
          </div>}
        </section>}
        {profileTab === 'account' && <section className="profile-tab-content profile-account-content" role="tabpanel" aria-label={t('Account settings')}>
          <section className="profile-settings" aria-label={t('Account language')}>
          <div className="settings-heading"><span className="label">{t('Account language')}</span></div>
          <label className="language-setting">{t('Choose the language used across Went To Event.')}
            <select value={language} onChange={(event) => onLanguageChange?.(event.target.value as Language)} aria-label={t('Account language')}>
              {languageOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
            </select>
          </label>
        </section>
        <section className="profile-settings" aria-label={t('Your identity')}>
          <div className="settings-heading"><span className="label">{t('Your identity')}</span><span>{t('Public profile')}</span></div>
          <form className="profile-form" onSubmit={saveProfile}>
            <label>{t('Display name')}<input value={profileForm.displayName} onChange={(event) => setProfileForm({ ...profileForm, displayName: event.target.value })} placeholder={t('Your name')} maxLength={80} /></label>
            <label>{t('Username')}<input value={profileForm.username} onChange={(event) => setProfileForm({ ...profileForm, username: event.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '') })} placeholder={t('your_username')} maxLength={24} /></label>
            <label className="profile-picture-label">{t('Profile photo')}
              <span className="profile-picture-picker">
                <input className="profile-picture-input" type="file" accept="image/png,image/jpeg,image/webp" onChange={handlePictureUpload} disabled={pictureUploading} aria-label={t('Choose a profile photo')} />
                {profile?.avatarUrl ? <img className="profile-picture-preview" src={profile.avatarUrl} alt="" /> : <span className="profile-picture-preview profile-picture-initial" aria-hidden="true">{(profile?.displayName ?? session.user.email ?? 'U').slice(0, 1).toUpperCase()}</span>}
                <span className="profile-picture-copy"><strong>{t(pictureUploading ? 'Uploading your photo…' : profile?.avatarUrl ? 'Update your photo' : 'Choose a profile photo')}</strong><small>{t('Square crop · JPG, PNG or WebP')}</small></span>
                <span className="profile-picture-action" aria-hidden="true">{pictureUploading ? '…' : t('Choose')}</span>
              </span>
            </label>
            <button className="primary-button" disabled={profileBusy}>{profileBusy ? t('Saving…') : t('Save profile')}</button>
          </form>
        </section>
        <VerificationPanel
          getToken={authToken}
          language={language}
          onEventCreated={(createdEvent) => {
            setEvents((current) => [createdEvent, ...current.filter((event) => event.id !== createdEvent.id)].sort((left, right) => left.startsAt.localeCompare(right.startsAt)))
            setShowProfile(false)
            setSelectedId(createdEvent.id)
          }}
        />
        {(profileError || profileNotice) && <p className={profileError ? 'error' : 'profile-notice'}>{profileError ?? profileNotice}</p>}
        <section className="profile-settings" aria-label={t('Account security')}>
          <div className="settings-heading"><span className="label">{t('Account security')}</span><span>{t('Private')}</span></div>
          <form className="profile-form" onSubmit={saveAccount}>
            <label>{t('Email address')}<input type="email" value={accountForm.email} onChange={(event) => setAccountForm({ ...accountForm, email: event.target.value })} placeholder={session.user.email ?? 'you@example.com'} /></label>
            <label>{t('New password')}<input type="password" value={accountForm.password} onChange={(event) => setAccountForm({ ...accountForm, password: event.target.value })} placeholder={t('At least 8 characters')} minLength={8} /></label>
            <button className="quiet-button settings-submit" disabled={profileBusy || (!accountForm.email && !accountForm.password)}>{t('Update account')}</button>
          </form>
        </section>
        <section className="account-note" aria-label={t('Account settings')}>
          <div><span className="label">{t('Account')}</span><strong>{t('Your account is secured by Clerk.')}</strong></div>
          <small>{t('Profile data and bookings remain stored securely in Went To Event.')}</small>
        </section>
        <button className="logout-button profile-logout" data-testid="logout" onClick={logout}>{t('Log out')}</button>
        </section>}
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
        <Navigation onHome={() => setShowExplore(false)} onBookings={openBookings} onExplore={openExplore} onProfile={openProfile} onChat={openSocial} active="explore" language={language} />
        <header>
          <p className="eyebrow">{t('Discover')}</p>
          <h1>{t('Explore events.')}</h1>
          <p className="lede">{t('Search events, venues, or hosts')}</p>
        </header>
        <section className="explore-controls" aria-label={t('Event filters')}>
          <input
            aria-label={t('Search events, venues, or hosts')}
            className="explore-search"
            placeholder={t('Search events, venues, or hosts')}
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
          <div className="filter-grid">
            <label><span>{t('Category')}</span><select aria-label={t('Category')} value={category} onChange={(event) => setCategory(event.target.value)}>
              <option value="All categories">{t('All categories')}</option>
              {[...new Set(events.map((event) => event.category))].map((value) => <option key={value} value={value}>{t(value)}</option>)}
            </select></label>
            <label><span>{t('Date')}</span><select aria-label={t('Date')} value={dateFilter} onChange={(event) => setDateFilter(event.target.value)}>
              <option value="Any date">{t('Any date')}</option><option value="Today">{t('Today')}</option><option value="This week">{t('This week')}</option>
            </select></label>
            <label><span>{t('Price')}</span><select aria-label={t('Price')} value={priceFilter} onChange={(event) => setPriceFilter(event.target.value)}>
              <option value="Any price">{t('Any price')}</option><option value="Free">{t('Free')}</option><option value="Under $25">{t('Under $25')}</option><option value="Under $50">{t('Under $50')}</option>
            </select></label>
            <label><span>{t('Sort')}</span><select aria-label={t('Sort')} value={sort} onChange={(event) => setSort(event.target.value)}>
              <option value="Recommended">{t('Recommended')}</option><option value="Soonest">{t('Soonest')}</option><option value="Most going">{t('Most going')}</option><option value="Price: low to high">{t('Price: low to high')}</option>
            </select></label>
          </div>
        </section>
        <div className="explore-results-heading">
          <h2>{filteredEvents.length} {t(filteredEvents.length === 1 ? 'event' : 'events')}</h2>
          {(query || category !== 'All categories' || dateFilter !== 'Any date' || priceFilter !== 'Any price' || sort !== 'Recommended') && (
          <button className="quiet-button" onClick={() => { setQuery(''); setCategory('All categories'); setDateFilter('Any date'); setPriceFilter('Any price'); setSort('Recommended') }}>{t('Clear filters')}</button>
          )}
        </div>
        {filteredEvents.length ? (
        <section className="events" aria-label={t('Explore results')}>
            {filteredEvents.map((event) => (
              <button className="event-card" key={event.id} onClick={() => { setShowExplore(false); setSelectedId(event.id) }}>
                <Cover event={event} />
                <span className="card-copy" data-testid="event-card">
                  <span className="category">{event.category}</span>
                  <h2>{event.title}</h2>
                  <span className="meta">{formatDate(event.startsAt)} · {event.venue.name}</span>
                  <span className="card-footer"><strong>{priceLabel(event, language)}</strong><span>{event.goingCount} {t('going')} →</span></span>
                </span>
              </button>
            ))}
          </section>
        ) : (
          <section className="empty-state" data-testid="explore-empty">
            <h2>{events.length ? t('No events match.') : t('No upcoming events yet.')}</h2>
            <p>{events.length ? t('Try a different search or clear one of the filters.') : t('Approved events from verified hosts will appear here.')}</p>
          </section>
        )}
      </main>
    )
  }

  if (selected) {
    return (
      <main className="shell">
        <Navigation onHome={() => setSelectedId(null)} onBookings={openBookings} onExplore={() => setSelectedId(null)} onProfile={openProfile} onChat={openSocial} active="explore" language={language} />
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
          {savedIds.includes(selected.id) ? `★ ${t('Saved event')}` : `☆ ${t('Save event')}`}
        </button>
        <section className="detail-card">
          <div>
            <span className="label">{t('When')}</span>
            <strong>{formatDate(selected.startsAt)}</strong>
          </div>
          <div>
            <span className="label">{t('Where')}</span>
            <strong>{selected.venue.name}</strong>
            <span>{selected.venue.address}</span>
          </div>
          <div>
            <span className="label">{t('Hosted by')}</span>
            <strong>{selected.host.name}</strong>
          </div>
        </section>
        <div className="section-heading">
          <h2>{t('Tickets')}</h2>
          <span>{selected.goingCount} {t('going')}</span>
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
              <strong>{tier.priceCents === 0 ? t('Free') : `$${(tier.priceCents / 100).toFixed(0)}`}</strong>
            </button>
          ))}
        </div>
        {booking ? (
          <section className="booking-confirmation" data-testid="booking-confirmation">
            <span className="eyebrow">{t('Confirmed')}</span>
            <h2>{t('You’re going.')}</h2>
            <p>{t('Booking reference')}</p>
            <strong>{booking.id}</strong>
            <span>{booking.quantity} {t(booking.quantity === 1 ? 'ticket' : 'tickets')} · ${(booking.totalCents / 100).toFixed(2)}</span>
            <button className="primary-button booking-button" onClick={() => { setSelectedId(null); setShowBookings(true); void openPass(booking) }}>{t('Open your QR pass')}</button>
          </section>
        ) : (
          <section className="booking-panel">
            <div className="booking-heading">
              <div>
                <span className="label">{t('Reserve your place')}</span>
                <strong>{t('How many tickets?')}</strong>
              </div>
              <span className="booking-total">{selectedTierId ? priceLabel({ ...selected, ticketTiers: selected.ticketTiers.filter((tier) => tier.id === selectedTierId) }, language) : t('Choose a ticket')}</span>
            </div>
            <div className="booking-row">
              <div>
                <span className="label">{t('Quantity')}</span>
                <strong>{quantity} {t(quantity === 1 ? 'ticket' : 'tickets')}</strong>
              </div>
              <div className="quantity-stepper" aria-label={t('Ticket quantity')}>
                <button className="quantity-button" aria-label={t('Decrease quantity')} disabled={quantity === 1} onClick={() => setQuantity((value) => Math.max(1, value - 1))}>−</button>
                <span>{quantity}</span>
                <button className="quantity-button" aria-label={t('Increase quantity')} disabled={quantity === 10} onClick={() => setQuantity((value) => Math.min(10, value + 1))}>+</button>
              </div>
            </div>
            {session ? (
              <button className="primary-button booking-button" disabled={bookingBusy || !selectedTierId} onClick={submitBooking}>
                {bookingBusy ? t('Confirming…') : t('Confirm booking')}
              </button>
            ) : (
              <button className="primary-button booking-button" data-testid="sign-in-to-book" onClick={() => setShowAuth(true)}>
                {t('Sign in to book')}
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
            <span aria-hidden="true">←</span> {t('Back to Went')}
          </button>
          <section className="pass-card" data-testid="booking-pass">
            <div className="pass-topline"><div className="pass-mark">e.</div><span className="pass-status">{t(passBooking.status === 'confirmed' ? 'Confirmed' : passBooking.status)}</span></div>
            <span className="eyebrow">{t('Your event pass')}</span>
            <h1>{passEvent?.title ?? t('Your event pass')}</h1>
            {passEvent && (
              <div className="pass-details">
                <div><span className="label">{t('When')}</span><strong>{formatDate(passEvent.startsAt)}</strong><small>{t('Until')} {formatDate(passEvent.endsAt)}</small></div>
                <div><span className="label">{t('Where')}</span><strong>{passEvent.venue.name}</strong><small>{passEvent.venue.address}</small></div>
                <div><span className="label">{t('Hosted by')}</span><strong>{passEvent.host.name}</strong></div>
              </div>
            )}
            <div className="pass-code-wrap">
              <span className="label">{t('Ticket QR code')}</span>
              {passBooking.tickets?.length ? <div className="pass-qr-list">{passBooking.tickets.map((ticket) => <TicketQr key={ticket.id} ticket={ticket} language={language} />)}</div> : <div className="pass-code" aria-label={t('Booking reference')} data-testid="booking-reference">{passBooking.id.slice(0, 8).toUpperCase()}</div>}
              <small>{t('Show one code per ticket at the door.')}</small>
            </div>
            <div className="pass-summary">
              <div><span className="label">{t('Ticket')}</span><strong>{passEvent?.ticketTiers.find((tier) => tier.id === passBooking.ticketTierId)?.name ?? t('Ticket')}</strong></div>
              <div><span className="label">{t('Quantity')}</span><strong>{passBooking.quantity} {t(passBooking.quantity === 1 ? 'ticket' : 'tickets')}</strong></div>
              <div><span className="label">{t('Total')}</span><strong>${(passBooking.totalCents / 100).toFixed(2)}</strong></div>
              <div><span className="label">{t('Booked')}</span><strong>{formatBookingDate(passBooking.createdAt)}</strong></div>
            </div>
            {passEvent && isUpcoming(passEvent) && (
              <div className="pass-reminder">
                <div>
                    <strong>{reminders[passBooking.id] ? t('Event reminder set') : t('Event reminder')}</strong>
                  <span>{reminders[passBooking.id] ? t('You’ll get a browser notification one hour before the event.') : t('Get a browser notification one hour before the event starts.')}</span>
                </div>
                <button className="secondary-button" onClick={() => { void toggleReminder(passBooking, passEvent) }}>
                  {reminders[passBooking.id] ? t('Cancel reminder') : t('Remind me')}
                </button>
                {reminderError && <small className="reminder-error">{reminderError}</small>}
              </div>
            )}
            <div className="pass-footer">
              <span>{t('Keep this pass ready for entry.')}</span>
              <span aria-hidden="true">✦</span>
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
        <Navigation onHome={() => setShowBookings(false)} onBookings={openBookings} onExplore={openExplore} onProfile={openProfile} onChat={openSocial} active="bookings" language={language} />
        <button className="back" data-testid="back-to-events-from-bookings" onClick={() => setShowBookings(false)}>
          <span aria-hidden="true">←</span> {t('Back to events')}
        </button>
        <header>
          <p className="eyebrow">{t('Your account')}</p>
          <h1>{t('Went')}</h1>
          <p className="lede">{t('Your upcoming and past events, all in one place.')}</p>
        </header>
        {bookingsError && <p className="error">{bookingsError}</p>}
        {bookingsLoading ? <p>{t('Loading bookings…')}</p> : bookings.length === 0 ? (
          <section className="empty-state"><h2>{t('No bookings yet.')}</h2><p>{t('Find an event worth going to and your pass will appear here.')}</p></section>
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
      <Navigation onHome={() => { setShowExplore(false); setShowBookings(false); setShowSocial(false); setShowProfile(false) }} onBookings={openBookings} onExplore={openExplore} onProfile={openProfile} onChat={openSocial} language={language} />
      <header>
          <p className="eyebrow">{t('Tabriz')}</p>
          <h1>{t('What’s happening?')}</h1>
          <p className="lede">{t('Find something worth going to.')}</p>
        </header>
        {session && <button className="bookings-link" data-testid="open-bookings" onClick={openBookings}>{t('Went')} <span aria-hidden="true">→</span></button>}
      {error && <p className="error">{error}</p>}
      {loading ? (
          <p>{t('Loading events…')}</p>
      ) : events.length === 0 ? (
        <section className="empty-state" data-testid="events-empty"><h2>{t('No upcoming events yet.')}</h2><p>{t('Approved events from verified hosts will appear here.')}</p></section>
      ) : (
        <section className="events" aria-label={t('Events')}>
          {events.map((event) => (
            <button className="event-card" key={event.id} onClick={() => setSelectedId(event.id)}>
              <Cover event={event} />
              <span className="card-copy" data-testid="event-card">
                <span className="category">{t(event.category)}</span>
                <h2>{event.title}</h2>
                <span className="meta">{formatDate(event.startsAt)} · {event.venue.name}</span>
                <span className="card-footer">
                  <strong>{priceLabel(event, language)}</strong>
                  <span>{event.goingCount} {t('going')} <span aria-hidden="true">→</span></span>
                </span>
              </span>
            </button>
          ))}
        </section>
      )}
    </main>
  )
}

function LoadingScreen() {
  return (
    <main className="app-loading" aria-busy="true" aria-live="polite">
      <span className="loading-spinner" aria-hidden="true" />
      <span className="sr-only">Loading</span>
    </main>
  )
}
