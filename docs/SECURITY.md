# Security

## Security posture

The retirement income planning service handles highly sensitive personal and
financial information. Security is a product requirement, not an infrastructure
afterthought.

## Sensitive data classes

| Data class | Examples | Handling requirement |
| --- | --- | --- |
| Identity | names, birth dates, household relationships | encrypt at rest and in transit |
| Financial assets | deposits, investments, pensions | encrypt, audit access |
| Real estate | addresses, asset values, rental income | minimize address precision where possible |
| Projection results | retirement income gaps, depletion ages | treat as derived sensitive data |
| Advisor notes | planning assumptions and explanations | role-based access |

## Controls

- Use TLS for all traffic.
- Encrypt application databases and backups.
- Avoid logging raw financial inputs or generated projections.
- Use structured redaction for support and observability events.
- Apply role-based access control for future advisor workflows.
- Record audit events for account access, projection changes, and exports.
- Require explicit user confirmation before sharing or exporting reports.

## Threat model

| Threat | Mitigation |
| --- | --- |
| Account takeover | strong auth, MFA-ready architecture, suspicious login alerts |
| Data leakage through logs | safe logging libraries, automated log scans |
| Projection manipulation | immutable scenario versions and auditable assumptions |
| Unauthorized advisor access | scoped permissions and household-level consent |
| Prompt or model data exposure | do not send raw personal financial data to external LLMs without explicit consent and masking |

## Privacy principles

- Collect only data that supports projection or explanation.
- Separate required and optional inputs.
- Allow users to delete scenarios and export their own data.
- Keep retention periods explicit.
- Document any third-party processor before integration.

## Security acceptance criteria

- No secrets committed to the repository.
- No raw PII in analytics events.
- All sensitive fields have a retention and deletion policy.
- Exported reports include clear generation timestamps and scenario names.
- Permission changes are covered by automated tests before release.
