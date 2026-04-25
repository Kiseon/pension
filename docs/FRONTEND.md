# Frontend Strategy

## Product Principle

The interface should help households understand the shape of future monthly income without mistaking the projection for guaranteed advice.

## Primary Workflows

1. Household setup
   - Enter user's birthdate and spouse/partner birthdate.
   - Select household status and retirement planning horizon.
   - Define currency, region, and tax assumption profile.
2. Asset and income input
   - Real estate: home, buildings, rental units, mortgages, maintenance costs.
   - Rental income: monthly rent, vacancy assumptions, contract renewal rules.
   - Pension income: public pension, private pension, annuity, employer pension.
   - Savings and investments: balances, expected yield, withdrawal policy.
   - Other income: part-time work, business income, family support.
3. Scenario modeling
   - Base, conservative, and optimistic assumptions.
   - Retirement age, pension start age, rental vacancy, inflation, investment return.
   - One-time events such as sale of property or large medical expense.
4. Projection review
   - Monthly income chart by age.
   - Income source breakdown.
   - Shortfall and surplus indicators.
   - Assumption audit trail.

## Screen Map

- Welcome and onboarding
- Household profile
- Asset inventory
- Income source inventory
- Assumption editor
- Projection dashboard
- Scenario comparison
- Reliability report
- Export and sharing

## Input Design

- Use progressive disclosure for complex assumptions.
- Keep every number tied to a source label and effective date.
- Show validation feedback near the field.
- Distinguish required inputs from optional refinements.
- Provide defaults only when they are clearly labeled and explainable.

## Projection Visualization

- Monthly cashflow line chart.
- Stacked income source chart.
- Age milestone markers for pension start, spouse pension start, asset sale, and life expectancy assumptions.
- Table view for auditability and export.

## Reliability UX

Every projection should expose:

- Input completeness score.
- Assumption risk flags.
- Model version.
- Last calculation timestamp.
- Known limitations.
- Whether the scenario has passed validation checks.

## Accessibility

- All charts need table alternatives.
- Avoid color-only risk encoding.
- Use clear Korean labels for financial terms.
- Support keyboard navigation for scenario editing.

## Open Design Questions

- Should onboarding begin with a simple estimate or a full asset inventory?
- Should the default view optimize for household monthly income or individual source detail?
- Which export formats matter first: PDF, CSV, spreadsheet, or advisor handoff package?
