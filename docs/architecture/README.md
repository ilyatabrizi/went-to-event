# Architecture notes

## Planned clients

- `apps/web` — TypeScript web app and PWA
- `apps/ios` — native SwiftUI app
- `apps/api` — server-side TypeScript API
- `packages/shared` — shared TypeScript contracts and validation
- `infra/supabase` — database migrations and Supabase configuration

## Migration rule

The root-level HTML/CSS/JavaScript app is the current visual prototype. It
stays runnable until the replacement web app is ready. New production code
should go into the application folders above rather than expanding the
prototype indefinitely.

## First vertical slice

The first shared product flow is:

```text
browse events -> event detail -> choose ticket -> create booking -> view pass
```

Both web and iOS should consume the same API contract for this flow.
