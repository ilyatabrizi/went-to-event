import type { IncomingMessage, ServerResponse } from 'node:http'
import handler from '../src/app.js'

export default function handleEvent(request: IncomingMessage, response: ServerResponse) {
  const incomingUrl = new URL(request.url ?? '/', 'http://localhost')
  const eventId = incomingUrl.searchParams.get('eventId')
  if (eventId) request.url = `/events/${encodeURIComponent(eventId)}`
  return handler(request, response)
}
