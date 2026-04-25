# AGENTS.md

## Purpose

This repository is planned as a reliability-first retirement income design service for Korea. Agents working here should preserve the product intent: help households project monthly after-tax income from the current working period through age 100 using personal profile data, labor income, severance payments, voluntary retirement incentives, real estate income and expenses, national pension, private pensions, housing pension, IRP, stocks, savings, investments, and other income-generating resources.

## Operating Principles

1. Treat financial projections as decision support, not guaranteed advice.
2. Make all assumptions explicit, versioned, and testable.
3. Prefer deterministic projection engines before introducing stochastic or AI-assisted recommendations.
4. Keep personally identifiable information and financial data protected by default.
5. Use Harness Engineering practices to improve reliability through automated tests, controlled deployments, observability, and repeatable verification gates.
6. Use Korean rules, Korean won, and Korea-specific pension/tax adapters unless a future product decision explicitly expands scope.
7. Do not hard-code external public rules directly in formulas without source, effective date, and version metadata.

## Expected Agent Workflow

1. Read `ARCHITECTURE.md`, `docs/PRODUCT_SENSE.md`, and `docs/RELIABILITY.md` before changing core behavior.
2. Update the relevant product spec or design doc before implementing major user-facing behavior.
3. Add or update an execution plan in `docs/exec-plans/active/` for work that spans more than one component.
4. Keep generated artifacts under `docs/generated/` clearly marked as generated or derived.
5. Record technical debt in `docs/exec-plans/tech-debt-tracker.md` instead of hiding it in code comments.

## Quality Bar

- Projection calculations must be covered by automated examples and edge-case tests.
- Assumptions such as inflation, pension start age, tax treatment, income growth, rent growth, IRP contribution plan, and investment return must be configurable.
- Releases must pass reliability gates before promotion.
- User-facing output must clearly distinguish inputs, assumptions, projections, recommendations, and warnings.
