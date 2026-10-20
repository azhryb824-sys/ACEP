# Quantity and cost statistics, research v1

The cost estimator could replace an explicit zero paint price with a gallon-based material average while multiplying it by wall area. CSV position assumptions also put the year into labor.city and supplier speciality into supplier.city. The quantity fitter grouped arbitrary item-code prefixes, which did not match BOQ engine price categories.

This change reads CSV by header, reports accepted/rejected rows, rejects invalid numeric input, preserves a valid snapshot when a refit fails, and rebuilds groups on a successful fit. Material statistics keep units separate. Explicit BOQ prices are preserved, including zero. Missing supply prices require exact material name, normalized unit, city and grade; unresolved or insufficient BOQ rows make totalCost and costPerM2 null with status=incomplete and pricingIssues. Consumers must handle that state. The returned priced subtotal is not a complete project price.

Quantity pricing uses eight narrow item/description matches and matching units. It never applies a concrete price to an elevator because both use COL. Other items retain labelled heuristic default prices. Finishing and regional factors apply once to primary and suggested items, and summaries are recalculated. These are reference estimates, not verified contractor quotations.

## Reproduce (Node 18 or newer, no npm dependencies)

Run from the ACEP root:

```bash
node research/quantity-cost-v1/checks.cjs
node research/quantity-cost-v1/extended-checks.cjs
node research/quantity-cost-v1/train-evaluate.cjs
```

The final command fits descriptive price statistics, writes fit-report.json and statistics-snapshot.json, and includes SHA256 identities for all five input CSVs. This is not neural network training. The snapshot records fitted statistics for review; runtime train() rebuilds its in-memory state from CSV.

## Measured results

- Targeted defect checks: parent 0/10; revised 10/10. These were authored to expose concrete defects, not an unbiased accuracy benchmark.
- Additional input/refit/unit checks: 12/12.
- Existing comprehensive phases/model suite: 76/76.
- Existing BOQ suite: 161/162 on both the parent engine and revised engine. Existing failure: Arabic `عظم` resolves to Full_Construction, while the test expects Shell. Stage classification was not changed here.
- Quantity price holdout: fixed SHA256 split by project ID; 8,012 training projects / 1,988 test projects, 68,109 / 16,953 rows, zero project overlap. Eight mapped descriptions cover 1,318 test rows. Mean absolute percentage error (MAPE) against CSV prices drops from 26.5298% for old fallback defaults to 7.6987% for fitted means. All description/unit means: 7.7434% MAPE. These are price statistics, not quantity or project-cost accuracy.
- Material supplier holdout: only 16/61 rows (26.23%) have exact compatible training features. Those 16 reproduce training prices. All 53 repeated feature groups in the full material file have a single repeated price. Zero error is therefore not independent predictive evidence.
- Final full fit: 85,062 BOQ rows, 16 category/unit groups, 87 description/unit groups; 380 material, 234 labor, 156 equipment and 124 supplier rows. Zero rejected rows in these supplied files; schema acceptance does not establish realism.

## Evidence and limitations

`packages/databases/training/scripts/generate_training_data.js` generates random BOQ quantities and category-base prices with city factors and jitter. Its material generator repeats a material/city price across supplier records. The supplied records show matching patterns, but no provenance chain or verified actual project has been provided. Project-ID splitting does not remove shared generator/template bias. Do not report these results as real-world accuracy or as 92.3% engineering accuracy.

Quantities still use heuristic geometric ratios; labor staffing, equipment utilization, duration, overheads and taxes remain assumptions. Installed BOQ rates may already include labor/equipment; requiresCostScopeReview flags that ambiguity. Confidence is uncalibrated, represented by confidence=0 and confidenceCalibrated=false, not a measured probability. No actual final-project cost or measured quantity validation, production deployment, or merge is included. v7/v8/v9 language-model selections are unchanged.

Next evidence needed: measured quantities with drawings, a consistent floor-area definition, and dated quotations identifying units, grade, location, and supply versus installed scope. Actual project final costs should remain held out for evaluation before further cost-model calibration.
