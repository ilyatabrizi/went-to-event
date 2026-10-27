import { describe, expect, it } from 'vitest'
import { buildApp } from '../src/app.js'
import { events } from '../src/data/events.js'
import { InMemoryEventRepository } from '../src/repositories/events.js'

describe('API CORS', () => {
  it('allows the deployed web client to call the separate API project', async () => {
    const app = buildApp(new InMemoryEventRepository(), null, null)

    const response = await app.inject({
      method: 'GET',
      url: '/events',
      headers: { origin: 'https://web-sigma-roan-83.vercel.app' },
    })

    expect(response.statusCode).toBe(200)
    expect(response.headers['access-control-allow-origin']).toBe('https://web-sigma-roan-83.vercel.app')
    expect(response.json().total).toBe(events.filter((event) => new Date(event.endsAt).getTime() > Date.now()).length)
  })

  it('allows the custom production web domains', async () => {
    const app = buildApp(new InMemoryEventRepository(), null, null)

    for (const origin of [
      'https://wenttoevent.com',
      'https://www.wenttoevent.com',
      'http://wenttoevent.com',
      'http://www.wenttoevent.com',
    ]) {
      const response = await app.inject({
        method: 'GET',
        url: '/events',
        headers: { origin },
      })

      expect(response.statusCode).toBe(200)
      expect(response.headers['access-control-allow-origin']).toBe(origin)
    }
  })

  it('allows admin removal requests from the production web client', async () => {
    const app = buildApp(new InMemoryEventRepository(), null, null)
    const response = await app.inject({
      method: 'OPTIONS',
      url: '/admin-users/member-1',
      headers: {
        origin: 'https://wenttoevent.com',
        'access-control-request-method': 'DELETE',
      },
    })

    expect(response.statusCode).toBe(204)
    expect(response.headers['access-control-allow-methods']).toContain('DELETE')
  })
})
