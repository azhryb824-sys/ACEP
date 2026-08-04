# Unified Engineering Training System (UETS)

Single Source of Engineering Truth for all ACEP AI models.

## Overview

UETS normalizes all training data into a **55+ field Engineering Ground Truth (EGT)** schema,
one record per training project. All 7 statistical JS models, the Vision AI pipeline, and the
Python AI training pipeline consume the same normalized data — eliminating the 8 duplication
points and 7 conflict points identified in `Unified_Training_System_Analysis.md`.

UETS is an **additive layer**: if it fails, the existing system runs exactly as before.
No existing API endpoint is modified, no data is deleted, no data is duplicated.

## Architecture

```
packages/uets/
├── index.js                          # UnifiedTrainingSystem (singleton) — main entry
├── core/
│   ├── engineering-ground-truth.js   # EGT schema (55+ fields)
│   ├── egt-factory.js                # CSV/EDL/KB/CL/profile → EGT conversions
│   ├── egt-repository.js             # Storage + indexing + persistence
│   └── egt-validator.js              # Schema / consistency / integrity / completeness
├── dataset/
│   └── generator.js                  # Training data generator (CSV, 10 JSONL domains, prompts, 3D)
├── training/
│   └── training-manager.js           # 4 queues: training / retraining / evaluation / feedback
├── validation/
│   └── dataset-validator.js          # Dataset versioning, coverage, readiness
├── adapters/
│   ├── csv-adapter.js                # CSV → EGT migration (idempotent, pre-indexed ~10s)
│   ├── edl-adapter.js                # EngineeringDataLayer → EGT migration
│   ├── continuous-learning-adapter.js# continuous-learning.json → EGT migration
│   └── kb-adapter.js                 # kb-projects.json → EGT migration
└── api/
    └── routes.js                     # 20+ endpoints under /api/v1/uets/*
```

## Quick Start

```js
const { UnifiedTrainingSystem } = require('./packages/uets');

const uets = new UnifiedTrainingSystem();
uets.initialize();

// EGT creation
const egt = uets.createEGT({ description: 'Villa in Riyadh', ... });

// Validation
uets.validateEGT(egt);              // { valid, errors, score }
uets.checkConsistency(egt);         // { checks, overallScore, passed }
uets.checkIntegrity(egt);           // integrity status
uets.calculateCompleteness(egt);    // 0-100

// Training queues
uets.enqueueTraining(['costEstimator'], { force: true });
uets.enqueueRetraining('low-accuracy', { models: [...] });
uets.enqueueEvaluation('benchmark', { results });
uets.enqueueFeedback({ type: 'decision', projectId, ... });
uets.startAutoRetrain(30 * 60 * 1000);

// Dataset versioning
uets.createDatasetVersion('Snapshot', 'description');
uets.getDatasetVersions();
uets.getReadinessReport();

// Persistence
uets.save();
```

