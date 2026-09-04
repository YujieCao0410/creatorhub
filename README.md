# CreatorHub

A publishing platform for creators — write posts, build a following, and turn
readers into a community. Full-stack **Next.js 16** app with its own
authentication, a REST API, and a Stripe subscription for the Pro plan.

Live demo: _deploy your own — see [DEPLOYMENT.md](./DEPLOYMENT.md)_

---

## Features

| Area | What it does |
| --- | --- |
| **Accounts** | Email/password auth, bcrypt hashing, JWT session in an httpOnly cookie, edge-gated dashboard, rate-limited login/registration |
| **Creator profiles** | Public page at `/creators/<handle>`, editable name/bio/avatar, follower / following / post counts |
| **Content** | Draft & publish posts, cover-image + video upload, tags, keyset-paginated feeds, stable slugs, author-only edit/delete |
| **Languages** | English / 中文 — follows the browser/OS language, with a manual toggle (cookie) |
| **Social** | Follow / unfollow, personalized "Following" feed, likes, threaded comments (with post-author moderation) |
| **Search** | Creators and posts, case-insensitive, `/search?q=` |
| **Dashboard** | Overview stats, content manager, profile editor, account settings, membership |
| **Membership** | FREE / PRO. FREE is capped at 3 drafts; PRO is unlimited. Plan is enforced **server-side** on every request |
| **Billing** | Stripe Checkout to upgrade, Billing Portal to cancel, webhook keeps the DB in sync. Works in Stripe **test mode** |

## Tech stack

- **Next.js 16** (App Router, Server Components, Route Handlers, `proxy.ts`)
- **TypeScript**, strict
- **Prisma 6** ORM — **PostgreSQL** (local via docker-compose)
- **Zod** for every request boundary
- **jose** (JWT) + **bcryptjs** for auth
- **Stripe** for subscriptions
- **Tailwind CSS v4**
- **Vitest** (142 unit/integration tests) + **Playwright** (20 end-to-end tests)

## Architecture

```
Browser ─► Route Handler (thin controller: auth + Zod validation)
             └─► Service  (src/server/services/*  — business rules, throws typed AppError)
                   └─► Prisma ─► database

Server Components read through the same services directly (no HTTP hop).
Client Components mutate via src/lib/api-client.ts.
```

- **Errors**: services throw `AppError` subclasses; `handleApiError` maps them to
  one JSON shape (`{ error: { code, message, details? } }`) and never leaks
  internals.
- **DTOs**: `src/lib/dto.ts` — the exact shapes the API returns, so no Prisma
  row (with `passwordHash` / `email`) can reach the client by accident.
- **Auth guards**: `requireUser()` / `requirePro()` throw (API routes);
  `requireUserPage()` / `requireProPage()` redirect (Server Component pages).

```
src/
  app/            routes — (app) public + dashboard, (auth) login/register, api/*
  components/     UI primitives + feature components
  lib/            env, db, auth, http, errors, rate-limit, security, dto, validation
  server/services business logic
prisma/           schema + migrations + seed
e2e/              Playwright specs
```

## Local development

Requires Node 22+.

```bash
npm install
cp .env.example .env          # fill in JWT_SECRET (>= 32 chars)
docker compose up -d          # PostgreSQL on :5432
npm run db:deploy             # apply migrations
npm run db:seed               # 2 users (alice = PRO), a few posts
npm run dev                   # http://localhost:3000
```

Seeded logins: `alice@example.com` / `bob@example.com`, password `password123`.

### Scripts

| Command | Purpose |
| --- | --- |
| `npm run dev` | Dev server |
| `npm run build` / `npm start` | Production build / serve |
| `npm test` | Vitest unit + integration |
| `npm run test:e2e` | Playwright (builds the app, uses `prisma/e2e.db`) |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run lint` | ESLint |
| `npm run db:migrate` / `db:deploy` | Apply migrations (dev / prod) |
| `npm run db:studio` | Prisma Studio |

## Environment variables

See [.env.example](./.env.example). Summary:

| Variable | Required | Notes |
| --- | --- | --- |
| `DATABASE_URL` | yes | a `postgresql://` connection string |
| `JWT_SECRET` | yes | >= 32 chars; `openssl rand -base64 48` |
| `APP_URL` | prod | Public origin, for Stripe redirect URLs and metadata |
| `STRIPE_SECRET_KEY` | for billing | Test key `sk_test_…` |
| `STRIPE_WEBHOOK_SECRET` | for billing | `whsec_…` |
| `STRIPE_PRICE_PRO` | for billing | Recurring price id `price_…` |

Billing endpoints return `503` and the upgrade UI is hidden until all three
Stripe variables are set — the app runs fine without them.

## Stripe (test mode)

1. Create a **recurring** product/price in the Stripe test dashboard → `STRIPE_PRICE_PRO`.
2. Forward webhooks locally:
   ```bash
   stripe listen --forward-to localhost:3000/api/webhooks/stripe
   ```
   Copy the `whsec_…` it prints into `STRIPE_WEBHOOK_SECRET`.
3. Upgrade from `/pricing` or `/dashboard/membership`, pay with test card
   `4242 4242 4242 4242`. The webhook flips `User.membership` to `PRO`.
4. Cancel from **Manage billing** (Stripe Billing Portal). The webhook flips it
   back to `FREE` when the subscription ends.

## Security

- Passwords: bcrypt, cost 12. Login uses a constant-time dummy-hash compare to
  avoid user enumeration.
- Session: httpOnly + `SameSite=lax` cookie, `Secure` in production; the user is
  re-resolved from the database on every request.
- CSRF: `SameSite=lax` plus a cross-site `Origin` / `Sec-Fetch-Site` check on
  state-changing API requests (Stripe webhook exempt).
- Headers: strict CSP, `X-Frame-Options: DENY`, `nosniff`, `Referrer-Policy`,
  `Permissions-Policy`, HSTS in production. `X-Powered-By` removed.
- Rate limiting on auth, post creation, and comment creation.
- Request bodies are size-checked before buffering and Zod-validated.
- Stripe secret key is server-only (`import "server-only"`); no secret is
  exposed to the client.

Known: the 3 `npm audit` "high" advisories are in `deepmerge-ts`, a dependency
of the Prisma **CLI** only — not in the runtime bundle.

## Deployment

See [DEPLOYMENT.md](./DEPLOYMENT.md) for Vercel and Docker.
