# Went To Event — Session Handoff

**Updated:** October 19, 2026

**Branch:** `develop`

**Latest code commit:** `c696845`; working tree was clean when this handoff was updated

> **Read this first.** The sections below this current snapshot include older
> notes from September 30–October 13, 2026. They are useful as product history,
> but some URLs, auth descriptions, and setup instructions are obsolete. The
> October 19 notes below supersede earlier snapshots where they conflict.

## Current session handoff — October 19, 2026

### Web privacy and test deployment

- The web app has a privacy policy at `/privacy` and `/privacy-policy`, plus a
  cookie notice with **Essential only** and **Allow optional** choices. The
  selected choice is saved in browser local storage under
  `wte.cookie-consent.v1`. The current app does not use optional analytics or
  advertising cookies; the preference does not activate optional scripts.
- Production web deployment `dpl_bFjZRKBbvGbQakdB7TXgS8N9U6Ld` is ready at
  `https://wenttoevent.com`.
- A test preview is ready at
  `https://web-o1xgixr0x-samshahverdi78-3858.vercel.app` (deployment
  `dpl_FUfMVX3bLgCShZH4ArghB16wLgLw`). Details are in `TEST_SERVER.md`.
- The web Vercel rewrite sends `/api/*` requests to the production API at
  `api-orcin-one-49.vercel.app`; actions in the test preview may therefore
  touch production data. Use care when creating test records.
- Only `SESSION_HANDOFF.md` was found as an existing session handoff file.

### Current session scope

The user asked to record the test-server link and update session handoff files.
`TEST_SERVER.md` and this current handoff snapshot record the preview URL,
deployment ID, production alias, and API routing caveat. No deployment was
performed in this handoff update.

## Current session handoff — October 13, 2026

### Cookie consent and authentication decision

- Web authentication remains on Clerk. The web client uses Clerk's session and
  sends a Clerk bearer token to the API; the API verifies it. Do not replace
  this with a custom login/session system just to address cookie consent.
- A repository scan found no analytics or advertising tracker integrations in
  the app. Clerk's sign-in storage and app functional preferences/cache are the
  current storage uses identified. Based on this scan, no consent pop-up is
  planned solely for authentication; explain necessary storage in the privacy
  notice and check obligations for the actual launch markets.
- Revisit consent before adding analytics, advertising, or other optional
  tracking. Where consent is required, block optional scripts until consent
  and provide a clear way to reject and later change the choice.
- The user asked whether to handle logins in-house; recommendation was to keep
  Clerk for launch. Owning authentication would also mean owning password
  handling, recovery, verification, abuse prevention, and session security. A
  cookie-session migration would require API changes and CSRF protections.
- Hosting/server purchasing is deferred for now; no infrastructure changes
  were requested or made in this conversation.

### Current session scope

The user asked to update this handoff and close the conversation. No code,
deployment, account settings, or consent UI changes were requested or made.

## Current session handoff — October 6, 2026

### Where we left off

The user is testing the native iOS app on a physical iPhone. Clerk was removed
from the iOS target to avoid the Associated Domains provisioning requirement.
The iOS app is now a guest preview: public event browsing is enabled, while
booking and all other authenticated operations are intentionally unavailable.
The iOS Debug and Release configurations now use the deployed HTTPS API, so a
physical phone does not need to reach a Mac-hosted API to load events.

The backend connection itself is working: a direct request to
`https://api-orcin-one-49.vercel.app/events` returned HTTP 200 and six events
on October 6. An unsigned iPhoneOS build also succeeded and its built Info.plist
contains `https://api-orcin-one-49.vercel.app` as `WTE_API_BASE_URL`.

**Current remaining iPhone blocker:** the latest signed build attempt reports
that the installed Apple development provisioning profile does not include the
currently selected iPhone UDID. This is a device-registration/provisioning
issue, not an Associated Domains error and not an API connectivity problem. Add
that iPhone to the Apple development team/profile in Xcode or the Apple
Developer account, refresh signing assets, then run the app again. A prior
signed build in this session succeeded, but the latest attempt after the API
config change did not; trust the latest build result.

### Current repository state

- Branch: `develop`.
- HEAD: `8ef024c` — `fix(ios)` (October 5, 2026).
- The worktree was clean before this handoff edit. `SESSION_HANDOFF.md` is the
  only expected modification now; do not recreate or revert the committed app
  changes.
- Recent preceding commit: `026b269` — `Chat system, admin logins, CSV for
  events and login page`.
- Do not commit, push, or deploy production unless the user explicitly asks.
  The user previously said not to push to production before being told; their
  later explicit deploy requests applied to those individual changes.

### Current architecture and capabilities

- `apps/web` is the React/Vite site; `apps/api` is the Fastify API deployed as
  a separate Vercel project; Supabase holds persistent event, social, profile,
  verification, booking, and business-lead data.
- Web authentication uses Clerk. The API verifies Clerk bearer tokens. Do not
  confuse the current iOS guest-preview state with the web/API auth setup.
- Web supports signup usernames, profile editing/picture upload, chat and
  friend requests, account verification, delegated admins, and event creation
  for verified accounts.
- `wte-join-main/` contains the separate business/organizer landing-page source
  used for the landing page. Its inquiry form submits to the API and persists
  company leads in Supabase using migration
  `infra/supabase/migrations/010_business_leads.sql` (already applied to the
  linked production Supabase project in the prior session).
- Company inquiries export is admin-only. The authenticated API route is
  `/admin-business-leads/export.csv`; it accepts the primary
  `ADMIN_CLERK_USER_IDS` admin and admins granted through the admin table. The
  web admin panel exposes **Company inquiries → Download CSV** in the profile's
  admin/verification area. Export is downloaded by the browser; it is not saved
  automatically to a server folder.
- iOS public event data flows through `EventStore` → `APIClient.getEvents()` →
  `GET /events`. `Config/Debug.xcconfig` and `Config/Release.xcconfig` currently
  both set the deployed HTTPS API URL. `apps/ios/WentToEvent/AuthStore.swift`
  deliberately provides no session/token in preview mode.

### Recent iOS changes and implications

- Removed `ClerkKit` and `ClerkKitUI` package dependencies from
  `apps/ios/WentToEvent.xcodeproj/project.pbxproj`.
