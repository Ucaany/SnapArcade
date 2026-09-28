# SnapArcade Agent Guide

## Project Reality

- Next.js 15 App Router, React 19, TypeScript, Tailwind CSS 4, shadcn/ui conventions.
- Source lives in `src/app`, `src/components`, and `src/lib`; use existing `@/*` aliases.
- App Router route groups under `src/app/(dashboard)` contain admin, owner (`/dashboard`), and staff screens. Public routes use `src/app/(public)` where present. Shared dashboard and public UI lives in `src/components`.
- `src/app/globals.css` owns global tokens and the `public-theme`, `dashboard-theme`, and `kiosk-theme` scopes. `src/app/layout.tsx` loads Geist. `components.json` configures shadcn with Lucide.
- Installed UI dependencies include `lucide-react`, `recharts`, `sonner`, `next-themes`, and shadcn's Base UI setup. Check `package.json` before adding or assuming dependencies.
- `PRD.md` describes intended product scope and visual direction. It is not proof that planned kiosk routes, APIs, authentication, database, payment, or hardware integrations exist. Verify in source before relying on them.
- `anti-slop/` contains existing UI audit reports; do not overwrite or renumber them as part of unrelated work.

## Commands

- `npm run dev` starts the Next.js development server.
- `npm run typecheck` runs TypeScript without emitting files.
- `npm run build` creates a production build.
- `npm start` serves a production build.

## Implementation Rules

- Read the target route and its parent layout/shared components before editing. Prefer the smallest change that fits existing patterns.
- Keep server components by default; add client boundaries only for browser interaction or client state.
- Keep the public/kiosk neobrutalist visual language separate from the professional dashboard system. Follow `DESIGN.md` and existing CSS tokens.
- Use real routes and working interactions. Do not invent completed functionality from the PRD; label sample data honestly and avoid fabricated product claims.
- Preserve Indonesian UI copy, accessible semantics/focus, responsive layouts, and reduced-motion behavior.
- Do not edit generated `.next*` output or unrelated dirty files.

## Design Skill

For frontend visual design, landing pages, or UI redesigns, read `DESIGN.md` first, then `.kilo/skills/design-taste-frontend/SKILL.md`. Apply only guidance relevant to the surface being changed; this product includes dense dashboards and kiosk workflows, not only marketing pages. Do not apply landing-page-only prescriptions to operational product UI.
