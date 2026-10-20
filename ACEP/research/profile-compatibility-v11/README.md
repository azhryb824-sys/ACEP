# ACEP v11: explicit project units and reusable profiles

The analyzer and scheduler previously consumed ambiguous project areas and could not safely reload their fitted summaries. A live restart test also exposed random room areas in the knowledge base. This cycle repairs those paths and preserves explicit abstention. It does not establish predictive accuracy or 90% acceptance.

## Behavior

- Project CSV ingestion is header based and understands quoted fields. Area basis must be declared as `per_floor` or `total_built_up`, in each row or through `train(path, {areaBasis})`. Conflicts and malformed values are audited; duplicate project IDs reject the input. Unknown options reject. Missing areas, quantities, or floors do not receive fabricated defaults.
- Total built-up area is normalized per project before aggregation, using the mean of products, not the product of means. Compensated averaging keeps constant-geometry summaries within their observed support.
- Legacy or undeclared-area summaries are ineligible for inference. Analyzer profiles use version 3; scheduler profiles retain version 2. Supported types require more than five accepted records and valid observed area/floor ranges. Outside-support requests abstain.
- `exportProfile()` and `loadProfile(jsonOrObject)` support only the analyzer and scheduler. JSON snapshots validate schema, units, numeric ranges, area basis, and model identity. An invalid load clears readiness. Imported accuracy/source-verification flags are always false. This is an explicit API, not automatic server startup integration or deployment.
- Room templates return stable typical areas, disclose `type_template` and `requiresDrawingVerification`, and return no rooms for types without a template. These are not measured plans or quantity takeoffs.
- `trainAllModels({dataDir, projectOptions})` supports explicit input paths. A successful fit is distinct from inference readiness and validated accuracy.
- The synthetic generator has a fixed seed, declares area semantics and synthetic provenance, and writes source/data SHA-256 manifests. Existing repository CSVs are not retroactively relabeled.

## Verified execution, 2026-10-20

Kaggle version 14, scriptVersionId `360222734`, completed successfully in **30.5 seconds**. Node `v20.19.0`, Python `3.13.15`. All fitting ran on Kaggle; local checks only loaded profiles, performed inference, or used authored/mocked fixtures.

[Verified Kaggle output](https://www.kaggle.com/code/aaabbb2026/acep-engines-real-projects-v1/output?scriptVersionId=360222734)

10,000 synthetic project rows produced 9,093 eligible building records and 19 types for each of the two project models. 907 rows lacked building area and were audited as rejected. All seven model fitting routines succeeded. The supplier model separately rejected one out-of-range synthetic supplier record. The trainer's 159,842 total record count includes reuse across engines; it is not a count of distinct projects.

| Suite | Passed / total |
| --- | ---: |
| Explicit area and fitting contracts | 25 / 25 |
| Model repairs v1 | 85 / 85 |
| Inference v10 | 57 / 57 |
| Training status | 19 / 19 |
| Schedule network | 19 / 19 |
| Schedule consistency | 19 / 19 |
| Inspection evidence | 15 / 15 |
| Snapshot reload and inference | 67 / 67 |
| **Total authored software checks** | **306 / 306** |

A separate local no-fit replay of the downloaded final profiles passed 67/67. All 50 packaged source hashes match the checked-in sources; all 24 output-file hashes were verified. These tests are not full browser/server end-to-end tests and are not accuracy measurements.

The first attempt (Kaggle version 13, `360220553`) fitted 7/7 models but passed only 47/62 snapshot checks: 13 failed due to random room areas and 2 due to test inputs that correctly triggered the scheduler's nonpositive-floor-factor guard. The random behavior was removed. Round-trip cases now use an interior floor count, and separate tests assert that the guard still abstains. Failed-run evidence is retained, not discarded.

## Reproduce

From the ACEP repository directory, package source without fitting:

```sh
python3 research/profile-compatibility-v11/build_notebook.py ACEP_Profile_Compatibility_v11.ipynb
```

Import that notebook into Kaggle and use Save & Run All. The notebook verifies 50 source hashes, generates explicit synthetic fixtures, fits all seven models, runs the suites, and exports `ACEP_v11_results.zip`. Fit entry points reject a working directory outside `/kaggle/working/`.

After downloading and verifying the output manifest, reload without fitting:

```sh
node research/profile-compatibility-v11/snapshot-checks.cjs /absolute/path/to/profiles /absolute/path/to/replay.json
```

The other five exported engine states are audit evidence only; they have no supported production import API in this cycle.

## Remaining limits

No new real-project holdout was evaluated and no previous exposed holdout was used to tune this cycle. `accuracyValidated` and `goal90PercentEstablished` remain false. Descriptive heuristics, uncalibrated confidence, finishing/region adjustments, marginal support ranges, the scheduler's restricted heuristic domain, and the synthetic SAR data do not establish field accuracy. A trustworthy 90% claim still needs task-specific acceptance metrics and unseen, sufficiently complete real projects, including actual quantities, costs, durations and outcomes for the relevant engines. Production deployment and PR merge have not been performed.