- Removed Clerk setup/environment, callback URL scheme, publishable-key
  setting, and `Config/WentToEvent.entitlements` (which carried the
  `webcredentials:` associated-domain entitlement). Associated Domains is no
  longer enabled in the Xcode project.
- `MyApp.swift` now has no Clerk initialization. `ContentView.swift` presents
  a guest-mode alert when a sign-in-only action is attempted. `AuthStore` stays
  signed out and throws a clear preview-mode message if protected code requests
  an access token.
- `apps/ios/README.md` documents the deployed API and guest-preview limitation.
- Public event reads do not require Clerk and have been verified against the
  production `/events` endpoint. Authenticated booking/profile/chat operations
  cannot work from iOS until auth is implemented again.
- Do not restore only the Associated Domains entitlement to work around the
  build. If native sign-in is brought back later, plan and provision the Clerk
  callback/associated-domain capabilities deliberately and update this note.

### Production deployment state

- Web production alias: `https://wenttoevent.com` (HTTP 200 checked October 5).
- API production alias: `https://api-orcin-one-49.vercel.app`.
- The October 5 API deployment includes the CSV export endpoint and explicit
  Vercel route wiring. Unauthenticated export check returned the expected
  HTTP 401, proving it is routed and protected (not a 404).
- October 5 API production deployment: `dpl_ErJFQ66JfAQU4ugLuYmUPfiwMyw5`.
- October 5 web production deployment: `dpl_HiJNqsDjBdfgQYREtsiUmAPmxtmc`.
- To deploy through CLI, use explicit account scope. From `apps/api` or
  `apps/web`, the working command was
  `vercel deploy --prod --yes --scope samshahverdi78-3858`. A deploy without
  `--scope` initially returned `Not authorized` despite being logged in.
- Vercel account/CLI identity checked as `samshahverdi78-3858`; project names
  are `api` and `web`, aliases above.
- The Vercel Hobby plan limits a deployment to 12 serverless functions. Adding
  a separate export function exceeded the limit, so the export route rewrites
  to the existing `api/admin-user` function. That wrapper dispatches the
  `businessLeadsExport=1` query to the Fastify export route; preserve this
  routing unless the function budget is deliberately reworked.
- The web UI and API CSV implementation were deployed in the production
  version at that time. Do not redeploy unless asked.

### Validation at last handoff

- API: `npm test` passed (7 files, 20 tests); `npm run build` passed.
- Web: `npm run build` passed (TypeScript and Vite).
- iOS Simulator build passed with Clerk removed.
- iPhoneOS compile passed with `CODE_SIGNING_ALLOWED=NO` after switching the
  API URL; built `WTE_API_BASE_URL` was verified as the production API URL.
- Latest signed physical-device build attempt failed only because the current
  provisioning profile did not include the selected iPhone. No app install or
  launch was completed in that final attempt.
- Live checks: production `/events` HTTP 200 with six events; production
  export route HTTP 401 without auth; `wenttoevent.com` HTTP 200.

### Next actions

1. If the user wants to install/test now, add the iPhone UDID to the Apple
   development team/profile, refresh profiles in Xcode, and build/run the
   `WentToEvent` scheme on that iPhone. Keep Clerk and Associated Domains out
   for this guest-preview build.
2. Verify the events appear on the phone. If they do not, inspect the device
   build's embedded `WTE_API_BASE_URL`, confirm the phone has internet access,
   and retest `GET https://api-orcin-one-49.vercel.app/events`.
3. Ask before implementing auth again. If user wants booking/profile/social
   features in iOS, design an auth provider/session flow compatible with API
   bearer-token verification; do not fake a signed-in state.
4. Only deploy production after a direct user request. If asked, test/build
   first and include `--scope samshahverdi78-3858` for Vercel.

### Useful commands

```bash
# Check current worktree and recent commits
git status --short
git log -5 --oneline

# Verify production events without credentials
curl -i https://api-orcin-one-49.vercel.app/events

# Build iOS for Simulator
xcodebuild -project apps/ios/WentToEvent.xcodeproj \
  -scheme WentToEvent -sdk iphonesimulator -configuration Debug \
  -derivedDataPath /tmp/wte-ios-derived CODE_SIGNING_ALLOWED=NO build

# Build iOS for a physical phone (requires valid device provisioning)
xcodebuild -project apps/ios/WentToEvent.xcodeproj \
  -scheme WentToEvent -destination 'generic/platform=iOS' \
  -configuration Debug -derivedDataPath /tmp/wte-ios-device-derived build

# Validate API and web locally
(cd apps/api && npm test && npm run build)
(cd apps/web && npm run build)
```

The following sections are retained as product history and older setup
reference. Use the October 6 snapshot above for current state.

## Historical snapshot — September 30, 2026 (superseded)

This section described the September 30 working state. Its working-tree and
deployment details have since changed; use the October 6 snapshot above.

### What is currently working

- The web app and API are deployed as separate Vercel projects.
- The API CORS allow-list includes the Vercel web origin and both custom domains;
  this was redeployed after the custom domain first showed “Could not load
  events.” HTTP entries are temporary compatibility support while Vercel
  finishes provisioning the custom-domain certificate.
- The iOS app builds successfully for the iOS Simulator with the current
  SwiftUI navigation, booking, profile, and authentication changes.
- The hosted Supabase event catalog was replaced with five future Tabriz events
  so event reminders can be tested.
- The iOS primary navigation is a custom bottom bar with five tabs: **Home,
  Explore, Profile, Booked, and Chat**.
- The iOS Booked flow is a full-page experience rather than a pull-up sheet.
  Booking passes push inside the navigation stack and no longer use the old
  default Close toolbar treatment.
- The iOS profile screen is presented as a separate page with the custom `e.`
  header and custom navigation behavior.
- Signup now has a prominent Create an account action and a dedicated
  verification-success screen rather than leaving the signup form visible.
- The web signup screen also shows a dedicated verification confirmation state.
- Web signup now passes the current production origin as Supabase
  `emailRedirectTo` and normalizes email addresses before signup/sign-in.
- The Vercel production web deployment includes that auth redirect fix.

### Current production URLs and deployments

```text
Web production alias: https://web-sigma-roan-83.vercel.app
API production:       https://api-orcin-one-49.vercel.app
Web health check:     https://api-orcin-one-49.vercel.app/health
Web events endpoint:  https://api-orcin-one-49.vercel.app/events
```

