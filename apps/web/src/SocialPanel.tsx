import { useCallback, useEffect, useRef, useState, type FormEvent, type ReactNode } from 'react'
import {
  createDirectConversation,
  getConversationMessages,
  getSocialConversations,
  getSocialOverview,
  postConversationMessage,
  enablePushNotifications,
  removeFriend,
  respondToFriendRequest,
  searchSocialUsers,
  sendFriendRequest,
  type AuthTokenProvider,
  type SocialConversation,
  type SocialMessage,
  type SocialOverview,
  type SocialPerson,
} from './api'
import { translate, type Language } from './i18n'

const pushReadyStorageKey = 'wte.push.notifications.enabled'

export function SocialPanel({ getToken, onBack, navigation, language }: { getToken: AuthTokenProvider; onBack: () => void; navigation: ReactNode; language: Language }) {
  const t = (text: string) => translate(language, text)
  const [overview, setOverview] = useState<SocialOverview | null>(null)
  const [query, setQuery] = useState('')
  const [socialTab, setSocialTab] = useState<'chats' | 'friends'>('chats')
  const [results, setResults] = useState<SocialPerson[]>([])
  const [conversationId, setConversationId] = useState<string | null>(null)
  const [messages, setMessages] = useState<SocialMessage[]>([])
  const [draft, setDraft] = useState('')
  const [loading, setLoading] = useState(true)
  const [busyId, setBusyId] = useState<string | null>(null)
  const [sending, setSending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [pushReady, setPushReady] = useState(() => {
    if (typeof window === 'undefined') return false
    try {
      return window.localStorage.getItem(pushReadyStorageKey) === 'true'
    } catch {
      return false
    }
  })
  const [pushBusy, setPushBusy] = useState(false)
  const [friendsLoaded, setFriendsLoaded] = useState(false)
  const messageList = useRef<HTMLDivElement>(null)
  const installed = typeof window !== 'undefined' && (window.matchMedia('(display-mode: standalone)').matches || Boolean((navigator as Navigator & { standalone?: boolean }).standalone))

  const refreshOverview = useCallback(async () => {
    const next = await getSocialOverview(getToken)
    setOverview(next)
    setFriendsLoaded(true)
    saveConversationCache(next.conversations)
    return next
  }, [getToken])

  const refreshConversations = useCallback(async () => {
    const { conversations } = await getSocialConversations(getToken)
    setOverview((current) => ({ friends: current?.friends ?? [], incomingRequests: current?.incomingRequests ?? [], outgoingRequests: current?.outgoingRequests ?? [], conversations }))
    saveConversationCache(conversations)
    return conversations
  }, [getToken])

  useEffect(() => {
    const cached = readConversationCache()
    if (cached) {
      setOverview({ friends: [], incomingRequests: [], outgoingRequests: [], conversations: cached })
      setLoading(false)
    }
    refreshConversations()
      .catch((failure) => setError(failure instanceof Error ? failure.message : t('Could not load friends and messages.')))
      .finally(() => setLoading(false))
  }, [refreshConversations])

  useEffect(() => {
    if (socialTab !== 'friends' || friendsLoaded) return
    refreshOverview().catch((failure) => setError(failure instanceof Error ? failure.message : t('Could not load friends and messages.')))
  }, [friendsLoaded, refreshOverview, socialTab])

  useEffect(() => {
    const term = query.trim()
    if (term.length < 2) {
      setResults([])
      return
    }
    let cancelled = false
    const timer = window.setTimeout(() => {
      searchSocialUsers(getToken, term)
        .then(({ users }) => { if (!cancelled) setResults(users) })
        .catch((failure) => { if (!cancelled) setError(failure instanceof Error ? failure.message : t('Could not search members.')) })
    }, 250)
    return () => {
      cancelled = true
      window.clearTimeout(timer)
    }
  }, [getToken, query])

  useEffect(() => {
    if (!conversationId) {
      setMessages([])
      return
    }
    let cancelled = false
    const load = () => getConversationMessages(getToken, conversationId)
      .then(({ messages: incoming }) => {
        if (cancelled) return
        setMessages((current) => {
          const merged = new Map(current.map((message) => [message.id, message]))
          incoming.forEach((message) => merged.set(message.id, message))
          return [...merged.values()].sort((left, right) => left.createdAt.localeCompare(right.createdAt))
        })
      })
      .catch((failure) => {
        if (!cancelled) setError(failure instanceof Error ? failure.message : t('Could not load messages.'))
      })
    load()
    const timer = window.setInterval(load, 10000)
    const onFocus = () => load()
    window.addEventListener('focus', onFocus)
    return () => {
      cancelled = true
      window.clearInterval(timer)
      window.removeEventListener('focus', onFocus)
    }
  }, [conversationId, getToken])

  useEffect(() => {
    if (!installed || !('Notification' in window) || Notification.permission !== 'granted') return
    let cancelled = false
    const restorePushState = async () => {
      try {
        const registration = await navigator.serviceWorker.ready
        const subscription = await registration.pushManager.getSubscription()
        if (!subscription) {
          window.localStorage.removeItem(pushReadyStorageKey)
          if (!cancelled) setPushReady(false)
          return
        }
        await enablePushNotifications(getToken)
        if (!cancelled) {
          window.localStorage.setItem(pushReadyStorageKey, 'true')
          setPushReady(true)
        }
      } catch {
        window.localStorage.removeItem(pushReadyStorageKey)
        if (!cancelled) setPushReady(false)
      }
    }
    void restorePushState()
    return () => { cancelled = true }
  }, [getToken, installed])

  async function turnOnNotifications() {
    setPushBusy(true)
    setError(null)
    try {
      await enablePushNotifications(getToken)
      window.localStorage.setItem(pushReadyStorageKey, 'true')
      setPushReady(true)
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : t('Could not enable notifications.'))
    } finally {
      setPushBusy(false)
    }
  }

  useEffect(() => {
    if (messageList.current) messageList.current.scrollTop = messageList.current.scrollHeight
  }, [messages.length])

  async function startConversation(person: SocialPerson) {
    setError(null)
    setBusyId(person.id)
    try {
      const { id } = await createDirectConversation(getToken, person.id)
      await refreshConversations()
      setSocialTab('chats')
      setConversationId(id)
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : t('Could not open this conversation.'))
    } finally {
      setBusyId(null)
    }
  }

  async function deleteFriend(person: SocialPerson) {
    setError(null)
    setBusyId(person.id)
    try {
      await removeFriend(getToken, person.id)
      await refreshOverview()
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : t('Could not remove this friend.'))
    } finally {
      setBusyId(null)
    }
  }

  async function requestFriend(person: SocialPerson) {
    setError(null)
    setBusyId(person.id)
    try {
      await sendFriendRequest(getToken, person.id)
      await refreshOverview()
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : t('Could not send the friend request.'))
    } finally {
      setBusyId(null)
    }
  }

  async function respond(id: string, action: 'accept' | 'decline') {
    setError(null)
    setBusyId(id)
    try {
      await respondToFriendRequest(getToken, id, action)
      await refreshOverview()
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : t('Could not update this friend request.'))
    } finally {
      setBusyId(null)
    }
  }

  async function sendMessage(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!conversationId || !draft.trim() || sending) return
    setSending(true)
    setError(null)
    try {
      const { message } = await postConversationMessage(getToken, conversationId, draft)
      setMessages((current) => [...current, message])
      setDraft('')
      await refreshConversations()
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : t('Could not send this message.'))
    } finally {
      setSending(false)
    }
  }

  const outgoingIds = new Set(overview?.outgoingRequests.map((request) => request.person.id) ?? [])
  const friendIds = new Set(overview?.friends.map((friend) => friend.id) ?? [])
  const searchTerm = query.trim().toLocaleLowerCase()
  const visibleConversations = (overview?.conversations ?? []).filter((conversation) =>
    !searchTerm || `${conversation.person.displayName} ${conversation.person.username ?? ''} ${conversation.lastMessage?.body ?? ''}`.toLocaleLowerCase().includes(searchTerm),
  )
  const activeConversation = overview?.conversations.find((conversation) => conversation.id === conversationId)

  return (
    <main className="shell social-shell">
      {navigation}
      <button className="back social-back" onClick={onBack}><span aria-hidden="true">←</span> {t('Back to profile')}</button>
      <header className="social-header">
        <div>
          <p className="eyebrow">{t('Your people')}</p>
          <h1>{t('Chat')}</h1>
          <p className="lede">{t('Friends and messages, together.')}</p>
        </div>
        <span className="social-header-mark" aria-hidden="true">+</span>
      </header>
      {error && <p className="error" role="alert">{error}</p>}
      {loading ? <p className="social-muted">{t('Loading your people…')}</p> : (
        <div className={`social-layout ${conversationId ? 'social-chat-open' : ''}`}>
          <aside className="social-sidebar" aria-label={t('Friends and conversations')}>
            <div className="social-sidebar-intro">
              <div><strong>{t('Inbox')}</strong><span>{visibleConversations.length} {visibleConversations.length === 1 ? t('conversation') : t('conversations')}</span></div>
              {installed && !pushReady ? <button type="button" className="social-notification-button" onClick={turnOnNotifications} disabled={pushBusy}>{pushBusy ? '…' : t('Enable notifications')}</button> : <span className="social-inbox-dot" aria-hidden="true" />}
            </div>
            <div className="social-tabs" role="tablist" aria-label={t('Friends and conversations')}>
              <button type="button" role="tab" aria-selected={socialTab === 'chats'} className={socialTab === 'chats' ? 'social-tab social-tab-active' : 'social-tab'} onClick={() => { setSocialTab('chats'); setQuery('') }}>{t('Chats')}</button>
              <button type="button" role="tab" aria-selected={socialTab === 'friends'} className={socialTab === 'friends' ? 'social-tab social-tab-active' : 'social-tab'} onClick={() => { setSocialTab('friends'); setQuery('') }}>{t('Friends')}</button>
            </div>
            {socialTab === 'friends' && <label className="social-search"><span>{t('Search people')}</span><input aria-label={t('Search people')} value={query} onChange={(event) => setQuery(event.target.value)} placeholder={t('Search people by their profile name or username.')} /></label>}
            {socialTab === 'friends' && results.length > 0 && <section className="social-section social-search-results"><h2>{t('Search results')}</h2>{results.map((person) => (
              <div className="social-person-row" key={person.id}>
                <PersonIdentity person={person} />
                {friendIds.has(person.id)
                  ? <button className="social-action" onClick={() => startConversation(person)} disabled={busyId === person.id}>{t('Message')}</button>
                  : <button className="social-action" onClick={() => requestFriend(person)} disabled={busyId === person.id || outgoingIds.has(person.id)}>{outgoingIds.has(person.id) ? t('Pending') : t('Add')}</button>}
              </div>
            ))}</section>}
            {socialTab === 'friends' && (overview?.incomingRequests.length ?? 0) > 0 && <section className="social-section social-requests"><h2>{t('Friend requests')}</h2>{overview!.incomingRequests.map((request) => (
              <div className="social-person-row" key={request.id}>
                <PersonIdentity person={request.person} />
                <div className="social-action-group">
                  <button className="social-action" onClick={() => respond(request.id, 'accept')} disabled={busyId === request.id}>{t('Accept')}</button>
                  <button className="social-action social-action-quiet" onClick={() => respond(request.id, 'decline')} disabled={busyId === request.id}>{t('Decline')}</button>
                </div>
              </div>
            ))}</section>}
            {socialTab === 'chats' && <section className="social-section social-conversations"><h2>{t('Conversations')}</h2>
              {visibleConversations.length ? visibleConversations.map((conversation) => (
                <ConversationButton key={conversation.id} conversation={conversation} active={conversation.id === conversationId} onClick={() => setConversationId(conversation.id)} language={language} />
              )) : <p className="social-muted">{searchTerm ? t('No conversations match that search.') : t('Your chats with friends will show up here.')}</p>}
            </section>}
            {socialTab === 'friends' && <section className="social-section social-friends"><h2>{t('Friends')}</h2>
              {overview?.friends.length ? overview.friends.map((friend) => (
                <div className="social-person-row" key={friend.id}>
                  <PersonIdentity person={friend} />
                  <div className="social-action-group">
                    <button className="social-action" onClick={() => startConversation(friend)} disabled={busyId === friend.id}>{t('Message')}</button>
                    <button className="social-action social-action-quiet" onClick={() => deleteFriend(friend)} disabled={busyId === friend.id}>{t('Remove')}</button>
                  </div>
                </div>
              )) : <p className="social-muted">{t('Search for people by their profile name or username.')}</p>}
            </section>}
          </aside>
          {activeConversation && <section className="social-chat" aria-label={t('Chat')}>
            <>
              <div className="social-chat-heading">
                <button className="social-mobile-back" onClick={() => setConversationId(null)}><span aria-hidden="true">←</span> {t('Chats')}</button>
                <div className="social-chat-person"><PersonIdentity person={activeConversation.person} /><span>{t('Direct conversation')}</span></div>
                <button className="social-chat-more" type="button" aria-label={t('Conversation options')}>•••</button>
              </div>
              <div className="social-messages" ref={messageList} aria-live="polite">
                {messages.length ? messages.map((message, index) => {
                  const own = message.senderId !== activeConversation.person.id
                  const previous = messages[index - 1]
                  const next = messages[index + 1]
                  const startsRun = !previous || previous.senderId !== message.senderId
                  const endsRun = !next || next.senderId !== message.senderId
                  return <div className={`social-message ${own ? 'social-message-own' : ''} ${startsRun ? 'social-message-start' : ''} ${endsRun ? 'social-message-end' : ''}`} key={message.id}>
                    <span>{message.body}</span>{endsRun && <time dateTime={message.createdAt}>{new Date(message.createdAt).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}</time>}
                  </div>
                }) : <p className="social-muted social-chat-empty">{t('Say hello to start the conversation.')}</p>}
              </div>
              <form className="social-compose" onSubmit={sendMessage}>
                <div className="social-compose-field">
                  <textarea aria-label={t('Write a message')} value={draft} onChange={(event) => setDraft(event.target.value)} placeholder={t('Write a message…')} maxLength={4000} rows={1} />
                  <span>{draft.length > 0 ? `${draft.length}/4000` : t('↵ to send')}</span>
                </div>
                <button className="social-send" disabled={sending || !draft.trim()} aria-label={sending ? t('Sending message') : t('Send message')}>{sending ? '…' : '↑'}</button>
              </form>
            </>
          </section>}
        </div>
      )}
    </main>
  )
}

