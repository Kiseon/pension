# Design

## Experience principles

The service should make a complex retirement income problem understandable without
pretending the future is certain.

1. Start with the household.
   - Retirement planning is usually a couple-level decision.
   - The default model treats the user and spouse as a shared financial unit with
     individual life events and income streams.
2. Show monthly cash flow.
   - Annual totals are useful, but monthly income exposes timing gaps.
   - Every projection should be explainable down to monthly inflow components.
3. Separate guaranteed, expected, and optional income.
   - Pensions and contracted rent differ from investment withdrawals.
   - The UI should make confidence levels visible.
4. Prefer scenario comparison over single answers.
   - A plan is useful when users can compare base, conservative, optimistic, and
     stress scenarios.
5. Make assumptions editable.
   - Inflation, rent growth, vacancy, withdrawal rate, tax assumptions, and life
     expectancy should be explicit.

## Primary user journey

1. Create household profile.
2. Enter people, birth dates, retirement targets, and expected pension start ages.
3. Add real estate assets and rental income.
4. Add financial assets that can produce income.
5. Add existing pensions and annuities.
6. Review normalized assumptions.
7. Generate monthly projection by age.
8. Compare scenarios.
9. Export a planning report.

## Core screens

### Onboarding

- Household name
- User birth date
- Spouse birth date, optional
- Country/currency
- Desired projection horizon

### Asset inventory

- Real estate assets
- Deposits and savings
- Investments
- Pension accounts
- Annuities
- Other recurring income

### Assumption review

- Inflation rate
- Asset yield assumptions
- Rent growth and vacancy assumptions
- Withdrawal strategy
- Pension indexation
- Tax and fee treatment

### Projection dashboard

- Monthly household income by age
- Income source breakdown
- Guaranteed versus variable income
- Shortfall warnings against target spending
- Scenario comparison

### Reliability report

- Inputs accepted
- Validation warnings
- Assumptions used
- Calculation version
- Test harness status

## Accessibility and localization

- Korean language is the initial product language.
- Currency and date formats must be locale-aware.
- Charts need tabular alternatives.
- Key risk messages should not rely on color alone.