The latest web auth deployment was made on September 30, 2026:

```text
Deployment ID: dpl_DVD7WLgCLhZZz3UvTiwh4MdPPYdj
Preview URL:  https://web-jza34kacg-samshahverdi78-3858.vercel.app
Target:       production
Alias:        https://web-sigma-roan-83.vercel.app
```

The latest API CORS deployment was made on October 1, 2026:

```text
Deployment ID: dpl_DUP9bprBsQBCjLMe1gH8zXbutyx6
Preview URL:  https://api-865z36jra-samshahverdi78-3858.vercel.app
Target:       production
Alias:        https://api-orcin-one-49.vercel.app
```

Production CORS was verified with successful `200` responses and matching
`Access-Control-Allow-Origin` headers for both custom domains over HTTP and
HTTPS:

```text
https://wenttoevent.com
https://www.wenttoevent.com
http://wenttoevent.com
http://www.wenttoevent.com
```

The Vercel project is `samshahverdi78-3858/web`, rooted at `apps/web`. The
production environment contains `VITE_API_URL`, `VITE_SUPABASE_URL`, and
`VITE_SUPABASE_ANON_KEY`. Never print the values of those variables; the anon
key is public-facing, but service-role credentials are not.

### Custom domain state

The domain `wenttoevent.com` was purchased from a third-party registrar and
has been added to the Vercel `web` project, along with `www.wenttoevent.com`.
Vercel currently reports the domain as not configured because its nameservers
are still:

```text
ns1.limoo.host
ns2.limoo.host
ns3.limoo.host
ns4.limoo.host
```

At the Limoo DNS panel, add the records Vercel requested:

```text
Type   Host   Value
A      @      76.76.21.21
A      www    76.76.21.21
```

Remove conflicting `A` or `AAAA` records for the apex and `www` host if they
exist. After DNS propagation, verify with:

```bash
cd apps/web
npx vercel domains inspect wenttoevent.com
npx vercel domains inspect www.wenttoevent.com
```

Supabase does not need its paid custom-domain feature. After the domain is
verified, update the free Supabase Auth URL Configuration manually in the
Supabase Dashboard:

```text
Site URL:       https://wenttoevent.com
Redirect URL:   https://wenttoevent.com/**
Redirect URL:   https://www.wenttoevent.com/**
```

The web code uses `window.location.origin` for email confirmation redirects, so
the same build will work when opened through the custom domain. The Supabase
API/Auth URL remains `https://legyknewpiwcxwdccbjd.supabase.co`.

### Hosted event catalog

The hosted Supabase database was updated directly using the authenticated CLI
query command because `supabase db push --include-seed` reported no seed files
to apply:

```bash
npx supabase db query --linked \
  --project-ref legyknewpiwcxwdccbjd \
  --file infra/supabase/seed.sql
```

The deployed API was then verified and returned these five events:

```text
event-1  Warehouse Sessions: Autumn Opening       2026-10-03
event-2  Sunrise Rooftop Yoga                      2026-10-07
event-3  Third Culture Supper Club                 2026-10-12
event-4  Light / Sound Installation Night          2026-10-20
event-5  Autumn Night Market                       2026-10-29
```

The source of truth for the fallback catalog is
`apps/api/src/data/events.ts`; the repeatable hosted/local seed is
`infra/supabase/seed.sql`. All old September event content was replaced. The
five dates are intentionally future relative to September 30, 2026, and the
October 29 event is approximately one month out for reminder testing.

### Validation performed in the current session

API validation from `apps/api`:

```bash
npm test       # 5 test files, 11 tests passed
npm run build  # TypeScript build passed
```

Web validation from `apps/web`:

```bash
npm run build  # TypeScript and Vite production build passed
npx vercel --prod
```

iOS validation from the repository root:

```bash
xcodebuild \
  -project apps/ios/WentToEvent.xcodeproj \
  -scheme WentToEvent \
  -sdk iphonesimulator \
  -configuration Debug \
  CODE_SIGNING_ALLOWED=NO build
```

The iOS simulator build passed after the bottom-tab, booking-page, signup
confirmation-screen, and email-normalization changes. The deployed API was
also queried directly after seeding and returned all five new future events.

### Verification-email diagnosis and current limitation

The hosted Supabase Auth settings were checked through the public Auth settings
endpoint. Email signup is enabled and `mailer_autoconfirm` is false, meaning
email confirmation is required. A database check showed that the newest test
user was still unconfirmed (`email_confirmed_at` was null), which explains why
login returned “Invalid login credentials” after the attempted confirmation.

The web fix is in `apps/web/src/AuthPanel.tsx`:

- Signup calls Supabase with `options.emailRedirectTo` set to the current site
  origin.
- Signup and sign-in trim whitespace and lowercase the email address.
- Signup displays a large dedicated “Verification email sent” state.

The iOS normalization fix is in `apps/ios/WentToEvent/AuthStore.swift`:

- Native signup and sign-in trim whitespace and lowercase email addresses.
- Native signup shows the verification message/screen when Supabase returns no
  session.

The iOS app still does not have a custom URL scheme or deep-link callback. Its
confirmation link therefore needs to complete in the browser before the user
returns to the app and signs in. A future native deep-link implementation needs
an iOS URL scheme, a Supabase allow-listed redirect URI, and app-level URL
handling.

The project currently uses Supabase’s built-in email sender. Repeated signup or
resend attempts produced “email rate limit exceeded”; this is an external
Supabase mailer limit, not an API or UI exception. Waiting for the limit to
reset is required for testing. Reliable production delivery requires configuring
a custom SMTP provider in Supabase and adding that provider’s SPF/DKIM DNS
records. The app does not yet have a resend-confirmation flow or client-side
resend cooldown.

## Current status at a glance

The first production-shaped vertical slice is working on both the web/PWA client
and the native iOS client:

```text
Browse public events
→ search, filter, and sort events
→ open event details
→ save/bookmark events locally
→ authenticate only when booking or opening account features
→ create a confirmed test booking
→ view upcoming and past booking history
→ open a detailed event ticket pass
```

The current Phase 2 roadmap is **Better event ownership and history**:

