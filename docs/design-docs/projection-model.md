# Projection Model

## Purpose

The projection model converts household facts and explicit assumptions into
monthly income lines. It should be deterministic, inspectable, and independent
from UI state.

## Projection grain

- Time grain: calendar month.
- Default view: Korean won household net income by month and by each person's age.
- Source grain: each income source creates one or more monthly cashflow lines.
- Scenario grain: each scenario has its own assumption set and result checksum.
- Horizon: from the current month through the year the user turns 100.

## Core concepts

| Concept | Role |
| --- | --- |
| Household | The planning unit containing one user and optional spouse |
| Person | Birth date, retirement target, pension eligibility, life events |
| Employment | Current work income, retirement age, severance pay, voluntary retirement incentive |
| Asset | Real estate net income, deposits, investments, IRP, pensions, annuities, other income sources |
| Income stream | Rule that produces monthly cashflow from an asset or entitlement |
| Rule source | Versioned official or user-supplied source for Korean pension, tax, and annuity rules |
| Assumption set | Inflation, returns, income-source growth, tax, fee, and longevity assumptions |
| Scenario | Named combination of facts and assumptions |
| Projection line | Monthly output with amount, source, confidence, and explanation trace |

## Input normalization

Before calculation, the engine should normalize:

1. Dates to month boundaries.
2. Annual values to monthly values with an explicit conversion rule.
3. Percentages to decimal rates.
4. All monetary values to Korean won.
5. Ownership shares to person-level or household-level attribution; joint ownership defaults to 50:50.
6. Tax and fee settings to after-tax monthly cashflow mode.
7. Pension start choices to rule-versioned monthly benefit options.

## Calculation sequence

1. Build monthly timeline from start month to projection horizon.
2. Compute each person's age for each month.
3. Activate employment income until retirement month.
4. Add severance pay and voluntary retirement incentive in the retirement month when applicable.
5. Activate pension streams based on selected or recommended start month.
6. Apply source-specific growth assumptions for earned income, rent/business income, pension, and financial income.
7. Apply financial asset returns, IRP planned contributions, and recommended withdrawal schedule.
8. Deduct monthly allocated taxes and costs to produce after-tax cashflow.
9. Aggregate income by source type and household total.
10. Compare household income with target post-retirement monthly income.
11. Generate recommended withdrawal order, pension start choices, and additional savings required when there is a gap.
12. Attach explanation traces and validation warnings.
13. Generate result checksum for regression tracking.

## Invariants

- Total monthly income equals the sum of projection lines for that month.
- A line cannot appear before its source start condition is met.
- Scenario calculation must not mutate source household facts.
- Every output line must reference an input source and assumption version.
- Missing optional inputs should produce warnings, not hidden defaults.
- Retirement recommendation output must reconcile with monthly source lines.
- Real-value views must use January of the current year as the present-value base month.

## Initial modeling decisions

- The first market is Korea only; currency and country selection are excluded.
- Spouse is optional and only the current spouse is supported.
- Death, inheritance, survivor pension, and property sale events are excluded from MVP.
- Real estate is modeled as monthly income and monthly cost only.
- Vacancy is excluded; rent growth is user-entered per income source.
- Taxes are modeled by tax category and allocated monthly as costs.
- Financial projections are deterministic by scenario; stochastic paths can be added later.
