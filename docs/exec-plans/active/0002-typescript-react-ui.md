# 0002: TypeScript + React Frontend Migration & Optimal UI

## Status
Active

## Goal
Migrate the vanilla HTML/JS frontend (`static/`) to a modular **TypeScript + React + Vite** application (`src/`) with an optimal retirement income planning UX, while preserving `pension_service/projection.py` as the deterministic Python calculation engine.

## Scope
1. **Frontend Stack**: React 19 + TypeScript + Vite (`src/`), built to `dist/` and served by `pension_service/server.py` (with Vite dev proxy for local development).
2. **UI/UX Enhancements**:
   - Tabbed/grouped input studio with Korean unit helpers (만원/억원), scenario presets (기본/보수/낙관/조기은퇴), and inline validation.
   - Executive KPI summary cards (retirement monthly cashflow, additional savings needed, depletion age/month, confidence score).
   - Interactive SVG charts: Age-based monthly cashflow & income source breakdown, asset balance trajectory (cash, stock, retirement/IRP), and life milestone markers.
   - Nominal vs. Real (명목/실질) toggle.
   - Multi-scenario comparison tab (Base vs. Conservative vs. Optimistic).
   - Auditable monthly/yearly breakdown table with filtering and CSV export.
   - Reliability & Rule Versions panel exposing `rule_versions`, `confidence_score`, and model scope limitations.
3. **Verification**:
   - TypeScript typecheck (`tsc --noEmit`) & Vite production build (`npm run build`).
   - Python unit tests (`python3 -m unittest discover -s tests`).
   - Playwright E2E tests (`tests/e2e/projection.spec.js`) updated for the new React UI.