function PersonIdentity({ person }: { person: SocialPerson }) {
  return (
    <span className="social-person-identity">
      {person.avatarUrl ? <img src={person.avatarUrl} alt="" /> : <span className="social-avatar" aria-hidden="true">{person.displayName.slice(0, 1).toUpperCase()}</span>}
      <span><strong>{person.displayName}</strong>{person.username && <small>@{person.username}</small>}</span>
    </span>
  )
}

function ConversationButton({ conversation, active, onClick, language }: { conversation: SocialConversation; active: boolean; onClick: () => void; language: Language }) {
  const t = (text: string) => translate(language, text)
  return (
    <button className={`social-conversation ${active ? 'social-conversation-active' : ''}`} onClick={onClick}>
      <PersonIdentity person={conversation.person} />
      <span className="social-conversation-preview">{conversation.lastMessage?.body ?? t('No messages yet')}</span>
      <span className="social-conversation-meta"><time dateTime={conversation.lastMessage?.createdAt}>{conversation.lastMessage ? formatTime(conversation.lastMessage.createdAt) : ''}</time><span className="social-conversation-chevron" aria-hidden="true">›</span></span>
    </button>
  )
}

function formatTime(value: string) {
  return new Date(value).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
}

const conversationCacheKey = 'wte.social.conversations'

function readConversationCache(): SocialConversation[] | null {
  try {
    const raw = localStorage.getItem(conversationCacheKey)
    if (!raw) return null
    const parsed = JSON.parse(raw) as { conversations?: SocialConversation[]; savedAt?: number }
    if (!Array.isArray(parsed.conversations) || Date.now() - (parsed.savedAt ?? 0) > 5 * 60_000) return null
    return parsed.conversations
  } catch {
    return null
  }
}

function saveConversationCache(conversations: SocialConversation[]) {
  try {
    localStorage.setItem(conversationCacheKey, JSON.stringify({ conversations, savedAt: Date.now() }))
  } catch {}
}
