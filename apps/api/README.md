# API

This will contain the server-side TypeScript API for business rules that must
not run in the browser or on the device, including bookings, payments,
webhooks, moderation, and administrative operations.

The API will use Supabase Postgres as its database during the first product
iteration.

## Local development

From this directory:

```bash
npm install
npm run dev
```

The API runs at `http://127.0.0.1:3000` on the Mac. For physical iPhone
testing, keep `HOST=0.0.0.0` and use the Mac's current LAN address, currently
`http://192.168.100.57:3000`.

Check it with:

```bash
curl http://127.0.0.1:3000/health
```

List the temporary event catalogue with:

```bash
curl http://127.0.0.1:3000/events
```

Fetch one event by ID with:

```bash
curl http://127.0.0.1:3000/events/event-1
```

The authenticated user endpoint is:

```text
GET /me
Authorization: Bearer <supabase-access-token>
```

Booking endpoints are protected by the same token:

```text
POST /bookings
GET  /me/bookings
GET  /me/bookings/:id
```

Create a test booking with JSON like:

```json
{"eventId":"event-1","ticketTierId":"tier-1","quantity":1}
```

Expected response:

```json
{"status":"ok","service":"went-to-event-api"}
```

Run the checks with:

```bash
npm test
npm run build
```

The port and host can be changed with `PORT` and `HOST` environment variables.

The event data is currently in memory at `src/data/events.ts`. It is temporary
seed data and is used automatically when Supabase credentials are absent.

## Supabase

The first database migration and seed data are in:

```text
infra/supabase/migrations/001_events.sql
infra/supabase/seed.sql
```

Account verification and verified-user event publishing use migrations
`007_account_verification.sql`, `008_verified_event_creation.sql`, and
`009_admin_delegation.sql`. Apply these migrations before enabling the flow.
Set `ADMIN_CLERK_USER_IDS` to the primary admin Clerk user ID(s). Those primary
admins can manage additional admins from the profile screen; delegated admins
are stored in `app_admins` and can review verification requests but cannot
delegate admin access. Every event create request is checked against the
account's database verification status on the API and again in the database
function.

Copy `.env.example` to `.env`, fill in the Supabase project URL and server-only
service-role key, then restart the API. The development server loads this file
automatically. The API will use Supabase automatically.
Never expose `SUPABASE_SERVICE_ROLE_KEY` to the web app or iOS app.

## Business inquiries

The `/business-join/` form posts to `POST /business-leads`. Apply
`infra/supabase/migrations/010_business_leads.sql` to store each inquiry in the
private `business_leads` table; review submissions in Supabase Table Editor.
The endpoint requires `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` on the API
server. The service-role key must never be exposed to the browser.

Email alerts are optional. To enable them, create a Resend API key, verify a
Went To Event sender address, then set `RESEND_API_KEY`,
`BUSINESS_LEADS_FROM_EMAIL`, and `BUSINESS_LEADS_TO_EMAIL` in the API
environment. For example, send from `leads@wenttoevent.com` to a real inbox such
as `ads@wenttoevent.com`. The sender domain must have the DNS records Resend
provides. The database save still succeeds if the email provider is not
configured or a notification fails.

After the migration is applied and new leads have been received, create an
Excel-friendly CSV with:

```bash
npm run export:business-leads
```

The file is written under `apps/api/exports/` and is git-ignored so contact
details are not accidentally committed. You can pass a different output path:

```bash
npm run export:business-leads -- /path/to/business-leads.csv
```
