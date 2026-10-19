# ACEP v8 — award-time feature ablation and reliable training outcomes

Research date: 2026-10-19. All model/transformer fitting ran on Kaggle CPU. **No acceptance gate passes; the seven-engine goal remains unmet (0/7 demonstrated).** The application training-status repair is documented separately under `research/training-status-v8/`.

## What changed

V7 exposed model-selection instability, excessive false alarms and extreme source values. V8 compares the earlier FDOT feature set against additional explicitly labelled award-time fields: `DOT Original Estimate`, awarded-amount/estimate ratio and `Innovative Contract Type`. Current/payment/adjustment fields remain excluded from predictors. Historical version availability of the original fields cannot be independently established.

Regression selection now defaults to the original estimate unless a candidate improves pooled within-10% rate by at least one percentage point without worsening MAPE/P95 and with maximum error no more than 105% of baseline. Eligible candidates are ranked by worst-fold within-10%, pooled rate and MAPE. Risk selection requires specificity ≥80%, recall ≥50%, precision ≥max(10%, twice development prevalence), balanced accuracy >50% and Brier no worse than the prevalence baseline. Thresholds are selected on development predictions only. If no candidate qualifies, the result contains a research prevalence probability and **no risk class**, with classification coverage zero and `requires_review`.

These constraints govern candidate selection, not claims of guaranteed behavior on new projects. The ≥90% frozen acceptance rules remain separate and unchanged in substance.

## Source and previously unused cohort

