import type { IncomingMessage, ServerResponse } from 'node:http'
import handler from '../../src/app.js'

export default function handleRequest(request: IncomingMessage, response: ServerResponse) {
  const incomingUrl = new URL(request.url ?? '/', 'http://localhost')
  const requestId = incomingUrl.searchParams.get('requestId')
  if (requestId) request.url = `/social/requests/${encodeURIComponent(requestId)}`
  return handler(request, response)
}
