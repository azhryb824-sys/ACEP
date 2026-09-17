# Engineering audit — 17 September 2026

The experiment gateway accepted conflicting geometry, incompatible power units, impossible calendar dates and unsupported currencies. Its safety projection assigned likelihood/severity without site evidence, and linear assets inherited generic building geometry. This change fixes these correctness boundaries without approving the synthetic research model for real engineering decisions.

## Changes

- Reject conflicting treated area vs length × width, invalid calendar dates, unsupported non-SAR estimates, and incompatible capacity dimensions. Normalize kW/MW, kVA/MVA, water flow and reservoir volume units.
- Return `needs_input` and blocked numeric outputs when the quantity area or building floor count is missing.
- Remove invented safety likelihood/severity/risk totals; retain qualitative hazards and controls for professional assessment.
- Parse Arabic ESG percentages and reject impossible reduction targets.
- Remove fabricated external area when the site is fully occupied.
- Reconcile the sequential schedule exactly to total working days; expose working-day offsets and the 22-day planning-month assumption. Remove the unsupported 38% parallel-execution claim.
- Return dimensional asset briefs for linear/site/utility assets, without rooms, columns, arbitrary heights or construction-completion claims.

The deployment overlay is still distributed through `gateway-token.patch`, applied after the existing staging archive. Apply the updated patch to that same baseline, not over the previous patch. A clean application was verified byte-for-byte against all 28 tested source files.

## Verification

- `npm run verify`: passed (lint, JS/TypeScript build, dataset validation, Python tests, 121 Jest tests, legacy suites, HTTP E2E and production governance smoke).
- `npm run test:http-engineering-matrix`: 35 project types, 350 engine executions/checks, 350 passed.
- `npm run test:engineering-adversarial`: 17/17 independent counterexamples passed. Initial baseline: 4/15; two extra regressions cover the schedule and linear geometry.
- Real Site worker gateway + hospital fixture: 10/10 engines executed.
- Browser against the isolated actual backend: complete villa, conflicting road rejected, corrected road analyzed, land-only villa blocks numeric estimates, engine pages reviewed, project switching, report save/copy and reload persistence.

The four old excavation test failures were invalid arbitrary bounds for inputs whose `area` is the footprint. Their excavation checks now use independently specified expected volumes (450, 750, 3000, 7500, 1500, 4500 m³ at the declared 1.5 m concept depth). No excavation formula or other acceptance bound was relaxed.

## Remaining engineering limits

The loaded candidate is `acep-million-synthetic-v1` (one million synthetic training records), not an independently measured accuracy result. BOQ items are concept work packages, prices are allocations of a model total, the schedule has no resource-loaded CPM/calendar, RISK/QUALITY are research predictions, ESG has no verified LCA factors, and SUPPLY has no verified live quotations. Free-text scope exclusions are not a measured scope takeoff. Document checkboxes are declarations, not verified file contents. These limits prohibit contractual, construction or safety approval from this audit alone.

Per `CONTRIBUTING.md`, security-aware maintainer and domain-owner review is required before merge/deployment. Licensed professional approval is required for real engineering decisions. This branch intentionally does not change release approval or production authorization.
