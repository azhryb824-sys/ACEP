# ACEP v12: real school construction cost research

Status: completed on Kaggle, independently verified, **research only; acceptance failed**. No production model, serving code, or main-branch behavior is changed by this directory.

This is a new, narrowly defined task: retrospective estimation of nominal USD **construction contract cost** from reported Florida public-school building characteristics and the completion-reference year. Historical design revisions are unavailable, so features can reflect as-built outcomes. This is not an award-time forecast, a Saudi quotation, total plant cost, or validation of all seven ACEP engines. It is a different task and dataset from the earlier transport-project experiments; their percentages are not directly comparable.

## Data and frozen protocol

Source: [Florida Department of Education, Public Schools Cost of Construction](https://www.fldoe.org/finance/fco/cost-of-construction/public-schools.stml). Thirteen official Excel workbooks cover 2010–2021 and 2024. `sources_manifest.json` pins original URLs, file sizes and SHA-256 digests. Official publication does not declare a Creative Commons license. Attribute FDOE; the evidence package retains the original bytes for research reproducibility.

The audit found 604 source records, 596 eligible records, eight rejected records and no exact duplicates. Four records lack a positive gross area; four have net area greater than gross area. Another 250 records carry quality flags, mainly missing classroom counts or unverified project scope; missing values are not replaced with invented zeroes. Two eligible records are excluded to remove normalized district/facility-group overlap between partitions.

| Partition | Years | Records |
|---|---|---:|
| Development | 2010–2020 | 492 |
| Calibration | 2021 | 56 |
| Final test | 2024 | 46 |

Temporal development folds validate on 2018, 2019 and 2020, with training/validation sizes 378/40, 415/42 and 459/32. Facility groups are purged between training and validation and between held-out partitions. This does not establish parcel, site or contractor independence. Missing 2022/2023 workbooks leave a material temporal gap.

The eleven inputs are year, gross/net ft², students, teachers, three classroom counts, school type, project scope and district. Derived transformations include net/gross ratio. Monetary fields, unit costs, fees, plant/facility totals, funding codes and facility name/ID are excluded from predictors. Project scope is matched from the official new-construction/addition sheets; unmatched scope stays `unverified` (95 development, 0 calibration, 14 test). The outcome remains USD and area remains ft²; no currency conversion is performed.

`frozen_contract.json` records the scope, features, split, selection rule and acceptance gates. Five distinct facility groups were fixed before fitting by sorting SHA-256 hashes of `ACEP-FDOE-V12-FIVE|project_id` and retaining the first five distinct groups. Test labels were parsed for data validity and stored separately; they were not used to fit or select candidates. The final model and all blind test predictions were hashed before the training script loaded the test labels for scoring. These are auditable application records, not an independent timestamping service.

## Training and export

All fitting, including preprocessing, took place on **Kaggle only**. Local work was source acquisition, data preparation, packaging, syntax validation and frozen-weight inference/verification; local fits: **0**.

Eighteen recipes were compared using pooled temporal validation predictions: three median baselines, three Ridge penalties, Huber regression, three ExtraTrees leaf settings, four gradient-boosting settings and four small neural-network settings. Neural recipes use widths 16/32, 400/1000 fixed updates and three seeds each, with bounded log-unit-rate residuals, Huber loss and gradient clipping. Fold-only preprocessing uses log transformations, median imputation, scaling, missing-value indicators and training-category one-hot encoding.

Selection ranks within-10% rate descending, then MAPE ascending, then candidate name. It uses the 114 temporal validation predictions per recipe, not calibration or test outcomes. `extratrees_leaf5` won (35/114 within ±10%, MAPE 34.27%). The final selected and baseline models were fitted only on the 492 development records. Counts across folds and final fitting: 36 neural fits, 34 scikit-learn fits, 46 preprocessor fits and 10 median fits. These are execution counts, not counts of distinct architectures.

Models are exported to JSON and predicted by `model_runtime.py` using NumPy. Forty-six native/export checks passed; maximum relative prediction difference was 1.004e-6, below the 5e-6 check threshold.

Kaggle run: private notebook, version **15**, script version **360227284**, successful in **83.0 s** (training script: 46.93 s). Runtime: Python 3.13.15, NumPy 2.1.3, scikit-learn 1.6.1, PyTorch 2.11.0+cpu. [Verified run output](https://www.kaggle.com/code/aaabbb2026/acep-engines-real-projects-v1/output?scriptVersionId=360227284). Access requires the authorized Kaggle account. Submitted notebook SHA-256: `84519c93cabf3c5943ceb83cef22cdfd94509f23783bfb5bfcb2898ba137a5b2`.

## Unseen 2024 results

| Metric (46 records) | Global median baseline | Selected ExtraTrees |
|---|---:|---:|
| Predictions within ±10% | 0/46 (0%) | **4/46 (8.70%)** |
| MAPE, lower is better | 53.02% | **38.85%** |
| Median absolute percentage error | 54.70% | 38.58% |
| 95th-percentile absolute percentage error | 73.28% | 63.07% |
| Maximum absolute percentage error | 96.26% | **158.63%** |
| Mean absolute error, USD | 10,794,716 | 8,754,097 |
| Prediction coverage | 46/46 | 46/46 |

Average error improved, but the worst error increased. **8.70% is the observed within-10% success rate; 100% minus MAPE must not be labeled accuracy.**

| Frozen project ID | Facility | Actual USD | Predicted USD | Absolute error |
|---|---|---:|---:|---:|
| FDOE-2024-028 | Coconut Palm K-8 Academy #01986000 | 4,489,722 | 2,619,108 | 41.66% |
| FDOE-2024-041 | Luminary MS | 58,719,572 | 30,627,500 | 47.84% |
| FDOE-2024-033 | James E Plew Elementary School | 4,898,630 | 3,425,713 | 30.07% |
| FDOE-2024-026 | Alonzo and Tracey Mourning shs | 11,728,073 | 7,027,281 | 40.08% |
| FDOE-2024-029 | Sebastian River Middle School | 7,241,911 | 5,058,726 | 30.15% |

All five failed the ±10% requirement. Acceptance also requires at least 90% of the full test within ±10%, full prediction coverage, and no worse MAPE/P95 than baseline. **Acceptance failed; no production promotion.** No claim of seven-engine 90% performance is established.

The 2021 calibration set produced a nominal 90% split-conformal multiplicative interval using the finite-sample 52nd ordered absolute log residual out of 56. Actual 2024 interval coverage was **34/46 = 73.91%**, and median interval width was **136.26% of the prediction**. Temporal exchangeability is not guaranteed. Interval coverage is separate from point-estimate accuracy.

## Verification and interpretation

`verify_results.py` independently verifies all recorded input/output/transport/source hashes, reconciles 594 retained records to original spreadsheet cells, checks all 18 candidate metrics and their ranking, checks temporal/facility separation and five-project selection, reproduces all 46 test and 56 calibration predictions without fitting, and checks calibration, metrics, gates and event/hash ordering. `verification.json` records success and zero local fits.

Post-hoc analysis, not used for selection, found median reported USD/gross-ft² of 151.39 in development, 222.94 in calibration and 330.36 in test. Project mix also differs. This describes distribution shift; it does not isolate inflation or prove causation. Do not rescale by test-observed costs or tune against these 46 records and then call them unseen again.

The next research cycle needs a new frozen holdout and better time/scope coverage: obtain and audit intermediate-year records, independently sourced price indices with explicit availability dates, and original tender/design fields if the intended use is pre-award estimation. Construction quantities, schedules, risks, inspections and supplier outcomes need their own real labels; this cohort cannot validate those engines. New recipes must be selected on development folds before any new holdout scoring.

## Reproduction

Files here are the research implementation, not production adapters. The separate `ACEP_Real_Building_Cost_v12_Evidence.zip` contains `real-v12/sources/`, `data/`, `kaggle-output/`, `verification.json`, `posthoc_diagnostics.json`, run provenance and a SHA-256 evidence inventory. Original source workbooks and result weights are evidence artifacts; code is retained in this Git directory.

Place those evidence directories beside these scripts. Reading Excel requires pandas, openpyxl and xlrd; verification also requires NumPy. The tested training versions are recorded above. From this directory:

```bash
# Optional source re-fetch; pinned hashes reject a silently changed publication.
python download_sources.py
# Data preparation only; checks the frozen study contract.
python prepare_data.py
# Package prepared data and runtime scripts; no local fitting.
python build_notebook.py
```

Upload the generated notebook privately to Kaggle and execute it there. The notebook packages 16 text files (prepared data and runtime source), verifies their hashes and launches `train_kaggle.py`. All fitting routines are guarded for the Kaggle environment. Download `ACEP_v12_results.zip` through the Kaggle interface and extract it into `kaggle-output/`, then verify without fitting:

```bash
python verify_results.py
```

A replay is reproduction of an exposed experiment, not a new blind evaluation. Small numerical differences may occur with different library/runtime versions; keep the archived original result as the record of this run.