1. Upcoming bookings — complete.
2. Past bookings — complete.
3. Better ticket pass — complete.
4. Event reminders — iOS local reminders implemented; physical-device notification test remains.
5. Save/bookmark synchronization.
6. Improved profile page — current identity, settings, saved-events, picture,
   and separate-page navigation work is implemented; password recovery remains.

Payment is intentionally not part of the current test flow. ZarinPal remains
deferred until the non-payment product experience is stable.

### Completed milestone commits

These are the important recent local commits, in chronological order:

```text
30aa3ea Add web explore search and filters
cc03b01 Add saved events to web profile
392daa9 Add saved events to native iOS app
96e7f07 Add native booking pass screen
60e891e Fix native booking response decoding
4a04916 Add upcoming and past booking history
e9b36b7 Clean up native Swift concurrency warnings
c430cf3 Configure native API URL per build environment
6f44001 Improve event ticket pass details
```

Earlier milestone work is committed locally on `develop`, but the latest
session changes are intentionally uncommitted. Nothing should be pushed to the
remote unless explicitly requested.

## 1. Which code is active?

There are two generations of code in this repository.

### Current application

The active product is under `apps/`:

```text
apps/api/       Fastify + TypeScript API
apps/web/       React + Vite web/PWA client
apps/ios/       SwiftUI native iOS client
infra/supabase/ Supabase migrations and seed data
packages/       Shared TypeScript data contracts
```

This is the code to extend for new product behavior.

### Older root prototype

The repository root contains an earlier, self-contained visual prototype:

```text
index.html
js/
css/
serve.py
e2e.py
docs/
```

It is useful for visual reference and screenshots, but it is not connected to the current API/Supabase application. Its state is mostly local storage. Editing its `js/` files does not change `apps/web` or the iOS app.

## 2. Architecture

```text
                 ┌──────────────────────────┐
                 │ Supabase Auth + Postgres │
                 └────────────▲─────────────┘
                              │
                 ┌────────────┴─────────────┐
                 │ Fastify TypeScript API   │
                 │ server-side rules        │
                 └─────────▲────────▲───────┘
                           │         │
                    React/Vite   SwiftUI iOS
                    web/PWA      native client
```

The important separation is:

- Clerk owns web/API accounts and access tokens. The native iOS client still
  uses Supabase Auth until the native migration is completed.
- Supabase Postgres owns persisted events, profiles, bookings, and booking items.
- Fastify owns server-side business rules and protected API access.
- Web and iOS own screens, navigation, form state, and presentation.
- The clients never receive the Supabase service-role key.

The normal authenticated request is:

```text
Client signs in with Clerk on web (Supabase Auth on the current iOS build)
→ receives an access token
→ sends Authorization: Bearer <token> to Fastify
→ Fastify verifies the Clerk token for web requests
→ Fastify performs the protected operation
```

The normal booking request is:

```text
Client chooses event, ticket tier, quantity
→ POST /bookings with access token
→ API verifies the user
→ Postgres create_booking(...) validates the tier and quantity
→ Postgres calculates the total from its own price
→ booking and booking_items are inserted
→ API returns the booking
```

## 3. Git and release workflow

Branches:

```text
main       production; should always be releasable
develop    integration/staging
feature/*  new feature work
fix/*      focused fixes
```

Start work from `develop`:

```bash
git switch develop
git pull --ff-only origin develop
git switch -c feature/short-description
```

Use small commits. Open a pull request into `develop`. After staging validation, merge `develop` into `main` for a production release. Do not work directly on `main`.

The user uses GitHub Desktop for branch changes, commits, and pushing. Do not push to the remote unless explicitly requested.

Recent important commits:

```text
6f44001 Improve event ticket pass details
c430cf3 Configure native API URL per build environment
e9b36b7 Clean up native Swift concurrency warnings
4a04916 Add upcoming and past booking history
392daa9 Add saved events to native iOS app
cc03b01 Add saved events to web profile
30aa3ea Add web explore search and filters
96e7f07 Add native booking pass screen
60e891e Fix native booking response decoding
8702a35 Fix native Supabase login request
80333ca Add native authentication and booking flow
b96a7b5 Connect iOS development client to LAN API
ee94b0d Fix iOS target configuration
a02c6a1 Set iOS deployment target to 17
87c7644 Add native event browsing flow
e607659 Place iOS Xcode project in app workspace
1951e24 Add profile page and logout
ba39a86 Move authentication into booking flow
54a53d6 Prevent mobile auth input zoom
83d778a Make web app responsive and installable
e1dd1a8 Add bookings history and ticket pass
```

## 4. Environment configuration

### API: `apps/api/.env`

```env
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=server-only-service-role-key
HOST=127.0.0.1
PORT=3000
```

The API loads this file automatically. With both Supabase values present, it uses Supabase repositories and Supabase token verification. Without them, event reads can fall back to the in-memory data in `apps/api/src/data/events.ts`; real authenticated bookings are not available without Supabase.

Never expose `SUPABASE_SERVICE_ROLE_KEY` to the web app, iOS app, browser, or GitHub.

### Web: `apps/web/.env`

```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=public-anon-key
```

The web app uses the public anon key with `@supabase/supabase-js`. It does not use the service-role key.

### iOS: `apps/ios/Config/` and `AppConfig.swift`

`AppConfig.swift` contains the native Supabase project URL and public anon key.
The API URL is no longer hardcoded in Swift. It is injected into the app bundle
from Xcode configuration files:

```text
apps/ios/Config/Debug.xcconfig
apps/ios/Config/Release.xcconfig
apps/ios/Config/Info.plist
```

The current development routing is:

```text
iOS Simulator:  http://127.0.0.1:3000
Physical iPhone: http://192.168.100.57:3000
```

If the Mac’s hotspot/LAN address changes, update only the
`WTE_API_BASE_URL[sdk=iphoneos*]` line in `Config/Debug.xcconfig`, then rebuild.
`Info.plist` stores the resolved value as `WTE_API_BASE_URL`, and
`AppConfig.apiBaseURL` reads it at runtime.

Release points to the deployed API at
`https://api-orcin-one-49.vercel.app`. The release configuration is still not
App Store-ready because signing, TestFlight metadata, notification capability,
production deep-link handling, and final physical-device validation remain.

For a physical iPhone, run the API on all interfaces:

```bash
HOST=0.0.0.0 npm run dev
```

