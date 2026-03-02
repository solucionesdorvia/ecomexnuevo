# Implementation Notes

## Scope delivered

Implemented missing product layers on top of existing E-COMEX app, keeping current backend contracts and visual system.

## New/updated routes and screens

- `GET /account` (updated)
  - Added Guided Onboarding block with first-use callout.
  - Added designed empty states:
    - no quotes
    - no active operations

- `GET /ajustes` (updated)
  - Role badge from real session.
  - Links to Roles & Access and Trust & Compliance.

- `GET /ajustes/roles-access` (new)
  - Roles matrix: Cliente, Operador interno, Consultor experto, Admin empresa.
  - Permission list per role.
  - Uses current backend role mapping (`user`, `operator`, `admin`), expert shown as UI-ready role.

- `GET /cotizar` (updated)
  - Added Decision Summary module:
    - recommendation (Importar ahora / Esperar / Ajustar variables)
    - reasons list
    - risk badge
    - CTAs Export / Enviar a experto / Guardar draft
  - Added Cost Benchmark module:
    - compares against local historical totals when enough history exists
    - empty state when insufficient history
  - Role-based UI gating on validate action.

- `GET /cotizaciones/reporte` (updated)
  - Added Cost Benchmark (historical based on user/anon quote history).
  - Added Expert Channel (threaded comments).
  - Added Decision actions (save draft / send to expert).
  - Added Trust & Compliance panel with audit trail list + disclaimer.

- `GET /trust-compliance` (new)
  - Dedicated trust/audit page with persisted logs + compliance guidance.

## New backend endpoints

- `GET/POST /api/quotes/[id]/comments` (new)
  - Quote thread comments.
  - Access control by quote owner (`userId`) or anonymous owner (`anonId`) when applicable.
  - Comment metadata includes role labeling (`expert`/`client`).

- `POST /api/quotes/[id]/decision` (new)
  - Supports actions:
    - `save_draft`
    - `send_expert`
  - Updates quote stage in backwards-compatible way.

## Existing endpoints updated (non-breaking)

- `GET /api/quote/pdf`
  - Added audit log event (`export_pdf`) on successful generation.

- `PATCH /api/operator/budgets/update`
  - Added audit log event (`overrides_saved` / `overrides_reset`).

- `GET /api/operator/budgets/pdf`
  - Added audit log event (`export_pdf`).

No existing endpoint names or request payload contracts were renamed or removed.

## Database/model changes (backwards-compatible)

Updated `prisma/schema.prisma`:

- `User.onboardingSeenAt` (nullable)
- New model: `QuoteComment`
- New model: `AuditLog`
- New relations from `Quote`, `User`, `OperatorBudget`

Added migration:

- `prisma/migrations/20260225003000_add_comments_audit_onboarding/migration.sql`

All new fields are nullable or additive; existing data/contracts remain valid.

## New shared modules/components

- `src/lib/auth/permissions.ts`
  - role/permission map + helpers.

- `src/lib/audit/log.ts`
  - best-effort audit writer.

- `src/components/onboarding/GuidedOnboarding.tsx`
  - first-use guided CTA panel.

- `src/app/cotizaciones/reporte/ui/ExpertChannel.tsx`
  - quote comments UI.

- `src/app/cotizaciones/reporte/ui/DecisionActions.tsx`
  - send-to-expert/save-draft action UI.

- `docs/REPO_INVENTORY.md`
  - phase-0 inventory and stitch mapping.

## How to test

1. Install/generate:
   - `npm install`
   - `npx prisma generate`
2. Run DB migration in your environment:
   - `npx prisma migrate deploy` (or your migration workflow)
3. Start app:
   - `npm run dev`
4. Validate flows:
   - Login/register and open `/account` -> guided onboarding + empty states.
   - Open `/ajustes/roles-access` -> role matrix.
   - Open `/cotizar` -> Decision Summary + Cost Benchmark.
   - Open `/cotizaciones/reporte?quote=<id>&mode=quote` -> benchmark + expert channel + decision actions + compliance panel.
   - Open `/trust-compliance` -> audit events listed.
5. Trigger audit logs:
   - export quote PDF
   - update operator overrides
   - export operator PDF
   - send quote comment
   - send to expert/save draft

