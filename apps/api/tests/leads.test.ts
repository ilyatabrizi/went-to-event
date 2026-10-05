import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'
import type { FastifyInstance } from 'fastify'
import { buildApp } from '../src/app.js'
import type { BusinessLeadInput, BusinessLeadService } from '../src/leads/service.js'
import { InMemoryEventRepository } from '../src/repositories/events.js'

describe('POST /business-leads', () => {
  let app: FastifyInstance
  const submit = vi.fn(async (_input: BusinessLeadInput) => ({ reference: 'WTE-12345678' }))
  const listForExport = vi.fn(async () => [{
    business_name: 'Night Market', first_name: 'Sam', last_name: 'Shahverdi', niche: 'Live music',
    city: 'Tehran', phone: '09123456789', email: 'sam@example.com', created_at: '2026-10-05T10:00:00.000Z', status: 'new',
  }])
  const service = { submit, listForExport } as BusinessLeadService
  const authService = {
    getUser: vi.fn(async (token: string) => token === 'admin' || token === 'member' ? ({ authId: token }) : null),
  }
  const verificationService = { isAdmin: vi.fn(async (id: string) => id === 'admin') }

  beforeAll(async () => {
    app = buildApp(new InMemoryEventRepository(), authService as never, null, null, verificationService as never, service)
    await app.ready()
  })

  afterAll(async () => {
    await app.close()
  })

  it('stores a valid inquiry and returns a reference', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/business-leads',
      payload: {
        first_name: 'Sam',
        last_name: 'Shahverdi',
        business_name: 'Night Market',
        niche: 'Live music',
        city: 'Tehran',
        phone: '09123456789',
        email: 'sam@example.com',
        elapsed_ms: '12000',
      },
    })

    expect(response.statusCode).toBe(200)
    expect(response.json()).toEqual({ ok: true, reference: 'WTE-12345678' })
    expect(submit).toHaveBeenCalledWith(expect.objectContaining({
      firstName: 'Sam',
      email: 'sam@example.com',
      sourcePage: 'business-join',
      elapsedMs: 12000,
    }))
  })

  it('rejects invalid contact information', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/business-leads',
      payload: { first_name: 'S', last_name: 'Shahverdi', phone: '123' },
    })

    expect(response.statusCode).toBe(400)
  })

  it('silently ignores submissions caught by the honeypot', async () => {
    submit.mockClear()
    const response = await app.inject({
      method: 'POST',
      url: '/business-leads',
      payload: { website: 'spam.example' },
    })

    expect(response.statusCode).toBe(200)
    expect(response.json()).toEqual({ ok: true })
    expect(submit).not.toHaveBeenCalled()
  })

  it('requires an authenticated admin to export company inquiries', async () => {
    const unauthenticated = await app.inject({ method: 'GET', url: '/admin-business-leads/export.csv' })
    expect(unauthenticated.statusCode).toBe(401)

    const member = await app.inject({ method: 'GET', url: '/admin-business-leads/export.csv', headers: { authorization: 'Bearer member' } })
    expect(member.statusCode).toBe(403)

    const admin = await app.inject({ method: 'GET', url: '/admin-business-leads/export.csv', headers: { authorization: 'Bearer admin' } })
    expect(admin.statusCode).toBe(200)
    expect(admin.headers['content-type']).toContain('text/csv')
    expect(admin.headers['content-disposition']).toContain('attachment; filename="business-leads-')
    expect(admin.body).toContain('Night Market')
    expect(listForExport).toHaveBeenCalledOnce()
  })
})
