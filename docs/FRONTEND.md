# Frontend Strategy

## Product Principle

The interface should help households understand the shape of future monthly income without mistaking the projection for guaranteed advice.

## Primary Workflows

1. Household setup
   - Enter user's birthdate and spouse/partner birthdate.
   - Select current work status, planned retirement age, and sudden retirement scenario.
   - Use Korea/KRW as the fixed market context.
2. Asset and income input
   - Employment income through retirement target age.
   - Severance pay and voluntary retirement compensation assumptions.
   - Real estate income and costs without detailed property type modeling.
   - Pension income: National Pension, private pension, employer pension, IRP, housing pension.
   - Savings and investments: balances, expected yield, planned contributions, withdrawal policy.
   - Other income: part-time work, business income, family support.
3. Scenario modeling
   - Base, conservative, and optimistic assumptions.
   - Retirement age, sudden retirement month, pension start age, inflation, investment return.
   - Pension start timing alternatives that change monthly income amounts.
4. Projection review
   - Monthly income chart by age.
   - Income source breakdown.
   - Shortfall and surplus indicators.
   - Assumption audit trail.
   - Recommended drawdown plan to reach a target post-retirement monthly income.
   - Additional monthly savings required before retirement if current assets are insufficient.

## Screen Map

- Welcome and onboarding
- Household profile
- Work and retirement status
- Asset inventory
- Income source inventory
- Pension timing optimizer
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
- Age milestone markers for retirement, sudden retirement, pension start, IRP drawdown, and age 100 horizon.
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
