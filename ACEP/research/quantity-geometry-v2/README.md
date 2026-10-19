# Quantity geometry and project persistence, v2

A 300 m² floor with two floors used a 150 m² excavation footprint because the BOQ divided area by floors, while most other items multiplied it by floors. Project creation then passed analyzer.totalArea into both quantity and cost estimators and persisted that total as the per-floor area, causing further multiplication when the project was read.

The shared project-geometry boundary now defines `area` as one floor by default. `areaBasis: 'total_built_up'` converts the supplied total once, with explicit positive area and integer floor count. `areaBasis: 'per_floor'` is the other supported value; land area is rejected. Geometry metadata marks an omitted basis as assumed and always states the equal-floor-area assumption and lack of measured verification. Different floor plates, basements, setbacks and compounds need explicit geometry; this conversion does not measure their footprint.

Excavation uses the normalized footprint with the existing heuristic 1.5 m depth. The fix changes the 300 m² / two-floor example from 225 to 450 m³; with the existing 70% cart-away assumption, transport remains 315 m³. These coefficients are not engineering design or measured takeoff. Other quantity heuristics are unchanged.

Project POST normalizes and stores per-floor area once, keeps explicit decimal dimensions, and respects explicit project type. ProjectAnalyzer now honors options.type before lexical type detection. GET uses the same stored finishing and region when recomputing BOQ/cost. Missing geometry remains null and produces no invented BOQ or cost in these POST/GET routes; the project can still be created. Explicitly marked legacy totals are read correctly; unmarked legacy records keep their previous per-floor interpretation and are not migrated by guesswork. The normalized interpretation is now visible in cost responses. UI widgets have not been redesigned.

The BOQ scope detector recognizes positive Arabic `عظم` / English `shell` requests while preserving finishing requests that mention a completed shell. It removes the bounded `بدون/دون تشطيب` phrase for scope detection and checks a small set of shell negations. This is a keyword rule, not a general Arabic semantic parser. Explicit phase still wins. The general StageClassifier is unchanged.

## Use

```js
const boq = quantityEstimator.estimateBOQ('Villa', 600, 2,
  'Standard', 'Riyadh', { areaBasis: 'total_built_up', phase: 'Shell' });
const estimate = costEstimator.estimateCost(boq.items, 'Villa', 600, 2,
  'Standard', 'Riyadh', { areaBasis: 'total_built_up' });
```

POST `/api/v1/projects` can accept `{name, type, area:600, floors:2, areaBasis:'total_built_up'}`; new stored area is 300 with basis=per_floor. GET does not multiply that stored area again. Invalid explicit dimensions or unsupported basis return 400. The returned pricing status is still heuristic or incomplete; a finite total is not a verified actual project cost.

## Reproduce

Run from the ACEP root with Node 18+:

```bash
node research/quantity-geometry-v2/checks.cjs
node research/quantity-geometry-v2/scenarios.cjs
node research/quantity-geometry-v2/api-checks.cjs
node research/quantity-cost-v1/checks.cjs
node research/quantity-cost-v1/extended-checks.cjs
node packages/ai-engine/tests/test-boq-engine-v3.js
node packages/ai-engine/tests/test-quantities.js
```

`api-checks.cjs` extracts the actual POST and GET handler source from server.js. It uses the actual quantity/cost/project-analyzer implementations and CSV fitting, in-memory storage, and schedule/risk/quality stubs. It does not boot the entire server or exercise a real browser. An optional argument selects a parent source root for comparison.

## Results

- Targeted geometry checks: parent 1/10, revised 10/10.
- Project route checks: parent 2/12, revised 12/12. Explicit project type, per-floor storage, total-area conversion, decimals, finishing/region, invalid inputs, offline creation, missing/partial geometry and legacy records are covered.
- 100 authored arithmetic/metamorphic scenarios across 13 project types: 100/100. Equal floor area versus total input produces equivalent quantities; adding floors does not reduce excavation; slab arithmetic agrees with the existing coefficients. These are not 100 actual projects or a percentage of engineering accuracy.
- Prior price-input/refit checks: 10/10 + 12/12.
- Existing BOQ suite: 162/162, previously 161/162 (Arabic shell failure fixed).
- Existing quantity ranges: parent 55/55; after the excavation fix, the untouched old test is 51/55. Four ranges encoded the divided-by-floor bug. They were replaced by explicit per-floor fixture arithmetic values, not widened; the revised suite is 55/55. The original failures are preserved in results.json.
- Existing phases suite: 76/76 after restoring the already-versioned data/kb-projects.json fixture. The first minimal runtime had 75/76 on both parent and revised because that fixture was absent; no project was fabricated to make the test pass.

The price corpus provenance limitations recorded in quantity-cost-v1 remain. No neural adapter is trained or promoted here, no actual-project ground truth is introduced, and there is no merge, deployment, structural approval, independent cost calibration, or claim of 98% engineering accuracy.
