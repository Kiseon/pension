# Projection Model

## Purpose

The projection model converts household facts and explicit assumptions into
monthly income lines. It should be deterministic, inspectable, and independent
from UI state.

## Projection grain

- Time grain: calendar month.
- Default view: household income by month and by each person's age.
- Source grain: each income source creates one or more monthly cashflow lines.
- Scenario grain: each scenario has its own assumption set and result checksum.

## Core concepts

| Concept | Role |
| --- | --- |
| Household | The planning unit containing one user and optional spouse |
| Person | Birth date, retirement target, pension eligibility, life events |
| Asset | Real estate, deposits, investments, pensions, annuities, other income sources |
| Income stream | Rule that produces monthly cashflow from an asset or entitlement |
| Assumption set | Inflation, returns, vacancy, tax, fee, and longevity assumptions |
| Scenario | Named combination of facts and assumptions |
| Projection line | Monthly output with amount, source, confidence, and explanation trace |

## Input normalization

Before calculation, the engine should normalize:

1. Dates to month boundaries.
2. Annual values to monthly values with an explicit conversion rule.
3. Percentages to decimal rates.
4. Currency to the scenario base currency.
5. Ownership shares to person-level or household-level attribution.
6. Tax and fee settings to either gross, net, or estimated-net mode.

## Calculation sequence

1. Build monthly timeline from start month to projection horizon.
2. Compute each person's age for each month.
3. Activate income streams based on start and end conditions.
4. Apply asset-specific adjustments such as vacancy, fees, or scheduled sale.
5. Apply scenario assumptions such as inflation, rent growth, or investment return.
6. Aggregate income by source type and household total.
7. Attach explanation traces and validation warnings.
8. Generate result checksum for regression tracking.

## Invariants

- Total monthly income equals the sum of projection lines for that month.
- A line cannot appear before its source start condition is met.
- Scenario calculation must not mutate source household facts.
- Every output line must reference an input source and assumption version.
- Missing optional inputs should produce warnings, not hidden defaults.

## Modeling choices still open

- Whether investment returns are modeled deterministically first or with
  stochastic paths later.
- Whether tax treatment starts as a flat adjustment or jurisdiction-specific
  tax modules.
- Whether property sale proceeds automatically become investable assets.
- Whether survivor scenarios are part of MVP or a first follow-up release.
