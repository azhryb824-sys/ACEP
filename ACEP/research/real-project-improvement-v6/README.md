# ACEP real-project improvement v6 — FDOT contract forecasts

Research date: 2026-10-19. All model and transformer fitting ran on Kaggle CPU. Local work only downloaded/prepared inputs and independently verified metrics and inference.

**No candidate passes acceptance. No predictor is promoted. The seven-engine, five-project 90% goal remains unmet (0/7 demonstrated).** This experiment evaluates awarded-contract expenditure, recorded Days Used and a single cost-overrun event; it does not validate all functions of the cost, schedule or risk engines.

## Source and scope

Publisher: Florida Department of Transportation, [Cost & Time Reports](https://www.fdot.gov/construction/constadm/reports). Ten publicly available detailed workbooks cover FY2016, 2017, 2018, 2020, 2021, 2022, 2023 Q2, 2024, 2025 Q3 and 2026. These are completed construction contracts. FDOT describes completed contracts as having final estimates and known claims settled and being passed for final payment. These are historical Florida transport works, denominated in USD.

The exact download URLs, retrieval date, sizes and SHA-256 hashes are in the accompanying evidence bundle's `sources/downloads.json`. Government publication is not asserted to be a Creative Commons licence. Preserve attribution and the [FDOT website policies](https://www.fdot.gov/agencyresources/webpoliciesandnotices.shtm).

Only the **Detailed Data** sheets are extracted. Separate PPP and raw staging sheets are excluded. The cost target is the reported **Actual Expenditure (Does Not Include Innovative Contract Adjustment Payments)**, conditional on the original awarded amount including contingency. Duration is recorded **Days Used**, not a calendar finish date. Risk means actual cost exceeds 110% of that original amount.

Audit: 2,981 source rows; 22 invalid/nonpositive/nonfinite/inconsistent rows quarantined; 12 repeated contract rows removed, preserving the earliest report; 2,947 eligible unique contracts. Input features are letting year/month, original amount, contingency fraction, original days, initial amount per day, district and the E/T letting channel. Outcomes, revisions, adjustments, weather/holiday days, report dates and project IDs are excluded from the feature matrix.

## Frozen retrospective evaluation

| Partition | Contracts | Rule |
|---|---:|---|
| Training | 977 | Report end through 2018-06-30 |
| Validation | 494 | Let from 2019-01-01; reported through 2022-06-30; family absent from training |
| Extra final-fit data | 407 | Other eligible reports through 2022-06-30; used after selection |
| Final fitting | 1,878 | Training + validation + extra data |
| Held-out test | 479 | Let from 2023-01-01; reported through 2026-06-30; family absent from final fit |
| Excluded | 590 | Outside windows or removed by family separation |

Family means the first six digits of the primary Financial Project ID. Sixteen validation and seventeen test rows were removed for family overlap. Additional IDs in multi-project contracts are not available, so complete shared-site independence cannot be established. Publication dates and historical revisions are not independently verified. This is report-vintage chronology with a six-month gap, not a prospective experiment. Completed-only sampling favors shorter contracts in recent letting cohorts. FY2019 is missing and FY2023/FY2025 are partial.

Before fitting, five contracts were fixed by the smallest `SHA256("ACEP-FDOT-V6-FIVE|" + contract_id)`: **T5781, T5778, E8U91, T5833, T5777**. Outcomes were not used to select them. A few source rows were inspected to audit the schema before the freeze; model selection did not use test outcomes.

Regression acceptance requires at least 90% of all 479 predictions within ±10% of the recorded target, every fixed contract within ±10%, and full coverage. Risk requires balanced accuracy and overrun recall both ≥90%, at least ten observations in each class, all five classifications correct, and full coverage. These are scoped research gates, separate from full-engine acceptance.

## Candidates and execution

Seventy candidate variants include unchanged estimates, median ratios, district/channel medians, ridge/logistic regression, histogram gradient boosting, extra trees, and nine unique neural configurations. Regression candidates also compare 0.5/1.0 blending with the original estimate and log-Huber/relative-Huber objectives. Validation determines candidate ranking, neural checkpoints, blending and risk thresholds. Selected epochs and thresholds are frozen before one final refit on 1,878 contracts. Selected model hashes are saved before test outcomes are semantically read.

Selected cost model: 64/32 neural, relative-Huber, 15 epochs, full blend. Duration: 32/16 neural, log-Huber, 1 epoch. Risk: 32/16 neural, weighted binary cross-entropy (legacy candidate name ends in `log_huber`), 5 epochs, threshold 0.4.

Kaggle version 10, script version **360166552**, succeeded in **99.7 seconds**; training script runtime **71.06 seconds**. [Verified run log](https://www.kaggle.com/code/aaabbb2026/acep-engines-real-projects-v1/log?scriptVersionId=360166552). Runtime: Python 3.13.15, scikit-learn 1.6.1, torch 2.11.0+cpu. Training source SHA-256: `b93cb9cbf4593642f008dba04153dfaa710cb814ccd6ba8499baab4af462ceb8`.

## Primary test results

| Task / metric | Unchanged / always-no baseline | Selected final-refit model |
|---|---:|---:|
| Cost MAPE | 6.83% | 12.61% |
| Cost within ±10% | 88.73% (425/479) | 68.68% (329/479) |
| Duration MAPE | 28.95% | 25.58% |
| Duration within ±10% | 15.24% (73/479) | 32.78% (157/479) |
| Risk balanced accuracy | 50.00% | 67.72% |
| Risk overrun recall | 0.00% | 63.64% (7/11) |
| Risk Brier score (lower is better) | 0.02296 | 0.13394 |

Cost deteriorates and is rejected. Duration improves against its original-days baseline, but is far below acceptance. Risk discrimination improves while probability error deteriorates; 11 positives among 479 make raw accuracy misleading. The always-no baseline has 97.70% raw accuracy despite zero detection of overruns. Selected risk confusion matrix: TN=336, FP=132, FN=4, TP=7.

| Fixed contract | Cost absolute percentage error | Days Used absolute percentage error | Risk correct? |
|---|---:|---:|---|
| T5781 | 11.94% | 5.46% | Yes |
| T5778 | 12.12% | 21.59% | Yes |
| E8U91 | 33.39% | 7.80% | Yes |
| T5833 | 5.83% | 4.59% | Yes |
| T5777 | 6.23% | 44.61% | No |

Thus 2/5 cost errors, 3/5 duration errors, and 4/5 risk classifications meet their individual checks. None of the three complete gates passes. Results are not directly comparable to v5's Tehran buildings or Australian BOQ lines.

## Posthoc diagnosis — not a replacement acceptance result

After the primary result was seen, inference with the retained pre-refit cost checkpoint yielded 88.31% within ±10% and MAPE 7.17% on the same test, versus 68.68% / 12.61% after refit. The original estimate still performs better (88.73% / 6.83%). This identifies refit instability; it does not justify replacing the frozen result or choosing a model using this now-exposed test. The pre-refit validation within-10% rate was 90.89%, but validation MAPE was 209.03% because of extreme relative errors. This is not a test achievement of 90%.

An earlier exposed v5b test diagnostic separately found only 2/26 time-based BOQ quantities within ±10% (baseline 5/26), versus 89/100 other quantities (baseline 90/100). Those posthoc subsets do not replace the all-lines gate. Resource hours/weeks and physical quantities need distinct prediction definitions and validation.

## Reproduction and evidence

Run from this directory with Python, pandas, numpy, openpyxl, scikit-learn and joblib available:

```bash
python download_sources.py
python prepare_data.py
python build_notebook.py
```

Upload `ACEP_FDOT_v6.ipynb` to Kaggle and execute there. Its compressed payload contains exact source/input hashes and stays under the notebook size limit. `train_kaggle.py` refuses paths outside `/kaggle/working/` and requires `/kaggle/input`; do not emulate those paths locally. Do not run model or transformer fitting locally.

Download `ACEP_FDOT_v6_results.zip`, extract its `results/` into `kaggle-output/`, then verify without fitting:

```bash
python verify_results.py
python diagnose_refit.py
```

The independent verifier checks all ten source hashes, input and artifact hashes, 70 validation metric sets and the ranking, all 479 prediction/label alignments, chronological/family separation, fixed-five selection, metrics and acceptance. It manually checks refit scaler means and reproduces saved-weight inference with `rtol=2e-5, atol=2e-6`. Maximum cost prediction difference was $2.07 on large contracts; duration and probability differences were below 0.00005 days and 0.00000012 respectively. No fitting occurs in verification or diagnosis.

Evidence includes source workbooks, audited inputs, frozen contracts/manifests, all saved models, predictions, learning curves, metrics, independent verification and posthoc diagnostics. These files are kept in the separate evidence archive; this Git directory contains reproducible source only. Re-downloading may retrieve publisher revisions; exact historical reproduction requires the archived source hashes.

## Next acceptance work

Predeclare rolling inner validation for the final-refit policy and seed stability, include severe-tail error and risk calibration in selection, and reserve a genuinely untouched future/source cohort. The v6 test is now exposed and must not become a fresh acceptance set. Obtain linked drawings, physical quantities, actual resource hours, dated costs, dependency/resource schedules, inspections and supplier deliveries for the same five relevant projects before claiming end-to-end seven-engine accuracy. Historical Florida expenditure forecasts do not validate Saudi prices or full schedule optimization. No merge or deployment was performed.