`.env` files, Xcode user data, build output, and other local files are ignored by `.gitignore`.

## 5. Start the development environment

### API for normal web development

Terminal 1:

```bash
cd apps/api
npm install
npm run dev
```

Check it:

```bash
curl http://127.0.0.1:3000/health
curl http://127.0.0.1:3000/events
```

### API for physical iPhone testing

```bash
cd apps/api
HOST=0.0.0.0 npm run dev
```

Before opening the iOS app, visit this from iPhone Safari:

```text
http://192.168.100.57:3000/events
```

If Safari cannot display JSON, fix the network/API binding first. The iOS code cannot work until the phone can reach the API.

### Web

Terminal 2:

```bash
cd apps/web
npm install
npm run dev
```

Open the Vite URL, normally `http://localhost:5173`. Vite proxies `/api` requests to `http://127.0.0.1:3000`.

For LAN/phone testing:

```bash
npm run dev -- --host 0.0.0.0
```

## 5A. Current Vercel deployment

The web and API are currently deployed as separate Vercel projects:

```text
Web: https://web-sigma-roan-83.vercel.app
API: https://api-orcin-one-49.vercel.app
```

The API health check is:

```text
https://api-orcin-one-49.vercel.app/health
```

The web project is rooted at `apps/web` and uses `apps/web/vercel.json`.
Production variables are configured in Vercel as `VITE_API_URL`,
`VITE_SUPABASE_URL`, and `VITE_SUPABASE_ANON_KEY`. The API project is rooted at
`apps/api`, uses `apps/api/api/[...path].ts` as its serverless adapter, and has
the production `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` configured only
in Vercel’s server environment.

The API and web deployments include local copies of the shared TypeScript
contracts under `apps/api/src/contracts` and `apps/web/src/contracts`. This is
required because each Vercel project is deployed from its app directory rather
than the repository root.

The Vercel deployment URLs remain available while `wenttoevent.com` is being
connected. Supabase project `legyknewpiwcxwdccbjd` is linked to the
repository and migration `004_profile_identity.sql` has been applied remotely,
including the profile username constraint and `profile-pictures` Storage
bucket. The iOS Release configuration now points to the deployed API instead
of a local IP address.

### iOS

Open:

```text
apps/ios/WentToEvent.xcodeproj
```

Open the `.xcodeproj`, not only the source folder. Select the `WentToEvent` scheme and choose either an iOS Simulator or the connected iPhone.

Simulator compile check:

```bash
xcodebuild \
  -project apps/ios/WentToEvent.xcodeproj \
  -scheme WentToEvent \
  -sdk iphonesimulator \
  -configuration Debug \
  -derivedDataPath /tmp/wte-ios-derived \
  CODE_SIGNING_ALLOWED=NO build
```

The project targets iOS 17 and is restricted to iOS/iOS Simulator platforms.

Running on a real iPhone additionally requires an Apple development team, a trusted device, Developer Mode, and an unlocked phone when Xcode installs the developer disk image.

## 6. Web application flow

The web entry point is `apps/web/src/main.tsx`. The main state/navigation lives in `apps/web/src/App.tsx`.

### Public event browsing

On launch:

1. The app checks whether Supabase already has a session.
2. It requests `GET /api/events`.
3. Vite proxies that to Fastify `GET /events`.
4. Event cards render without requiring login.

The home page intentionally does not lead with sign-in. A user should be able to explore first.

### Event detail

Selecting an event requests:

```text
GET /api/events/:id
```

The detail view shows category, title, time, venue, description, host, going count, ticket tiers, and prices.

### Web authentication

Authentication is in:

```text
apps/web/src/auth.ts
apps/web/src/AuthPanel.tsx
```

The web client uses Supabase’s `signInWithPassword`, `signUp`, `signOut`, `getSession`, and `onAuthStateChange` APIs.

When the user signs in, the session access token is retained by the Supabase web client. That token is sent to the API for protected calls.

### Signed-out booking behavior

If a signed-out user taps the booking action:

1. No booking request is made.
2. The auth view opens.
3. The user can switch between sign-in and sign-up.
4. After authentication, the user can complete the booking.

### Web booking

The client sends:

```http
POST /api/bookings
Authorization: Bearer <supabase-access-token>
Content-Type: application/json
```

with:

```json
{
  "eventId": "event-1",
  "ticketTierId": "tier-1",
  "quantity": 1
}
```

The API verifies the token and delegates total calculation to Postgres. The browser never determines the authoritative total.

### Web profile and bookings

The profile flow displays the current account, saved events, and a logout action.
Saved event IDs are stored in browser `localStorage` under
`wte.saved-events`. This is currently device/browser-local, not server synced.
Logout clears the client session and returns the user to public browsing.

The profile hub also shows saved-event, upcoming-booking, and active-reminder
counts, with quick actions for opening bookings and returning to Explore. The
upcoming count reflects bookings already loaded in the current browser session;
opening bookings loads the authoritative list from the API.

Authenticated profile settings are now connected to the API. The web profile
has a root-prototype-inspired identity header and grouped settings cards for:

- Display name.
- Unique lowercase username.
- Profile picture URL.
- Email address.
- New password.

Email and password changes use the protected account endpoint. Supabase may
require email confirmation after an email change, depending on project Auth
settings. The current profile-picture increment stores a validated HTTPS/HTTP
image URL; binary image upload through Supabase Storage is still a later step.

The bookings page requests:

```text
GET /api/me/bookings
```

Only the authenticated user’s bookings are returned. For each booking, the web
client separately requests `GET /events/:id` and stores the result in
`bookingEvents`, because the current booking API returns `eventId` rather than
an embedded event object.

Bookings are split using the related event’s `endsAt` timestamp:

- **Upcoming:** `event.endsAt >= Date.now()`.
- **Past:** the event has ended, or its event details could not be loaded.

Opening a booking shows a detailed pass containing its status, event title,
start/end time, venue and address, host, ticket tier, quantity, total, booking
date, and the first eight characters of the booking ID as the entry reference.

The web pass also includes an upcoming-event reminder action. Reminder records
are stored in `localStorage` under `wte.event-reminders`, and the browser asks
for notification permission when the user taps `Remind me`. The reminder is
scheduled for one hour before the event, and the action changes to `Cancel
reminder` after it is saved. This first implementation uses an in-page timer,
so the site must remain open for the browser notification to fire. Reliable
background web reminders will require service-worker/push infrastructure later.
Web and iOS reminder choices are device-local and are not synchronized.

