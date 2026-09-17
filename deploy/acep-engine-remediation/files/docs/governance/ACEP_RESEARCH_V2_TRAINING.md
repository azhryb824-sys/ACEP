# ACEP million-project research training

- Model ID: `acep-million-synthetic-v2`
- Training projects: **1,000,000**
- Independent holdout projects: **70,000**
- Project types: **35**
- Dataset provenance: `synthetic_engineering_prior`
- Release status: `research_candidate`

This candidate is trained only on reproducible synthetic engineering-prior scenarios. Its holdout metrics measure how well it reproduces those priors; they do not establish real-project accuracy.

## Independent synthetic holdout metrics

| Target | MAPE | P90 APE | MAE | R² | Gate |
|---|---:|---:|---:|---:|---|
| costSar | 5.21% | 10.67% | 6.882e+07 | 0.9953 | PASS |
| durationDays | 6.05% | 12.41% | 50.76 | 0.9819 | PASS |
| concreteM3 | 4.42% | 9.08% | 2324 | 0.9966 | PASS |
| steelTon | 4.78% | 9.85% | 417.6 | 0.9962 | PASS |
| blocksM2 | 4.12% | 9.45% | 2487 | 0.9957 | PASS |
| hvacTR | 4.79% | 10.92% | 166.3 | 0.9947 | PASS |
| electricalKVA | 4.79% | 9.86% | 1245 | 0.9963 | PASS |
| waterLpd | 5.64% | 11.59% | 3.744e+04 | 0.9946 | PASS |
| riskScore | n/a | n/a | 0.02801 | 0.9581 | PASS |
| expectedDefects | 9.67% | 19.78% | 26.27 | 0.9820 | PASS |

## Per-project-type gates

- Type-target checks evaluated: **350**
- Failed type-target checks: **0**
- A global average cannot pass the candidate when any non-zero project-type target exceeds its dedicated threshold.

## Governance

- `suitableForModelApproval` is false.
- The bundle is enabled only for experimental inference unless an operator explicitly changes the governed release state.
- Supplier selection is excluded: project records cannot establish live supplier identity, price, availability, or contractual suitability.
- A production release still requires licensed real project data, frozen independent evaluation, licensed engineering review, model-risk review, and rollback/monitoring evidence.

## Dataset shards

| File | Records | SHA-256 |
|---|---:|---|
| `train-001.jsonl.gz` | 100,000 | `bd5fcdb384a253f1ef576fbf1570443108c8e6efd3e6d6fe37a8bb4ded7bf41a` |
| `train-002.jsonl.gz` | 100,000 | `d75ffb20e1cf04d4843ebc34d25b0015215d8b2399b17f34c7d3556dc0a9f9cc` |
| `train-003.jsonl.gz` | 100,000 | `a88d45f5c330739a2e0c780a703c6083ab51cabe4e48b5749c070f75e29750d5` |
| `train-004.jsonl.gz` | 100,000 | `dc2b44cb501091e30f48099ec2c028c0ca89da15dc9c454d9b35f813ec183bc7` |
| `train-005.jsonl.gz` | 100,000 | `aa495ed0c30c16005c1678e593a94441c79615564b47dd342dbed0891620e182` |
| `train-006.jsonl.gz` | 100,000 | `af581612466aaa58db67c61a0daa8ee8628a0de6ed4ac2873b4f699bdbe2a98a` |
| `train-007.jsonl.gz` | 100,000 | `6d3db92fd63a5689bb8f92f3b153ff687b5e9ee1bf7523210f2d95db3ce6b7fe` |
| `train-008.jsonl.gz` | 100,000 | `b02d6242c1145dd1e3f316f23f4fc6105e1e29c6ab4c0f192c7cb1ebe97126a1` |
| `train-009.jsonl.gz` | 100,000 | `ba1ca9c2918fb3e49afc09fe686ec29d319f030a57be05504d1d49a0533b6ced` |
| `train-010.jsonl.gz` | 100,000 | `4c7710808b15efc2652d38765a40a21cd23c302575e21d14059cdda5f9f6be67` |
