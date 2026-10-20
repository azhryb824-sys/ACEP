# ACEP v13: time-aware real building cost study

This research cycle extends v12 with official 2022, 2023 and 2025 Florida
Department of Education reports. The task remains **retrospective nominal-USD
construction-contract cost from reported building characteristics**. It is not
a tender-time forecast, a Saudi quotation, total plant cost, or validation of
all seven engineering engines. Training and all fitted preprocessing run on
Kaggle only. Local work is data extraction, checks and frozen-weight inference.

## Source audit

The 16 original official publications cover every year from 2010 through 2025.
The [official index](https://www.fldoe.org/finance/fco/cost-of-construction/public-schools.stml)
links the 13 workbooks previously audited in v12 and three additional PDFs:
[2022](https://www.fldoe.org/file/7742/22CostConst-PS.pdf),
[2023](https://www.fldoe.org/file/7742/23CostConst-PS.pdf), and
[2025](https://www.fldoe.org/file/7742/25CostConst-PS.pdf).
Original bytes, URLs and SHA-256 hashes are retained. Attribution: FDOE; no
Creative Commons license is inferred from public availability.

The additional PDFs contain 28, 46 and 65 all-schools rows respectively.
Repeated type-specific summaries are not new projects. MuPDF and pdfplumber
independently agree on 1,251 numeric cells. The parser normalizes the unusual
2022 PDF MediaBox origin, preserves wrapped facility names, and records each
cell's page and coordinates. The source's abbreviated names are preserved.

Across all years: 743 source rows, one exact duplicate removed, nine invalid
rows rejected, 733 eligible records. Thirteen further records are excluded for
facility-group overlap, leaving 610 development (2010–2023), 46 calibration
(2024), and 64 final evaluation records (2025). The rejected cases have missing
or nonpositive gross area/target, or net area exceeding gross area. There is no
cost-outlier exclusion. 387 nonduplicate eligible records have quality flags;
this is not a claim that every source field is correct. Missing fields remain
missing. All PDF project scopes are `unverified`, because reliable scope
membership was not extracted from their repeated summary tables.

Facility matching uses normalized district/name plus a conservative 0.90
string-similarity threshold for names with at least 12 characters. This can
overmerge facilities and cannot prove parcel/site/contractor independence.
Temporal folds validate on 2021, 2022 and 2023, with 54, 26 and 44 validation
records. Training groups overlapping the validation groups are purged.

## Selection and acceptance

Five distinct 2025 facility groups are fixed by SHA-256 order of
`ACEP-FDOE-V13-FIVE|project_id`, not by their costs, errors or ease of prediction.
IDs: PDF-049, PDF-046, PDF-012, PDF-018 and PDF-038, all prefixed `FDOE-2025-`.

The 2025 source table was visible during source discovery/auditing before the
protocol was frozen. It is **not an externally blinded study**. The code
separates the test targets and does not load them for fitting, candidate
selection or calibration. Model selection and final blind predictions are
hashed before the script opens test labels. These are auditable application
records, not third-party timestamping. Exposed evaluation results cannot be
reused as fresh evidence after subsequent tuning.

Forty-seven fixed base recipes and two geometric ensembles are compared on the
same 124 development-fold predictions. Families include median baselines,
Ridge/Huber regression, ExtraTrees, boosted trees and small neural networks.
Extensions include five-year windows, recency weights and bounded robust
training-year trends. The trend is a median of pairwise slopes of annual log
unit-cost medians over up to six recent years, clipped to [-0.05, 0.15]. It
captures time and project-mix effects jointly; it is **not a verified inflation
index**. Neural extensions use widths 32/64 and 2,000/5,000 updates with three
distinct seeds, Huber loss, bounded residuals and gradient clipping.

Candidate selection: within-10% fraction descending, then MAPE ascending, then
name. The two ensembles combine the top three or top five base recipes by the
geometric mean, again ranked using development predictions only. The selected
recipe is refitted on development only; 2024 calibrates intervals and 2025
scores the frozen model. Eleven nonmonetary predictors exclude fees, prices,
unit costs, target, facility name and identifiers. Reported/as-built inputs are
not demonstrated to have been available at contract award.

Acceptance requires all of: at least 90% of all eligible test predictions
within ±10% of actual cost; all five fixed projects within ±10%; complete
prediction coverage; and MAPE/P95 no worse than the median baseline. Missing
predictions are failures. `1 - MAPE` is never labeled accuracy. Interval
coverage is a separate metric and carries no temporal exchangeability guarantee.

Version 16 was stopped after an exact duplicate 2023 source row and repeated
neural seed were discovered in integrity checks, before viewing performance
outputs. The corrected study removes that development-only duplicate and uses
seeds 82025, 82026, 82027. Test targets, five IDs, candidate families and
acceptance rule are unchanged. `repair_decision.json` records this decision;
the cancelled run is not accepted evidence.

The previous v12 selected model's 64 predictions were separately sealed without
loading 2025 labels for a secondary paired comparison. Any difference reflects
both the data and model changes; it is not an isolated causal architecture test.

## Reproduction

Research source is retained in this directory. The evidence ZIP supplies
`sources/`, `data/`, PDF extraction records, hashes, trained model JSON and
predictions. No production import, deployment or main-branch change is made.

```bash
python download_sources.py  # pinned original bytes only
python extract_pdf.py       # two independent numeric extractors
python prepare_data.py      # no fitting; fixed cohort and protocol
python check_data.py        # extraction/split/leakage regressions
python build_notebook.py    # creates a private-upload Kaggle notebook
```

Upload the notebook to Kaggle and use Save & Run All. Do not run the trainer
locally; its guard rejects execution before ML imports. Download the completed
result ZIP into `kaggle-output/`, then run `python verify_results.py` locally.
This independently recalculates candidate rankings, metrics and gates, checks
all transport/source/result hashes and event ordering, and reproduces frozen
JSON predictions without fitting. Replaying an exposed study is reproduction,
not a new independent evaluation. The evidence archive includes `verification.json`, `paired_comparison.json` and
`REPORT_AR.md`. They record the completed run and the unmet overall goal.


## Verified version 17 result

Private Kaggle version 17 (`360254779`) completed in 338.5 seconds; the training
script took 298.81 seconds. All fitting was on Kaggle CPU. The selected
`ensemble_top3` achieved 16/64 (25%) within ±10%, MAPE 34.51%, P95 error 86.28%
and 2/5 fixed projects passing. The original median baseline achieved 0/64,
MAPE 53.98% and P95 82.50%. The tail-error and acceptance gates failed.

A separate paired comparison of the previously frozen v12 model on these same
64 records gives 3/64 (4.69%), MAPE 47.64%, P95 77.34%. Thus typical error and
within-10% count improved, while severe errors worsened. The change cannot be
attributed to architecture alone because data and recipes both changed.

Independent verification reconciled 720 retained source rows, recomputed all
49 candidate metric sets/ranking, checked hashes and split/event order, and
reproduced all 64 test and 46 calibration predictions from JSON weights without
fitting. 126 native/export comparisons had maximum relative difference 1.119e-6.
Browser download notifications incorrectly reported failure/timeouts; complete
archives nevertheless arrived and passed CRC plus submitted transport hashes.

[Successful Kaggle run](https://www.kaggle.com/code/aaabbb2026/acep-engines-real-projects-v1/log?scriptVersionId=360254779)
requires the authorized Kaggle account. No production promotion, merge or
deployment occurred. **The user's seven-engine 90% requirement remains unmet.**
The 2025 cohort is exposed and cannot be reused as a new independent holdout
after tuning. `remaining_evidence.json` specifies the missing project-linked
labels for each engine.