### Web tests

Tests are in `apps/web/tests/events.spec.ts`:

```bash
cd apps/web
npm run test:e2e
```

The current 7 tests cover event browsing/detail, desktop layout, mobile-safe auth
fields, signed-out booking auth redirect, signed-out profile access, explore
search/filter behavior, and saved-event persistence after reload.

## 7. Native iOS application flow

The app entry point is `apps/ios/WentToEvent/MyApp.swift`. The main SwiftUI screen is `apps/ios/WentToEvent/ContentView.swift`.

### Native event browsing

`EventStore` calls `APIClient.getEvents()`, which requests:

```text
GET /events
```

The home screen supports loading, retry/error state, pull-to-refresh, event cards, and navigation to event detail.

`EventModels.swift` maps the API event JSON into Swift `Codable` models.

### Native event detail and booking entry

The detail screen shows the event and allows ticket tier selection and quantity selection from 1 through 10.

If the user is signed out, the action opens native authentication rather than sending a bad booking request.

### Native authentication files

```text
AppConfig.swift          Supabase and API configuration
AuthModels.swift         Session/user response models
SupabaseAuthClient.swift Supabase Auth REST requests
AuthStore.swift          Observable session state and auth actions
KeychainStore.swift      Secure local session storage
```

The app uses `URLSession` directly instead of adding the Supabase Swift package.

Sign-in sequence:

1. User enters email/password in `AuthView`.
2. `AuthStore.signIn` calls `SupabaseAuthClient.signIn`.
3. The client sends `POST /auth/v1/token?grant_type=password` to Supabase.
4. Supabase returns access and refresh tokens.
5. The app sends the access token to Fastify `GET /me`.
6. If the API verifies the token, the app stores the session in the Keychain.
7. The UI becomes signed in.

The native token URL bug was fixed in commit `8702a35`: `grant_type` is now built as a real URL query item rather than being appended as part of a path string.

Sign-up uses Supabase `POST /auth/v1/signup`. If Supabase requires email
confirmation and returns no session, the app displays a dedicated confirmation
screen with the target email and a Back to sign in action. The signup and
sign-in email values are trimmed and lowercased before the request. The app
does not yet intercept a native email-link deep link.

### Native session restoration

On app launch, `AuthStore` loads the stored session from Keychain.

- A valid token is checked against `GET /me`.
- A nearly expired token is refreshed with the Supabase refresh token.
- If restoration fails, the app clears the local session and becomes signed out.

### Native profile/logout

The Profile tab shows the user’s email and ID, saved events, and a logout
button. Native saved event IDs are stored with `UserDefaults` through
`SavedEventsStore`; they are currently local to that device and are not yet
synced to Supabase. It also has editable identity/security fields and a Photos
picker that center-crops and uploads a profile picture through the API.

The Profile tab also has an account header, saved-event and local-reminder
counts, a direct Booked shortcut, and the custom `e.` navigation treatment.

The profile sheet now includes editable display name, username, profile-picture
URL, email, and password fields backed by the same API endpoints as the web
client.

Logout clears the in-memory session and deletes the Keychain session.

### Native booking and booking history

The booking request is:

```text
POST /bookings
Authorization: Bearer <supabase-access-token>
```

The native Booked tab requests:

```text
GET /me/bookings
```

The native Booked tab is a custom full-page SwiftUI screen. It loads the booking
list and then fetches each related event. It renders two sections:

- **Upcoming:** related event `endsAt` is greater than or equal to the current
  date/time.
- **Past:** the event has ended, or its event details are unavailable.

Selecting a booking pushes `BookingPassView` inside the same navigation stack,
not another sheet. It now displays:

- Confirmed/status label.
- Event artwork and title.
- Start time and end time.
- Venue name and address.
- Host name.
- Ticket tier and quantity.
- Total price.
- Booking reference from the first eight characters of the booking ID.
- Booking creation date.

The reference is currently a display code, not a cryptographically generated
QR/barcode and not yet connected to an entry scanner.

### Native iOS event reminders

The first reminder increment is local to the iOS device and does not require a
new API route or database table. `ReminderStore.swift` uses
`UNUserNotificationCenter` and `UserDefaults`:

- Each booking can have one reminder identified by its booking ID.
- Tapping `Remind me` requests notification permission the first time.
- The notification is scheduled for one hour before the event start time.
- The reminder state survives app restarts on the same device.
- Tapping `Cancel reminder` removes the pending notification and local state.
- Events starting in less than one hour cannot receive this reminder and show a
  clear explanation.
- If the user previously denied notifications, the app explains that they must
  enable notifications in iOS Settings.

The action is shown only for upcoming events inside `BookingPassView`. This is
intentionally a local notification feature for development; it is not a remote
push notification system and it does not synchronize reminder choices between
the web app and iOS yet.

## 8. API routes and server responsibilities

The Fastify app is assembled in `apps/api/src/app.ts`.

Public routes:

```http
GET /health
GET /events
GET /events/:id
```

Protected routes:

```http
GET /me
POST /bookings
GET /me/bookings
GET /me/bookings/:id
GET /me/profile
PATCH /me/profile
PATCH /me/account
POST /me/profile-picture
```

`PATCH /me/profile` validates and persists `username`, `displayName`, and
`avatarUrl` in `public.profiles`. Usernames are normalized to lowercase and
must be 3–24 characters using lowercase letters, numbers, or underscores.
`PATCH /me/account` accepts an email and/or password and applies the change
through the Supabase Admin Auth client after verifying the caller’s access
token. The service-role key remains server-only.

`POST /me/profile-picture` accepts a base64 JPEG, PNG, or WebP image payload,
limits it to approximately 1 MB, uploads it to Supabase Storage under the
authenticated user’s folder, and updates `profiles.avatar_url` with the public
asset URL.

Apply `infra/supabase/migrations/004_profile_identity.sql` to the Supabase
project before using usernames or profile-picture uploads. It adds the nullable
username column, format constraint, case-insensitive unique index, public
`profile-pictures` storage bucket, and user-folder storage policies. Existing
accounts continue to work with a blank username until the user fills one in.

