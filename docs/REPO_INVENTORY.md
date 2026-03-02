# E-COMEX Repo Inventory (FASE 0)

## Stack and architecture

- Framework: `Next.js 16` + `React 19` + `TypeScript`
- Router: App Router (`src/app`)
- Styling: `Tailwind v4` + global CSS tokens in `src/app/globals.css`
- UI components: `src/components/ui` and shell/layout in `src/components/shell`
- API/backend: Next Route Handlers in `src/app/api/**/route.ts`
- Auth: JWT cookie (`ecomex_auth`) + helpers in `src/lib/auth`
- DB/ORM: PostgreSQL + Prisma (`prisma/schema.prisma`, generated client in `src/generated/prisma`)

## Existing primary routes/screens

- Landing institucional: `/` (container intro video gate)
- Quoting engine modular: `/cotizar` (legacy compatibility via `/chat`)
- Quote management/library: `/cotizaciones`
- Quote detail/report: `/cotizaciones/reporte`
- Operator/internal panel: `/operador` (legacy compatibility via `/interno`)
- Settings: `/ajustes`
- Account/dashboard: `/account`
- Trends/signals: `/tendencias`

## Reusable UI pieces found

- Buttons: `src/components/ui/Button.tsx`
- Cards: `src/components/ui/Card.tsx`
- Badges: `src/components/ui/Badge.tsx`
- Header section: `src/components/ui/SectionHeader.tsx`
- App shell/nav: `src/components/shell/AppShell.tsx`
- Sheets/side panels: `src/components/ui/Sheet.tsx`
- Analysis modules/rail/compare: `src/components/analysis/*`

## API surface mapped (no contract changes)

- Auth: `/api/auth/login`, `/api/auth/register`, `/api/auth/logout`
- Chat/quote flow: `/api/chat`
- PDF quote: `/api/quote/pdf`
- Operator budgets:
  - `/api/operator/budgets`
  - `/api/operator/budgets/update`
  - `/api/operator/budgets/pdf`
- Admin roles: `/api/admin/users/role`
- Debug/analyze helpers: `/api/debug/*`, `/api/analyze-product`

## Stitch export mapping found

Source folder scanned:

- `/Users/valentindoroszuk/Downloads/stitch_e_comex_app_quoting_engine 2`

Detected exports:

- `e_comex_institutional_landing`
- `e_comex_app_guided_onboarding`
- `e_comex_app_roles_access`
- `e_comex_app_quoting_engine`
- `e_comex_app_decision_summary`
- `e_comex_app_cost_benchmark`
- `e_comex_app_quote_management`
- `e_comex_app_expert_channel`
- `e_comex_app_expert_validation`
- `e_comex_app_trust_compliance`
- `e_comex_app_account_settings`
- `e_comex_app_operation_tracking`
- plus supporting exported modules.

These exports match the 6 missing feature layers and were used as implementation reference only, while preserving current app design system.

