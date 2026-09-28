# Went To Event — Session Handoff

**Updated:** September 28, 2026

**Branch:** `develop`

**Latest code commit:** `Add profile identity and account settings` (see `git log -1` for the current local hash)

This document explains the active architecture, local setup, application flows, API contracts, testing process, known limitations, and recommended next steps.

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
6. Improved profile page.

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

All work has been committed locally on `develop`. Nothing has been pushed to
the remote unless explicitly requested.

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

- Supabase Auth owns accounts and access tokens.
- Supabase Postgres owns persisted events, profiles, bookings, and booking items.
- Fastify owns server-side business rules and protected API access.
- Web and iOS own screens, navigation, form state, and presentation.
- The clients never receive the Supabase service-role key.

The normal authenticated request is:

```text
Client signs in with Supabase
→ receives access token
→ sends Authorization: Bearer <token> to Fastify
→ Fastify asks Supabase Auth to verify the token
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

Release currently uses the same development addresses because a production API
has not been deployed yet. Do not treat the current Release configuration as
App Store-ready.

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

Sign-up uses Supabase `POST /auth/v1/signup`. If Supabase requires email confirmation and returns no session, the app displays a message asking the user to check email and sign in after confirmation.

### Native session restoration

On app launch, `AuthStore` loads the stored session from Keychain.

- A valid token is checked against `GET /me`.
- A nearly expired token is refreshed with the Supabase refresh token.
- If restoration fails, the app clears the local session and becomes signed out.

### Native profile/logout

The profile sheet shows the user’s email and ID, saved events, and a logout
button. Native saved event IDs are stored with `UserDefaults` through
`SavedEventsStore`; they are currently local to that device and are not yet
synced to Supabase.

The profile sheet also has an account header, saved-event and local-reminder
counts, a direct bookings shortcut, and a note that profile editing and
password recovery are still pending.

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

The native bookings sheet requests:

```text
GET /me/bookings
```

The native bookings sheet loads the booking list and then fetches each related
event. It renders two sections:

- **Upcoming:** related event `endsAt` is greater than or equal to the current
  date/time.
- **Past:** the event has ended, or its event details are unavailable.

Selecting a booking opens `BookingPassView`, which now displays:

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
```

`PATCH /me/profile` validates and persists `username`, `displayName`, and
`avatarUrl` in `public.profiles`. Usernames are normalized to lowercase and
must be 3–24 characters using lowercase letters, numbers, or underscores.
`PATCH /me/account` accepts an email and/or password and applies the change
through the Supabase Admin Auth client after verifying the caller’s access
token. The service-role key remains server-only.

Apply `infra/supabase/migrations/004_profile_identity.sql` to the Supabase
project before using usernames. It adds the nullable username column, format
constraint, and case-insensitive unique index. Existing accounts continue to
work with a blank username until the user fills one in.

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

Release currently points to the same development addresses because no hosted
production API exists yet.

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

The profile hub and editable identity/security fields are implemented on web
and iOS. Profile pictures currently use a validated image URL rather than a
binary upload. A future increment should add Supabase Storage upload, image
cropping, and password-recovery/re-authentication UX.

### Password recovery

Forgot-password, resend-confirmation, and deep-link confirmation flows are not implemented yet.

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
6. Improved profile page — identity and account editing are implemented on web
   and iOS; Supabase Storage image upload and password recovery remain.

After Phase 2:

7. Add password reset, resend-confirmation, and email deep-link handling.
8. Implement ZarinPal through the API with pending/confirmed payment states.
9. Add event publishing, moderation, capacity, and admin workflows.
10. Create real staging/production environments and TestFlight/App Store
    release configuration.

## 15. End-to-end product summary

The current working vertical slice is:

```text
Browse events without an account
→ open event details
→ authenticate only when needed
→ verify the Supabase token through Fastify
→ view profile and logout
→ select ticket tier and quantity
→ create a protected booking
→ view upcoming and past booking history
→ open a detailed ticket pass
```

The web and iOS clients use the same API contracts. Supabase is the source of truth for authentication and persisted data. Fastify is the source of truth for protected server behavior and booking rules. ZarinPal is planned but not yet connected.
