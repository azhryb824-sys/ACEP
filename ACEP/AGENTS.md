# ACEP Project — Agent Summary

## Architecture

ACEP is a full-stack construction AI platform with:
- **Node.js Express server** (`server.js`, port 3000) — main API gateway
- **AI Engine** (`packages/ai-engine/`) — type classification, structure inference, MEP inference, stage classification, BOQ analysis, profiling, 10-phase knowledge-driven decision system
- **Vision AI** (`packages/vision-ai/`) — real image/video generation via FLUX (HF Inference or Gradio Space), DALL-E (OpenAI), Stable Diffusion (local), Together AI
- **Vision Training** (`packages/vision-training/`) — model training pipeline
- **AI Training** (`packages/ai-training/`) — FastAPI-based AI training server (port 8000)
- **AI Services** (`packages/ai-services/`) — 9 TypeScript microservices (LLM, Embeddings, Vision, Document Analyzer, OCR, Speech, Simulation, BIM Parser, CAD Parser)
- **UI** (`packages/ui/web/index.html`) — single-page React-like web app
- **UETS** (`packages/uets/`) — Unified Engineering Training System v1.0.0 (single source of engineering truth for all 7 statistical models + Vision/Python AI training)

## UETS (Unified Engineering Training System)

Single Source of Engineering Truth: all training data normalized into a 55+ field **Engineering Ground Truth (EGT)** schema per project. Layered on top of existing system — **no API breaks, no deletions, no data duplication** (fail → system runs exactly as before).

- Entry: `packages/uets/index.js` → `new UnifiedTrainingSystem()` (singleton), exposed as `app.locals.uets`.
- **Core**: `core/engineering-ground-truth.js` (schema), `core/egt-factory.js` (CSV/EDL/KB/continuous-learning/profile → EGT), `core/egt-repository.js` (10,000 records persisted to `data/uets/egt-repository.json`), `core/egt-validator.js` (schema/consistency/integrity/completeness).
- **Dataset Generator**: `dataset/generator.js` → CSV + 10 JSONL domains + image prompts + 3D params from EGT. `writeJSONLToDisk(dir, egts)` persists all 10 domains (train/val split) to `data/uets/jsonl/` at server startup for the Python pipeline.
- **Training Manager**: `training/training-manager.js` → 4 queues (training/retraining/evaluation/feedback), auto-retrain, state in `data/uets/training-state.json`.
- **Dataset Validator**: `validation/dataset-validator.js` → versioning (latest: v4.0.0), coverage, readiness; `data/uets/dataset-versions.json`.
- **Adapters**: `adapters/csv-adapter.js` (`migrateAllToEGT()`, idempotent — dedups by `originalId`+`source`), `adapters/edl-adapter.js`, `adapters/continuous-learning-adapter.js`, `adapters/kb-adapter.js` (`data/kb-projects.json` → EGT).
- **Repo query note**: `core/egt-repository.js` `query()` supports `originalId`/`uuid` filters (dedup correctness). CSV migration is pre-indexed by project_id (no O(N×M) nested filters) — full 10k-project migration takes ~10s.
- **API**: `api/routes.js` → 20+ endpoints under `/api/v1/uets/*` (status, EGT CRUD, generate-csv/jsonl/prompts, training enqueue, versions, validate/integrity/consistency/coverage/readiness, migrate/csv, save).
- **Integration** (backward compatible):
  - `packages/ai-engine/training-data-bridge.js` → `loadFromUETS(uets)` supplements CSV data with EGT-derived data (deduped by project_id/item_code).
  - `packages/ai-engine/knowledge-dataset-loader.js` → `recomputeFromUETS(uets)` rebuilds aggregates from EGT.
  - `packages/ai-engine/retraining-orchestrator.js` → `setUETS(uets)` + `retrainViaUETS()`.
  - `packages/ai-engine/learning-feedback-engine.js` → `setUETS(uets)`; forwards decisions to UETS FeedbackQueue.
  - `packages/ai-engine/selective-retraining.js` → `setUETS(uets)`; forwards analyses to UETS EvaluationQueue.
  - `packages/ai-engine/models/trainer.js` → `trainAllModelsFromUETS(uets)` trains all 7 models via UETS.
  - `packages/ai-engine/shared-constants.js` → EGT constants (`EGT_VERSION`, `EGT_PROJECT_TYPES`, `normalizeProjectType`, etc.).
  - `packages/ai-engine/data-standards.js` → `validateEGT(egt)`; `egt` schema added (9 schemas total).
  - `packages/ai-engine/data-quality-pipeline.js` → `runUETSCheck(uets)` full EGT quality/integrity/consistency check.
  - UETS core `validateAgainstGroundTruth(projectData)` → cross-model consistency vs EGT historical aggregates (`POST /api/v1/uets/validate/ground-truth`, z-scores for area/floors/cost/schedule).
  - `packages/vision-ai/training/training-collector.js` → `collectFromEGT(uets)` seeds vision training data from EGT prompts.
  - `packages/training-platform/integration.js` → `importFromEGT(uets)` imports EGT gallery records.
  - `packages/ai-training/` (Python) → Step 3.3: `config.py` `UETS_DIR`; `dataset.py` `load_uets_datasets()` + `load_all_datasets_with_uets()` (UETS authoritative per domain); `run_pipeline.py` `STEP 1.5 Import UETS` copies JSONL into `packages/datasets/` so `train.py` trains unchanged. Flags: `--import-uets`, `--overwrite-uets`. Server writes JSONL to `data/uets/jsonl/<domain>/{training,validation}.jsonl` on startup + `POST /api/v1/uets/jsonl/write`. Environment-gated (GPU only) — static integration, no execution.
  - `server.js` → EDL + ContinuousLearning + KB adapters run at startup (Step 4.3); `POST /api/v1/uets/vision/collect` + `POST /api/v1/uets/vision/import` + `POST /api/v1/uets/jsonl/write` endpoints; `setUETS` wired to orchestrator/feedback/selective-retraining.
  - `POST /api/v1/retraining/orchestrate` accepts `{ useUETS: true }` → runs retraining via UETS queue pipeline (train → benchmark → evaluation → feedback); default remains `retrainAll()`.
  - `/api/v1/phases/status` reports `uets` field.
