import type { IncomingMessage, ServerResponse } from 'node:http'
import handler from '../src/app.js'

export default function handleAdminUser(request: IncomingMessage, response: ServerResponse) {
  const incomingUrl = new URL(request.url ?? '/', 'http://localhost')
  if (incomingUrl.searchParams.get('businessLeadsExport') === '1') {
    request.url = '/admin-business-leads/export.csv'
    return handler(request, response)
  }
  const userId = incomingUrl.searchParams.get('userId')
  if (userId) request.url = `/admin-users/${encodeURIComponent(userId)}`
  return handler(request, response)
}
