# Model boundary and evidence repairs — 2026-10-19

Parent: `abef15a84733b52eb8a02fa4c578a1609b54dfcb`. Scope: the five defects documented by the seven-model audit, and the API/workflow/UI boundaries that consume these outputs.

## Changed behavior

- Project analysis, quantities, risk and quality reject invalid numeric dimensions and report missing input explicitly. Quantities no longer manufacture a BOQ when area or floors are absent. The explicit `getBOQAssumptions` review API remains available. Workflow no longer substitutes one floor for missing/zero floors or uses stale predicted dimensions.
- Risk fitting builds project-type/category statistics, reads CSV by header with quote support, validates ordinal ratings, computes historical paired risk scores correctly and selects repeatable descriptions. Unseen types/categories label their global fallback. Normalized ordinal ratings and adjusted risk scores remain uncalibrated heuristics, not measured event probabilities.
- Quality records contain defects but no inspected exposure, complete inspections with zero defects, or current project inspection results. The model therefore returns a type-specific historical defect profile, **null** expected counts and **null** grade/score, with review metadata. Replicating the defect corpus cannot produce a doubled prediction. This is an explicit abstention, not a newly calibrated quality predictor.
- Supplier selection requires specialty AND the requested city, honors supported requirements, and returns `no_match` when appropriate. Known category aliases map to material price categories. Comparisons separate material, unit, city, quality grade, price date and currency. A market mean exists only for one comparable group; missing/multiple groups return null. Ranking is explicitly heuristic and non-price based. Records are historical, not live quotations or verified qualifications. One existing supplier row with rating 5.3/5 is rejected and counted in the audit (123/124 accepted).
- EDL, project/inspection APIs and UI retain null/review states. Historical defects no longer become Passed/Failed inspection outcomes. The actual `/api/v1/full-analysis` registration now invokes the real workflow handler instead of returning a prefilled quality score, demo cost and duration. Existing saved dimensions may fill fields absent from the description; total-built-up geometry normalizes once. Full-analysis failures return no fabricated substitute result.

## Validation

Run from the ACEP root:

```sh
node research/model-repairs-v1/checks.cjs
node research/model-repairs-v1/integration.cjs
node research/model-repairs-v1/matrix.cjs
```

- 85/85 direct-model, CSV, workflow and EDL checks.
- 16/16 integration checks using actual route and DOM-handler source, real seven models/workflow/EDL, and storage/DOM/API stubs. Includes actual full-analysis registration and propagation of nulls.
- Existing schedule 22/22, scoped cost 16/16, cost integration 10/10, geometry 10/10, project handlers 12/12 and cost UI 6/6: 76/76.
- Broad phase suite: 76/76. Standalone full-analysis handler contract also passes.
- Authored 100-project matrix: 600/600 model calls complete with finite numeric values or explicit nulls. Seven statistical models fitted in process memory to existing internal CSV; six models invoked across the matrix, suppliers tested separately. No neural/GPU training.
- 36 missing/invalid probes: accepted without review **18 before → 0 after**. Risk numeric outputs at fixed dimensions: **1 before → 6 after** across six types. Quality abstains from numeric predictions in 100/100 cases while exposing historical profiles.

The first integration harness omitted required `facts` in its UI response fixture and failed one assertion; the fixture was corrected to the actual response contract and the suite rerun. Baseline audit results are preserved, not overwritten with passing outcomes. `source-sha256.json` identifies tested production sources.

## Limits

These are authored regression and operational checks, not accuracy measurements on independent executed projects. Existing internal data provenance remains unverified/synthetic. No new real project labels were introduced, no percentage of field accuracy is established, and no 98% accuracy claim is made. No full browser, deployed-server or engineering acceptance test was run. Schedule productivity, predictive quality incidence, live supplier quotations and field calibration remain pending. Other demonstration metrics in unrelated platform endpoints (for example digital-twin resource/safety fields) are outside this repair.
