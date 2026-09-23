# Web app

This will become the production TypeScript web/PWA client.

The current working visual prototype remains at the repository root while we
migrate it gradually. Do not delete or move the root files until the new web
app can replace them and its browser tests pass.

## Local development

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
