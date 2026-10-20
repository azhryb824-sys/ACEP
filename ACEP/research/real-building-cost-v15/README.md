# ACEP v15: area-basis ablation and explicit extreme-error constraints

Research only. Builds on v14 commit `2ac625df04e238644204ef187ec2dbf0d6053858`.
No production predictor, model loading, merge or deployment is changed.
The seven-engine 90% requirement remains unestablished.

## Problem and changes

v14's pooled validation MAPE/P95 constraints admitted a model with 708.51%
maximum validation APE. On the already-exposed 64-project diagnostic cohort,
within-10% improved but MAPE, P95 and maximum error worsened. Multiplying an
estimated unit rate by gross area also imposes a fixed linear area factor,
even where gross area and the scope of a reported contract are uncertain.

This cycle compares three explicit output bases: gross area, net area and
direct total cost. Features contain independent log gross/net area, log
net/gross ratio, student count, area per student and year; the categorical
fields remain school type, project scope and district. Teacher/classroom
counts are omitted. This is an ablation, not proof of a causal mechanism.

37 fixed recipes comprise the original gross-area median baseline and six
families crossed with three output bases and raw/lagged-PPI targets. Families:
Ridge alpha 10/100, ExtraTrees leaf 5/15, absolute-loss boosting and a small
32/16-unit neural ensemble with 2,000 updates for each of seeds 92026–92028.
The 610/46/64 partitions, 124 validation records, facility groups, original
numeric values, targets and fixed five-project IDs are unchanged from v14.
All fitting is restricted to Kaggle before any ML imports.

## Stronger selection and review rules

An eligible candidate must not worsen the global-median baseline's pooled
MAPE, P95 APE, mean of the worst ceil(10% × n) errors (CVaR90), maximum APE,
or number of errors above 100%. Its maximum APE must also be no worse than
the baseline within **each** 2021/2022/2023 temporal fold. Rank eligible
candidates by within-10% descending, MAPE ascending, then name. The baseline
is always an eligible fallback. No diagnostic labels select a candidate.

Training-only 1st/99th-percentile support bounds flag unusual gross area,
net area or net/gross ratio. Missing/invalid areas, unverified scope and the
earlier classroom-count heuristic also require input review. These are
descriptive review rules, not calibrated guarantees or production approval.
Flagged records remain in the full 64-project accuracy denominator.

## Source reconciliation

The Charlotte County School Board's [2024 financial statements](https://flauditor.gov/pages/dsb_efile%20rpts/2024%20charlotte%20county%20district%20school%20board.pdf),
PDF page 54 / printed page 50, list a Liberty Elementary modular installation
commitment. The contract amount is $847,434; $528,258 is completed to date and
$319,176 remains committed at June 30, 2024. This is a possible scope lead,
not an exact match to the FDOE final $822,037 record. Original contract IDs,
area schedules and final reconciliation are still missing. The table was
checked visually and with MuPDF/Poppler; pdfplumber omitted its embedded table.