Protected routes require:

```http
Authorization: Bearer <supabase-access-token>
```

`apps/api/src/auth/service.ts` verifies the token through Supabase Auth. The API does not trust a client-provided user ID.

Event repository selection is automatic:

```text
Supabase credentials present → SupabaseEventRepository
Credentials absent           → InMemoryEventRepository
```

Booking service selection is also Supabase-based. Real booking behavior requires the Supabase URL, service-role key, migrations, and RPC function.

## 9. Database model

Migrations are in `infra/supabase/migrations/`.

### `001_events.sql`

Creates:

```text
venues
events
ticket_tiers
```

Relationships:

```text
venues 1 ─── many events
events 1 ─── many ticket_tiers
```

### `002_profiles.sql`

Creates `profiles`, keyed to `auth.users(id)`, with display name and avatar fields. Policies allow an authenticated user to read/write only their own profile.

The current UI does not yet provide full profile editing; it mainly displays Auth user information and supports logout.

### `003_bookings.sql`

Creates:

```text
bookings
booking_items
```

The `create_booking` Postgres function:

- Requires quantity between 1 and 10.
- Confirms that the ticket tier belongs to the selected event.
- Calculates the total from the database’s `price_cents`.
- Inserts the booking and booking item.
- Returns the created booking as JSON.

This server-side calculation must remain authoritative.

## 10. Payment status

Stripe is not being used. ZarinPal is the selected payment provider, but payment integration is intentionally deferred.

Current test bookings are created as confirmed database records without a real payment transaction.

The intended future flow is:

```text
Client asks API to start checkout
→ API creates pending booking/order
→ API requests a ZarinPal payment
→ Client opens the payment redirect
→ ZarinPal calls the server callback
→ API verifies the transaction server-side
→ API marks booking confirmed
→ Client shows the pass
```

ZarinPal merchant credentials must live only in the API/deployment secret store.

## 11. Testing checklist

### API

```bash
cd apps/api
npm test
npm run build
```

Manual smoke checks:

```bash
curl http://127.0.0.1:3000/health
curl http://127.0.0.1:3000/events
curl http://127.0.0.1:3000/events/event-1
```

### Web

```bash
cd apps/web
npm run build
npm run test:e2e
```

### iOS

Run the simulator build command from section 5, then manually test on a physical phone:

1. Start API with `HOST=0.0.0.0`.
2. Verify `/events` from iPhone Safari.
3. Unlock/trust the iPhone and enable Developer Mode.
4. Run the `WentToEvent` scheme.
5. Browse events and open detail.
6. Open Profile while signed out.
7. Sign up or sign in.
8. Confirm email/profile appears.
9. Log out and confirm signed-out state.
10. Sign in again.
11. Create a test booking.
12. Open bookings and confirm it appears under Upcoming or Past.
13. Open the booking pass and verify event time, end time, venue address, host,
    ticket tier, quantity, total, booking reference, and booking date.
14. Kill and relaunch the app to test Keychain session restoration.

## 12. Known limitations

### iOS build messages

The actor-isolation warnings around `AuthStore` and `EventStore` were removed in
commit `e9b36b7`. The remaining AppIntents metadata message is harmless because
the app does not declare any AppIntents:

```text
Metadata extraction skipped, no AppIntents.framework dependency found
```

### Development IP configuration

The API URL is no longer hardcoded in Swift. Simulator and physical-device
values are resolved through `apps/ios/Config/Debug.xcconfig` and embedded in
`Config/Info.plist`. Update the `iphoneos` value when the Mac’s hotspot/LAN IP
changes.

Release points to the hosted API at `https://api-orcin-one-49.vercel.app`.
Debug continues to use local Simulator/LAN addresses.

### Ticket pass limitations

The improved pass is informational. Its booking reference is the first eight
characters of the booking ID; it is not yet a cryptographic QR/barcode and is
not connected to an entry scanner. A real check-in system should be designed
before App Store launch.

### Saved-event synchronization

Saved events currently persist locally:

- Web: browser `localStorage`.
- iOS: `UserDefaults`.

They are not synchronized between devices or persisted in Supabase yet.

### Event reminders

iOS local reminders and the first web reminder action are implemented. iOS uses
`UNUserNotificationCenter`; web uses the browser Notification API and an
in-page timer. Both are device-local and are not synchronized. The remaining
work is physical-iPhone notification validation and, later, reliable background
web delivery through service-worker/push infrastructure.

### Profile editing

The profile hub, editable identity/security fields, and profile-picture upload
are implemented on web and iOS. Profile pictures are center-cropped to 512×512
and stored in the `profile-pictures` Supabase Storage bucket. Password recovery
and re-authentication UX remain future work.

### Password recovery and confirmation recovery

Forgot-password, resend-confirmation, and native deep-link confirmation flows
are not implemented yet. Web confirmation now uses the current browser origin
as `emailRedirectTo`, but Supabase URL Configuration must include the production
custom domain before those links can reliably return to the branded site.

### Payments

Bookings are not paid bookings yet. ZarinPal must be integrated server-side before users should be promised paid tickets.

### Events/admin

There is no event publishing, admin, moderation, inventory, or capacity-management workflow yet.

## 13. Troubleshooting

### Port 3000 already in use

`EADDRINUSE` means another API process owns port 3000. Reuse the existing process or stop the duplicate before starting another watcher.

### iPhone developer disk image error

The common cause in the current setup was a locked phone. Unlock it, trust the Mac, enable Developer Mode, and run again.

### iOS cannot load events

Check:

1. API is running.
2. Physical-device API uses `HOST=0.0.0.0`.
3. iPhone Safari can open `http://192.168.100.57:3000/events`.
4. `apps/ios/Config/Debug.xcconfig` has the Mac’s current address on its
   `iphoneos` line.
5. macOS firewall/network sharing is not blocking port 3000.

### Native login fails

Check:

1. The same credentials work in the web app.
2. iOS Supabase URL/anon key match `apps/web/.env`.
3. The API is running, because native login verifies the token through `GET /me`.
4. The phone can reach the API address.
5. The account has completed email confirmation if confirmation is enabled.
6. The app is rebuilt from commit `8702a35` or later, which fixes the token query URL.

### Xcode shows red lines while the build succeeds

