# Shared contracts

This package will hold shared TypeScript schemas, API types, validation, and
design tokens used by the web app and API.

The first shared contract is in `src/events.d.ts`. It defines the event payload,
ticket tier payload, list/detail responses, and the repository interface used
by the API.

Swift models should eventually be generated from the API contract rather than
maintained as an unrelated second copy.
