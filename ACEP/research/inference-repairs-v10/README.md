# ACEP inference repairs v10

This cycle fixes observable inference and integration defects. It performs **zero fits** and makes **no new field-accuracy claim**. The 90% acceptance goal remains unproven. Previous research holdouts are not reused for selection or tuning.

## Changes

- Schedule history must have a declared area basis. New version-2 profiles average per-project total built-up areas, record support ranges and reject incompatible/unknown/out-of-support inputs. Unknown types no longer receive an invented eight-month fallback.
- Sequential template durations are allocated exactly once, using explicit minimums and normalized weights. The remaining factors and 22-day month are disclosed heuristic assumptions. Construction-method comparisons do not recommend a winner.
- `scheduleFromActivities(activities, timeUnit)` and the existing project schedule route accept explicit finish-to-start networks. Duration/float calculations do not imply resource feasibility, validated productivity or a calendar completion date. Only nonnegative integer durations/lags and `working_day`/`calendar_day` are supported.
- Risk ratings remain historical ordinal summaries for the requested project type. Probability, impact fraction, project score and risk class are null without observed outcomes, exposure and a horizon. Ranking preserves the historical mean of paired ordinal products; it is not a calibrated measure. Area, floors and finishing no longer inflate ratings. Other types' categories are not borrowed.
- Project analysis uses the mean of per-project area×floors, rather than mean(area)×mean(floors). Apartment finishing does not borrow whole-building history. Its legacy CSV area basis remains explicitly **assumed_per_floor**, not independently verified.
- Empty supplier market averages are null. Untrained quantity/quality models return incomplete reviewable results, not zero cost or a successful empty inspection.
- EDL persistence invalidates old schedule totals and risk outputs pending recalculation; stored activities remain available. Workflow and orchestrator retain review status. Main UI callbacks handle unknown values and errors without success toasts.
- SIAPP no longer returns random PPE, safety or alert metrics. Digital-twin performance/finish dates remain unknown without observations. Simulation calculates duration differences only from two supplied networks in the same unit; named flags do not invent financial, quality or risk improvements.

## Training/profile compatibility

No local or remote training was run in this cycle. Modified fitting code is syntax checked but **not executed or end-to-end validated** here. Schedule fitting accepts an explicit `area_basis` column (`per_floor` or `total_built_up`), or an explicitly verified `train(csvPath, {areaBasis: ...})` declaration. The existing CSV does not establish this basis, so it must not be guessed just to recover coverage. Existing schedule profiles without it yield `incompatible_training_profile`; new profiles with missing basis remain ineligible. Existing project-analysis profiles without `avgTotalBuiltUpArea` also abstain.

Rebuild the affected profiles **on Kaggle only**, after source scope and units are checked. Source provenance, activity calendars/resources, event exposure, Saudi transferability, calibration and unseen-project acceptance remain open. Cost-estimator predictive behavior was not changed in this cycle. This is not a claim that all model weaknesses have been eliminated.

## API example

`POST /api/v1/projects/:id/schedule/generate`:

```json
{
  "timeUnit": "working_day",
  "activities": [
    {"id": "A", "duration": 2, "predecessors": []},
    {"id": "B", "duration": 3, "predecessors": ["A"]},
    {"id": "C", "duration": 5, "predecessors": ["A"]},
    {"id": "D", "duration": 1, "predecessors": ["B", "C"]}
  ]
}
```

This authored example returns 8 days with critical activities A,C,D, not 11 days. `totalMonths`, completion date and resource feasibility remain unknown. `POST /api/v1/simulation` accepts `{ "scenario": { "timeUnit": "working_day", "baselineActivities": [...], "activities": [...] } }`.

## Verification

Run these **no-fit** suites:

```sh
node research/inference-repairs-v10/checks.cjs
node research/schedule-network-v3/checks.cjs
node research/schedule-consistency-v1/checks.cjs
node research/inspection-evidence-v4/checks.cjs
```

Results: 57 + 19 + 19 + 15 = **110 passed**, 0 failed. The first suite covers actual model methods with authored profiles, EDL/workflow/orchestrator, extracted UI callbacks and actual API handlers served over local HTTP with stubbed surrounding services. This is not full-server/browser E2E. The schedule consistency suite now uses an authored profile and performs no fitting.

Risk expectations in `research/model-repairs-v1/checks.cjs` were updated for the new contract, but that fit-containing suite was **not run locally**. Syntax checks cover every changed JS/CJS file. An initial consistency check caught an unintended predecessor shape change; template predecessor IDs were restored to strings before final checks.

Authored counterexample: the same 1,000 m²/two-floor schedule fixture changed from 136 to 110 days after reference-area correction and allocation repair. This is a software regression example, not evidence of improved actual-project accuracy.

References for interpretation, not calibration data: [GAO Schedule Assessment Guide](https://www.gao.gov/products/gao-16-89g), [NIST measurement terminology](https://csrc.nist.gov/projects/measurements-for-information-security/terminology). Neither source establishes ACEP model accuracy.
