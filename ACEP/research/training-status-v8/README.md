# Training outcome reporting repair

`models/trainer.js` previously defined `trainAllModels` twice and always logged that all seven models trained successfully, even when individual trainers threw. UETS training also logged a success marker on partial failure.

The implementation now runs a shared reporting routine, counts successes and failures, preserves per-model errors, rejects invalid/empty record counts and marks a failed model untrained. Outcomes are `succeeded`, `partial_failure` or `failed`. The legacy numeric `models` field remains the requested count; `successfulModels`, `failedModels` and `modelResults` expose actual outcomes. Every summary explicitly keeps `accuracyValidated: false`: completion of fitting is not independent engineering acceptance.

UETS validates model names before enqueueing, rejects empty/invalid lists, deduplicates requested names and reports queue/notification errors. Feedback contains the actual outcome. Existing public exports and UETS result fields are preserved, with additive status fields.

Validation: `node ACEP/research/training-status-v8/checks.js` passes 19 scenarios using fake trainers in an isolated VM: success, partial/all failure, invalid and empty counts, returned errors, duplicate/unknown model requests, queue failure and notification failure. **No real model fitting occurs locally.** These verify orchestration behavior, not field accuracy. This change is in a draft PR; no merge or deployment is included.
