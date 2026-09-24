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

The API runs at `http://127.0.0.1:3000`.

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

Copy `.env.example` to `.env`, fill in the Supabase project URL and server-only
service-role key, then restart the API. The development server loads this file
automatically. The API will use Supabase automatically.
Never expose `SUPABASE_SERVICE_ROLE_KEY` to the web app or iOS app.
