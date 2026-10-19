# ACEP v7: fixed-budget training and new DSLIB construction projects

Research date: 2026-10-19. **All fitting ran on Kaggle CPU. No model passes the frozen acceptance gate. The seven-engine goal remains unmet (0/7 demonstrated).** These are scoped cost, duration and cost-overrun forecasts, not whole-engine certification.

## Data and provenance

The [Ghent University real-project library](https://www.projectmanagement.ugent.be/research/data/realdata) and the [author's DSLIB repository](https://github.com/MarioVanhoucke/DSLIB-Dynamic-Scheduling-Empirical-Project-Library) provide the source. Cite Batselier & Vanhoucke (2015), *Construction and evaluation framework for a real-life project database*, DOI: 10.1016/j.ijproman.2014.09.004. Release DSLIB v3.4 contains 231 projects. The frozen ZIP SHA-256 is `19f87632c589f5d49f72b5f071992efc6379df2beb35f1efd3a60ac1381dc277`, verified against the publisher's release digest. Public research availability is not an assertion of a Creative Commons or commercial-use licence.

Preparation retains construction projects with publisher-green project and tracking authenticity, positive baseline/final values and reconciled actual costs. It excludes known rescheduled baselines. Green cells may be blank in the workbook. Source colours are the publisher's assessment, not a new field audit.

Of 231 projects, 87 are eligible: 76 development projects in 13 collector/name groups, and 11 held-out 2025-collection projects in two groups. Exclusions: 68 other sectors, 53 without both green authenticity fields, 19 failed workbook reconciliations (17 missing leaf actual costs, two inconsistent totals), four missing/nonpositive baseline or final fields. All 106 examined project workbooks have frozen hashes.

Recent workbook exports omit computed project totals. Their final costs are checked against the sum of WBS leaves. Baseline amounts are retained from the publisher's analysis sheet when the independently computed total is missing; this limitation applies to **all 11 test projects**. Missing actual costs are not filled with zero. Durations are source-reported rounded working days and are not independently calendar-reconciled. Retrospective baseline revision history is incomplete.

Collector-connected and normalized-name-connected projects share a group. Development groups and test groups are disjoint. Development folds contain 44/16/16 projects. Collection years encoded by project IDs are **not project execution dates**, so the test is not established as chronological. Contractor/site independence cannot be fully proved. Test labels are separated, and selected model hashes are saved before semantic test-label loading. Source auditing necessarily reads reported outcomes for completeness/reconciliation; it does not select projects from model errors.

Predictors: planned days, activity and renewable/consumable resource counts, SP/AD/LA/TF network indices, and construction subsector. Cost amount, identities, collection year, collectors and final outcomes are excluded from the predictor matrix. The original cost remains the multiplicative baseline. Currency units are retained as reported; aggregate monetary MAE is not interpreted as a common-currency economic effect.

The second dataset reuses only 1,878 pre-July-2022 development contracts from audited [FDOT reports](https://www.fdot.gov/construction/constadm/reports). Three family-separated report-year folds have train/validation sizes 359/253, 683/277 and 977/223 with a six-month letting gap. Their pooled 753 validation records are development evidence, **not a new independent test**. The previously exposed 479-contract v6 test is excluded from v7 training and evaluation.

## Frozen selection and execution

Each dataset compares 21 cost, 21 duration and six risk variants: **96 variants** total. Candidates include unchanged estimates, constant ratios, ridge, histogram gradient boosting, ExtraTrees and neural residual ensembles. All preprocessing fits only the applicable training fold.

Neural configurations use widths 16/8 or 32/16, zero-initialized outputs, bounded log residuals, SmoothL1 loss, AdamW and 150 or 500 fixed optimizer updates. Three seeds (71357–71359) are averaged. The final fit repeats the selected update budget rather than selecting a new stopping point. Totals: 147 neural fits, 88 sklearn estimator fits and 32 sigmoid calibration fits, excluding preprocessors/constant estimators.

Regression eligibility limits pooled development MAPE and P95 relative error to 105% of the unchanged baseline. Selection maximizes worst-fold within-10% rate, then pooled rate, then minimizes MAPE. Risk uses cross-fitted sigmoid calibration, development-only thresholds and a Brier limit of 110% of the prevalence baseline. These are model-selection scores, not unbiased test estimates.

Kaggle notebook version **11**, script **360173465**, succeeded in **135.4 seconds** (training script 99.13 seconds): [verified run](https://www.kaggle.com/code/aaabbb2026/acep-engines-real-projects-v1/log?scriptVersionId=360173465). Python 3.13.15, scikit-learn 1.6.1, torch 2.11.0+cpu. Training source SHA-256: `6fb149deea3825024377707bd81fcdb10672fbc94e62c4fe128331faa111f66a`.

## Results on the 11 new held-out projects

| Task | Selected recipe | Selected result | Unchanged/no-overrun baseline |
|---|---|---|---|
| Cost | Median cost ratio | MAPE 5.1261%; 9/11 within 10% (81.8182%) | MAPE 3.0809%; 9/11 within 10% |
| Duration | Ridge alpha 100, 50% blend | MAPE 17.9672%; 6/11 within 10% (54.5455%) | MAPE 18.3825%; 5/11 within 10% |
| Cost-overrun risk | Logistic C=1, calibrated, threshold 0.13 | Balanced accuracy 50%; raw accuracy 9.0909%; Brier 0.148464 | Balanced accuracy 50%; raw accuracy 90.9091%; Brier 0.090909 |

Risk marks all 11 projects positive: one true positive and ten false positives. Recall of 100% is based on **one positive** and is not a success claim. ROC AUC is zero. The selected cost candidate is worse than the original estimate on MAPE. Duration improves the within-10% count by one but worsens MAE (13.52 vs 13.18 working days), P95 (48.02% vs 44.25%) and maximum error (59.40% vs 47.19%). This is mixed performance, not general improvement.

The five projects were frozen by the smallest SHA-256 of `ACEP-DSLIB-V7-FIVE|project_id`: C2025-02, C2025-01, C2025-19, C2025-21, C2025-07. Four of five meet the cost error check, three of five the duration check, and zero of five risk classifications are correct. All five happen to be actual non-overruns; the selection used no outcomes.

Acceptance requires at least 90% of all test predictions within 10%, all five individual checks and full coverage. Risk additionally requires balanced accuracy and overrun recall of at least 90% with at least ten examples of **each** class. All three gates fail. The sample of 11 cannot satisfy the risk class-size requirement; it was never weakened.

FDOT development selection chooses ridge cost (88.18% within 10%, baseline 83.93%), neural duration (28.82%, baseline 15.80%) and logistic risk (59.71% balanced accuracy). Cost MAPE remains **146.43%**, versus 146.13% baseline. Contract E6M90 reports actual expenditure 1,725 against original 1,818,000 and a prediction of 1,835,758; source investigation is needed before changing its inclusion. The extreme observation remains in the published metrics. P95 controls do not solve every tail error. No independent FDOT acceptance or final-refit stability proof is claimed.

## Reproduction and independent verification

1. Place the v7 evidence bundle's `data/`, `sources/` and `kaggle-output/results/` under this directory. For fresh source preparation, run `download_sources.py`, then `prepare_data.py`; the latter additionally needs the v6 evidence data in sibling `real-project-improvement-v6/data/` (scratch fallback `real-projects-v6/data/`).
2. Run `build_notebook.py` locally; it performs no fitting and embeds exact hashed inputs below Kaggle's source limit.
3. Upload the notebook to a private Kaggle notebook and run there. `train_kaggle.py` refuses non-Kaggle working paths.
4. Extract the results ZIP to `kaggle-output/`, then run `verify_results.py` locally. Dependencies for preparation/verification: numpy, pandas, openpyxl, joblib and scikit-learn. Use the recorded Kaggle versions for training reproduction.

Verification checks source/input/artifact hashes, fold IDs and separation, all 96 development metric sets/eligibility/rankings, frozen-five selection, label alignment, test metrics, baselines and acceptance. Selected DSLIB inference is reconstructed from frozen arrays/coefficients with NumPy; all three maximum differences are **0.0**. Local sklearn's imputer format differs from Kaggle's, so inference avoids version-dependent transformer methods. CSV predictions use round-trip float parsing to preserve cases exactly on the 10% boundary. No local `.fit` occurs.

The evidence bundle contains data, source workbooks, attribution, model weights, predictions, curves, hashes and verification records. Reproducible source lives in this repository. The newly exposed 11-project cohort is now a historical test and must not be reused as untouched acceptance after tuning. Next work needs development-only source investigation/tail safeguards, more overrun cases, a fresh independent cohort and linked drawings/quantities/resources/inspections/supplier outcomes for the same five projects. No model promotion, merge or deployment is included.
