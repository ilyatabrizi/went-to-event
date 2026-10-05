import type { IncomingMessage, ServerResponse } from 'node:http'
import handler from '../../src/app.js'

export default function handleConversationMessages(request: IncomingMessage, response: ServerResponse) {
  const incomingUrl = new URL(request.url ?? '/', 'http://localhost')
  const conversationId = incomingUrl.searchParams.get('conversationId')
  if (conversationId) request.url = `/social/conversations/${encodeURIComponent(conversationId)}/messages`
  return handler(request, response)
}
