# ACEP million-project research training

- Model ID: `acep-million-synthetic-v1`
- Training projects: **1,000,000**
- Independent holdout projects: **50,000**
- Project types: **35**
- Dataset provenance: `synthetic_engineering_prior`
- Release status: `research_candidate`

This candidate is trained only on reproducible synthetic engineering-prior scenarios. Its holdout metrics measure how well it reproduces those priors; they do not establish real-project accuracy.

## Independent synthetic holdout metrics

| Target | MAPE | P90 APE | MAE | R² | Gate |
|---|---:|---:|---:|---:|---|
| costSar | 5.17% | 10.63% | 7.235e+07 | 0.9952 | PASS |
| durationDays | 6.04% | 12.36% | 48.65 | 0.9825 | PASS |
| concreteM3 | 4.36% | 9.00% | 2237 | 0.9970 | PASS |
| steelTon | 4.78% | 9.86% | 416.8 | 0.9960 | PASS |
| blocksM2 | 4.12% | 9.43% | 2498 | 0.9955 | PASS |
| hvacTR | 4.79% | 10.97% | 165.1 | 0.9943 | PASS |
| electricalKVA | 4.77% | 9.80% | 1262 | 0.9962 | PASS |
| waterLpd | 5.66% | 11.65% | 3.664e+04 | 0.9948 | PASS |
| riskScore | n/a | n/a | 0.02822 | 0.9577 | PASS |
| expectedDefects | 9.57% | 19.68% | 25.88 | 0.9832 | PASS |

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
| `train-001.jsonl.gz` | 100,000 | `173246249cf12d99976d44728a9b190e31d28c25bfd0ff21a8857246defdcb1c` |
| `train-002.jsonl.gz` | 100,000 | `84044809586836161669f013ad52b50cb3ff46aeb0e7e76993db627cd2ddab68` |
| `train-003.jsonl.gz` | 100,000 | `a8d61b7c0ea390ee9bae74a99764e84a301e950e4b6a26531e3f4f566947a53a` |
| `train-004.jsonl.gz` | 100,000 | `151ee05cf82d5ee5861786a83bb4c8ef15bce9cf526c0cbe716c34b4efe49e3b` |
| `train-005.jsonl.gz` | 100,000 | `c16aae0428642160e1629675b3820dcb246e2484dcc2ea0bd87e79c96c60342e` |
| `train-006.jsonl.gz` | 100,000 | `d7a7a21335aba9768c5c0c914bd7b13e39c029b43e2a3e9f4f12fed9046ad41c` |
| `train-007.jsonl.gz` | 100,000 | `afd2e026f57f8148a781253fe0809d89ff761b7d0278c9231b93cdb56e52a119` |
| `train-008.jsonl.gz` | 100,000 | `ab0c7f15cf770c2c40a29b2675af4137c499fb741a43c5f80f23283e8c8365e0` |
| `train-009.jsonl.gz` | 100,000 | `ff8413e79eaec7967b1040586dfd1a8636ea83254165436fbfc9af058119daba` |
| `train-010.jsonl.gz` | 100,000 | `2dfd7387307b0ef5aa499f4c0669f33e89c8fe29bd0d9001cc85029ca8231f17` |
