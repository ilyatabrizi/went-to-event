import { describe, expect, it, vi } from 'vitest'
import type { SupabaseClient } from '@supabase/supabase-js'
import { SupabaseAuthService } from '../src/auth/service.js'

const futureExpiration = Math.floor(Date.now() / 1000) + 3600

describe('SupabaseAuthService', () => {
  it('uses the trusted database ID claim without another identity lookup', async () => {
    const getClaims = vi.fn(async () => ({ data: { claims: {
      sub: 'auth-user-id', exp: futureExpiration, email: 'simulated@example.test',
      app_metadata: { database_user_id: 'legacy-profile-id' },
    } }, error: null }))
    const from = vi.fn()
    const service = new SupabaseAuthService({ auth: { getClaims }, from } as unknown as SupabaseClient)

    await expect(service.getUser('simulated-token')).resolves.toEqual({
      id: 'legacy-profile-id', authId: 'auth-user-id', email: 'simulated@example.test',
    })
    expect(from).not.toHaveBeenCalled()
  })

  it('resolves a legacy profile mapping once, then reuses the short-lived cache', async () => {
    const query = {
      select: vi.fn(),
      eq: vi.fn(),
      maybeSingle: vi.fn(async () => ({ data: { database_user_id: 'legacy-profile-id' }, error: null })),
    }
    query.select.mockReturnValue(query)
    query.eq.mockReturnValue(query)
    const from = vi.fn(() => query)
    const getClaims = vi.fn(async () => ({ data: { claims: { sub: 'auth-user-id', exp: futureExpiration } }, error: null }))
    const service = new SupabaseAuthService({ auth: { getClaims }, from } as unknown as SupabaseClient)

    await expect(service.getUser('first-token')).resolves.toMatchObject({ id: 'legacy-profile-id' })
    await expect(service.getUser('second-token')).resolves.toMatchObject({ id: 'legacy-profile-id' })
    expect(from).toHaveBeenCalledOnce()
    expect(query.maybeSingle).toHaveBeenCalledOnce()
  })

  it('rejects expired or unverifiable tokens', async () => {
    const service = new SupabaseAuthService({
      auth: { getClaims: vi.fn(async () => ({ data: { claims: { sub: 'auth-user-id', exp: 1 } }, error: null })) },
    } as unknown as SupabaseClient)
    await expect(service.getUser('expired-token')).resolves.toBeNull()
  })
})