Source: [FDOT Cost & Time Reports](https://www.fdot.gov/construction/constadm/reports), exact source URLs and SHA-256 hashes in `data/sources.json`. Government publication is not an assertion of Creative Commons licensing. Preserve FDOT attribution.

The v6 audited corpus already included records excluded from its training/test windows. V8 freezes **98 of those previously unused contracts**, let July–December 2022, whose primary financial families are absent from **all** earlier-used FDOT partitions, including the old test. These rows were read during source auditing; they had not been model-fitted or model-evaluated in v6/v7. They are not newly collected external data, and labels were not selected by model error.

Development is limited to **1,612** contracts reported through June 2021, leaving more than a year before new-test letting. The 266 June-2022-report contracts in the v7 development pool are excluded by this predeclared temporal cutoff, not by model error. Consequently, improved development MAPE relative to v7 cannot be attributed to model changes alone. E6M90 is outside v8 training/evaluation for that same cutoff; it remains in the source-audit diagnostic.

Three financial-family-purged folds have training/validation sizes 359/79, 683/202 and 977/212 (493 pooled validation records). The five test contracts were fixed before fitting by the smallest SHA-256 of `ACEP-FDOT-V8-FIVE|contract_id`: **E1V05, T1847, T2890, T2880, T2902**. Source release dates, all secondary financial identities and complete contractor/site separation remain unverified. Only completed contracts are represented; recent letting cohorts favor shorter completed contracts.

Source-quality checking flags four missing positive DOT estimates (training-only median imputation) and E6M90's extreme final-expenditure/CRS-payment discrepancy. That contract reports final expenditure 1,725, CRS payment 1,615,532 and after-CRS amount −1,615,532. Their accounting scopes differ and do not prove a replacement target. **No source label is corrected by inference, and no row is removed by a quality-score rule.** The audit field `excluded_from_primary_metrics: false` means the quality flag itself excludes nothing; E6M90 is separately outside the temporal cohort.

Additional research downloaded [39 New Zealand transport projects](https://data.mendeley.com/datasets/m74jb8smwz/1), Love, Matthews & Ika (2024), DOI 10.17632/m74jb8smwz.1, CC BY 4.0. The 39×11 SPSS file lacks a separately recorded initial cost baseline and verified feature-availability dates. It is included for provenance/schema review but **not used for fitting or acceptance**. No initial estimate is reconstructed from final cost and the overrun label as an input feature.

## Kaggle execution

[Version 12, script 360178385](https://www.kaggle.com/code/aaabbb2026/acep-engines-real-projects-v1/log?scriptVersionId=360178385) succeeded in **100.2 seconds**; the training script took **64.09 seconds**. Python 3.13.15, scikit-learn 1.6.1, torch 2.11.0+cpu.

There are **61 candidate variants** (22 cost, 22 duration, 17 risk), **72 neural fits** and **61 sklearn estimator fits**, excluding preprocessing and constant estimators. Neural configurations use 16/8 or 32/16 hidden units, 150 or 500 fixed updates, bounded residuals, zero-initialized output, AdamW and three seeds. Selection/refitting and preprocessing occur on Kaggle only. Final model hashes are saved before semantic test-label loading.

Training source SHA-256: `1f440aeec3c869b1a1f5e9a8dfd1c7f0b1751bf937cecdcf696b15a0473d73c5`.

## Frozen test results

| Task | Selected result | Baseline | Decision |
|---|---|---|---|
| Cost, ExtraTrees leaf 30, original features | MAPE 5.5187%; 82/98 within 10% (83.6735%); MAE $274,620.97 | MAPE 6.0813%; 82/98 within 10%; MAE $261,046.18 | Fails acceptance; mixed improvement |
| Days Used, unchanged original estimate | MAPE 33.2965%; 12/98 within 10% (12.2449%) | Identical | No learned duration candidate passed selection |
| Cost-overrun risk, prevalence only | Brier 0.066440; no classification; zero classification coverage | Same prevalence probability | Requires review; no accuracy claim |

Cost P95 improves from 15.0004% to 14.8551% and maximum error from 41.6436% to 35.8946%, but monetary MAE worsens and the within-10% count does not improve. Additional award fields do **not** win selection. Development cost reaches 91.48% within 10%; this is not test acceptance.

The highest-within-10% duration candidate on development (`base::hist`, 35.29%) is rejected because P95 rises to 73.19% versus baseline 60.04%, and maximum relative error also exceeds the guard. No rejected candidate is evaluated on the 98-contract test as a replacement result.

Risk development has only 14 positives among 493 validation records. No candidate meets all alert constraints. Test has seven positives and 91 negatives. An always-negative decision would show 92.86% raw accuracy but zero recall; V8 does not report that as model success. Risk test accuracy, balanced accuracy, recall and confusion matrix are null because the selected procedure abstains from every classification. The class-size gate also requires at least ten positives.

The fixed-five checks pass 3/5 cost, 0/5 duration, and no risk classifications are issued. Cost errors: 3.54%, 5.03%, 1.09%, 35.89%, 13.48%. Duration errors: 49.78%, 47.37%, 62.12%, 43.40%, 24.47%. All complete acceptance gates fail. These are contract expenditure/Days Used/single cost-overrun tasks, not whole-engine or Saudi-price validation.

## Verification and reproduction

`verify_results.py` independently checks nine original workbook hashes, the prior audited-input hash, all prepared-input/result hashes, exact fold IDs/financial-family separation, exclusion of prior-used contracts, all 61 development metric sets/eligibility/thresholds/rankings, fixed-five selection, test label alignment, baselines and gates. NumPy inference from the frozen tree/transform arrays reproduces cost predictions to less than $0.000000001; duration and risk differences are zero. No local fitting is performed.

Place this evidence bundle's `data/`, `sources/` and `kaggle-output/` beside the scripts. `sources/fdot-v6/` carries the nine needed source workbooks and previous audited input. `prepare_data.py` also supports a sibling v6 research directory. Run preparation only when intentionally rebuilding inputs; the frozen data are already provided. Run `build_notebook.py`, upload `ACEP_v8.ipynb` privately to Kaggle and execute there. Extract `ACEP_v8_results.zip` to `kaggle-output/`, then run `verify_results.py` locally. Python preparation/verification dependencies: numpy, pandas, openpyxl, joblib, scikit-learn; pyreadstat is only needed to inspect the optional NZ file.

The 98-contract test is now exposed and cannot be relabelled as a fresh test after tuning. Further progress needs richer execution/resource information and more independently documented overrun cases, with fresh acceptance cohorts and linked evidence across all seven engines for the same five projects. No model promotion, merge or deployment is included.
