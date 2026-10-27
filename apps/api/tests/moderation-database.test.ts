import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { PGlite } from '@electric-sql/pglite'
import { readFile } from 'node:fs/promises'

const db = new PGlite()
beforeAll(async () => {
  await db.exec(`
    create role anon; create role authenticated; create role service_role bypassrls;
    create table profiles (id text primary key, username text, display_name text, verification_status text default 'unverified', verified_at timestamptz, updated_at timestamptz);
    create table venues (id uuid primary key default gen_random_uuid(), name text, address text);
    create table events (id text primary key, category text, title text, description text, starts_at timestamptz, ends_at timestamptz, venue_id uuid references venues(id), host_name text, host_user_id text references profiles(id));
    create table ticket_tiers (id text primary key, event_id text references events(id), name text, description text, price_cents integer);
    create table bookings (id uuid primary key default gen_random_uuid(), event_id text references events(id));
    create table account_verification_requests (id uuid primary key default gen_random_uuid(), user_id text references profiles(id), status text, reviewed_by text, reviewed_at timestamptz, review_note text);
    alter table events enable row level security; alter table venues enable row level security; alter table ticket_tiers enable row level security;
    create policy read_events on events for select using (true);
    create policy read_venues on venues for select using (true);
    create policy read_tiers on ticket_tiers for select using (true);
    grant usage on schema public to anon, authenticated, service_role;
    grant select on events, venues, ticket_tiers to anon, authenticated;
    grant all on all tables in schema public to service_role;
    insert into profiles(id, username, verification_status) values ('host', 'host', 'verified'), ('member', 'member', 'pending');
    insert into events(id, title) values ('previously-published', 'Existing event');
    insert into account_verification_requests(user_id, status) values ('member', 'pending');
  `)
  await db.exec(await readFile(new URL('../../../infra/supabase/migrations/021_event_location_coordinates.sql', import.meta.url), 'utf8'))
  await db.exec(await readFile(new URL('../../../infra/supabase/migrations/023_event_moderation.sql', import.meta.url), 'utf8'))
}, 30000)
afterAll(() => db.close())

async function submit() {
  const result = await db.query<{ id: string }>(`select create_event_for_verified_user('host','Music','Pending concert','Description','2099-01-01','2099-01-02','Venue','Venue address',35.7,51.4,'[{"name":"General","description":"Entry","price_cents":1000}]') as id`)
  return result.rows[0].id
}

describe('moderation database enforcement', () => {
  it('preserves existing published events and queues new submissions', async () => {
    const id = await submit()
    expect((await db.query(`select publication_status from events where id = 'previously-published'`)).rows).toEqual([{ publication_status: 'approved' }])
    expect((await db.query('select publication_status from events where id = $1', [id])).rows).toEqual([{ publication_status: 'pending' }])
  })
  it('hides pending events, ticket prices and venues from direct public database reads', async () => {
    const id = await submit()
    for (const role of ['anon', 'authenticated']) {
      await db.exec(`set role ${role}`)
      try {
        expect((await db.query('select * from events where id = $1', [id])).rows).toHaveLength(0)
        expect((await db.query('select * from ticket_tiers where event_id = $1', [id])).rows).toHaveLength(0)
        expect((await db.query('select * from venues')).rows).toHaveLength(0)
        await expect(db.query("select review_event($1, 'intruder', true, null)", [id])).rejects.toThrow(/permission denied/)
        await expect(db.query("select admin_verify_user('member', 'intruder')")).rejects.toThrow(/permission denied/)
      } finally { await db.exec('reset role') }
    }
  })
  it('blocks service-role bookings until approval and records the decision', async () => {
    const id = await submit()
    await db.exec('set role service_role')
    try {
      await expect(db.query('insert into bookings(event_id) values ($1)', [id])).rejects.toThrow('Event is not published')
      await db.query("select review_event($1, 'admin', true, 'Looks good')", [id])
      await db.query('insert into bookings(event_id) values ($1)', [id])
      const result = await db.query('select publication_status, reviewed_by, review_note from events where id = $1', [id])
      expect(result.rows[0]).toEqual({ publication_status: 'approved', reviewed_by: 'admin', review_note: 'Looks good' })
      await expect(db.query("select review_event($1, 'second-admin', false, null)", [id])).rejects.toThrow('Event is no longer pending')
    } finally { await db.exec('reset role') }
    await db.exec('set role anon')
    try { expect((await db.query('select id from events where id = $1', [id])).rows).toHaveLength(1) }
    finally { await db.exec('reset role') }
  })
  it('keeps rejected events unbookable', async () => {
    const id = await submit()
    await db.query("select review_event($1, 'admin', false, 'Please provide details')", [id])
    await expect(db.query('insert into bookings(event_id) values ($1)', [id])).rejects.toThrow('Event is not published')
  })
  it('verifies a member and closes their pending request atomically', async () => {
    await db.query("select admin_verify_user('member', 'admin')")
    expect((await db.query("select verification_status from profiles where id = 'member'")).rows).toEqual([{ verification_status: 'verified' }])
    expect((await db.query("select status, reviewed_by from account_verification_requests where user_id = 'member'")).rows).toEqual([{ status: 'approved', reviewed_by: 'admin' }])
    await expect(db.query("select admin_verify_user('missing', 'admin')")).rejects.toThrow('User not found')
  })
})
