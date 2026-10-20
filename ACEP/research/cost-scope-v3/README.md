# Explicit price scope and incomplete-cost propagation, v3

A BOQ item priced as installed work was still treated as material supply, and the estimator added a whole-project labor/equipment heuristic. EDL then converted an unresolved null cost to zero. UI cards and timeline reported that zero as a completed estimate; cost bars also invented architectural/mechanical/electrical percentages.

BOQ pricing now has its own scoped arithmetic path. Area-only estimation remains a separate, clearly heuristic fallback. No neural model or new price dataset is trained.

## Contract

- `priceScope: 'installed'` means the line price includes **direct materials, labor and equipment**, and excludes overheads, contingency, profit and tax. Those inclusions must be checked against the actual quotation. No separate installation costs are added. Supplying `installation` with an installed line is a conflict.
- `priceScope: 'supply_only'` means material supply. `installation: {labor, equipment}` contains explicit **whole-line totals in SAR**, not rates multiplied by quantity. Both amounts are required, even when zero. Missing values do not imply free installation.
- Missing/unknown scope requires review. An explicit `options.defaultPriceScope` may classify missing/unknown item scopes; a specific supported item scope overrides the default. Generated KB/CSV prices are labelled unknown; the source tag remains heuristic/unverified even after a caller declares scope.
- Tax-inclusive, overhead-inclusive, unsupported all-in rates, unsupported currencies and conflicting installation declarations are unresolved, not silently repriced or taxed again. No currency conversion or inference from descriptive words is attempted.
- Missing supply prices can use the existing exact material name/unit/city/grade CSV lookup only for a supply-only line. A supply observation cannot price installed work.
- `options.markups` accepts `indirect`, `contingency`, `profit`, `tax`, each a finite numeric rate from zero through one. Unknown keys, strings, invalid scopes and invalid rates are rejected. Missing rates use the previous internal heuristic defaults, including the existing tax assumption; this is not a statement of current tax law. Callers can explicitly set all four rates to zero.
- Currency amounts round to SAR cents. Unsafe financial arithmetic is blocked. Final costs reconcile with rounded components. A finite result remains a price-based estimate, not project approval or empirical engineering accuracy.

```js
const result = estimator.estimateCost([
  {code:'A', quantity:10, unit:'m2', unitPrice:100, priceScope:'installed'},
  {code:'B', quantity:2, unit:'m3', unitPrice:100, priceScope:'supply_only',
   installation:{labor:30, equipment:10}}
], 'Villa', 100, 2, 'Standard', 'Riyadh', {
  markups:{indirect:0, contingency:0, profit:0, tax:0}
});
// directCost = totalCost = 1240 SAR; no whole-project installation surcharge.
```

Unknown inputs return `status:'incomplete'`, null direct/final cost and costPerM2, `pricingIssues`, quoted subtotal, known direct subtotal, scope summary and per-line source evidence. These subtotals are not complete project prices. Zero is retained only when explicitly valid. Confidence remains uncalibrated.

## Integration

Project create/read accepts and preserves optional `pricing: {defaultPriceScope, markups}`. The existing project cost-estimate endpoint accepts the same pricing object. Workflow stores explicitly supplied settings in EDL metadata and reuses them on later estimates; incomplete results survive EDL JSON round-trips as null with issue evidence. The cost pipeline step is marked requires_review and the validator explains the missing price scope instead of describing an unresolved amount as a zero estimate.

The main full-analysis and cost-page handlers show review text for missing totals. Actual material/installed/labor/equipment component names and amounts replace fabricated trade shares. No probability/confidence interval is manufactured from the uncalibrated confidence number. This change does not add a full quotation editor or redesign the pages.

## Reproduce

From ACEP root, Node18+:

```bash
node research/cost-scope-v3/checks.cjs
node research/cost-scope-v3/scenarios.cjs
node research/cost-scope-v3/integration.cjs
node research/cost-scope-v3/ui-checks.cjs
node research/quantity-cost-v1/checks.cjs
node research/quantity-cost-v1/extended-checks.cjs
node research/quantity-geometry-v2/api-checks.cjs
```

Results: authored defect checks parent0/16 -> revised16/16; workflow/EDL/validator/route and numeric-boundary10/10; UI source handlers with DOM/API stubs6/6; authored cost arithmetic/metamorphic cases100/100. Prior price checks10/10+12/12, geometry checks10/10, route checks12/12, geometry scenarios100/100, BOQ162/162, quantities55/55 and phases76/76. Two older price fixtures now declare supply scope and explicit zero installation to preserve their unit/zero-price assertions under the stronger contract. Geometry route tests now compare positive known direct subtotals when a missing kitchen item prevents a final total; comparing null totals alone would be vacuous.

These are code/contract and arithmetic checks, not independent real projects, dated quotations, structural validation or proof of cost accuracy. The complete application/browser was not tested; no local test browser was installed. No merge, deployment, Qwen adapter change or claim of 98% engineering accuracy is included.
