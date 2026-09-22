# Contributing

## Branches

- `main` is production. It should always be releasable.
- `develop` is the integration branch and should represent staging.
- `feature/<short-name>` is for new work.
- `fix/<short-name>` is for focused bug fixes.

Create work from `develop`:

```bash
git switch develop
git pull --ff-only origin develop
git switch -c feature/short-description
```

Open a pull request into `develop`. After the change has been tested in
staging, open a pull request from `develop` into `main` for a production
release. Do not work directly on `main`.

## Local checks

Run the preview:

```bash
python3 serve.py
```

In another terminal, run the browser suite:

```bash
python3 e2e.py
```

Before opening a pull request, also check the changed screens manually at
`http://localhost:8141`.

## Releases

Production releases are made from `main` and should be tagged with a version:

```bash
git switch main
git pull --ff-only origin main
git tag -a v0.1.0 -m "Release v0.1.0"
git push origin v0.1.0
```

Use a new version tag for each release. Keep commits small and write commit
messages that describe the change, for example `Add event detail loading`.

## Secrets

Never commit API keys, Supabase credentials, payment keys, or `.env` files.
Use the deployment provider's secret store for staging and production.
