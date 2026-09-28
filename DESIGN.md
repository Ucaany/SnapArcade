# SnapArcade Design Direction

## Product

SnapArcade is an Indonesian photobooth operations SaaS. Its audiences are photobooth owners, field staff, platform administrators, and kiosk customers. The repository currently implements web UI routes for public, owner, staff, and admin areas. Kiosk flows and several integrations described in `PRD.md` are product plans, not evidence of shipped functionality.

## Two Deliberate Visual Systems

Do not force one aesthetic across unrelated surfaces:

- Public product pages and kiosk experiences: playful, high-contrast arcade/neobrutalist language. Use the existing tokens in `src/app/globals.css`: yellow `#FFD60A`, cyan `#22D3EE`, pink `#F472B6`, lime `#A3E635`, ink `#0A0A0A`, background `#FFFDF0`; thick ink borders, hard offset shadows, solid fills, and restrained pressed-button motion. The public layout currently uses Inter. Space Grotesk and Archivo Black are loaded through `next/font` in the root layout.
- Owner, staff, and admin dashboards: professional, information-first shadcn-style SaaS UI using the sidebar-08 shell. Preserve the existing neutral CSS-variable foundation, blue dashboard primary, `0.625rem` radius, Geist root font, accessible focus ring, and compact data layouts. Use `lucide-react`, already installed and configured.

Keep the two systems scoped to their existing layout/theme boundaries. Do not add arcade colors or hard shadows to dashboard tables, or dashboard chrome to kiosk/public surfaces without a product reason.

## Design Decisions

- Color: use the existing theme tokens; they distinguish playful customer-facing surfaces from operational dashboards.
- Typography: retain loaded Geist for the dashboard and existing Inter theme for public/kiosk; Space Grotesk and Archivo Black are verified in `src/app/layout.tsx` and loaded through `next/font`.
- Components: reuse existing components and shadcn primitives under `src/components/`; avoid duplicating working layout or interaction patterns.
- Layout: prioritize readable operational data in dashboards, large touch targets and landscape tablet use for kiosk, responsive single-column fallbacks on narrow screens.
- Motion: use only for feedback or meaningful state transitions; honor the existing reduced-motion CSS behavior.
- Icons: use the installed Lucide family consistently with the PRD's heavier stroke for neobrutalist contexts where appropriate.
- Landing composition: the tilted dashboard preview creates a single product focal point; hard offset shadows make clickable surfaces legible as physical arcade controls; the two-column operational plan comparison plus full-width custom plan keeps the pricing hierarchy content-led rather than default three-column pricing.

## Dials

- Public / kiosk: ENERGY 3 / RHYTHM 2 / MOTION 2.
- Dashboard: ENERGY 1 / RHYTHM 1 / MOTION 1.

These are starting constraints, not permission to invent content or functionality. Follow explicit page requirements and the established implementation when refining an existing screen.

## UI Work Rules

- Inspect the target route, its parent layout, shared components, and current tokens before changing UI.
- Treat `PRD.md` as product intent. Confirm a route, API, interaction, or integration exists in source before presenting it as implemented.
- Keep controls functional, navigation destinations real, and data/copy grounded in source or clearly identified as sample data.
- Preserve Indonesian as the default interface language.
- Check keyboard focus, contrast, reduced motion, and mobile/tablet behavior appropriate to the surface.
