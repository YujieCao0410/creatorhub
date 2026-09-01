# Deployment

CreatorHub runs anywhere Next.js does. Two documented paths: **Vercel** and
**Docker**. Production should use **PostgreSQL** (SQLite's single file doesn't
survive a serverless/container filesystem).

---

## 1. Switch to PostgreSQL

SQLite is the local-dev default. For production:

1. **Point Prisma at Postgres** — in `prisma/schema.prisma`:
   ```prisma
   datasource db {
     provider = "postgresql"
     url      = env("DATABASE_URL")
   }
   ```

2. **Case-insensitive search** — Postgres `LIKE` is case-sensitive, so add
   `mode: "insensitive"` to the `contains` filters in
   `src/server/services/user-service.ts` (`searchCreators`) and
   `src/server/services/post-service.ts` (`searchPosts`). Example:
   ```ts
   { title: { contains: query, mode: "insensitive" } }
   ```
   (SQLite rejects `mode`, which is why it isn't there by default.)

3. **Regenerate the migration history** against Postgres:
   ```bash
   rm -rf prisma/migrations
   DATABASE_URL="postgresql://…" npx prisma migrate dev --name init
   ```
   The models are already Postgres-compatible (`cuid()` ids, no SQLite-only
   types). Consider converting `User.membership` and `Subscription.status` to
   real `enum`s at this point.

4. Run migrations on release: `npm run db:deploy`.

### Local Postgres

```bash
docker compose up -d      # postgres:17 on :5432 (see docker-compose.yml)
# DATABASE_URL="postgresql://creatorhub:creatorhub@localhost:5432/creatorhub?schema=public"
npm run db:migrate
```

---

## 2. Vercel

1. Push the repo to GitHub and import it in Vercel.
2. Add a Postgres database (Vercel Postgres, Neon, Supabase…) and set env vars in
   the Vercel project:
   - `DATABASE_URL` — the pooled connection string
   - `JWT_SECRET`
   - `APP_URL` — `https://your-app.vercel.app`
   - `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_PRICE_PRO` (optional)
3. `postinstall` runs `prisma generate` automatically. Add a **Deploy Hook** or a
   release step running `npx prisma migrate deploy` (Vercel has no release phase —
   run it from CI or `vercel build` override: `prisma migrate deploy && next build`).
4. In the Stripe dashboard, add a webhook endpoint
   `https://your-app.vercel.app/api/webhooks/stripe` for the events
   `checkout.session.completed`, `customer.subscription.updated`,
   `customer.subscription.deleted`; put its signing secret in
   `STRIPE_WEBHOOK_SECRET`.

`next.config.ts` sets `output: "standalone"`, which Vercel ignores but Docker uses.

---

## 3. Docker

```bash
docker build -t creatorhub .
docker run -p 3000:3000 \
  -e DATABASE_URL="postgresql://…" \
  -e JWT_SECRET="…" \
  -e APP_URL="https://…" \
  creatorhub
```

- The image is the Next.js **standalone** server (`node server.js`) plus the
  Prisma CLI + schema, so you can run migrations in a one-off container:
  ```bash
  docker run --rm -e DATABASE_URL="…" creatorhub npx prisma migrate deploy
  ```
- Build args / runtime env: everything from `.env.example`.
- Healthcheck: `GET /api/health` returns `200` only when the database is
  reachable (`503` otherwise) — wire it into your orchestrator.

---

## 4. Post-deploy checklist

- [ ] `DATABASE_URL` points at Postgres; `prisma migrate deploy` has run
- [ ] `JWT_SECRET` is a fresh 32+ char secret (not the dev one)
- [ ] `APP_URL` matches the real origin (Stripe redirects + OG tags depend on it)
- [ ] Stripe webhook endpoint registered and its secret set
- [ ] `GET /api/health` returns `{ "status": "ok" }`
- [ ] A test Stripe checkout upgrades the account to PRO and back to FREE on cancel
- [ ] Error monitoring: pipe `console.error` / add Sentry in
      `src/lib/http.ts#handleApiError` and the `error.tsx` boundaries
