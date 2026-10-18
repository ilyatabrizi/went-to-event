import { describe, expect, it, vi } from 'vitest'
import type { SupabaseClient } from '@supabase/supabase-js'
import { AccountVerificationService } from '../src/verification/service.js'

function query(result: { data: unknown; error: null }) {
  const builder: Record<string, unknown> = {}
  for (const method of ['select', 'eq', 'in', 'limit']) builder[method] = vi.fn(() => builder)
  builder.maybeSingle = vi.fn(async () => result)
  builder.then = (resolve: (value: typeof result) => unknown, reject?: (error: unknown) => unknown) => Promise.resolve(result).then(resolve, reject)
  return builder
}

describe('legacy admin identity compatibility', () => {
  it('recognizes a primary Clerk ID through the linked Supabase identity and database profile', async () => {
    const from = vi.fn((table: string) => {
      if (table === 'auth_user_identities') return query({ data: { database_user_id: 'profile-id' }, error: null })
      if (table === 'user_identities') return query({ data: [{ clerk_user_id: 'legacy-primary-id' }], error: null })
      throw new Error(`Unexpected table ${table}`)
    })
    const service = new AccountVerificationService({ from } as unknown as SupabaseClient)

    await expect(service.isPrimaryAdmin('11111111-1111-4111-8111-111111111111', ['legacy-primary-id'])).resolves.toBe(true)
    await expect(service.isPrimaryAdmin('11111111-1111-4111-8111-111111111111', ['some-other-id'])).resolves.toBe(false)
    expect(from).toHaveBeenCalledTimes(4)
  })

  it('recognizes delegated admin records linked to a Supabase identity', async () => {
    let adminChecks = 0
    const from = vi.fn((table: string) => {
      if (table === 'app_admins') return query({ data: adminChecks++ === 0 ? null : { clerk_user_id: 'legacy-admin-id' }, error: null })
      if (table === 'auth_user_identities') return query({ data: { database_user_id: 'profile-id' }, error: null })
      if (table === 'user_identities') return query({ data: [{ clerk_user_id: 'legacy-admin-id' }], error: null })
      throw new Error(`Unexpected table ${table}`)
    })
    const service = new AccountVerificationService({ from } as unknown as SupabaseClient)

    await expect(service.isAdmin('11111111-1111-4111-8111-111111111111')).resolves.toBe(true)
  })
})