This is usually stale SourceKit/index state after the target or synchronized files changed. Use `Product → Clean Build Folder`, close/reopen the `.xcodeproj`, verify the `WentToEvent` scheme and iOS destination, then rebuild. If command-line `xcodebuild` succeeds, capture the exact remaining diagnostic before changing working code.

## 14. Recommended next order of work

Phase 2 — Better event ownership and history:

1. Upcoming bookings — complete in `4a04916`.
2. Past bookings — complete in `4a04916`.
3. Better ticket pass — complete in `6f44001`.
4. Event reminders — iOS local notifications and the first web reminder action
   are implemented; validate both clients before considering service-worker or
   remote push delivery. Do not add payment or remote push infrastructure yet.
5. Save/bookmark synchronization — move from client-only storage toward a
   protected API and Supabase table, while preserving the current local UX.
6. Improved profile page — identity, account editing, and Supabase Storage
   profile-picture upload are implemented on web and iOS; password recovery and
   re-authentication remain.

After Phase 2:

7. Add password reset, resend-confirmation, and email deep-link handling.
8. Implement ZarinPal through the API with pending/confirmed payment states.
9. Add event publishing, moderation, capacity, and admin workflows.
10. Create real staging/production environments and TestFlight/App Store
    release configuration.

## 15. Historical end-to-end product summary (superseded)

The current working vertical slice is:

```text
Browse events without an account
→ open event details
→ authenticate only when needed
→ verify the Clerk token through Fastify
→ view profile and logout
→ select ticket tier and quantity
→ create a protected booking
→ view upcoming and past booking history
→ open a detailed ticket pass
```

The web and iOS clients use the same API contracts. Clerk is now the web/API
identity provider, while Supabase remains the source of truth for persisted
events, profiles, bookings, and storage. Fastify is the source of truth for
protected server behavior and booking rules. The iOS client still uses its old
Supabase AuthStore until the native Clerk SDK work in section 16 is completed.
ZarinPal is planned but not yet connected.

## 16. Historical Clerk migration status — October 1, 2026 (superseded for iOS)

The authentication migration from Supabase Auth to Clerk was started after the
Clerk CLI was authenticated as `sam.shahverdi78@gmail.com`. The linked Clerk
application is the real `wenttoevent` app (`app_3K5nK0PtKNf1p46GgSOtAbHGtb3`),
not one of the unrelated Clerk applications in the account.

### Completed in this migration

- Initialized Clerk in `apps/web` with the current `@clerk/react` package and
  wrapped the app in `ClerkProvider`.
- Replaced the web Supabase session listener and Supabase sign-in/sign-up panel
  with Clerk's embedded `SignIn` and `SignUp` components.
- Changed web API calls to request a Clerk token on demand using `getToken()`;
  booking, profile, account, and profile-picture requests now send that token.
- Added `@clerk/backend` to the API.
- Added `ClerkAuthService`, which verifies bearer tokens with Clerk, retrieves
  the Clerk user's email, and keeps the existing API contract.
- Kept Supabase's service-role client for database, storage, and event data; it
  is no longer used to authenticate web requests.
- Added `infra/supabase/migrations/005_clerk_auth.sql`. It changes profile and
  booking user IDs to text, removes the old `auth.users` foreign-key dependency,
  adds `public.user_identities`, and changes `create_booking` to accept Clerk
  IDs. Existing UUID IDs are preserved as text.
- Existing users are mapped by matching their Clerk email to the old Supabase
  Auth user on their first authenticated API request. Their old bookings and
  profile remain addressable. New users use their Clerk ID directly.
- Applied migration 005 to hosted Supabase project
  `legyknewpiwcxwdccbjd` with the Supabase CLI.
- Added production Vercel environment variables:
  - Web: `VITE_CLERK_PUBLISHABLE_KEY` on project `web`.
  - API: `CLERK_SECRET_KEY` on project `api` as a sensitive secret.
- API production deployment completed and `/health` plus `/events` were checked.
- Web production deployment completed and was aliased to
  `https://wenttoevent.com`.
- Local API build and all 12 API tests pass. Local web TypeScript/Vite build
  passes.

### Auth UI polish and latest deployment

The first Clerk deployment exposed Clerk's default card styling, which did not
match the product UI. `apps/web/src/AuthPanel.tsx` now passes a custom Clerk
appearance configuration for the dark Went To Event theme. The corresponding
styles are in `apps/web/src/styles.css` and cover the Clerk root, card, title,
subtitle, labels, inputs, primary action, social buttons, divider, footer,
links, errors, and alerts.

The auth page also had a centering problem because it inherited the responsive
event shell width while Clerk used its own internal width. The `.auth-shell`
layout now explicitly uses a centered `min(calc(100% - 32px), 520px)` column;
the auth panel, header, and Clerk root all fill that same column. This was
verified by a successful production web build and deployed as:

- Latest web deployment: `dpl_8AtheqCx2kX2BPXrn3FuBqQfSS7k`.
- Latest production alias: `https://wenttoevent.com`.
- Latest preview URL: `https://web-46y5zrheo-samshahverdi78-3858.vercel.app`.

If the old layout still appears in a browser, perform a hard refresh or open a
private window because the Vite bundle is cached by the browser/service worker.

### Important remaining work

The web/API Clerk migration is deployed, but the iOS app still contains the
old Supabase AuthStore. The Clerk CLI can detect the Swift project and write
`apps/ios/.env`, but it cannot add the Swift Package Manager dependency or
complete native-app registration. The iOS follow-up is:

1. In Clerk Dashboard → Native Applications, enable Native API and register
   bundle ID `com.samshahverdipersonalteam.WentToEvent`.
2. In Xcode add `https://github.com/clerk/clerk-ios`, products `ClerkKit` and
   `ClerkKitUI`, and the Associated Domains capability required by Clerk.
3. Configure `Clerk.configure(publishableKey:)` in `MyApp`, inject
   `Clerk.shared` into the SwiftUI environment, and replace the Supabase
   `AuthStore` token/session code with Clerk's native session/token APIs.
4. Point iOS API requests at the same Clerk-protected API and run the simulator
   and physical-device builds.

Do not remove the remaining Supabase Auth files from iOS until this native
Clerk flow is implemented and tested. Also do not remove the old Supabase Auth
users until all existing accounts have successfully been matched to Clerk.
