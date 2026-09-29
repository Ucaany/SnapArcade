# SnapArcade Production Handover

Task 3.11 deployment runbook. Real credentials stay in Cloudflare/Supabase secret stores, never in Git.

## 1. Preflight

```sh
openssl rand -base64 32
openssl rand -hex 32
npm ci
npm run typecheck
npm run build
```

Use the first value for a new production `ENCRYPTION_KEY`. It must not be reused from development. Keep a sealed backup in the team's password manager; losing it makes existing encrypted payment credentials unreadable.

Run database migrations against the production Supabase direct connection before opening traffic:

```sh
DATABASE_URL='postgresql://...' npm run db:migrate
```

Do not run `db:seed` in production.

## 2. Cloudflare Pages

Create a Pages project connected to this repository and configure:

- Production branch: the release branch
- Build command: `npm run build`
- Build output: Next.js deployment output selected by the Cloudflare Next.js/OpenNext integration
- Root directory: `/`
- Node version: `22`

Set every variable in `.env.production.example` in the Pages production environment. `NEXT_PUBLIC_*` values are public by design. All other values are server-only. Do not upload a `.env.production` file.

This application uses App Router server routes and Node-compatible Drizzle/Supabase code. Use the current Cloudflare-supported OpenNext adapter for Next.js 15 rather than treating `out/` as a static export. Verify the adapter's compatibility with the deployed Next.js version before production cutover.

## 3. Worker webhook and scheduler

The Worker in `workers/production.ts` forwards signed provider payloads to the existing Next.js webhook routes and invokes the protected maintenance endpoints every 15 minutes. It does not reimplement payment logic.

```sh
npx wrangler login
npx wrangler secret put CRON_SECRET
npm run deploy:worker
```

Set `CRON_SECRET` equal to Pages `NOTIFICATION_CRON_SECRET`. Configure provider callbacks to:

- `https://snaparcade.id/webhooks/pakasir`
- `https://snaparcade.id/webhooks/midtrans`
- `https://snaparcade.id/webhooks/xendit`
- `https://snaparcade.id/webhooks/tripay`

The Worker route is intentionally strict: POST only, known providers only. Provider signatures remain verified by the application routes.

## 4. Domains and HTTPS

In Cloudflare DNS, add the Pages custom domains `snaparcade.id` and `kiosk.snaparcade.id`. Use the Pages-provided CNAME targets; keep proxy status enabled. Set SSL/TLS to Full (strict), enable Always Use HTTPS, and confirm certificate issuance before DNS cutover.

Set `kiosk.snaparcade.id` to the kiosk entry route through the application routing layer. Do not create a second frontend deployment unless kiosk isolation is required.

Validation:

```sh
curl -fsS https://snaparcade.id/
curl -fsS -o /dev/null -w '%{http_code}\n' https://kiosk.snaparcade.id/kiosk
curl -si -X POST https://snaparcade.id/webhooks/unknown
```

Expected webhook result for the last command: `404`.

## 5. Monitoring and rollback

Enable Cloudflare Pages deployment notifications, Worker invocation/error metrics, Supabase logs, and an uptime check for `/`. Sentry is optional; if enabled, add the Sentry DSN through the platform secret UI and scrub payment payloads and credentials before reporting events.

Release checklist:

- `npm run typecheck` passes
- `npm run build` passes without warnings treated as errors
- All focused checks pass: `auth:check`, `payment-crypto:check`, `pakasir:check`, `tripay:check`, `kiosk-auth:check`, `kiosk-session:check`, `printer-usb:check`, `voucher:check`
- Supabase production migration is complete
- Test payment uses production-safe low-value verification and is reconciled
- Webhook signatures and idempotency verified
- LCP measured in Lighthouse on mobile; target `< 2.5s`

Rollback by selecting the previous successful Pages deployment, then revert the Worker to the previous version with `npx wrangler rollback`. Database migrations are forward-only; never reset production data.
