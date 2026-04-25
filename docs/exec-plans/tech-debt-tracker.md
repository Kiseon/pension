# Tech Debt Tracker

This tracker records reliability, product, and platform debt discovered while designing or implementing the retirement income planning service.

| ID | Area | Debt | Impact | Owner | Status |
| --- | --- | --- | --- | --- | --- |
| TD-001 | Domain | Pension and tax rules are not yet jurisdiction-specific. | Projection accuracy depends on broad assumptions. | Product/Domain | Open |
| TD-002 | Reliability | Golden household fixtures are not implemented. | Regression confidence is manual. | Engineering | Open |
| TD-003 | Data | Asset source confidence is not formalized. | Users may over-trust self-reported values. | Product/Design | Open |
| TD-004 | Security | Data retention policy is not finalized. | Privacy risk remains unclear. | Security | Open |
| TD-005 | UX | Projection uncertainty display is not validated with users. | Reports may imply false precision. | Design | Open |

## Review cadence

Review this file whenever a design doc, assumption set, or projection engine behavior changes.
