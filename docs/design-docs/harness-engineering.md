# Harness Engineering Design

## Purpose

Harness Engineering turns retirement income projection from an opaque
calculation into a governed, repeatable, and observable system.

## Harness responsibilities

1. Validate input invariants before projection.
2. Execute deterministic golden scenarios on every engine change.
3. Compare result digests across assumption and engine versions.
4. Attach explanation lineage to every monthly cashflow line.
5. Emit privacy-safe observability events.

## Required harness artifacts

### Golden household fixtures

Each fixture contains:

- Household profile.
- Assets and income streams.
- Scenario assumptions.
- Expected projection digest.
- Human-readable explanation snapshot.
- Known limitations.

### Result digest

The digest should include:

- Projection horizon.
- Monthly total income checksums.
- Income-source-level checksums.
- Warning codes.
- Assumption version.
- Engine version.

### Lineage trace

Each output line should identify:

- Source input id.
- Calculator rule id.
- Scenario assumption id.
- Applied date range.
- Gross amount.
- Adjustments.
- Net amount.

## Test strategy

| Test type | Example |
| --- | --- |
| Unit | Pension starts in the configured month |
| Boundary | February 29 birth date age calculation |
| Golden | Couple with rental property and staggered pension starts |
| Metamorphic | Higher property cost cannot increase net real estate income |
| Contract | Projection API returns stable schema |
| Privacy | Logs contain no raw birth dates or asset values |

## Release policy

Projection engine changes require:

- Passing automated harness tests.
- Reviewed golden scenario diff if outputs change.
- Updated assumption registry for rule changes.
- Documented user-facing impact for material changes.
