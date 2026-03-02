# Enstitch (Stitch) screen map → E‑Comex app

Source design exports (HTML + screenshot per screen):

- `/Users/valentindoroszuk/Downloads/stitch_e_comex_app_quoting_engine 2`

This document maps each export to the **current Next.js App Router** route(s) and the **primary implementation file(s)** that should match the design.

## 1) One export → one route (primary screens)

| Enstitch export | Screenshot | Route | Primary implementation |
| --- | --- | --- | --- |
| `e_comex_institutional_landing` | `e_comex_institutional_landing/screen.png` | `/` | `src/app/ui/LandingContainerGate.tsx` (used by `src/app/page.tsx`) |
| `e_comex_app_guided_onboarding` | `e_comex_app_guided_onboarding/screen.png` | `/cotizar` | `src/app/cotizar/page.tsx` + `src/app/cotizar/ui/CotizarClient.tsx` |
| `e_comex_app_quoting_engine` | `e_comex_app_quoting_engine/screen.png` | `/cotizar` (flow) | `src/app/chat/ui/QuotationFlowClient.tsx` + `src/app/chat/ui/ChatClient.tsx` |
| `e_comex_app_quote_management` | `e_comex_app_quote_management/screen.png` | `/cotizaciones` | `src/app/cotizaciones/page.tsx` + `src/app/cotizaciones/ui/CotizacionesClient.tsx` |
| `e_comex_app_report_preview` | `e_comex_app_report_preview/screen.png` | `/cotizaciones/reporte` | `src/app/cotizaciones/reporte/page.tsx` + `src/app/cotizaciones/reporte/ui/*` |
| `e_comex_app_trust_compliance` | `e_comex_app_trust_compliance/screen.png` | `/trust-compliance` | `src/app/trust-compliance/page.tsx` |
| `e_comex_app_account_settings` | `e_comex_app_account_settings/screen.png` | `/ajustes` | `src/app/ajustes/page.tsx` |
| `e_comex_app_roles_access` | `e_comex_app_roles_access/screen.png` | `/ajustes/roles-access` | `src/app/ajustes/roles-access/page.tsx` |
| `e_comex_app_operation_tracking` | `e_comex_app_operation_tracking/screen.png` | `/operador` | `src/app/operador/page.tsx` + `src/app/interno/ui/OperatorBudgetClient.tsx` |
| `e_comex_app_cost_benchmark` | `e_comex_app_cost_benchmark/screen.png` | `/tendencias` | `src/app/tendencias/page.tsx` + `src/app/tendencias/ui/TendenciasClient.tsx` |

## 2) Exports that map to in-flow surfaces (no dedicated route)

These exports are treated as **sections / panels** inside the primary screens above.

| Enstitch export | Screenshot | Where it should appear in the app |
| --- | --- | --- |
| `e_comex_app_decision_summary` | `e_comex_app_decision_summary/screen.png` | Quote decision/summary blocks inside `/cotizaciones/reporte` (`src/app/cotizaciones/reporte/ui/*`) |
| `e_comex_app_risk_analysis_detail` | `e_comex_app_risk_analysis_detail/screen.png` | Risk analysis detail rail/panel inside `/cotizaciones/reporte` and/or analysis modules (`src/components/analysis/*`) |
| `e_comex_app_logistics_selector` | `e_comex_app_logistics_selector/screen.png` | Logistics selector step inside `/cotizar` flow (`src/app/cotizar/ui/*`, `src/app/chat/ui/QuotationFlowClient.tsx`) |
| `e_comex_app_expert_channel` | `e_comex_app_expert_channel/screen.png` | Expert channel UI within chat/quote flow (`src/app/chat/ui/*`) |
| `e_comex_app_expert_validation` | `e_comex_app_expert_validation/screen.png` | Expert validation surfaces within operator flow (`src/app/operador/*`, `src/app/interno/ui/*`) |
| `e_comex_strategic_expertise_section` | `e_comex_strategic_expertise_section/screen.png` | Secondary landing section inside `/` (same implementation as landing container) |

## 3) Screens with no export (must be restyled to match the system)

Auth screens are not present as Enstitch exports but must match the global visual system:

- `/account/login` → `src/app/account/login/page.tsx`
- `/account/register` → `src/app/account/register/page.tsx`
- `/account` → `src/app/account/page.tsx`

