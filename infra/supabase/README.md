# Supabase

Supabase migrations and local database configuration belong in this folder.

Do not commit project secrets. Local and hosted credentials belong in ignored
`.env` files or the deployment provider's secret store.

The first migration creates `venues`, `events`, and `ticket_tiers`. Apply the
migration and seed data through the Supabase dashboard or CLI before enabling
the Supabase repository in the API.
