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
