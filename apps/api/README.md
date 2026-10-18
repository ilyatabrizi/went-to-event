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
Set `ADMIN_AUTH_USER_IDS` to the primary Supabase Auth user UUID(s). Those primary
admins can manage additional admins from the profile screen; delegated admins
are stored in `app_admins` and can review verification requests but cannot
delegate admin access. Every event create request is checked against the
account's database verification status on the API and again in the database
function.

Copy `.env.example` to `.env`, fill in the Supabase project URL and server-only
service-role key, then restart the API. The development server loads this file
automatically. The API will use Supabase automatically.
Never expose `SUPABASE_SERVICE_ROLE_KEY` to the web app or iOS app.

### Supabase Auth and session verification

The browser and iOS clients keep refreshable Supabase Auth sessions locally.
The API verifies access-token claims with Supabase `getClaims()` and its cached
JWKS, then uses the token subject as the auth ID; ordinary requests do not call
the Auth user endpoint or look up `user_identities`. Use asymmetric JWT signing
keys (such as ES256) on the Auth server so verification can use JWKS locally.
For accounts that must keep a different existing profile/booking ID, provision
the trusted `app_metadata.database_user_id` claim on that Auth user. Never put
that mapping in user-editable metadata, and insert its auth UUID and database ID
into `auth_user_identities` (migration `017_supabase_auth_identity_map.sql`) so
admin tools can resolve it.

Existing Clerk accounts are not transferred by this code. Provision those
users in Supabase Auth and preserve their old database identity by setting the
trusted mapping claim; users will need a password reset or new credential
because Clerk passwords cannot be copied. Before production, point web, iOS,
and API configuration at the same Auth server that is reachable for the target
users, and configure its allowed origins, email confirmation/recovery, and
WebAuthn relying-party origin. Passkeys are enabled in the web client through
Supabase's experimental passkey API and require a compatible Auth server.
The current xcconfig defaults still name the existing `*.supabase.co` project;
they must be changed if that endpoint is unreachable from Iran. This code change
does not migrate or provision production accounts and does not deploy migration
017.

## Business inquiries

The `/business-join/` form posts to `POST /business-leads`. Apply
`infra/supabase/migrations/010_business_leads.sql` to store each inquiry in the
private `business_leads` table; review submissions in Supabase Table Editor.
The endpoint requires `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` on the API
server. The service-role key must never be exposed to the browser.

Email alerts and booking confirmations use Resend. To enable them, verify the
`wenttoevent.com` domain in Resend, add the DNS records Resend provides, then
set `RESEND_API_KEY` and `RESEND_FROM_EMAIL=info@wenttoevent.com` in the API
environment. Business inquiry alerts additionally use
`BUSINESS_LEADS_TO_EMAIL` (for example `ads@wenttoevent.com`). Booking creation
still succeeds if the email provider is not configured or a notification fails.

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