Collins' original 756,979 gross ft² and 71,395 net ft² remain unchanged: no
matched primary schedule justifies a replacement. The district annual-report
URL returned 404. The [Marion legislative request](https://www.flsenate.gov/PublishedContent/Session/FiscalYear/FY2024-25/LocalFundingInitiativeRequests/FY2024-25_S2350.pdf)
describes a proposed 16-classroom facility, not a matched final contract for
the four-classroom FDOE record. No search result is converted into a target,
numeric correction or independently held project. See source_reconciliation.json.

## Execution repair and reproducibility

Kaggle version 19 failed when a net-area recipe encountered one missing
development net area and produced a NaN target. Earlier gross-area recipes
had run; no final selection or new diagnostic scoring completed. Preserve
the failed UI log and initial protocol in the evidence.

The execution repair keeps every row, candidate and ranking rule. For a net
output basis, missing/nonpositive net area uses gross area multiplied by the
median positive net/gross ratio fitted within the training fold. The final
imputer uses development features only. Its scalar is stored in the JSON
model and propagated through the PPI wrapper. Support quantiles use finite
observations. Source values are not overwritten. Hand-computed no-fit probes
cover observed/missing/zero areas and the PPI wrapper; all 128 prior v13/v14
predictions remain reproducible.

The evidence archive contains data and outputs, with the previous v14
evidence archive as an explicit dependency. Extract the v14 evidence first
to restore `real-building-cost-v13` and `real-building-cost-v14` artifacts
beside this directory; extract v15 artifacts into this directory. Code lives
in Git and is not duplicated in the archive. Original scratch names are
also supported. Commands:

```bash
python prepare_data.py       # no fitting; verifies pinned inputs
python build_notebook.py     # no fitting; creates private Kaggle notebook
# Import notebook into Kaggle; Save & Run All; obtain output archive.
python verify_results.py     # no fitting; independent metrics and JSON replay
```

v14 comparison predictions are embedded without labels, after local frozen
weight reproduction. Full v14 weights are retained in comparison/ for local
verification, keeping the notebook below Kaggle's source-size limit. All
candidate metrics, per-fold eligibility, final inference, intervals, review
flags, source/input/output/transport hashes and event ordering are checked.

## Critical source-identity correction discovered after the run

All 37 candidates have their maximum validation error at
`FDOE-2023-PDF-026` (Central School, Santa Rosa, 2,100 ft², $86,936).
The [original FDOE 2023 report](https://www.fldoe.org/file/7742/23CostConst-PS.pdf),
page 5, describes **Softball Batting Cages** and **Baseball Batting Cages** in
separate rows with identical numeric values. These are ancillary sports work,
not classroom buildings. The v13 numeric duplicate removal collapsed one
of these distinct work items. Earlier statements that the removed row was
an established exact project duplicate are therefore corrected.

`audit_subproject_identity.py` checks both descriptions and numbers with
MuPDF and pdfplumber, preserving source coordinates. It restores summary row
`FDOE-2023-PDF-027` in a **separate proposed 611-row development dataset**,
retains the same facility group and both original cost targets, and records
both work items as ancillary sports. It does not guess which description
belongs to which otherwise identical summary row. Unreviewed rows remain
unclassified. Frozen v15 inputs, outputs and metrics are unchanged.

The proposed dataset is blocked from fitting until corpus-wide work-purpose
and identity review and a new frozen split/protocol are complete. Do not
improve the displayed scores by deleting these cases or changing the old
acceptance denominator. The defect reinforces that v13–v15 are exploratory
evidence, not a valid full-scope acceptance benchmark.

## Verified result

Kaggle version 20 (`360441016`) completed in **284.3 seconds** (trainer 243.81).
None of the 36 learned candidates meets all safeguards; the frozen rule
selects **baseline_median**. All 36 fail the maximum and per-fold maximum
constraints; 35 fail CVaR90. No post-result relaxation or re-selection occurs.

| Same 64 exposed diagnostic records | v14 | v15 fallback |
|---|---:|---:|
| Within ±10% | 19/64 (29.69%) | 0/64 (0%) |
| MAPE | 37.15% | 53.98% |
| P95 APE | 90.95% | 82.50% |
| Mean worst 10% APE | 164.03% | 102.20% |
| Maximum APE | 342.36% | 176.96% |
| Fixed five within ±10% | 4/5 | 0/5 |

**This is not an accuracy improvement; do not promote the fallback.**
Only eight of 64 absolute percentage errors improve versus v14; 56 worsen.
Input review flags 12 records but catches only one of the two errors above
100%; it is not a reliable error detector. Nominal 90% intervals cover 54/64
(84.38%) with median width 279.28% of the point estimate.

Independent verification passes all 37 pooled/per-fold metric sets and
eligibility, 64 new + 46 calibration + 128 prior frozen predictions, all 64
review flags, source/input/output/transport hashes and event seals. The 108
export checks have maximum relative difference 2.75e-6. Successful-run fits
on Kaggle: 108 preprocessors, 90 sklearn, 54 neural, 36 area imputers, five
median models and one support summary. Local fits: zero. These counts do not
include the failed first attempt. The supplemental identity audit makes no fits.

[Verified private run log](https://www.kaggle.com/code/aaabbb2026/acep-engines-real-projects-v1/log?scriptVersionId=360441016).

## Acceptance boundary

2025 outcomes were already exposed in v13/v14. This is a development-driven
diagnostic comparison with **zero new independent acceptance records**.
Repeated scoring cannot establish external acceptance. Nominal-90% interval
coverage is separate from predictions within ±10%; do not call 1−MAPE accuracy.
The PPI is national, current-vintage, lagged by a calendar year; this is not a
historical-vintage backtest, pre-award forecast or Saudi-price validation.

Source features are reported/as-built, and contract area/scope is not fully
reconciled. Quantities, schedules, risk, quality and supplier engines require
their own dated project-level ground truth. Even a successful cost diagnostic
cannot satisfy the complete seven-engine objective.
