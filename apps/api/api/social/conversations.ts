import type { IncomingMessage, ServerResponse } from 'node:http'
import handler from '../../src/app.js'

export default function handleSocialConversations(request: IncomingMessage, response: ServerResponse) {
  const incomingUrl = new URL(request.url ?? '/', 'http://localhost')
  if (incomingUrl.searchParams.get('pushSubscription') === '1') {
    request.url = '/notifications/push-subscription'
  }
  return handler(request, response)
}
