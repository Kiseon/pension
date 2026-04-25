# Reliability

Harness Engineering is the product discipline for keeping projections dependable, explainable, and safe to operate as rules, assumptions, and user data evolve.

## Reliability goals

1. **Deterministic projections**: same inputs and assumption version produce the same monthly output.
2. **Explainable outputs**: every projected cashflow links back to source input, rule, and assumption.
3. **Scenario isolation**: baseline, optimistic, conservative, and custom scenarios never mutate each other.
4. **Traceable changes**: changes to tax, pension, inflation, or asset rules are versioned and regression-tested.
5. **Graceful uncertainty**: incomplete inputs produce visible confidence gaps, not hidden precision.

## Harness Engineering layers

### 1. Domain invariant harness

Validates rules before projection:

- Birth dates imply valid ages and life expectancy windows.
- Monthly rent, pension, drawdown, and investment income cannot silently become negative unless modeled as expenses.
- Asset ownership share is between 0% and 100%.
- Projection horizon is explicit.
- Currency and month boundaries are normalized.

### 2. Golden scenario harness

Maintains canonical households:

- Single retiree with national pension only.
- Couple with staggered retirement dates.
- Real estate heavy household with vacancy risk.
- Investment-heavy household with sequence-of-returns sensitivity.
- Survivor scenario after one spouse dies.

Each golden scenario stores:

- Inputs.
- Assumption version.
- Expected monthly projection digest.
- Explanation snapshot.
- Known limitations.

### 3. Metamorphic test harness

Checks relationships instead of fixed outputs:

- Increasing monthly rent should not reduce total nominal income.
- Later retirement start should not increase earlier-month pension income.
- Higher vacancy rate should not increase real estate net income.
- Higher inflation should not increase real purchasing power when nominal income is fixed.
- Adding a spouse should preserve the original person's individual cashflow lines.

### 4. Data quality harness

Scores user inputs:

- Completeness: required fields present.
- Plausibility: values within realistic ranges.
- Freshness: asset values and rent assumptions recently reviewed.
- Source confidence: self-reported, document-backed, or imported.

### 5. Observability harness

Every projection run should emit:

- Projection run id.
- Household id.
- Input schema version.
- Assumption set version.
- Engine version.
- Runtime duration.
- Validation warnings.
- Output checksum.

No personally identifiable data should be emitted in logs.

## Failure modes to design for

| Failure mode | Impact | Harness response |
| --- | --- | --- |
| Incorrect pension start month | Misleading retirement readiness | Date boundary tests and golden cases |
| Missing spouse survivor benefit | Overstates household income after death | Survivor scenario harness |
| Double-counted property income | Overstates cashflow | Source-to-output lineage checks |
| Inflation applied twice | Understates real income | Metamorphic inflation tests |
| Unversioned assumption change | Irreproducible projections | Assumption registry and checksum |
| Ambiguous asset ownership | Wrong distribution between spouses | Ownership validation |

## Release gates

A projection engine release is not releasable unless:

- Unit tests pass for calculators and validators.
- Golden scenarios match reviewed snapshots.
- Metamorphic tests pass.
- Schema migrations are reversible or explicitly forward-only.
- Sample explanations remain understandable to a non-expert reviewer.
- Security checks confirm no raw PII in telemetry.

## Manual review points

Manual review is required for:

- New pension or tax rule interpretation.
- Assumption set updates with material output changes.
- Changes to survivor, spouse, or inheritance modeling.
- Any change that alters projected income by more than an agreed threshold in golden scenarios.

## Reliability backlog

1. Define first five golden households.
2. Build projection checksum format.
3. Create assumption version registry.
4. Add lineage metadata to every monthly cashflow line.
5. Add regression report comparing old and new projection outputs.
