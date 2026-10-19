# ACEP v9: connect independent evidence to application reporting

Date: 2026-10-19. This is an application/evaluation correctness cycle, **not a new model training or acceptance cycle**. The existing Kaggle v8 holdout is now exposed. No model or transformer fitting occurs locally, no frozen predictions are changed, and no research model is promoted. Full seven-engine acceptance remains unproven (0/7 demonstrated).

## Problem and changes

`BenchmarkLibrary` used historical quantity rates as both prediction and reference, yielding 100% without invoking a quantity predictor. Cost and duration predictions were blended with the historical target before scoring, and a failed model could fall back to that same target. Per-model pass rates also counted lack of exceptions as success. These are invalid independent predictive-accuracy claims.

The historical comparison now returns **descriptive diagnostics** with actual unblended cost/duration outputs, missing/failed prediction coverage, and explicit unavailable quantity comparisons. It exposes no accuracy, pass rate or MAPE; the legacy fields are null. Missing mean geometry is not replaced with 500m²/two floors. Historical mean area is provisionally interpreted as per-floor input and labelled `assumed_per_floor`; its source basis is not established. These type-aggregate diagnostics remain unsuitable for field accuracy even when a numerical comparison exists. The comparison endpoint requires explicit geometry and returns 422 for insufficient values. Legacy persisted scores are sanitized in result/trend/export accessors rather than silently promoted.

Periodic evaluation preserves the diagnostic role and safely handles missing datasets. Selective retraining ignores unvalidated/unknown accuracy, exposes evidence gaps and requests linked project outcomes. Its `execute` flag no longer marks a plan as completed without execution. The system-health decision no longer derives an apparently validated confidence score from aggregate agreement, data-quality score and the fact an evaluation ran.

AI initialization now shares concurrent work, preserves its result and exposes operational readiness separately from initialization and accuracy. Failed fits no longer make the server report all models ready. The health response becomes degraded and analysis guards return 503 while the required models are unavailable. A later change in model fitted flags updates operational readiness without declaring accuracy validated.

## Frozen evidence integration

`model-evidence.js` reads the reviewed `evidence/fdot-v8.json`, verifies its pinned SHA-256 and recomputes metrics using the pure `evaluation-metrics.js` functions. No endpoint accepts client-supplied acceptance claims. The source snapshot contains all 98 archived v8 predictions/targets, original IDs, five frozen IDs, provenance hashes, policy and limitations. It is derived from already published research evidence, not new training data.

Regression denominators include expected IDs even when predictions are absent. Duplicate/unknown IDs and invalid numerical values fail closed; null predictions are abstentions. Binary reporting separates probability coverage from classification coverage, preserves null classification scores for complete abstention, and includes abstentions in known-class recall denominators. The fixed-five, full-coverage and minority-size gates are retained. Even a scoped metric gate pass cannot declare full-engine acceptance or establish that deployed weights match evaluated research weights.

The read-only `GET /api/v1/model-evidence` returns 200 for verified evidence and 503 for unavailable/tampered evidence. `/api/v1/phases/status` carries the same report. `/phases-admin` renders all seven engines, the three scoped results, abstention, coverage, provenance context, and data requirements. Unknown scores are not rendered as zero. New evidence text is HTML-escaped; loading failure removes stale evidence from the panel.

Verified archived numbers: cost 82/98 within ±10% (83.6735%), MAPE 5.5187% vs baseline 6.0813%, but higher dollar MAE; duration 12/98 (12.2449%) with unchanged baseline; risk 7 positives, zero classification coverage and null accuracy/recall. Fixed-five results remain 3/5 cost and 0/5 duration. All complete scoped gates fail. Other engines have no evaluation **in this FDOT cycle**; that is not a claim that no earlier research exists.

## Verification

Run `node ACEP/research/evidence-integration-v9/checks.cjs` from the repository root. The 39 scenarios cover numerical/identity failures, missing predictions, majority-class inflation, abstention, source tampering, legacy scores, startup failure/concurrency, downstream planning, actual HTTP route handlers and actual admin-page handlers/rendering. All trainers are stubs; real model fits: zero. A localhost HTTP harness executes the extracted real handlers with dependencies supplied explicitly. It does not launch the entire production server, run browser automation, or validate every unrelated route.

The counterexample is an authored software fixture, not an executed project: raw cost prediction 200 against historical mean100 previously became120, and raw duration40 against mean10 became16; all seven comparisons showed 100% aggregate pass. Now raw outputs remain200/40 and no independent accuracy is claimed. This demonstrates the reporting defect, not an improvement in model field accuracy.

Rebuild the reviewed snapshot only intentionally with `python3 ACEP/research/evidence-integration-v9/build_snapshot.py /path/to/extracted/v8/evidence`. Review the exact resulting hash and update the pinned constant in `model-evidence.js` in the same reviewed change. Do not remove the integrity check to accept a changed file. The v8 evidence bundle and Kaggle run contain the original results; v9 does not rerun their training or tune their test.

Method references: [scikit-learn leakage guidance](https://scikit-learn.org/stable/common_pitfalls.html) and [balanced accuracy definition](https://scikit-learn.org/stable/modules/generated/sklearn.metrics.balanced_accuracy_score.html). Original FDOT publisher: https://www.fdot.gov/construction/constadm/reports . Government publication is not an assertion of Creative Commons licensing.

## Remaining limits

No merge or deployment. No newly trained weights or new independent test. The existing retraining orchestrator, alternate benchmark systems and unrelated heuristic confidence endpoints are outside this change; this is not a claim that every platform score has been corrected. Authentic linked designs, BOQ, dated baseline/actual costs, resources, activity networks, inspection exposure and supplier deliveries for the same five projects are still required for the seven-engine goal. Historical FDOT evidence is not Saudi-price or resource-feasible scheduling acceptance.
