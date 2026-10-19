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

## Completed result

| Evaluation | v8 before continuation | v9 after continuation |
| --- | ---: | ---: |
| Authored site-style development | 15/18 | 17/18 |
| Previous regression suite | 346/348 | 342/348 |
| Frozen site-style cases | 8/9 | 8/9 |
| Two metric requests from one published example | 2/2 | 2/2 |

The v9 candidate is **rejected** under the predeclared research selection policy. It has one incorrect contract-valid call: a zero-price supply-cost request is routed to `add_waste`. It also regresses on three equal-openings cases and one kg/ton conversion. The old gross/openings swap becomes a clarification, which avoids that incorrect call but is still not the expected invalid-input answer. No tools were executed by the model evaluator.

The v7 default and the previous v8 units research decision remain unchanged. This run completed 80 steps on 640 records in 1080.6514 seconds; validation loss was 0.0253461078. The v9 adapter SHA256 is `960140f06dbaa802535d30c2042397c8459e5d79e1d511faa90819564b7ac4fe`.

The finalizer preserves the original v8 archive entries, adds a separate `infer_acep_research_v9.py` entry point, records a generation smoke check, verifies frozen-file identity and decision order, and validates the final ZIP CRC and SHA256 manifest. Model weights and experiment archives are not committed to Git.
