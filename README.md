# SnapArcade

Platform SaaS photobooth Indonesia: public and kiosk neobrutalist UI, owner/staff/superadmin dashboards, Supabase-backed operations.

## Stack

Next.js 15 App Router, React 19, TypeScript, Tailwind CSS 4, Drizzle ORM, Supabase, shadcn/Base UI, Lucide, Recharts.

## Setup

1. Copy `.env.example` to `.env.local` and provide Supabase, database, auth, encryption, and app URL values.
2. Run `npm install`.
3. Apply schema with `npm run db:migrate`.
4. Seed development data with `npm run db:seed`.
5. Start with `npm run dev`.

## Scripts

| Script | Purpose |
| --- | --- |
| `npm run typecheck` | TypeScript validation |
| `npm run build` | Production build |
| `npm run db:generate` | Generate Drizzle migration |
| `npm run db:migrate` | Apply migrations |
| `npm run db:seed` | Seed development data |
| `npm run auth:check` | Auth policy check |
| `npm run payment-crypto:check` | Credential crypto check |
| `npm run kiosk-auth:check` | Kiosk token check |
| `npm run kiosk-session:check` | Kiosk session helper check |
| `npm run printer-usb:check` | Printer driver check |
| `npm run tripay:check` | Tripay signature/status check |

## Hardware

WebUSB camera and printer bridges require Chromium and a user gesture. Webcam and local print simulation remain honest fallbacks when hardware is unavailable.

## Notification Sweep

Call the cron route with `Authorization: Bearer $NOTIFICATION_CRON_SECRET` after setting `NOTIFICATION_CRON_SECRET`.

## Status

Phase 1 and the Phase 2 source paths are implemented. Migrations `0000` to `0003` are applied on the Supabase project referenced by `.env.local`: 17 tables with row level security, 18 policies, the `kiosks` and `notifications` realtime publication, and the `snaparcade-sessions` and `snaparcade-frames` private storage buckets.

The migration journal was re-baselined: `0000` is a regenerated full schema and `0001`–`0003` replace the previous history (`0004` was folded into `0000`). Any database that still holds the previous `0000_fantastic_true_believers` baseline must have `drizzle.__drizzle_migrations` reset (or the schema dropped and recreated) before running `npm run db:migrate`, otherwise Drizzle replays the new baseline over existing tables.

`npm run db:seed` still requires three Supabase Auth users for the seed owner emails (`src/db/seed.ts`); create them in the Supabase dashboard or admin API first. Payment gateway integrations, production security hardening, SEO, end-to-end testing, and deployment remain Phase 3.
