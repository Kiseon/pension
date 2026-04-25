# Core Beliefs

## Product beliefs

1. **Projection is a decision aid, not a promise.**
   The service should communicate uncertainty clearly and avoid false precision.

2. **Monthly cashflow matters more than net worth alone.**
   Users need to understand when income arrives, from which source, and under what assumptions.

3. **Couple-level planning must preserve person-level facts.**
   Birth dates, pension start dates, employment status, and ownership shares differ by person.

4. **Real estate income requires net modeling.**
   Rent should be modeled as monthly income minus user-entered monthly costs and allocated property taxes.

5. **Every answer needs a trace.**
   A monthly income number must be explainable through input, rule, assumption, and calculation version.

## Engineering beliefs

1. **The projection engine is a pure domain core.**
   Given normalized inputs and an assumption version, it should return deterministic outputs without UI or persistence side effects.

2. **Harnesses are product features.**
   Test fixtures, scenario snapshots, input quality scoring, and explanation checks directly affect user trust.

3. **Assumptions are data, not hidden code.**
   Inflation, rent growth, discount rates, pension rules, and tax parameters should be versioned and reviewable.

4. **Warnings are better than silent correction.**
   When input is incomplete or implausible, the system should show confidence gaps instead of quietly guessing.

5. **Release safety is cumulative.**
   New features must add or update golden scenarios and metamorphic checks when they affect projections.

## Design principles

- Prefer progressive disclosure over dense financial dashboards.
- Show household-level totals with source-level details one click away.
- Make baseline, conservative, and optimistic scenarios easy to compare.
- Use plain Korean labels for financial terms, with definitions available inline.
- Separate nominal income from inflation-adjusted purchasing power.
