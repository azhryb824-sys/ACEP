# ACEP real-project improvement cycle v5

Research only. All model/transformer fitting occurred on Kaggle CPU. No predictor
from this cycle is promoted into the seven production engines. The 90% requirement
remains unmet. The retained test sets are now consumed: further tuning must use
new independent projects or a newly registered outer evaluation.

## Data and scope

- Rafiei, M. *Residential Building*, UCI 437, DOI 10.24432/C5S896, CC BY 4.0.
  372 actual historical Tehran residential projects. Costs are in historical
  10,000 IRR per square metre; durations in quarters. No current Saudi pricing claim.
- Thiele, B.; Ryan, M.; Abbasi, A. *Project Portfolio Dataset*,
  DOI 10.6084/m9.figshare.12998822.v3, CC BY 4.0. Eight original Australian civil
  project workbooks. These project identities appeared in earlier duration research;
  their BOQ outcomes constitute a separate task, not wholly new ACEP acceptance projects.
  261 audited BOQ rows, 232 eligible rows, 16,532 resource transactions and 1,128
  dependency rows. Six unscorable rows are quarantined and 29 rows without positive
  initial baselines are counted as uncovered. Thirteen transaction arithmetic
  discrepancies over AUD 0.05 are flagged and not silently reconciled.

Original source bytes, derived data, frozen contracts, lineage, weights, predictions
and audit evidence are in the companion data/results archive. The source scripts
are maintained here in Git. See source manifests for exact URLs and hashes.

## Methods

Residential v5: 162 training projects completed by Persian year 1382; 81 validation
projects started in 1383–1386 and completed by 1386; 31 additional completed projects
available only for final refit. Final fit has 274 projects; test has 38 projects
started in 1387–1388. Sixty in-flight projects have unavailable outcomes at the
refit cutoff and are excluded. Dates are Persian, not Gregorian. Completion-based
availability filtering censors longer unfinished projects; this is a limitation.

Excluded predictors: actual completion, duration, sale price, construction cost,
base-year equivalent V6 and all V21 economic lags because their description refers
to completion-time information. Two physical/economic feature packs are compared.
Five test projects are fixed by hashing IDs before fitting. All 38 are evaluated.
65 candidates across cost, duration and overrun classification include 12 neural
networks. Selection and neural stopping use validation only; selected configurations
are refit using only labels available before test start. Model hashes are frozen
before test labels are opened.

BOQ v5b: P01/P17 train (77 lines), P18 validates (29), P02–P06 test (126 eligible
lines). This is retrospective project-disjoint validation, **not time-forward**:
P17 contains later observations than some test projects. Original spreadsheets
do not establish the complete baseline-revision history. The task predicts final
quantities/cost conditional on a supplied BOQ, not quantity takeoff from drawings.
TF-IDF descriptions, unit/WBS indicators and initial amounts are fit on training
only. Ten candidates per task include a neural network; two tasks total 20 candidates.
No test-based tuning or final BOQ refit. Zero actual amounts are retained and treated
as failures unless predicted as zero. Unlike quantity units are never summed.

## Results

Residential cost neural network: held-out MAPE 10.7264% versus 26.4608% for initial
estimates; 23/38 projects (60.5263%) within ±10%. Only two of the five fixed projects
meet that tolerance. This is an error reduction, not a claim of 89.27% accuracy.

Duration neural network: MAPE 25.0310% versus 24.1101% median baseline; 15/38
(39.4737%) within ±10%. Two of the five fixed projects meet that tolerance.

Risk histogram model: balanced accuracy 37.8378%, raw accuracy 73.6842%; only one
negative in the 38-project test (37 overruns, one non-overrun). Always-overrun raw
accuracy is 97.3684%, demonstrating why raw accuracy is misleading here. Risk
acceptance also requires at least five examples of each class and is not met.

BOQ unit-median quantity adjustment: 72.2222% of eligible test lines within ±10%,
versus 75.3968% for unchanged initial quantities. Selected neural line-cost model:
11.1111% within ±10%, equal to initial-cost baseline. No project passes the full
quantity or cost gate. The all-audited denominator includes uncovered lines.

Runs: Kaggle version 8 (360158321), residential; version 9 (360161472), BOQ.
BOQ's first save attempt was rejected before training by Kaggle's 1 MB source limit.
The successful notebook compresses transport only and verifies identical input
and training-source hashes. No experiment configuration was changed.

## Reproduce

Use the data/results archive to populate `sources`, `data`, `boq_data`,
`kaggle-output/results` and `boq-kaggle-output/results` beside these scripts.
Local preparation requires Python, pandas and openpyxl. Verification requires
NumPy, pandas, joblib and scikit-learn. Training uses PyTorch and scikit-learn
already available in Kaggle (run versions are recorded in evaluation.json).

```sh
python prepare_data.py
python prepare_boq.py
python build_notebook.py
python build_boq_notebook.py
```

Import the generated notebooks into Kaggle and use Save & Run All. Download the
two result ZIPs and extract into the result directories above. Do not fit locally:
both training entry points reject non-Kaggle paths/environments.

```sh
python verify_results.py
```

Verification independently checks hashes, row/label alignment, project separation,
validation ranking, test metrics, saved-weight inference and acceptance gates.
It performs no fitting. Tiny floating-point differences across NumPy versions are
allowed (relative tolerance 2e-5). Only load trusted, hash-verified joblib artifacts.

## Next data requirement

The seven-engine acceptance gate needs five fresh end-to-end real projects with
original drawings/BIM and quantities, dated estimates/revisions and final costs,
baseline/actual schedules with dependencies and resources, actual risk/inspection
outcomes, and supplier deliveries/prices. Historical foreign data supports these
limited experiments but cannot establish Saudi whole-engine accuracy. Repeatedly
tuning on the now-open test projects would not establish the requested result.
