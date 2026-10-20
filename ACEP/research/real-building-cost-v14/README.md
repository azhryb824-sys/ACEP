# ACEP v14: source scope repairs and external price normalization

Research only. This cycle builds on the already completed v13 study at
`7df8e4c4793b053ae612dec7a1b339a512788221`. It does not modify a production
predictor or approve deployment. The user's seven-engine 90% requirement is
still an outstanding goal.

## Why this change

v13 improved typical cost errors but worsened severe errors. All PDF rows had
unverified project scope, although their source PDFs include explicit
new-construction and type-of-addition tables. Some reported classroom counts
also appear implausible. v13's learned time trend combined price and project
mix; it was not an independent inflation index.

This cycle repairs traceable scope metadata, preserves suspicious numeric
fields while comparing models that omit them, tests an external school-price
index, and adds a validation tail-error constraint to candidate selection.

## Sources and data integrity

The 16 original [FDOE publications](https://www.fldoe.org/finance/fco/cost-of-construction/public-schools.stml)
cover 2010–2025. Source bytes and hashes are inherited unchanged from v13.
Read the adjacent v13 README for the 743-row audit, one duplicate removal,
nine rejected records and facility-group purging. The final partitions remain
**610 development, 46 calibration, 64 diagnostic evaluation records**.
All target bytes, row order, facility groups, temporal folds and the five
previously selected project IDs remain unchanged. No cost outliers are removed.

`prepare_data.py` reads explicit PDF tables headed `NEW CONSTRUCTION` or
`TYPE OF ADDITION`. It matches year, school type, district, student stations,
net area and gross area; it never matches using prices or target values.
Matching must resolve to one normalized facility identity. Multiple conflicting
scope memberships stay unverified. Absence from a new-construction table is
never interpreted as proof of an addition.

The source audit checks 426 numeric cells with both MuPDF and pdfplumber and
retains page coordinates and original strings. It repairs **96 retained scopes:
38 development and 58 diagnostic rows**. Six PDF project IDs have conflicting
memberships and remain unresolved. Eight retained records have a classroom
count greater than half their positive student capacity. This heuristic only
flags uncertainty; it does not establish which source value is wrong and does
not overwrite a numeric field or target.

The external series is [BLS New School Building Construction, PCU236222236222,
via FRED](https://fred.stlouisfed.org/series/PCU236222236222).
[BLS methodology](https://www.bls.gov/ppi/factsheets/producer-price-index-data-for-nonresidential-building-construction-sector-new-school-building-construction-naics-236222.htm)
describes a national output-price measure for new K–12 schools. It is not a
Florida-specific series or an independently validated index for additions.
The original FRED observation HTML is pinned in `index_source_manifest.json`;
192 months from 2009–2024 supply prior-calendar-year annual means for projects
dated 2010–2025. No month from a project's own year is used. Values are the
current revised vintage downloaded on 2026-10-20; this is **not** an archival
point-in-time backtest or proof of tender-date information availability.

## Frozen experiment

`protocol.json` was written before v14 fitting or evaluation. Thirty-five
fixed recipes consist of three median baselines and eight model settings
crossed with full/compact inputs and raw/PPI-normalized outcomes. Model settings
are Ridge 10/100, ExtraTrees leaf 5/15, depth-two Huber/absolute-loss boosting,
and width-32/64 small neural networks with 2,000 updates and three distinct
seeds (82026–82028). Compact recipes retain year, gross area, net/gross ratio,
school type, scope and district while omitting capacity/classroom fields.

PPI recipes fit log cost-per-area residuals after division by the previous
year's index/100, and restore the index factor at inference. All preprocessing
is fitted on each training fold only. All fitting runs on Kaggle; local work
is extraction, syntax checks and frozen-weight verification.

Selection uses the unchanged 2021/2022/2023 temporal folds (124 pooled
validation rows). A candidate must have MAPE and P95 absolute percentage error
no worse than the global-median baseline on these validation predictions.
Among eligible candidates, rank within-10% rate descending, MAPE ascending,
then name. The baseline itself is an eligible fallback. This development
constraint does not guarantee tail performance on later data.

The chosen model is fitted on development only. 2024 calibrates multiplicative
intervals; 2025 is evaluated only after current-run model/prediction hashes are
recorded. The v13 frozen model is evaluated on its original features, and its
64 predictions must match the archived v13 predictions. This is a paired
comparison with stable labels and denominator; its total change does not
isolate an architecture effect.

## Evaluation boundary

**The 2025 outcomes were exposed during v13. They are diagnostic only.** This
cycle does not have a new independent holdout. Calendar matching, repeated
scoring, a fixed five-project list or computational label separation cannot
restore blindness. Even if numerical 90% gates pass, independent acceptance,
full-engine validation and production promotion remain false.

The task remains retrospective nominal-USD contract cost estimation from
reported/as-built school features. It does not cover pre-award cost forecasts,
Saudi pricing, total plant cost, quantities, schedule, risk, inspections or
supplier performance. Numerical diagnostic gates retain at least 90% of all
64 predictions within ±10%, all five fixed projects within ±10%, full coverage
and MAPE/P95 no worse than the median baseline. Never label `1 - MAPE` accuracy.
Interval coverage is separate and has no temporal exchangeability guarantee.

## Reproduction and evidence

Code is versioned in this directory and the adjacent v13 research directory.
The evidence archive contains data/source/result artifacts, not a duplicate
code repository. Restore its `real-building-cost-v13` and
`real-building-cost-v14` contents into the corresponding Git directories.
For the original scratch layout, adjacent `real-v13` is also accepted.

```bash
python download_price_index.py  # verifies the pinned source; rejects a new vintage
python prepare_data.py         # metadata/index preparation only; no fitting
python build_notebook.py       # private-upload Kaggle notebook; no fitting
```

Run the notebook using Kaggle Save & Run All. Download its result archive to
`kaggle-output/`. Do not run the trainer locally; it rejects execution outside
`/kaggle/working/` before importing ML libraries. Verify without fitting:

```bash
python verify_results.py
```

The verifier checks source/input/output/transport hashes, 192 index months,
unchanged cohort and labels, scope-cell reconciliation, all candidate metrics
and tail-constrained ranking, JSON predictions for calibration and diagnostics,
the prior model comparison, intervals, five-project gates and event ordering.
Hashes/events are application records, not independently trusted timestamps.

Source attribution: FDOE and BLS via FRED. FDOE public availability does not
declare a Creative Commons license; preserve attribution and original bytes.
Current-vintage index changes must start a separate study, not silently replace
the pinned input. A future acceptance run needs genuinely independent projects
with scope-matched, dated evidence. Other engines need their own project-linked
ground-truth labels; this cost cohort cannot validate them.


## Verified v14 outcome — Kaggle version 18

The private Kaggle run `360430541` completed successfully in **295.2 seconds**
(UI), with 262.13 seconds recorded by the trainer. Its frozen selection was
`full_ppi_forest5` (ExtraTrees leaf 5, full inputs, lagged PPI normalization).

| Same 64 diagnostic projects | v13 | v14 |
|---|---:|---:|
| Within ±10% | 16/64 (25.00%) | 19/64 (29.69%) |
| MAPE | 34.51% | 37.15% |
| Median APE | 23.11% | 23.80% |
| P95 APE | 86.28% | 90.95% |
| Maximum APE | 275.32% | 342.36% |
| Mean absolute error (USD) | 6,848,682 | 6,768,718 |
| Fixed five projects within ±10% | 2/5 | 4/5 |

**Decision: retain this research, do not promote v14.** The gain in within-10
rate and absolute-dollar error is accompanied by worse MAPE, median, P95 and
maximum percentage errors. Numerical diagnostic gates fail; the lack of an
independent holdout also prevents acceptance. Nominal 90% intervals cover only
46/64 (71.88%). All seven engines' 90% requirement remains unestablished.

`analyze_errors.py` is a post-evaluation diagnostic only. It finds 31 lower and
33 higher per-project errors versus v13; seven projects enter the ±10% band
and four leave it. Three errors exceed 100%, versus two before. The selected
model passed the frozen validation MAPE/P95 constraint but had a validation
maximum APE of 708.51%, versus 283.33% for the baseline. P95 does not constrain
the worst fewer-than-5% cases. This is a limitation of the frozen rule, not a
reason to revise selection after scoring the diagnostic set.

The largest diagnostic failures include two additions and one unverified-scope
record. One addition reports 756,979 gross ft² and 71,395 net ft²; another has
reported contract cost of $822,037. These are observed source fields, not proof
of erroneous inputs. Reconcile building area and contract scope with original
project documents before changing any values. No post-result model retuning,
source correction inferred from error, or additional candidate evaluation was
performed.

Independent verification passed: all 16 source reports and 192 index months;
96 scope changes and 387 retained-row scope-cell rechecks; all 35 candidate
metrics and the frozen ranking; 64 new, 46 calibration and 64 prior frozen
predictions. The extraction audit's 426 checks includes source rows outside the
retained partitions. Kaggle recorded 97 preprocessor, 73 scikit-learn, 72 neural
and 10 median fits, including folds and seeds. Local fits: **zero**.
The 97 export checks had maximum relative prediction difference 1.17e-6.

[Verified Kaggle run log](https://www.kaggle.com/code/aaabbb2026/acep-engines-real-projects-v1/log?scriptVersionId=360430541)
requires the authorized account. The evidence archive includes the Arabic
report, data, original sources, model weights, predictions and verification.
