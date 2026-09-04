# Deployment

CreatorHub is a Next.js app on **PostgreSQL** with **Vercel Blob** for uploaded
media. Two documented paths: **Vercel** (recommended) and **Docker**.

---

## 1. PostgreSQL

Postgres is used in every environment. There is no SQLite fallback.

**Local dev:**

```bash
docker compose up -d          # postgres:17 on :5432 (docker-compose.yml)
# .env: DATABASE_URL="postgresql://creatorhub:creatorhub@localhost:5432/creatorhub?schema=public"
npm run db:deploy             # apply migrations
npm run db:seed               # optional demo data
```

The test suites use their own databases on the same instance
(`creatorhub_test`, `creatorhub_e2e`) — created once with
`docker compose exec -T db psql -U creatorhub -c "CREATE DATABASE creatorhub_test;"`.

**Migrations** live in `prisma/migrations/` and are applied with
`prisma migrate deploy` (never `migrate reset` against a shared DB). New schema
changes: `npx prisma migrate dev --name <change>` against local Postgres.

---

## 2. Vercel

1. **Push to GitHub**, then import the repo in Vercel (framework auto-detected;
   `vercel.json` sets the build command to `prisma migrate deploy && next build`).
2. **Storage → Postgres** — add Neon (or Vercel Postgres). It sets `DATABASE_URL`
   (and `POSTGRES_*`) on the project automatically. Use the **pooled** URL.
3. **Storage → Blob** — create a Blob store. It sets `BLOB_READ_WRITE_TOKEN`.
4. **Environment variables** (Project → Settings → Environment Variables):
   - `JWT_SECRET` — a fresh 32+ char secret (`openssl rand -base64 48`)
   - `APP_URL` — `https://<project>.vercel.app` (or the custom domain)
   - `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` (YouTube)
   - `TIKTOK_CLIENT_KEY` / `TIKTOK_CLIENT_SECRET`
   - `INSTAGRAM_APP_ID` / `INSTAGRAM_APP_SECRET`
   - `ANTHROPIC_API_KEY` (AI captions), optional `ANTHROPIC_MODEL`
   - `STRIPE_SECRET_KEY` / `STRIPE_WEBHOOK_SECRET` / `STRIPE_PRICE_PRO`
     (+ `STRIPE_PRICE_PRO_CNY`), optional
5. **Redirect URIs** — in each platform's developer console, set the OAuth
   redirect URI to `<APP_URL>/api/integrations/<provider>/callback`
   (`youtube` / `tiktok` / `instagram`).
6. **Stripe webhook** — add `https://<APP_URL>/api/webhooks/stripe` for
   `checkout.session.completed`, `customer.subscription.updated`,
   `customer.subscription.deleted`; put its signing secret in
   `STRIPE_WEBHOOK_SECRET`.

Uploads: Vercel caps a serverless request body at ~4.5 MB, and CreatorHub's
proxy already excludes `/api/uploads` from body buffering, but large videos
still need a direct-to-Blob client upload — see `src/lib/storage.ts` (currently
server-side `put()`; switch to `@vercel/blob/client` `handleUpload` for big files).

---

## 3. Docker

```bash
docker build -t creatorhub .
docker run -p 3000:3000 \
  -e DATABASE_URL="postgresql://…" \
  -e JWT_SECRET="…" \
  -e APP_URL="https://…" \
  -e BLOB_READ_WRITE_TOKEN="…" \
  creatorhub
```

- The image is the Next.js **standalone** server plus the Prisma CLI + schema:
  ```bash
  docker run --rm -e DATABASE_URL="…" creatorhub npx prisma migrate deploy
  ```
- Healthcheck: `GET /api/health` returns `200` only when the database is
  reachable (`503` otherwise).

---

## 4. Media storage

`src/lib/storage.ts` `saveUpload()`:

- **`BLOB_READ_WRITE_TOKEN` set** → uploads go to Vercel Blob, returns an
  absolute `https://…blob.vercel-storage.com/…` URL.
- **unset** → files under `public/uploads/`, served at `/uploads/<name>`.

`src/lib/media.ts` resolves both forms for the publishers (`publicMediaUrl`,
`readMediaBytes`, `isOwnMedia`). `mediaRef` in `src/lib/validation/post.ts`
accepts absolute URLs, and the CSP allows `media-src https:` / `img-src https:`.

---

## 5. Post-deploy checklist

- [ ] `DATABASE_URL` (pooled) set; `prisma migrate deploy` ran during build
- [ ] `BLOB_READ_WRITE_TOKEN` set; a test upload returns a `blob.vercel-storage.com` URL
- [ ] `JWT_SECRET` is a fresh 32+ char secret (not the dev one)
- [ ] `APP_URL` matches the real origin
- [ ] YouTube / TikTok / Instagram redirect URIs point at `<APP_URL>/api/integrations/<provider>/callback`
- [ ] Stripe webhook endpoint registered and its secret set
- [ ] `GET /api/health` returns `{ "status": "ok" }`
- [ ] Register an account, connect one platform, publish a test video
- [ ] Error monitoring: add Sentry in `src/lib/http.ts` and the `error.tsx` boundaries
