import type { IncomingMessage, ServerResponse } from 'node:http'
import { buildApp } from '../src/app.js'

const app = buildApp()
const ready = app.ready()

export default async function handler(request: IncomingMessage, response: ServerResponse) {
  await ready
  if (request.url) request.url = request.url.replace(/^\/api(?:\/api)?(?=\/|$)/, '') || '/'
  app.server.emit('request', request, response)
}
