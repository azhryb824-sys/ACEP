# Kaggle continuation experiment

These scripts extend the user's restored v5 research workspace. They do not
bootstrap a new model or claim engineering deployment readiness.

`prepare_v6.py` verifies the frozen v5 adapter, retains the 744 original examples,
adds 192 balanced boundary and missing-input examples, and writes 32 separately
worded development targets. The shared system prompt aligns zero-value policy
with the unchanged contract gate. It freezes 120 comparison cases: 40 prior,
48 earlier development, and the new 32. All remain authored development cases,
not an independent engineering test.

The generator reuses the successful v5 assistant-only masking/collator and
creates `train_tool_pilot_v6.py`: NF4 with FP16 compute, verified v5 LoRA loaded
as trainable, 936 examples, one epoch, batch 1, accumulation 8, learning rate
3e-5, six warmup steps, and checkpoints every 30 steps. Six warmup steps replace
removed `warmup_ratio` in the installed Transformers version. Expected optimizer
steps: 117. The v5 files remain unchanged.

`run_v6_experiment.py` runs the preparation, baseline, training, evaluation,
comparison, and verified ZIP backup. On two GPUs it assigns the v5 baseline to
GPU 1 while v6 trains on GPU 0; one-GPU sessions run sequentially. Both versions
use identical prompt, cases, precision, decoding, and scorer. Saved predictions
resume by ID. Training resumes the last checkpoint. Do not launch concurrent
supervisors for the same experiment directory.

The candidate selection requires improved overall exact answers and no decrease
in contracts, missing-input call rate, each suite, or each tool. Every individual
improvement and regression is retained for review. Even a selected candidate is
research-only. No model-generated call is executed by this experiment.

Run only after restoring and verifying the user's complete v5 backup and
previous evaluation files in `/kaggle/working/acep-engineering-v1`:

```sh
python prepare_v6.py
python -u run_v6_experiment.py
```

Use Kaggle Save Version with output preservation after completion; a live
session's working directory is not a durable backup.
