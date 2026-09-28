---
name: design-taste-frontend
description: Design guidance for SnapArcade public pages, kiosk UI, and dashboard redesigns, adapted to the repository's real stack and two design systems.
---

# SnapArcade Design Taste Skill

Read the repository's root `DESIGN.md` before visual work. This skill is contextual guidance, not permission to override product requirements, accessibility, existing architecture, or the user's explicit direction.

## Read the Surface

SnapArcade is an Indonesian photobooth operations SaaS with distinct public, kiosk, owner, staff, and admin surfaces. First inspect the target route, its parent layout, shared components, theme scope, and current CSS tokens. Determine whether the task is a public page, kiosk workflow, dashboard screen, or an existing-design refinement. Never apply marketing-page layout rules to an operational dashboard by default.

Use the matching direction from `DESIGN.md`:

- Public/kiosk: arcade-inspired neobrutalism using existing yellow/cyan/pink/lime/ink tokens, hard borders and offset shadows.
- Dashboard: professional shadcn-style information UI using existing neutral tokens and blue primary.

Do not blend systems without a concrete product reason. Preserve the current visual language when redesign was not requested.

## Stack and Existing Conventions

- Next.js App Router, React 19, TypeScript, Tailwind CSS 4.
- Keep Server Components by default. Isolate browser interaction in small Client Components.
- Use existing shadcn/Base UI components, `lucide-react`, Recharts, and Sonner when they fit. Verify `package.json` before importing or adding dependencies.
- Root layout loads Geist; public and kiosk theme scopes currently use Inter. Do not assume PRD-mentioned Space Grotesk or Archivo Black are installed.
- Theme tokens and component utilities are in `src/app/globals.css`; route layouts define their own surface boundaries.

## Design and Quality Checks

- Use the actual product content and implemented behavior. `PRD.md` is planned scope; inspect source before describing a feature as live.
- Do not invent customer names, testimonials, metrics, integrations, or navigation destinations. Mark sample data as sample when relevant.
- Match layout density to the surface: dashboards favor legibility and useful data hierarchy; kiosk favors touch targets and tablet landscape; public pages explain the actual product.
- Make responsive behavior explicit for each layout and test narrow viewport overflow.
- Preserve semantic controls, keyboard access, visible focus, readable contrast, and the reduced-motion behavior already established in CSS.
- Animate only for meaningful feedback or hierarchy. Avoid adding a motion library for simple transitions.
- Keep copy Indonesian unless a specific surface or request establishes another language.
- Verify with `npm run typecheck`; use `npm run build` when scope and environment permit.

## Dials

Starting values from `DESIGN.md`: public/kiosk ENERGY 3 / RHYTHM 2 / MOTION 2; dashboard ENERGY 1 / RHYTHM 1 / MOTION 1. Adjust only when the user or existing brand direction calls for it.
