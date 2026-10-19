# Site-style extraction research (v9)

This experiment tests whether the existing v8 research adapter can handle supplied quantities in site-style requests before a bounded continuation run. It covers only the four elementary tool contracts. It does not test full-project engineering, design compliance, market prices, or production UI behavior.

The v7 default configuration scores 14/18 exact (16/18 contract-valid), with no incorrect contract-valid calls. It uses its original prompt/contract and does not support the extended kg/ton price basis. This is a configuration comparison, not a causal training comparison. The v8 development baseline is 15/18 exact, 17/18 contract-valid, with no incorrect contract-valid calls. Its three errors concern an excluded neighboring facade, unresolved supplier prices, and conflicting gross-area surveys. Additional remediation uses different questions and values. Nine fresh cases remain frozen until the selection decision is written.

Two metric-normalized requests use one published QUIKRETE slab example (manufacturer training module 3, pages 11–12). They share the same geometry and are not two independent projects. The offline reference checks volume only; bag counts and structural suitability are outside scope.

Sources:

- https://www.quikrete.com/dealers/training/presentations/3-mixing-placing-concrete-cement-mixes-training.pdf
- https://archive.nptel.ac.in/content/storage2/courses/105103023/module5/lec3/2.html (cost-estimation method context; no project numbers copied)

## Reproduction

Use the existing verified Kaggle v8 experiment root at `/kaggle/working/acep-engineering-v1`. The v8 complete archive provides the prerequisite adapters, unchanged prompt v3, contract v2, identity, training template, memory probe, replay training records and saved 348 regression cases. These scripts are intentionally scoped to that root.

1. Run `prepare_site_v9.py` once. It freezes 18 development and nine fresh site-style cases and prepares the first 576 training records plus 16 validation records. Do not rerun it after adding remediation: it rebuilds the original training file.
2. Run `evaluate_site_v9.py --adapter v8 --suite development` on GPU 0.
3. Run `prepare_additional_v9.py`. It adds 64 distinct contextual examples after development review (640 training total) and creates two published-example requests.
4. Run `evaluate_site_v9.py --adapter v8 --suite published` before training.
5. Run `build_training_v9.py`. It verifies contract validity and normalized-question disjointness, verifies the v8 parent adapter hash, writes the bounded one-epoch training program and launches it. FP16 base, FP32 trainable LoRA, microbatch 2 / accumulation 4, learning rate 1e-5, seed 9301, 80 steps, unchanged prompt; it does not merge adapters into base weights.
6. Run `run_site_v9_pipeline.py` once. It waits for completion, evaluates 348 regression cases in two GPU shards, then development and published examples. It writes the selection policy/decision before evaluating the fresh cases for both adapters. Logs and raw outputs remain under `v9_site/`.
7. Run `finalize_site_v9.py` after the pipeline completes to validate parent hashes, assemble the report and verified archive, and retain v7 as the general default. Candidate flags produce proposals only.

The nine frozen cases use related templates and are not a semantically independent benchmark. Exact question disjointness is a limited leakage check. There are no actual project records or expert-reviewed ground truths in this experiment. No engineering deployment is authorized by the scripts, even if selection thresholds pass.
