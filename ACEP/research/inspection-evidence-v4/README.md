# Inspection evidence and real-data research v4

`qualityInspector.summarizeInspectionOutcomes(projectId, records)` consumes observed inspections without requiring the synthetic/unverified defect corpus. Each row requires `inspectionId`, `projectId`, `inspectionType`, `inspectionDate` (valid YYYY-MM-DD), `result`, and `source`.

Only exact `Approved` and `Corrections Issued` results enter the explicit-outcome denominator. Administrative, partial, cancelled and unknown results remain counted separately. Identical IDs are deduplicated; contradictory IDs, invalid dates, missing provenance and mixed projects reject. Empty evidence stays unknown. Rates are descriptive, source authenticity is unverified, and quality grades/prediction accuracy remain null.

Run `node research/inspection-evidence-v4/checks.cjs` from ACEP. Fifteen input and aggregation checks cover real failure modes; they do not measure predictive accuracy.

## Separate Kaggle experiment

Primary public source: https://data.lacity.org/resource/9w5z-rg2h.json
Catalog and license: https://catalog.data.gov/dataset/building-and-safety-inspections (CC0).
Snapshot: 2026-10-19; 1,181,033 original Approved/Corrections Issued events, 2021–2024.
Conservative daily-event deduplication removes 35,860 repeated outcome rows and quarantines 132 conflicting rows. Remaining 1,145,041 daily permit/type outcomes.

Permit/address connected components isolate sites. Exact normalized addresses can have aliases; a site is not necessarily one contract. Raw addresses, permit IDs, future permit statuses and target outcomes are excluded from model features. Uploaded site and permit identifiers are hashes used only for split auditing. All current-day events are excluded from lagged features.

- Train: 375,898 events, 80,501 sites, 2021–2022; no sites present in validation/test.
- Validation: 160,921 events, 46,569 sites, 2023; no sites present in test.
- Test: 300,226 events, 68,036 sites, 2024.
- Another 307,996 rows serve only as eligible prior history or are omitted from fitting/scoring to maintain temporal/site separation.
- Five sites selected by a fixed hash among sites with at least 30 events, without using class balance or performance: `ec85efda88b1bbf94273`, `9d39dd303c5cb9824eff`, `2bca77fe49c19c4f67cc`, `cef67310404a57d6b7dd`, `d0eb82d4b0791598c9a3`.

Eight candidates: always-approved and train-prevalence baselines; two regularized logistic models; two histogram gradient boosting models; 160-tree ExtraTrees; and a 64/32-unit neural MLP trained for 30 epochs with validation checkpoint selection every five epochs. Candidate/threshold selection uses validation only. Model and selection hashes are written before test labels are opened. Acceptance requires each of five sites to have accuracy and balanced accuracy ≥90%, full scored-event coverage and at least five observations in each class. Small or one-class sites cannot pass this gate.

All model fitting must run on Kaggle; training script refuses execution elsewhere. Input preparation is deterministic local processing. No outcome predictor is automatically promoted. Even a passing inspection-outcome experiment cannot validate all seven ACEP engines, physical defect detection, engineering safety, Saudi deployment, cost, quantities, schedules or supplier delivery. The source lacks those labels.

Research datasets, source hashes, model artifacts and independent result reports are delivered separately; no large data/model binary is committed here. Public-source provenance and missing-data findings are preserved in the report. The private Kaggle notebook retains each executed version.
