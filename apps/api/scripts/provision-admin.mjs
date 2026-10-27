import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'
import { randomBytes } from 'node:crypto'
import { writeFileSync } from 'node:fs'
import { resolve } from 'node:path'

config({ path: new URL('../.env', import.meta.url) })
const email = 'admin@wenttoevent.com'
const password = process.env.BOOTSTRAP_ADMIN_PASSWORD ?? randomBytes(18).toString('base64url')
const output = resolve(process.env.BOOTSTRAP_ADMIN_CREDENTIAL_FILE ?? '/tmp/wte-admin-credentials.txt')
if (password.length < 8) throw new Error('Use a password of at least 8 characters.')
if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) throw new Error('Supabase server configuration is required.')
const client = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false, autoRefreshToken: false } })
const { data: existing, error: lookupError } = await client.from('profiles').select('id').eq('username', 'admin').maybeSingle()
if (lookupError) throw new Error(lookupError.message)
if (existing) throw new Error('Username admin already exists. No account or password was changed.')
// Save locally before creating the account so credentials survive a partial failure.
writeFileSync(output, `Username: admin\nEmail: ${email}\nPassword: ${password}\n`, { mode: 0o600, flag: 'wx' })
const { data, error } = await client.auth.admin.createUser({ email, password, email_confirm: true, user_metadata: { username: 'admin', full_name: 'Administrator' } })
if (error || !data.user) throw new Error(error?.message ?? 'Could not create account')
const id = data.user.id
for (const result of [
  await client.from('profiles').upsert({ id, username: 'admin', display_name: 'Administrator', verification_status: 'verified', verified_at: new Date().toISOString() }),
  await client.from('auth_user_identities').upsert({ auth_user_id: id, database_user_id: id, email }),
  await client.from('app_admins').upsert({ clerk_user_id: id, added_by: 'bootstrap' }),
]) { if (result.error) throw new Error(`Account ${id} created but provisioning needs repair: ${result.error.message}`) }
const { error: signInError } = await client.auth.signInWithPassword({ email, password })
if (signInError) throw new Error(`Account created, but login verification failed: ${signInError.message}`)
console.log(`Admin account created and sign-in verified. Credentials: ${output}`)