## API Endpoints (`/api/v1/uets/*`)

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/status` | System status (version, records, queues) |
| GET | `/stats` | Record breakdown by project type / source |
| POST | `/egt` | Create a single EGT |
| POST | `/egt/batch` | Create multiple EGTs |
| GET | `/egt/:uuid` | Fetch one EGT |
| GET | `/egt` | Query EGTs (filters) |
| POST | `/validate` | Validate a single EGT |
| POST | `/validate/integrity` | Integrity check on dataset |
| POST | `/validate/consistency` | Consistency check on dataset |
| POST | `/validate/coverage` | Coverage analysis |
| POST | `/validate/readiness` | Training readiness report |
| POST | `/validate/ground-truth` | Cross-model consistency vs EGT ground truth (z-score per dimension) |
| POST | `/generate-csv` | Generate CSV training data from EGT |
| POST | `/generate-jsonl` | Generate JSONL for a domain |
| POST | `/jsonl/write` | Write all 10 JSONL domains to disk (`data/uets/jsonl`) for the Python pipeline |
| POST | `/generate-prompts` | Generate image prompts for an EGT |
| POST | `/training/enqueue` | Enqueue model training |
| POST | `/retraining/enqueue` | Enqueue retraining |
| POST | `/evaluation/enqueue` | Enqueue evaluation |
| POST | `/feedback` | Enqueue feedback |
| POST | `/auto-retrain/start\|stop` | Auto-retrain control |
| GET | `/versions` | List dataset versions |
| POST | `/version/create` | Create a dataset version |
| GET | `/versions/diff` | Diff two versions |
| POST | `/migrate/csv` | Run CSV → EGT migration |
| POST | `/save` | Persist repository to disk |

## Integration Points (backward compatible)

| Existing module | Added method | Purpose |
|-----------------|--------------|---------|
| `training-data-bridge.js` | `loadFromUETS(uets)` | Supplement CSV data with EGT-derived records |
| `knowledge-dataset-loader.js` | `recomputeFromUETS(uets)` | Rebuild aggregates from EGT |
| `retraining-orchestrator.js` | `setUETS(uets)` + `retrainViaUETS()` | Train via UETS queue pipeline |
| `learning-feedback-engine.js` | `setUETS(uets)` | Forward decisions to UETS FeedbackQueue |
| `selective-retraining.js` | `setUETS(uets)` | Forward analyses to UETS EvaluationQueue |
| `models/trainer.js` | `trainAllModelsFromUETS(uets)` | Train all 7 models via UETS |
| `data-standards.js` | `validateEGT(egt)` | EGT schema validation |
| `data-quality-pipeline.js` | `runUETSCheck(uets)` | Full EGT quality/integrity check |
| `training-collector.js` (vision) | `collectFromEGT(uets)` | Seed vision training data from EGT |
| `training-platform/integration.js` | `importFromEGT(uets)` | Import EGT gallery records |
| `server.js` | — | Initialization, routes, 60s auto-save, SIGINT/SIGTERM save, startup JSONL write |
| `dataset/generator.js` | `writeJSONLToDisk(dir, egts)` | Persist 10 JSONL domains (train/val split) for the Python pipeline |

### Server wiring

`POST /api/v1/retraining/orchestrate` accepts `{ useUETS: true }` to run retraining via UETS
(trains models → runs benchmark → enqueues evaluation + feedback).

`GET /api/v1/phases/status` includes a `uets` field reporting version, record count, readiness
grade, and queued training count.

### Python AI training integration (Step 3.3)

At startup the server writes UETS JSONL datasets to `data/uets/jsonl/<domain>/{training,validation}.jsonl`
(10 domains: contract_ai, cost_ai, drawing_ai, engineering_llm, planning_ai, quality_ai, quantity_ai,
risk_ai, safety_ai, procurement_ai). The Python side (`packages/ai-training/`) consumes them:

- `config.py` — `UETS_DIR = <root>/data/uets/jsonl`.
- `dataset.py` — `load_uets_datasets(tokenizer, max_length)` builds `DatasetDict`s from UETS JSONL;
  `load_all_datasets_with_uets()` merges legacy + UETS (UETS is authoritative per domain).
- `run_pipeline.py` — new `STEP 1.5: Import UETS Engineering Ground Truth Datasets` copies the JSONL
  into the standard `packages/datasets/` layout so `train.py` trains on EGT-derived data unchanged.
  Flags: `--import-uets` (copy UETS data), `--overwrite-uets` (replace existing datasets).

The JSONL sample format (`system`/`instruction`/`output`, Arabic `<|system|>/<|user|>/<|assistant|>`
template) is directly compatible with `format_instruction()` in `dataset.py` — no format change needed.
Execution is environment-gated (requires GPU + installed transformers/datasets), so the integration is
static code only.

## EGT Schema (top-level fields)

`uuid, version, source, originalId, createdAt, updatedAt, description (ar/en), projectUnderstanding,
classification, geometry, location, boq[], cost, schedule, risks[], quality, images, navigation,
digitalTwin, materials[], suppliers[], constructionSequence[], lessonsLearned, validation,
confidence, tags`

## Persistence

| File | Contents |
|------|----------|
| `data/uets/egt-repository.json` | All EGT records (indexed + serialized) |
| `data/uets/dataset-versions.json` | Immutable dataset versions + coverage |
| `data/uets/training-state.json` | Training/retraining/evaluation/feedback queues |
| `data/uets/jsonl/<domain>/` | 10 JSONL domains (train/val) for the Python pipeline |

## Migration sources

- **CSV**: `packages/databases/training/csv/*.csv` (projects, BOQ, risks, quality, material prices) — idempotent (dedups by `originalId`+`source`, safe on every boot)
- **EDL**: `data/edl-state.json` (live project state, persisted every 60s)
- **Continuous learning**: `data/continuous-learning.json` (approved projects, price trends, feedback)
- **Knowledge base**: `data/kb-projects.json` (via `fromKB`)

## Guardrails

- Never delete or rename an existing API endpoint.
- Never change a model `.train()` or `.estimate*()` signature.
- UETS failures are non-fatal (wrapped in try/catch at every integration point).
