# Web app

This will become the production TypeScript web/PWA client.

The current working visual prototype remains at the repository root while we
migrate it gradually. Do not delete or move the root files until the new web
app can replace them and its browser tests pass.

## Frontend contributor and AI instructions

This guide applies to anyone working on the frontend, including AI coding
assistants. Treat the frontend as a client of the existing backend. Keep
changes focused on the user interface and browser-side behavior.

### Frontend boundary

- Work in `apps/web/` for frontend tasks. Root-level prototype files may be
  changed only when the task explicitly concerns that prototype.
- Do not edit, create, delete, or rename backend or infrastructure files.
  This includes `apps/api/`, `infra/`, server entry points, API routes,
  database schemas and migrations, Supabase functions or policies, and
  server-side authentication, payment, or deployment configuration.
- Do not change API contracts, database structure, server behavior, or
  environment variable names. Do not add secrets or server-only credentials
  to browser code or frontend environment variables.
- If a frontend feature appears to require a backend change, stop at the
  frontend boundary: describe the needed API contract or server capability in
  the handoff and ask the backend owner to implement it. Keep frontend work
  compatible with the current API.
- Never work around missing authorization or server validation in the client.
  UI checks improve the experience; the server remains responsible for
  enforcing access and validating data.

### How to make frontend changes

- Read the existing component, styles, API client, and nearby screens before
  changing them. Follow the established React, TypeScript, and CSS patterns.
- Keep changes scoped to the requested screen or behavior. Reuse existing
  components and tokens; avoid unrelated refactors and new dependencies unless
  the task calls for them.
- Keep API calls in the existing frontend API layer (`src/api.ts`) and handle
  loading, empty, success, and error states in the UI. Do not call privileged
  services directly from a component.
- Make layouts work on mobile and desktop, preserve keyboard access and visible
  focus, label interactive controls, and account for reduced-motion settings.
- Do not remove or weaken existing tests to make a change pass. Add or update
  frontend tests when the task requests tests or verification.

### Branches, review, and handoff

- Do frontend work on the `frontend` branch or a focused branch based on it;
  do not commit directly to `main` or `develop`.
- Keep each change small and describe the user-facing result in the commit or
  pull request. Open frontend pull requests against `develop`, unless the
  repository owner gives a different target.
- Before handing work over, summarize changed files, behavior, checks run and
  their results, and any known issue. Clearly call out backend/API work that is
  needed instead of making that change yourself.
- Do not commit `.env` files, credentials, generated build output, or unrelated
  user changes.

## Local development

### Frontend preview without the API or sign-in

For day-to-day interface work, start the isolated preview mode:

```bash
cd apps/web
npm install
npm run dev:preview
```

Open the Vite URL, usually `http://localhost:5173/demo`. Preview mode uses
sample events and a local demo account; it does not contact Supabase or the
API, and any profile, booking, or verification changes are saved only in this
browser. The banner at the top identifies preview mode and its reset button
clears the demo state. These changes never reach shared or production data.

To work against the real API and authentication instead, use the regular
`npm run dev` instructions below and provide the local environment settings.

### Review and approval path

1. Build and review frontend changes locally in `dev:preview`; share screenshots
   or a screen recording with the reviewer when useful.
2. Push the work and open a pull request into `develop`. Include the change
   summary, preview steps, checks performed, and screenshots for visual work.
3. The reviewer approves and merges the pull request. That approval is the
   point where the changes enter the shared integration app. Do not deploy
   directly from the frontend branch.
4. Production continues through the repository's existing `develop` to `main`
   release process in the root `CONTRIBUTING.md`.

The `frontend` branch and local preview provide separation and a review path;
repository hosting permissions and required pull request approvals must be
configured in the Git host by an owner to enforce merges. A local branch alone
cannot prevent someone with Git access from merging or deploying.

Start the API in one terminal:

```bash
cd apps/api
npm run dev
```

Start the web app in another:

```bash
cd apps/web
npm install
npm run dev
```

Open the URL printed by Vite, usually `http://localhost:5173`.

The Vite development server proxies `/api` to the local API at
`http://127.0.0.1:3000`.

To enable web authentication, copy `.env.example` to `.env` and add the
Supabase project's public URL and anon key. Never put the API service-role key
in the web app.

Run the browser smoke test with:

```bash
npm run test:e2e
```

The test starts the API and Vite automatically. Install the Playwright browser
once if needed:

```bash
npx playwright install chromium
```