- **Persistence**: server auto-saves UETS every 60s + on SIGINT/SIGTERM.

## Vision AI Provider Pipeline

Provider priorities (highest first):
1. **flux** (priority 10) — `packages/vision-ai/providers/flux.js` → `flux_local.py`
2. **dalle** (priority 8) — requires `OPENAI_API_KEY`
3. **stable-diffusion** (priority 5) — local server at `STABLE_DIFFUSION_URL`

### FLUX Provider (`packages/vision-ai/providers/flux.js`)
- Tries Replicate API (`REPLICATE_API_KEY`) first; on 402 (insufficient credit) falls to Python script
- Calls `flux_local.py` via `execFile` with temp JSON config file
- `flux_local.py` tries two methods:
  1. `huggingface_hub.InferenceClient.text_to_image()` — fast (~6s), uses monthly HF free credits
  2. `gradio_client.Client()` → `black-forest-labs/FLUX.1-schnell` Space — free (~8s), uses ZeroGPU quota
- Output is PNG with magic-byte detection (no more hardcoded `image/png`)

### Stable Diffusion (`packages/vision-ai/providers/stable-diffusion.js`)
- Expects AUTOMATIC1111-compatible API at configurable URL (default: http://localhost:7860)
- Local server: `packages/vision-ai/sd_server.py` loads `D:\models\sd15.safetensors` (4.26GB, from `v1-5-pruned-emaonly`)
- CPU-only generation (~37s/step, impractical for production)
- Uses `enable_attention_slicing()` instead of `enable_model_cpu_offload()` (no GPU)

### Image Format Detection
- `image-engine.js` `detectFmt(buf)`: reads buffer magic bytes (PNG: `89 50 4E 47`, JPEG: `FF D8 FF`, WebP: `RIFF`)
- `flux.js` `detectMimeType(buffer)`: same logic for Replicate output
- No more mislabeled JPEG-as-PNG files

### Storage Route (`packages/vision-ai/api/routes.js`)
- Properly serves nested project-based paths under `/vision-ai/storage/`
- Path traversal protection (rejects `..` and `~`)

## Key Modules

### StageClassifier (`packages/ai-engine/project-understanding/stage-classifier.js`)
- Implements 10-stage taxonomy: Studies, Design, Foundation, Construction, Building Completion, MEP, Finishing, Furnishing, Testing, Handover
- Multi-factor analysis: description keywords, BOQ items, building data, MEP systems, stage override
- Returns structured JSON with `primary_stage`, `stage_percentages`, `confidence`, `reasoning`, `evidence`
- Integrated into `boq-knowledge-base.js detectPhase()` and `ai-project-visualizer.js _analyzeProjectPhase()`

### TypeClassifier (`packages/ai-engine/project-understanding/type-classifier.js`)
- Evidence-based project type detection (no defaults)
- Analyzes description, name, BOQ, building data
- Confidence scoring with source quality weighting

### ProjectProfiler (`packages/ai-engine/project-understanding/project-profiler.js`)
- Orchestrates TypeClassifier, StructureInference, MEPInference
- Builds comprehensive digital profile with no assumptions

### ImageGenerationEngine (`packages/vision-ai/engines/image-engine.js`)
- `buildPrompt()` — rich professional prompts from project analysis data (BOQ, stage, type, description, style, structure, finishing, climate, materials)
- `generate()` — real provider pipeline via `ModelAbstractionLayer.generateWithFallback()`
- `_generateImageToImage()` — supports image-to-image via Stable Diffusion
- Image verification (rejects SVG, empty, <1KB images)

### ModelAbstractionLayer (`packages/vision-ai/model-abstraction.js`)
- Provider registry: flux (10), together (9), dalle (8), stable-diffusion (5), runway (video, 10)
- `generateWithFallback()` — tries providers in priority order, throws real errors if all fail

### VisionAI API Routes (`packages/vision-ai/api/routes.js`)
- `POST /api/v1/vision-ai/generate` — real pipeline via VisionAICore
- `POST /api/v1/vision-ai/interior/exterior/drone/concepts/video/before-after/phase-sequence`
- `GET /api/v1/vision-ai/status/:generationId` — job status polling
- `GET /api/v1/vision-ai/providers` — list active providers

## Environment Variables Required
- `REPLICATE_API_KEY` — for FLUX via Replicate (currently 402 insufficient credit)
- `HF_TOKEN` — for HuggingFace InferenceClient + Gradio Space
- `HF_HOME` — model cache directory (D:\huggingface)
- `TOGETHER_API_KEY` — recommended: free FLUX.1-schnell via Together AI (sign up at https://api.together.ai)
- `OPENAI_API_KEY` — for DALL-E (optional, not set)
- `STABLE_DIFFUSION_URL` — for local SD (optional, default: http://localhost:7860)

## Known Quota Limits
- **Together AI Free**: FLUX.1-schnell-Free endpoint, rate-limited but indefinitely free (no credit card)
- **Replicate**: 402 insufficient credit (needs paid top-up)
- **HF InferenceClient**: monthly free credits (~1 generation before exhaust)
- **HF Gradio Space ZeroGPU**: 0s left (resets daily; PRO gives 40 min/day)
- **SD local CPU**: ~37s/step (impractical without GPU)

## Provider Priority
1. FLUX (local Python script → HF InferenceClient → Gradio Space)
2. Together AI (FLUX.1-schnell-Free via API — needs TOGETHER_API_KEY)
3. DALL-E 3 (needs OPENAI_API_KEY)
4. Stable Diffusion (local CPU server at localhost:7860)

## 10-Phase Engineering Foundation Program

The platform now implements a 10-phase program to transform ACEP from code-driven to knowledge-driven:

| Phase | File | Purpose |
|-------|------|---------|
| P1 | `AI-AUDIT-REPORT-COMPLETE.json` | Audit report mapping all 39 layers |
| P2 | `knowledge-dataset-loader.js` | Statistical aggregates from 9 CSV files (19 project types, 168 BOQ items) |
| P3 | `data-standards.js` | 8 JSON schemas, unit normalization, 5 finishing levels |
| P4 | `data-quality-pipeline.js` | Dataset quality checks, anomaly detection, consistency checks |
| P5 | `knowledge-growth-system.js` | Approved project recording, feedback analysis, coverage reports |
| P6 | `benchmark-library.js` | AI predictions vs CSV historical data comparison, accuracy metrics |
| P7 | `unified-knowledge-base.js` | Merged CSV + KB + recorded projects into single queryable KB |
| P8 | `periodic-evaluation.js` | Scheduled benchmarks, quality checks, growth checks |
| P9 | `selective-retraining.js` | Weak area detection (low accuracy/samples/high MAPE), retraining triggers |
| P10 | `knowledge-driven-decisions.js` | Historical-data-first decision engine with fallback to AI |

### API Endpoints Added
- `POST /api/v1/benchmark-library/run` — run benchmark against CSV data
- `GET /api/v1/benchmark-library/results` — last benchmark results
- `GET /api/v1/knowledge-base/query` — unified query across CSV+KB+recorded
- `GET /api/v1/knowledge-base/search` — full-text search across all sources
- `POST /api/v1/evaluation/run` — manual evaluation run
- `POST /api/v1/evaluation/auto/start` — start automatic periodic evaluation
- `POST /api/v1/retraining/analyze` — detect weak areas
- `POST /api/v1/retraining/run` — execute retraining
- `POST /api/v1/decisions/evaluate` — knowledge-driven decision

### Key Design Principle
P10 (KnowledgeDrivenDecisions) implements a **historical-data-first** approach:
1. Check CSV historical averages first (if ≥10 samples, use with confidence)
2. Use AI engine as fallback if historical data insufficient
3. Cross-reference with similar projects from Unified KB
4. Only apply decision when confidence exceeds configurable threshold (default 0.6)

## Admin Dashboard
- `GET /phases-admin` — single-page UI showing all 10 phases status, with buttons to run benchmarks, evaluations, retraining, and decisions, plus tabs for logs

## Summary of API Endpoints Added (Phases 6-10)

| Phase | Method | Path | Purpose |
|-------|--------|------|---------|
| P6 | POST | `/api/v1/benchmark-library/run` | Run benchmark vs CSV data |
| P6 | POST | `/api/v1/benchmark-library/compare` | Compare AI model vs historical data |
| P6 | GET | `/api/v1/benchmark-library/results` | Last benchmark results |
| P6 | GET | `/api/v1/benchmark-library/trends` | Benchmark trends over time |
| P6 | GET | `/api/v1/benchmark-library/stats` | Benchmark library stats |
| P7 | POST | `/api/v1/knowledge-base/query` | Unified query across CSV+KB+recorded |
| P7 | GET | `/api/v1/knowledge-base/summary/:type` | Summary for a project type |
| P7 | GET | `/api/v1/knowledge-base/search` | Full-text search |
| P7 | GET | `/api/v1/knowledge-base/statistics` | KB statistics |
| P7 | POST | `/api/v1/knowledge-base/clear-cache` | Clear query cache |
| P8 | POST | `/api/v1/evaluation/schedule` | Create evaluation schedule |
| P8 | GET | `/api/v1/evaluation/schedules` | List schedules |
| P8 | POST | `/api/v1/evaluation/run` | Run evaluation now |
| P8 | POST | `/api/v1/evaluation/auto/start\|stop` | Auto evaluation control |
| P8 | GET | `/api/v1/evaluation/history` | Evaluation history |
| P8 | GET | `/api/v1/evaluation/latest` | Latest evaluation |
| P8 | GET | `/api/v1/evaluation/stats` | Evaluation statistics |
| P9 | POST | `/api/v1/retraining/analyze` | Analyze weak areas |
| P9 | POST | `/api/v1/retraining/run` | Execute retraining |
| P9 | GET | `/api/v1/retraining/thresholds` | Get thresholds |
| P9 | POST | `/api/v1/retraining/thresholds` | Set thresholds |
| P9 | GET | `/api/v1/retraining/history` | Retraining history |
| P9 | GET | `/api/v1/retraining/stats` | Retraining stats |
| P10 | POST | `/api/v1/decisions/evaluate` | Knowledge-driven decision |
| P10 | GET | `/api/v1/decisions/config` | Get config |
| P10 | POST | `/api/v1/decisions/config` | Set config |
| P10 | GET | `/api/v1/decisions/history` | Decision history |
| P10 | GET | `/api/v1/decisions/stats` | Decision statistics |
| - | GET | `/api/v1/phases/status` | All 10 phases unified status |
| - | GET | `/api/v1/phases/persist` | Save phase state to disk |
| - | GET | `/phases-admin` | Admin dashboard UI |

## Files Changed This Session
- `packages/ai-training/train.py` — guarded unused `trl` import (no longer required); `setup_model()` now transformers-v5 compatible (`dtype`/`quantization_config` instead of deprecated `load_in_4bit`/`torch_dtype` kwargs), preserves 4-bit GPU path; `load_best_model_at_end`/`EarlyStoppingCallback` now tied to `eval_strategy != "no"`.
- `packages/ai-training/config/cpu-uets-smoke.json` — NEW: CPU-feasible smoke config (Qwen2.5-0.5B, fp32, LoRA r8, max_steps 40, batch 1, seq 256). **Smoke run: 40/40 steps @ ~4.4s/it CPU, loss 2.70→1.50, 2.9 min; adapter saved `packages/ai-training/models/acep-uets-cpu-smoke/`; inference produces valid Arabic cost estimates** (full UETS→train→save→infer chain validated on this machine; full 7B run still requires GPU).
- `packages/ai-training/config/cpu-uets-extended.json` — NEW: extended CPU config (same model, max_steps 300). **Run: 300/300 steps, 36.1 min, loss 2.74→0.29; adapter `models/acep-uets-cpu-extended/`; inference outputs structured Arabic engineering answers (cost/risk/schedule templates learned from UETS).** Note: bitsandbytes 0.50 supports 4-bit on CPU but training is ~3 min/step (impractical); fp32 is the only viable CPU path.
- `packages/ai-training/config/cpu-uets-continue-600.json` — NEW: continued CPU training (resume from step 301 → 600 total). **Run: 600 steps, 28.6 min, avg train_loss 0.72→0.19; adapter `models/acep-uets-cpu-continue-600/`; inference yields detailed structured Arabic outputs (cost/m², total cost, duration, labor/material %, market reference).** Resume pattern: copy checkpoint, remove `scheduler.pt` so optimizer+scheduler reset while trained weights load (transformers v5 restores them together otherwise).
- `packages/ai-training/colab/` — **Colab training kit** for UETS. `uets_colab_bundle.zip` (181KB: 10-domain UETS JSONL + `train_uets_colab.py` + `README_colab.md`; rebuilt with Python zipfile — forward slashes, 22 entries, 0 backslashes — after `Compress-Archive` corruption), `uets_colab.ipynb` (6 cells: install deps → upload zip → extract → train → download), `_build_notebook.py` (regenerates the notebook). `train_uets_colab.py` is self-contained 4-bit QLoRA (Qwen2.5-7B default, T4-compatible, assistant-only loss masking, `--drive` saves adapter to Google Drive). **Verified end-to-end locally (fp32 0.5B, `--no-quantize`): EXIT 0, adapter saved, Arabic inference output.** Fixes applied: `collect_samples` keys are `training`/`validation` (not `train`); device auto-detect (`bf16/fp16`/`paged_adamw_8bit` only on GPU, else fp32/`adamw_torch`); `gradient_checkpointing` auto (True only on GPU — on CPU it costs ~15x speed: 55s/step→3.75s/micro-batch); removed `domain` field from encoded records (collator crash); `dataloader_num_workers=0` on CPU (Windows hang); `--no-quantize` flag for CPU smoke tests — fp32 path loads WITHOUT `device_map` (avoids accelerate offload hooks that break both training backward "expected device meta" and `PeftModel.from_pretrained` `KeyError 'base_model.model.model.embed_tokens'`); inference check loads base `device_map="auto"`+bf16 on GPU / natural fp32 on CPU; prints `[UETS] Config:` args at startup. New `--no-eval` flag: CPU eval every 100 steps is very slow (500 validation forward-pass samples, ~20 min/block on CPU), so disable it for CPU runs (Colab keeps eval on GPU). New `--resume-from <ckpt>` flag (passes `resume_from_checkpoint`); note transformers v5 does NOT auto-resume from `output_dir` — explicit checkpoint is required, a fresh `trainer.train()` always restarts from step 0. Note: local 4-bit CPU works but hangs after ~30 steps (bitsandbytes CPU flakiness) — fp32 is the only reliable local path; Colab T4 GPU unaffected. **Local training outcome (this machine: 16.9GB RAM, mostly occupied by other apps, ~1-4GB free, CPU-only): fp32 0.5B runs OK for ~500-800 steps then the OS starts swapping and per-step time collapses (5s/step → 60-185s/step, ETA days) — the machine cannot sustain long fp32 training. Final local deliverable: `D:\uets-adapter-local` = QLoRA adapter harvested from the highest checkpoint (`D:\uets_train\training_output\checkpoint-800`, ~800 steps, r16/seq256 fp32), VERIFIED: loads and produces structured Arabic cost estimates (500m² villa → ~14.32M SAR).** Local opencode cannot run Colab sessions — the user runs the notebook on colab.research.google.com.
- `D:\uets-adapter-local` — **local QLoRA adapter** (Qwen2.5-0.5B base, **2000 steps**, fp32, LoRA r16) — resumed from `checkpoint-800` → completed 2000 steps (`--resume-from training_output\checkpoint-800 --max-steps 2000 --max-seq 128 --save-steps 50/100 --no-quantize --no-eval`), final `train_loss 0.22`, 115.9 min, harvested from `D:\uets_train\training_output\checkpoint-2000` (final adapter also at `D:\uets_train\uets-adapter-resume2`). **Verified (verify.py): loads, 0 trainable at inference, produces structured Arabic cost estimates** — villa 500m² Riyadh → 12,740,000 ر.س (3,968 ر.س/م²); 20-floor tower → 13,450,000 ر.س. Note on resume runs: `save_total_limit=2` keeps the two newest checkpoints; the process can die silently on this 16GB machine (~2-4GB free) mid-run — the checkpoint just before death is still safe (one earlier resume died at step 890 with nothing saved; a later stable run reached 2000). Working copy of the ACEP repo is now `D:\مقاولات إلكترونية 2` (C: copy deleted to free disk).
- **«سند قبض» PDF generator** — `gen_sand_qabd.py` (reportlab + arabic_reshaper + python-bidi + Tahoma TTF, A4, RTL): recreates the contractor's «مستخلص مالي» PDFs as proper payment receipts in `Downloads/`: `سند قبض RCT-1785674485420.pdf` (25,000 ر.س، عقد CONT0042) and `سند قبض RCT-1785746892070.pdf` (20,000 ر.س). Latin values (RCT/CONT/amount/date) verified present in the content stream; amount-in-words correct (خمسة وعشرون ألف / عشرون ألف), no doubled currency.
- `packages/vision-ai/providers/together.js` — NEW: Together AI FLUX provider (OpenAI-compatible API)
- `packages/vision-ai/providers/flux_local.py` — rewritten: INFERENCE → GRADIO SPACE fallback chain, stdout suppression for gradio_client
- `packages/vision-ai/providers/flux.js` — resolution cap 512→1024, detectMimeType() for format detection
- `packages/vision-ai/engines/image-engine.js` — detectFmt() for magic-byte format detection
- `packages/vision-ai/api/routes.js` — storage handler fixed for nested paths, EDL-based UPM building
- `packages/vision-ai/model-abstraction.js` — added together provider (priority 9), flux priority 10, SD priority 5; singleton pattern
- `packages/vision-ai/sd_server.py` — load from single .safetensors, CPU-only fallback
- `packages/vision-ai/engines/post-generation-analyzer.js` — REAL CV analysis via sharp
- `packages/vision-ai/engines/3d-engine.js` — reads BOQ items from EDL, maps materials to structural categories
- `packages/ai-engine/engineering-data-layer.js` — added persist()/load(), getUPMSources/get3DParams/addConflict
- `packages/ai-engine/ai-orchestrator.js` — _step3DNavigation calls actual 3D engine when navEngine provided
- `server.js` — orchestrator gets navEngine (3D engine), EDL persistence (60s + shutdown), /api/v1/orchestrate/analyze with projectParams
- `packages/vision-context-builder.js` — uses EDL getEffective() instead of manual priority resolution; falls back to legacy store
- `packages/vision-ai/shared/format-detection.js` — NEW: shared format detection (magic bytes for PNG/JPEG/WebP/GIF/BMP/TIFF)
- `packages/vision-ai/engines/image-engine.js` — uses shared detectExtension instead of inline detectFmt
- `packages/vision-ai/providers/flux.js` — uses shared detectMimeType instead of inline detectMimeType
- `packages/vision-ai/providers/together.js` — uses shared detectMimeType instead of inline _detectMimeType

## PostGenerationAnalyzer (`packages/vision-ai/engines/post-generation-analyzer.js`)
- Real CV analysis via `sharp` (installed in `packages/vision-ai/node_modules/`)
- **Image Validity**: magic-byte detection (PNG/JPEG/WebP/GIF/BMP/TIFF), rejects unknown/empty (<256 bytes)
- **Image Dimensions**: reads actual width/height via `sharp().metadata()`, validates min 256px, checks aspect ratio against project type (tower=vertical, villa=horizontal, warehouse=wide)
- **Image Content**: brightness + standard deviation analysis; detects blank (stdev<5), too dark (<20), overexposed (>235)
- **Dominant Color**: extracts dominant RGB via `sharp().stats()`, compares against UPM paint color with color distance (Δ<150 = match)
- Style color palettes defined for Modern/Classical/Islamic/Contemporary/Minimalist
- Score: 60% threshold across 10 checks, with retry up to 3 attempts

## 3D Engine (`packages/vision-ai/engines/3d-engine.js`)
- Accepts EDL data via `aiData` param (boqItems, schedule, risks, quality, cost)
- MATERIAL_MAP: 9 material keywords mapped to categories (Structure/Architecture/Finishing/MEP) with colors
- `_detectMaterials(boqItems)`: scans EDL BOQ items, identifies materials by keyword, falls back to all defaults
- Structural elements (columns) only generated when Structure materials present
- Architectural elements (walls) only generated when Finishing/Masonry materials present
- Metadata includes real schedule duration, risk level, quality score, cost/m²

## EngineeringDataLayer (`packages/ai-engine/engineering-data-layer.js`)
- `persist(filePath)`: saves full EDL state to JSON file
- `load(filePath)`: restores EDL state from persisted JSON
- Server saves every 60s + on SIGINT/SIGTERM

## AI Orchestrator (`packages/ai-engine/ai-orchestrator.js`)
- `_step3DNavigation` now calls `this.navEngine.generateStructure()` if navEngine is provided
- Passes EDL boqItems, cost, schedule, risks, quality data to 3D engine
- Falls back gracefully if 3D engine fails or is not configured

## Knowledge Dataset Loader (`packages/ai-engine/knowledge-dataset-loader.js`)
- Loads CSV training data via TrainingDataBridge, computes statistical aggregates
- Standard quantities per project type: avg concrete/m2, steel/m2, blocks/m2, tiles/m2, paint/m2, electrical/m2, plumbing/m2 (with mean, median, min, max, stddev, sample count)
- Unit prices per BOQ item code: avg, median, min, max, stddev from 85K+ real items
- Material prices by city, labor rates by trade/city, equipment rates
- Project understanding profiles (common cities, finishing levels, avg area/floors/cost per type)
- Risk profiles by category, quality defect profiles by type
- **Replaces hardcoded data** in knowledge-engine/standard-quantities.js with real CSV-derived statistics
- Exposed via `/api/v1/knowledge-dataset/*` (8 read-only endpoints + export)
- Auto-loaded into `KnowledgeBaseEngine.standards` on startup

## Server (`server.js`)
- EDL persistence: auto-save every 60s to `data/edl-state.json`, load on startup
- Orchestrator receives `navEngine` from `packages/vision-ai/engines/3d-engine`
- `POST /api/v1/orchestrate/analyze` accepts `projectParams` field to seed EDL directly

## Intelligent Orchestrate Pipeline (`POST /api/v1/orchestrate/intelligent`)
- Runs the base pipeline (7 steps via AIOrchestrator.runFullPipeline)
- **Phase 1**: 5 validators in parallel (SemanticValidator, ConfidenceEngine, CrossModelValidator, BOQAuditor, DigitalTwin)
- **Phase 2**: DependencyEngine.buildFromProject() + DecisionGraph.buildFromEngineeringGraph() + buildFromKnowledgeGraph()
- **Phase 3**: EngineeringDecisionEngine.evaluate() — 10-question decision framework (BOQ logical, image matches, cost matches, etc.)
- **Phase 4**: ConsistencyScorer.scoreAll() — pair-wise cross-model consistency
- **Phase 5**: AutomaticRecalculation — checks if any element needs update
- **Phase 6**: EngineeringMemory.recordDecision() — stores orchestration verdict
- **Phase 7**: RecommendationEngine.generateAll() — comprehensive recommendations
- **Phase 8**: AISelfReview.review() — post-project root cause analysis
- **Phase 9**: MaturityMetrics.calculate() — 10-dimension maturity scoring
- **Phase 10**: ExplainableAI.generateTrace() — decision trace
- **Phase 11**: FinalReport.generate() — aggregates everything
- **Cross-modal**: VisionNavBridge.synchronizeProject() + BenchmarkExtension stats
- All 22 layers now execute in a single POST request

## TypeScript Microservices (`packages/ai-services/`)

All 9 services upgraded from mock-only to real implementations with API fallback:

| Service | Methods | Features |
|---------|---------|----------|
| **llm** | `generate()`, `analyze()`, `generateQuestions()`, `explain()` | 4 providers: openai, together, express-bridge, mock. Auto-fallback on API failure |
| **embeddings** | `generateEmbedding()`, `indexDocument()`, `searchSimilar()` | 3 providers: openai/text-embedding-3-small, together/BERT, synthetic hash. Real cosine similarity search |
| **vision** | `analyzeImage()`, `detectProgress()`, `identifyMaterials()` | Bridges to `/api/v1/vision-ai/generate`. Mock fallback with construction labels |
| **document-analyzer** | `analyzeDocument()`, `extractSpecifications()`, `extractContractTerms()` | Bridges to `/api/v1/analyze`. Arabic/English detection. BOQ keyword extraction |
| **ocr** | `extractText()`, `parseBOQ()`, `detectTables()` | 3 providers: Tesseract (node-tesseract-ocr), Express API, mock. Regex-based BOQ parsing with Arabic/English patterns |
| **speech** | `speechToText()`, `textToSpeech()`, `processVoiceCommand()`, `processTextCommand()` | 3 providers: OpenAI Whisper, Express API, mock. 6 intent patterns (cost, progress, materials, schedule, quality, risk) |
| **simulation** | `runSimulation()`, `compareScenarios()`, `generateReport()` | Engineering formulas for 19 project types, 4 finishing levels. Real cost/duration/risk calculations |
| **bim-parser** | `parseIFC()`, `extractSpaces()`, `convertToBOQ()` | IFC text/JSON parsing. Quantity takeoff formulas for Villa/Building/Tower |
| **cad-parser** | `parseDWG()`, `extractElements()`, `convertToBuildingModel()` | 23 standard CAD layer patterns (A-WALL, S-COLS, E-LITE, etc.). DXF parser. Virtual building model generation |

## Bug Fixes Applied

| Bug | File | Fix |
|-----|------|-----|
| Double retrain crash | `risk-analyzer.js`, `quality-inspector.js`, `schedule-optimizer.js`, `supplier-intelligence.js` | Reset accumulators at start of `train()` |
| `runGrowthCheck` not found | `periodic-evaluation.js`, `selective-retraining.js` | Replaced with `getKnowledgeGrowthReport()` |
| `quality?.score` undefined | `knowledge-driven-decisions.js:129` | Changed to `qScore` |
| `generateImprovementSuggestions` not found | `selective-retraining.js` | Replaced with `suggestDatasetUpdates()` |
| Duplicate provider registrations | `model-abstraction.js:47` | Added `if (this.providers.has(name)) return;` |
| Duplicate project in continuous-learning | `data/continuous-learning.json` | Removed duplicate proj-1784976600640 entry |
| 4 mock TODOs (DALL-E, SD, FLUX, ComfyUI) | `model-abstraction-layer.js` | Replaced with real HTTP API calls, mock fallback on failure |

## Benchmark Accuracy

| Metric | Current | Fix |
|--------|---------|-----|
| Quantity predictions | 100% | CSV historical averages |
| costEstimation | **87.05%** (ALL 19 types pass) | 3 formula bugs fixed in `cost-estimator.js` |
| scheduleEstimation | **99.66%** (ALL 19 types pass) | Normalized area/floor factors in `schedule-optimizer.js` |

**Bug fixes applied this session:**

| Bug | File:Line | Root Cause | Fix |
|-----|-----------|------------|-----|
| costEstimation 0.02% | `benchmark-library.js:159` | `historicalAvg * area` — but `avgCost.mean` is already total cost, not per-m² | Removed `* area` |
| costEstimation 37-19% (Hotel/Tower) | `cost-estimator.js:141-144` | `marketFactor = marketMatAvg / 300` inflated costs 2.2x using avg of incomparable units (SAR/m³ concrete + SAR/ton steel + SAR/m cable) | Removed `marketFactor` |
| costEstimation 37-19% (Hotel/Tower) | `cost-estimator.js:153` | `durationDays = months*22 * (floors/2)` double-counted floors — `durationMonths` already accounts for total duration | Removed `* (floors/2)` |
| costEstimation 37-19% (Hotel/Tower) | `cost-estimator.js:154` | `workers = totalArea * 0.003` used built-up area (area*floors) instead of per-floor area | Changed to `area * 0.003` |
| costEstimation 37-19% (Hotel/Tower) | `cost-estimator.js:165-166` | Same duration/area double-count for equipment | Fixed `equipDays` and `equipCount` |
| scheduleEstimation 47-84% MAPE | `schedule-optimizer.js:77-78` | `areaFactor` used fixed 5000m² baseline, `floorsFactor` used fixed 2-floor baseline — for avg Hotel (16320m², 23fl), factors were 1.93× and 2.68× | Changed to normalize against type-specific `areaMean` and `floorsAvg` so avg project gets ~1.0× |

## Environment Variables (.env.example exists)

| Variable | Required For | Default |
|----------|-------------|---------|
| `PORT` | Server | 3000 |
| `TOGETHER_API_KEY` | FLUX via Together AI (free) | — |
| `REPLICATE_API_KEY` | FLUX via Replicate | — |
| `HF_TOKEN` | HuggingFace Inference/Gradio | — |
| `OPENAI_API_KEY` | DALL-E + Whisper + TTS | — |
| `STABLE_DIFFUSION_URL` | SD local server | http://localhost:7860 |
| `COMFYUI_URL` | ComfyUI local server | http://localhost:8188 |
| `ACEP_ANALYSIS_URL` | AI service bridge | http://localhost:3000 |

## Test Status
- 76/76 unit tests (all 10 phases + models + double-retrain bug verification)
- 20/20 E2E HTTP tests (BOQ endpoints, project types, sessions)