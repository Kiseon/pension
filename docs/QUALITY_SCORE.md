# Quality Score

This scorecard defines how the retirement income design service will measure planning quality, reliability, and user trust before and after releases.

## Quality Dimensions

| Dimension | Target | Measurement |
| --- | --- | --- |
| Projection correctness | Same inputs always produce the same monthly projection | Golden scenario tests and deterministic calculation snapshots |
| Explainability | Users can understand why each income line appears | Per-month breakdown by income source, assumptions, and events |
| Input completeness | Missing critical assumptions are visible before projection | Readiness score and validation prompts |
| Scenario resilience | Stress scenarios run without corrupting baseline data | Scenario isolation tests |
| Data protection | Sensitive financial and family data remains protected | Security review, access logging, encryption checks |

## Harness Engineering Gates

Each planning engine change should pass these gates:

1. Unit tests for formulas and event timing.
2. Contract tests for projection API requests and responses.
3. Regression snapshots for representative households.
4. Scenario comparison tests for pessimistic, base, and optimistic assumptions.
5. Observability checks for calculation latency, failure rate, and unexpected null values.

## Planning Quality Indicators

- Income coverage ratio by month: projected income divided by target spending.
- Guaranteed income ratio: pension and annuity income divided by total projected income.
- Volatility exposure: share of income dependent on market-linked assets.
- Longevity buffer: number of months with positive available cash under long-life assumptions.
- Housing dependency: share of income or liquidity tied to real estate assets.

## Review Cadence

- Product review: confirm that outputs answer user planning questions.
- Engineering review: confirm deterministic calculations and test coverage.
- Risk review: confirm disclaimers, assumption boundaries, and privacy controls.
- Data review: confirm schema changes preserve auditability.
