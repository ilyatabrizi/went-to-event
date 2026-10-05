import { useCallback, useEffect, useRef, useState, type FormEvent, type ReactNode } from 'react'
import {
  createDirectConversation,
  getConversationMessages,
  getSocialOverview,
  postConversationMessage,
  respondToFriendRequest,
  searchSocialUsers,
  sendFriendRequest,
  type AuthTokenProvider,
  type SocialConversation,
  type SocialMessage,
  type SocialOverview,
  type SocialPerson,
} from './api'

export function SocialPanel({ getToken, onBack, navigation }: { getToken: AuthTokenProvider; onBack: () => void; navigation: ReactNode }) {
  const [overview, setOverview] = useState<SocialOverview | null>(null)
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SocialPerson[]>([])
  const [conversationId, setConversationId] = useState<string | null>(null)
  const [messages, setMessages] = useState<SocialMessage[]>([])
  const [draft, setDraft] = useState('')
  const [loading, setLoading] = useState(true)
  const [busyId, setBusyId] = useState<string | null>(null)
  const [sending, setSending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const messageList = useRef<HTMLDivElement>(null)

  const refreshOverview = useCallback(async () => {
    const next = await getSocialOverview(getToken)
    setOverview(next)
    return next
  }, [getToken])

  useEffect(() => {
    refreshOverview()
      .catch((failure) => setError(failure instanceof Error ? failure.message : 'Could not load friends and messages.'))
      .finally(() => setLoading(false))
  }, [refreshOverview])

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
        .catch((failure) => { if (!cancelled) setError(failure instanceof Error ? failure.message : 'Could not search members.') })
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
        if (!cancelled) setError(failure instanceof Error ? failure.message : 'Could not load messages.')
      })
    load()
    const timer = window.setInterval(load, 5000)
    return () => {
      cancelled = true
      window.clearInterval(timer)
    }
  }, [conversationId, getToken])

  useEffect(() => {
    if (messageList.current) messageList.current.scrollTop = messageList.current.scrollHeight
  }, [messages.length])

  async function startConversation(person: SocialPerson) {
    setError(null)
    setBusyId(person.id)
    try {
      const { id } = await createDirectConversation(getToken, person.id)
      await refreshOverview()
      setConversationId(id)
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : 'Could not open this conversation.')
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
      setError(failure instanceof Error ? failure.message : 'Could not send the friend request.')
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
      setError(failure instanceof Error ? failure.message : 'Could not update this friend request.')
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
      await refreshOverview()
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : 'Could not send this message.')
    } finally {
      setSending(false)
    }
  }

  const outgoingIds = new Set(overview?.outgoingRequests.map((request) => request.person.id) ?? [])
  const friendIds = new Set(overview?.friends.map((friend) => friend.id) ?? [])
  const activeConversation = overview?.conversations.find((conversation) => conversation.id === conversationId)

  return (
    <main className="shell social-shell">
      {navigation}
      <button className="back" onClick={onBack}><span aria-hidden="true">←</span> Back to profile</button>
      <header className="social-header">
        <p className="eyebrow">Your people</p>
        <h1>Friends &amp; messages.</h1>
        <p className="lede">Connect with people and keep the conversation going.</p>
      </header>
      {error && <p className="error" role="alert">{error}</p>}
      {loading ? <p className="social-muted">Loading your people…</p> : (
        <div className={`social-layout ${conversationId ? 'social-chat-open' : ''}`}>
          <aside className="social-sidebar" aria-label="Friends and conversations">
            <label className="social-search">Find people<input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search by name or username" /></label>
            {results.length > 0 && <section className="social-section"><h2>Search results</h2>{results.map((person) => (
              <div className="social-person-row" key={person.id}>
                <PersonIdentity person={person} />
                {friendIds.has(person.id)
                  ? <button className="social-action" onClick={() => startConversation(person)} disabled={busyId === person.id}>Message</button>
                  : <button className="social-action" onClick={() => requestFriend(person)} disabled={busyId === person.id || outgoingIds.has(person.id)}>{outgoingIds.has(person.id) ? 'Pending' : 'Add'}</button>}
              </div>
            ))}</section>}
            {(overview?.incomingRequests.length ?? 0) > 0 && <section className="social-section"><h2>Friend requests</h2>{overview!.incomingRequests.map((request) => (
              <div className="social-person-row" key={request.id}>
                <PersonIdentity person={request.person} />
                <div className="social-action-group">
                  <button className="social-action" onClick={() => respond(request.id, 'accept')} disabled={busyId === request.id}>Accept</button>
                  <button className="social-action social-action-quiet" onClick={() => respond(request.id, 'decline')} disabled={busyId === request.id}>Decline</button>
                </div>
              </div>
            ))}</section>}
            <section className="social-section"><h2>Conversations</h2>
              {overview?.conversations.length ? overview.conversations.map((conversation) => (
                <ConversationButton key={conversation.id} conversation={conversation} active={conversation.id === conversationId} onClick={() => setConversationId(conversation.id)} />
              )) : <p className="social-muted">Your chats with friends will show up here.</p>}
            </section>
            <section className="social-section"><h2>Friends</h2>
              {overview?.friends.length ? overview.friends.map((friend) => (
                <div className="social-person-row" key={friend.id}>
                  <PersonIdentity person={friend} />
                  <button className="social-action" onClick={() => startConversation(friend)} disabled={busyId === friend.id}>Message</button>
                </div>
              )) : <p className="social-muted">Search for people by their profile name or username.</p>}
            </section>
          </aside>
          <section className="social-chat" aria-label="Chat">
            {activeConversation ? <>
              <div className="social-chat-heading">
                <button className="social-mobile-back" onClick={() => setConversationId(null)}>← Chats</button>
                <PersonIdentity person={activeConversation.person} />
              </div>
              <div className="social-messages" ref={messageList} aria-live="polite">
                {messages.length ? messages.map((message) => (
                  <p className={`social-message ${message.senderId === activeConversation.person.id ? '' : 'social-message-own'}`} key={message.id}>
                    <span>{message.body}</span><time dateTime={message.createdAt}>{new Date(message.createdAt).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}</time>
                  </p>
                )) : <p className="social-muted social-chat-empty">Say hello to start the conversation.</p>}
              </div>
              <form className="social-compose" onSubmit={sendMessage}>
                <textarea aria-label="Write a message" value={draft} onChange={(event) => setDraft(event.target.value)} placeholder="Write a message…" maxLength={4000} rows={2} />
                <button className="primary-button" disabled={sending || !draft.trim()}>{sending ? 'Sending…' : 'Send'}</button>
              </form>
            </> : <div className="social-chat-placeholder"><span aria-hidden="true">✉</span><strong>Choose a conversation</strong><p>Pick a friend or start a chat from your list.</p></div>}
          </section>
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

function ConversationButton({ conversation, active, onClick }: { conversation: SocialConversation; active: boolean; onClick: () => void }) {
  return (
    <button className={`social-conversation ${active ? 'social-conversation-active' : ''}`} onClick={onClick}>
      <PersonIdentity person={conversation.person} />
      <small>{conversation.lastMessage?.body ?? 'No messages yet'}</small>
    </button>
  )
}
