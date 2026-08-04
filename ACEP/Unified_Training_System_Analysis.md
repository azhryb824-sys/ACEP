# Unified Engineering Training System (UETS) — Analysis Report

## تحليل نظام التدريب الموحد لمنصة ACEP

**التاريخ:** 2026-07-30  
**النسخة:** 1.0  
**الحالة:** تحليل كامل — لم يبدأ التنفيذ بعد

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Current System Architecture](#2-current-system-architecture)
3. [All Training Locations](#3-all-training-locations)
4. [All Data Locations](#4-all-data-locations)
5. [All Duplication Points](#5-all-duplication-points)
6. [All Conflict Points](#6-all-conflict-points)
7. [Data Flow Analysis by Model](#7-data-flow-analysis-by-model)
8. [Integration Plan](#8-integration-plan)
9. [Execution Plan](#9-execution-plan)
10. [Components to Restructure](#10-components-to-restructure)
11. [Components NOT to Modify](#11-components-not-to-modify)
12. [System Impact Analysis](#12-system-impact-analysis)
13. [UETS Architecture Design](#13-uets-architecture-design)
14. [Engineering Ground Truth Schema](#14-engineering-ground-truth-schema)
15. [Strict Rules & Constraints](#15-strict-rules--constraints)

---

## 1. Executive Summary

### 1.1 المشكلة الحالية (Current Problem)

منصة ACEP تعاني من **تشتت مصادر البيانات** و**تعدد أماكن التدريب** بشكل كبير. يوجد:

- **7 نماذج إحصائية** في `packages/ai-engine/models/` يتدرب كل منها من ملفات CSV بشكل مستقل
- **نظام رؤية** منفصل (`packages/vision-training/`) مع مجموعة بيانات صور خاصة به
- **منصة تدريب صور** منفصلة (`packages/training-platform/`) بقاعدة بيانات JSON خاصة
- **مولدات بيانات** مستقلة (`packages/ai-data-factory/`, `packages/databases/training/scripts/`)
- **ملفات CSV/JSON** مكررة في `packages/databases/training/csv/`, `packages/databases/training/json/`
- **10 مجموعات JSONL** منفصلة في `packages/datasets/` (contract_ai, cost_ai, drawing_ai, engineering_llm, planning_ai, procurement_ai, quality_ai, quantity_ai, risk_ai, safety_ai)
- **نظام تعلم مستمر** يكتب إلى `data/continuous-learning.json`
- **Base معرفة إنشائي** في `packages/construction-knowledge/` ببيانات hardcoded
- **قاعدة بيانات SQLite** للرؤية في `packages/vision-ai/storage/vision-ai.db`
- **EDL (Engineering Data Layer)** يخزن حالة المشاريع في `data/edl-state.json`

### 1.2 الحل المقترح (Proposed Solution)

بناء **Unified Engineering Training System (UETS)** الذي يصبح المصدر الوحيد لتدريب جميع نماذج ACEP. سيقوم UETS بـ:

1. **توحيد جميع مصادر البيانات** في هيكل `Engineering Ground Truth` واحد لكل مشروع
2. **جعل جميع النماذج تتدرب** من نفس البيانات الهندسية الموحدة
3. **إنشاء Training Pipeline** واحد يغذي جميع النماذج
4. **ضمان اتساق المخرجات** بين BOQ, Cost, Schedule, Image, 3D Navigation, Digital Twin

### 1.3 الإحصائيات الحالية (Current Statistics)

| المكون | العدد | الحجم التقريبي |
|--------|-------|----------------|
| ملفات CSV تدريبية | 9 | ~161,584 سجل |
| ملفات JSON تدريبية | 9 | ~161,584 سجل |
| مجموعات JSONL | 10 (30 ملف) | ~2,180 سجل |
| نماذج AI إحصائية | 7 | كلها تتدرب من CSV |
| خدمات TypeScript | 9 | لا تحتوي على تدريب |
| أنظمة الرؤية | 3 (vision-ai, vision-training, training-platform) | SQLite + JSON + صور |
| نقاط تخزين البيانات | 12+ | موزعة على كل المشروع |

---

## 2. Current System Architecture

### 2.1 Architecture Diagram Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│                        ACEP SERVER (server.js)                      │
│  Port 3000 — Express.js — 4119 lines, 150+ API endpoints            │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  ┌─────────────────────────┐    ┌──────────────────────────────┐    │
│  │   AI ENGINE (ai-engine) │    │   CONSTRUCTION KNOWLEDGE     │    │
│  │   ┌───────────────────┐ │    │   ┌────────────────────────┐ │    │
│  │   │ 7 Statistical     │ │    │   │ Project Types (18)     │ │    │
│  │   │ Models            │ │    │   │ Codes (200+)           │ │    │
│  │   │ - ProjectAnalyzer │ │    │   │ Materials (300+)       │ │    │
│  │   │ - QuantityEstim.  │ │    │   │ Elements (300+)        │ │    │
│  │   │ - CostEstimator   │ │    │   │ BOQ Items (500+)       │ │    │
│  │   │ - RiskAnalyzer    │ │    │   │ Phases (18)            │ │    │
│  │   │ - QualityInspector│ │    │   └────────────────────────┘ │    │
│  │   │ - ScheduleOptim.  │ │    └──────────────────────────────┘    │
│  │   │ - SupplierIntell. │ │                                        │
│  │   └───────────────────┘ │    ┌──────────────────────────────┐    │
│  │   ┌───────────────────┐ │    │   VISION AI (vision-ai)      │    │
│  │   │ TrainingDataBr.   │─│─→  │   ┌────────────────────────┐ │    │
│  │   │ KnowledgeDataset  │ │    │   │ 4 Providers            │ │    │
│  │   │ DataStandards     │ │    │   │ - Flux (Replicate)     │ │    │
│  │   │ DataQualityPipe   │ │    │   │ - Together AI          │ │    │
│  │   │ BenchmarkLibrary  │ │    │   │ - DALL-E 3             │ │    │
│  │   │ SelectiveRetrain  │ │    │   │ - Stable Diffusion     │ │    │
│  │   │ KnowledgeGrowth   │ │    │   └────────────────────────┘ │    │
│  │   │ PeriodicEval      │ │    │   ┌────────────────────────┐ │    │
│  │   │ KnowledgeDriven   │ │    │   │ 3D Engine (THREE.js)   │ │    │
│  │   │ RetrainOrchestr.  │ │    │   │ BOQ Linker             │ │    │
│  │   │ LearningFeedback  │ │    │   │ Schedule Linker        │ │    │
│  │   │ UnifiedKB         │ │    │   │ Navigator (6 modes)    │ │    │
│  │   └───────────────────┘ │    │   └────────────────────────┘ │    │
│  └─────────────────────────┘    │   ┌────────────────────────┐ │    │
│                                  │   │ TrainingCollector     │ │    │
│  ┌─────────────────────────┐    │   └────────────────────────┘ │    │
│  │ AI ORCHESTRATOR         │    └──────────────────────────────┘    │
│  │ - 11-step pipeline      │                                        │
│  │ - Cross-validation (5)  │    ┌──────────────────────────────┐    │
│  │ - EvidenceValidator     │    │   AI TRAINING (Python)       │    │
│  └─────────────────────────┘    │   FastAPI port 8000          │    │
│                                  │   - Qwen2.5-7B LoRA         │    │
│  ┌─────────────────────────┐    │   - 10 Domains              │    │
│  │ EDL (Engineering        │    │   - PyTorch + Transformers  │    │
│  │ Data Layer)             │    └──────────────────────────────┘    │
│  │ - Project state mgmt    │                                        │
│  │ - BOQ/Cost/Schedule/R   │    ┌──────────────────────────────┐    │
│  └─────────────────────────┘    │   9 TypeScript Services      │    │
│                                  │   - llm, embeddings, vision  │    │
│  ┌─────────────────────────┐    │   - document-analyzer, ocr   │    │
│  │ TRAINING PLATFORM       │    │   - speech, simulation       │    │
│  │ - Image dataset mgmt    │    │   - bim-parser, cad-parser   │    │
│  │ - DB: JSON files (10)   │    └──────────────────────────────┘    │
│  │ - Versioning/Splitting  │                                        │
│  └─────────────────────────┘                                        │
└─────────────────────────────────────────────────────────────────────┘
```

### 2.2 Current Training Data Flow

```
[CSV Files] ───→ TrainingDataBridge ───→ KnowledgeDatasetLoader ───→ 7 AI Models
                                                        │
                               ┌────────────────────────┘
                               ▼
                   BenchmarkLibrary / SelectiveRetraining / KnowledgeDrivenDecisions

[Generated Images] ───→ TrainingPlatform ───→ Dataset Split/Balance/Version ───→ Vision LoRA Training

[EDL Projects] ───→ TrainingDataBridge.addEDLRecord() ───→ Continuous Learning

[Continuous Learner] ───→ data/continuous-learning.json

[AI Data Factory (Python)] ───→ 10 JSONL Datasets ───→ Python AI Training (Qwen2.5-7B)
```

---

## 3. All Training Locations

### 3.1 Location #1: AI Engine Startup Training

| الخاصية | القيمة |
|---------|--------|
| **الملف** | `packages/ai-engine/index.js:33` |
| **الآلية** | `trainer.trainAllModels()` |
| **التوقيت** | عند بدء تشغيل السيرفر (كل مرة) |
| **ما يتم تدريبه** | 7 نماذج إحصائية |
| **مصدر البيانات** | 8 ملفات CSV من `packages/databases/training/csv/` |
| **الناتج** | إحصائيات متوسطات لكل نوع مشروع |
| **ملاحظات** | يستغرق 35-45 ثانية — كل نموذج يقرأ CSV منفصلاً |

### 3.2 Location #2: Each Model's `.train()` Method

| النموذج | الملف | السطر | البيانات المقروءة |
|---------|------|-------|-------------------|
| ProjectAnalyzer | `models/project-analyzer.js:17` | `train()` | `projects.csv` (21 columns, 10,000+ records) |
| QuantityEstimator | `models/quantity-estimator.js:24` | `train()` | `boq_items.csv` (85,063+ items) |
| CostEstimator | `models/cost-estimator.js:23` | `train()` | 4 CSVs: `material_prices.csv`, `labor_rates.csv`, `equipment_rates.csv`, `suppliers.csv` |
| RiskAnalyzer | `models/risk-analyzer.js:12` | `train()` | `risks.csv` (40,141+ records) + `projects.csv` |
| QualityInspector | `models/quality-inspector.js:12` | `train()` | `quality_defects.csv` (14,985+ records) |
| ScheduleOptimizer | `models/schedule-optimizer.js:25` | `train()` | `projects.csv` |
| SupplierIntelligence | `models/supplier-intelligence.js:13` | `train()` | `suppliers.csv` (125) + `material_prices.csv` (380) |

### 3.3 Location #3: Retraining Orchestrator

| الخاصية | القيمة |
|---------|--------|
| **الملف** | `packages/ai-engine/retraining-orchestrator.js:12` |
| **الآلية** | `retrainAll()` → calls `.train()` on each model |
| **التوقيت** | يدوي عبر API `/api/v1/retraining/orchestrate` |
| **API** | `POST /api/v1/retraining/orchestrate` |
| **ملاحظات** | يوجد أيضاً `retrainWeakAreas()` يستخدم SelectiveRetraining |

### 3.4 Location #4: Vision Training (LoRA Fine-Tuning)

| الخاصية | القيمة |
|---------|--------|
| **الملف** | `packages/vision-training/training/lora-trainer.js:37` |
| **الآلية** | `train()` → spawns Python `train_lora.py` |
| **مصدر البيانات** | صور من `packages/vision-training/dataset/datasets/` + `الصور/` |
| **الـ Base Model** | `stabilityai/stable-diffusion-xl-base-1.0` |
| **الإعدادات** | loraRank=16, learningRate=1e-4, steps=1000, resolution=1024 |
| **ملاحظات** | يعمل في mode simulation حالياً (لا يحتوي GPU) |

### 3.5 Location #5: Construction Pattern Training Script

| الخاصية | القيمة |
|---------|--------|
| **الملف** | `scripts/train_construction_patterns.js:14` |
| **الآلية** | تدريب LoRA على أنماط التشطيب |
| **مصدر البيانات** | مجلد `الصور/` (9 فئات: جبسمبورد، تكييف، سيراميك، رخام، شقق، فلل، مساجد، مستشفيات) |
| **الحالة** | simulation mode (`simulate: true`) |

### 3.6 Location #6: Python AI Training Server

| الخاصية | القيمة |
|--------|--------|
| **الملف** | `packages/ai-training/train.py` |
| **الآلية** | SFTTrainer من HuggingFace Transformers |
| **الـ Model** | Qwen2.5-7B-Instruct مع LoRA (rank=16) |
| **مصدر البيانات** | 10 JSONL datasets من `packages/datasets/` |
| **API** | FastAPI على port 8000 — `/train`, `/predict`, `/chat` |
| **الخدمة** | Docker خدمة `acep-api` مع GPU support |

### 3.7 Location #7: Continuous Learning (AI Orchestrator)

| الخاصية | القيمة |
|--------|--------|
| **الملف** | `packages/ai-engine/ai-orchestrator.js:310` |
| **الآلية** | `_stepContinuousLearning()` → `trainingBridge.addEDLRecord()` |
| **التوقيت** | بعد إكمال P5-P10 pipeline |
| **ما يتم تخزينه** | projectId, type, area, floors, boqItems, cost, schedule, risk, quality, conflicts |

### 3.8 Location #8: Continuous Learner (Knowledge Engine)

| الخاصية | القيمة |
|--------|--------|
| **الملف** | `packages/ai-engine/knowledge-engine/continuous-learner.js:32` |
| **الآلية** | `recordApprovedProject()` → saves to `data/continuous-learning.json` |
| **ما يتم تخزينه** | project + BOQ + cost data, price adjustments, execution feedback |

### 3.9 Location #9: Learning Feedback Engine

| الخاصية | القيمة |
|--------|--------|
| **الملف** | `packages/ai-engine/learning-feedback-engine.js:36` |
| **الآلية** | `recordDecision()` ← approve/reject/modify/skip |
| **ما يتم تخزينه** | decision logs, feedback summaries, rejection reasons |
| **API** | `POST /api/v1/learning/feedback/*` |

### 3.10 Location #10: Knowledge Growth System (P5)

| الخاصية | القيمة |
|--------|--------|
| **الملف** | `packages/ai-engine/knowledge-growth-system.js:13` |
| **الآلية** | `recordApprovedProject()` → `trainingBridge.addEDLRecord()` |
| **API** | `POST /api/v1/knowledge-growth/record-approval` |

### 3.11 Location #11: Training Platform (Image Dataset)

| الخاصية | القيمة |
|--------|--------|
| **الملف** | `packages/training-platform/integration.js:19` |
| **الآلية** | `captureGeneratedImage()` → saves to JSON database |
| **قاعدة البيانات** | 10 JSON collections في `packages/training-platform/data/` |
| **الميزات** | duplicate detection, dataset splitting, class balancing, versioning, certification |

### 3.12 Location #12: Training Data Collector (Vision)

| الخاصية | القيمة |
|--------|--------|
| **الملف** | `packages/vision-ai/training/training-collector.js` |
| **الآلية** | `recordApproval()` → saves to SQLite `vision_training_data` table |
| **قاعدة البيانات** | `packages/vision-ai/storage/vision-ai.db` |

---

## 4. All Data Locations

### 4.1 CSV Files (Training Data)

| # | المسار | السجلات | الأعمدة | يستخدم بواسطة |
|---|--------|---------|---------|---------------|
| 1 | `packages/databases/training/csv/projects.csv` | 10,001+ | 21 | ProjectAnalyzer, ScheduleOptimizer, RiskAnalyzer |
| 2 | `packages/databases/training/csv/boq_items.csv` | 85,063+ | 9 | QuantityEstimator |
| 3 | `packages/databases/training/csv/material_prices.csv` | 381+ | 6 | CostEstimator, SupplierIntelligence |
| 4 | `packages/databases/training/csv/labor_rates.csv` | 235+ | 4 | CostEstimator |
| 5 | `packages/databases/training/csv/equipment_rates.csv` | 157+ | 4 | CostEstimator |
| 6 | `packages/databases/training/csv/suppliers.csv` | 125+ | 6 | SupplierIntelligence, CostEstimator |
| 7 | `packages/databases/training/csv/risks.csv` | 40,141+ | 7 | RiskAnalyzer |
| 8 | `packages/databases/training/csv/quality_defects.csv` | 14,985+ | 8 | QualityInspector |
| 9 | `packages/databases/training/csv/project_understanding.csv` | ~500+ | 5 | KnowledgeDatasetLoader (غير مستخدم مباشرة بنموذج) |

### 4.2 JSON Files (Mirrored CSV Data)

| # | المسار | المحتوى |
|---|--------|---------|
| 1 | `packages/databases/training/json/projects.json` | نفس بيانات projects.csv (مكرر) |
| 2 | `packages/databases/training/json/boq_items.json` | نفس بيانات boq_items.csv (مكرر) |
| 3 | `packages/databases/training/json/material_prices.json` | مكرر + `material_prices_full.json` |
| 4 | `packages/databases/training/json/labor_rates.json` | مكرر + `labor_rates_full.json` |
| 5 | `packages/databases/training/json/equipment_rates.json` | مكرر + `equipment_rates_full.json` |
| 6 | `packages/databases/training/json/suppliers.json` | مكرر + `suppliers_full.json` |
| 7 | `packages/databases/training/json/project_understanding.json` | مكرر |
| 8 | `packages/databases/training/json/risks.json` | مكرر |
| 9 | `packages/databases/training/json/quality_defects.json` | مكرر |

### 4.3 JSONL Datasets (AI Training)

| # | المجال | train | test | val | الوصف |
|---|--------|-------|------|-----|-------|
| 1 | `contract_ai` | 160 | 20 | 20 | NER للعقود |
| 2 | `cost_ai` | 160 | 20 | 20 | تقدير التكاليف |
| 3 | `drawing_ai` | 160 | 20 | 20 | تحليل المخططات |
| 4 | `engineering_llm` | 240 | 30 | 30 | LLM هندسي عام |
| 5 | `planning_ai` | 160 | 20 | 20 | تخطيط المشاريع |
| 6 | `procurement_ai` | 160 | 20 | 20 | المشتريات والموردين |
| 7 | `quality_ai` | 160 | 20 | 20 | فحص الجودة |
| 8 | `quantity_ai` | 160 | 20 | 20 | كميات الأعمال |
| 9 | `risk_ai` | 160 | 20 | 20 | تحليل المخاطر |
| 10 | `safety_ai` | 160 | 20 | 20 | السلامة |

### 4.4 Knowledge Base (Hardcoded Data)

| # | المسار | المحتوى | الحجم |
|---|--------|---------|-------|
| 1 | `packages/construction-knowledge/entities/project-types.js` | 18 type map | ~50 lines |
| 2 | `packages/construction-knowledge/entities/project-types-v2.js` | 18 types + details | ~200 lines |
| 3 | `packages/construction-knowledge/entities/codes.js` | 100+ Saudi codes | ~300 lines |
| 4 | `packages/construction-knowledge/entities/codes-v2.js` | 200+ codes (12 standards) | ~818 lines |
| 5 | `packages/construction-knowledge/entities/materials.js` | 100+ materials | ~250 lines |
| 6 | `packages/construction-knowledge/entities/materials-v2.js` | 300+ materials | ~500 lines |
| 7 | `packages/construction-knowledge/entities/elements.js` | 100+ elements | ~200 lines |
| 8 | `packages/construction-knowledge/entities/elements-v2.js` | 300+ elements | ~600 lines |
| 9 | `packages/construction-knowledge/entities/phases.js` | 18 phases | ~50 lines |
| 10 | `packages/construction-knowledge/data/boq-data.js` | 500+ BOQ items | ~800 lines |
| 11 | `packages/construction-knowledge/data/boq-data-v2.js` | 500+ BOQ items + details | ~1200 lines |
| 12 | `packages/construction-knowledge/data/schedule-data.js` | 35+ schedule tasks | ~200 lines |
| 13 | `packages/construction-knowledge/data/image-db.js` | Image references | ~100 lines |
| 14 | `packages/construction-knowledge/data/video-db.js` | Video references | ~50 lines |

### 4.5 AI Engine Data Files

| # | المسار | المحتوى |
|---|--------|---------|
| 1 | `data/edl-state.json` | EDL project state (persisted every 60s) |
| 2 | `data/kb-projects.json` | Knowledge base recorded projects |
| 3 | `data/projects.json` | Project store (CRUD) |
| 4 | `data/continuous-learning.json` | Continuous learner state (price trends, approvals) |
| 5 | `data/boq-learning.json` | BOQ price learner & assumption manager |
| 6 | `data/store.js` | Simple JSON file store |

### 4.6 Phase State Files

| # | المسار | المحتوى |
|---|--------|---------|
| 1 | `data/phases/benchmark-results.json` | Benchmark run history (P6) |
| 2 | `data/phases/retraining-history.json` | Retraining history (P9) |
| 3 | `data/phases/evaluation-history.json` | Evaluation history (P8) |
| 4 | `data/phases/decision-log.json` | Knowledge-driven decisions (P10) |
| 5 | `data/phases/growth-log.json` | Knowledge growth events (P5) |

### 4.7 Vision AI Database

| # | المسار | المحتوى |
|---|--------|---------|
| 1 | `packages/vision-ai/storage/vision-ai.db` | SQLite: projects, generations, gallery, training_data, providers, queue |
| 2 | `packages/vision-ai/storage/projects/` | Generated images organized by project ID |

### 4.8 Training Platform Database

| # | المسار | المحتوى |
|---|--------|---------|
| 1 | `packages/training-platform/data/training_images.json` | Training images collection |
| 2 | `packages/training-platform/data/dataset_versions.json` | Dataset version history |
| 3 | `packages/training-platform/data/dataset_splits.json` | Train/val/test splits |
| 4 | `packages/training-platform/data/balance_analyses.json` | Class balance analysis |
| 5 | `packages/training-platform/data/duplicate_groups.json` | Duplicate groups |
| 6 | `packages/training-platform/data/quality_assessments.json` | Quality assessment results |
| 7 | `packages/training-platform/data/training_readiness.json` | Dataset readiness reports |

### 4.9 Prompt Data

| # | المسار | المحتوى |
|---|--------|---------|
| 1 | `data/prompts/prompt_index.json` | Prompt index |
| 2 | `data/prompts/prompts_batch_*.json` | Prompt batches |
| 3 | `data/prompts/training_prompts.jsonl` | Training prompts |

### 4.10 Image Files (Multiple Locations)

| # | المسار | المحتوى |
|---|--------|---------|
| 1 | `../الصور/` | 9 فئات من صور التشطيب (جبسمبورد، تكييف، سيراميك، رخام، مساجد، مستشفيات) |
| 2 | `packages/vision-training/dataset/datasets/images/` | 63 صورة تدريبية (مكررة من المجلد أعلاه) |
| 3 | `packages/vision-ai/storage/projects/` | ~30 صورة م generated (مجلدات حسب project ID) |
| 4 | `packages/vision-ai/storage/flux_local_*.png` | صور م generated محلياً |

---

## 5. All Duplication Points

### 5.1 CSV ↔ JSON Duplication

**الموقع:** `packages/databases/training/csv/` مقابل `packages/databases/training/json/`

| الملف CSV | الملف JSON المطابق | التكرار |
|-----------|-------------------|---------|
| `projects.csv` | `projects.json` | 10,001+ records مكررة بالكامل |
| `boq_items.csv` | `boq_items.json` | 85,063+ records مكررة بالكامل |
| `material_prices.csv` | `material_prices.json` + `material_prices_full.json` | مكرر + نسخة موسعة |
| `labor_rates.csv` | `labor_rates.json` + `labor_rates_full.json` | مكرر + نسخة موسعة |
| `equipment_rates.csv` | `equipment_rates.json` + `equipment_rates_full.json` | مكرر + نسخة موسعة |
| `suppliers.csv` | `suppliers.json` + `suppliers_full.json` | مكرر + نسخة موسعة |
| `risks.csv` | `risks.json` | 40,141+ records مكررة |
| `quality_defects.csv` | `quality_defects.json` | 14,985+ records مكررة |
| `project_understanding.csv` | `project_understanding.json` | مكرر |

**التأثير:** نفس البيانات مخزنة مرتين (CSV + JSON) دون مزامنة — قد يصبحان غير متطابقين.

### 5.2 CSV Data in TrainingDataBridge ↔ KnowledgeDatasetLoader

**الموقع:** `packages/ai-engine/training-data-bridge.js` + `packages/ai-engine/knowledge-dataset-loader.js`

- **TrainingDataBridge** يقرأ 8 CSV files ويحملها في الذاكرة
- **KnowledgeDatasetLoader** يقرأ من TrainingDataBridge ويحسب نفس الإحصائيات
- **كل نموذج** يقرأ CSV بشكل مستقل (لا يستخدم TrainingDataBridge)

### 5.3 Hardcoded KB Data ↔ CSV Data

**الموقع:** `packages/construction-knowledge/entities/` vs `packages/databases/training/csv/`

- `project-types.js` يحتوي على 18 نوع مشروع بنفس التصنيفات الموجودة في `projects.csv`
- `materials.js` يحتوي على مواد موجودة أيضاً في `material_prices.csv`
- `boq-data.js` يحتوي على بنود BOQ موجودة أيضاً في `boq_items.csv`

**التأثير:** البيانات الهندسية موجودة في مكانين — hardcoded في KB ومشتقة من CSV — وقد تتعارض.

### 5.4 KB Integration Files ↔ AI Engine Models

**الموقع:** `packages/construction-knowledge/integration/` vs `packages/ai-engine/models/`

- `integration/boq-ai.js` → `generateBOQ()` + `models/quantity-estimator.js` → `estimateBOQ()`
- `integration/cost-ai.js` → `estimate()` + `models/cost-estimator.js` → `estimateCost()`
- `integration/scheduling-ai.js` → `generateSchedule()` + `models/schedule-optimizer.js` → `generateSchedule()`
- `integration/risk-ai.js` → `analyze()` + `models/risk-analyzer.js` → `analyzeRisks()`

**التأثير:** توجد صيغ مضاعفة لتقدير نفس القيم — KB integration يستخدم صيغ hardcoded، بينما AI engine يستخدم إحصائيات من CSV.

### 5.5 Integration Layer ↔ AI Engine

**الموقع:** `integration-layer.js` vs `packages/ai-engine/models/`

- `integration-layer.js:37` → `generateBOQItems()` — صيغ تخمينية عشوائية
- `integration-layer.js:57` → `estimateCost()` — نسب مئوية hardcoded (35% مواد، 25% عمالة، إلخ)

### 5.6 Simulation Service ↔ KB Integration

**الموقع:** `packages/ai-services/simulation/src/index.ts` vs `packages/construction-knowledge/integration/`

- **Simulation service** يحتوي على `BASE_RATES` لـ 19 نوع مشروع مع `costPerM2` و `months` hardcoded
- **KB integration cost-ai.js** يحتوي على نفس أنواع المشاريع مع صيغ تقدير تكلفة مختلفة

### 5.7 Image Files Duplication

**الموقع:** `../الصور/` vs `packages/vision-training/dataset/datasets/images/`

- مجلد `الصور/` يحتوي على ~70 صورة
- مجلد `packages/vision-training/dataset/datasets/images/` يحتوي على نسخة من هذه الصور (63 صورة)

### 5.8 Training Platform ↔ Vision Training Data

**الموقع:** `packages/training-platform/` vs `packages/vision-ai/training/`

- **Training platform** يخزن بيانات التدريب في JSON files (10 collections)
- **Vision training collector** يخزن بيانات مماثلة في SQLite (`vision_training_data` table)

---

## 6. All Conflict Points

### 6.1 Conflict: KB V1 vs V2

**الموقع:** `packages/construction-knowledge/entities/` (v1 files vs v2 files)

- `project-types.js` vs `project-types-v2.js` — إصداران مختلفان من نفس البيانات
- `codes.js` vs `codes-v2.js` — إصداران بمستويات تفصيل مختلفة
- `materials.js` vs `materials-v2.js` — V2 يحتوي على 300 مادة مقابل 100 في V1
- `elements.js` vs `elements-v2.js` — V2 يحتوي على 300 عنصر مقابل 100 في V1
- `boq-data.js` vs `boq-data-v2.js` — إصداران مختلفان بقوائم BOQ مختلفة

**نقطة التعارض:** عند استعلام KB، قد يُرجع V1 و V2 قيماً مختلفة لنفس العنصر.

### 6.2 Conflict: CSV Data ↔ KB Hardcoded Data

**الموقع:** AI engine models (CSV-based) vs KB integration (hardcoded)

- **QuantityEstimator** يستخدم CSV → متوسطات إحصائية
- **BOQAIIntegration** يستخدم KB → صيغ hardcoded (`area*0.4` للأساسات، إلخ)

**نقطة التعارض:** نفس المشروع سيعطي كميات مختلفة اعتماداً على من يقدم التقدير.

### 6.3 Conflict: EDL State Persistence Timing

**الموقع:** `server.js:213` (60s interval) vs `server.js:2619` (120s interval)

- **EDL state** يُحفظ كل 60 ثانية
- **Phase state** يُحفظ كل 120 ثانية
- **Learning data** تُحفظ كل 60 ثانية (line 4026-4078)

**نقطة التعارض:** قد تفقد البيانات عند إيقاف السيرفر بين عمليات الحفظ.

### 6.4 Conflict: Continuous Learning Storage

**الموقع:** `data/continuous-learning.json` (Knowledge Engine) vs `data/edl-state.json` (EDL)

- **Continuous Learner** يحفظ حالات المشاريع المعتمدة إلى `continuous-learning.json`
- **EDL** يحفظ حالة جميع المشاريع (بما فيها غير المعتمدة) إلى `edl-state.json`
- **TrainingDataBridge** يحتفظ بقائمة منفصلة من `edlRecords`

**نقطة التعارض:** لا توجد مزامنة بين هذه المصادر الثلاثة — قد يحتوي أحدها على مشاريع لا توجد في الآخر.

### 6.5 Conflict: Project ID Generation

**الموقع:** `integration-layer.js:35` → `'proj-' + Date.now()` vs `packages/vision-ai/storage-engine.js` → 24-char hex

- **Integration Layer** يستخدم timestamp-based IDs
- **Vision AI** يستخدم crypto-based 24-char hex
- **EDL** يستخدم `projectId` قد يكون من أي من المصدرين

### 6.6 Conflict: Training Data Formats

**الموقع:** `packages/datasets/*.jsonl` (JSONL Lines) vs `packages/databases/training/csv/*.csv` (CSV rows)

- **JSONL datasets** تحتوي على `{id, domain, system, instruction, output}` — لكل سجل instruction+output واحد
- **CSV datasets** تحتوي على `{project_id, item_code, quantity, ...}` — بيانات جدولية علائقية

**نقطة التعارض:** 10 مجموعات JSONL منفصلة لكل domain م generated بواسطة Python script منفصل عن CSV data.

### 6.7 Conflict: AI Training (Python) vs AI Engine (JS)

**الموقع:** `packages/ai-training/` (Python, Qwen2.5-7B) vs `packages/ai-engine/models/` (JS, statistical)

- **Python training** يدرب LLM حقيقي (7B parameters) على 10 JSONL datasets
- **JS engine** يقوم بتجميع إحصائيات من CSV ويستخدمها مباشرة

**نقطة التعارض:** هذان نظامان تدريب منفصلان تماماً — لا يشاركان البيانات أو الحالة.

---

## 7. Data Flow Analysis by Model

### 7.1 كيف يتدرب كل نموذج حالياً

#### Project Analyzer
```
projects.csv → قراءة 21 عموداً → تجميع حسب projectType → حساب متوسطات:
  avgCost, avgArea, avgFloors, avgConcrete, avgSteel, avgDuration, avgCostPerM2
```

#### Quantity Estimator
```
boq_items.csv → قراءة 85,063 بند → تجميع حسب category → حساب إحصائيات سعر:
  mean, median, min, max لكل prefix كود بند (مثل CON → خرسانة، STL → صلب)
```

#### Cost Estimator
```
material_prices.csv → إحصائيات مواد حسب الفئة
labor_rates.csv → إحصائيات عمالة حسب الحرفة
equipment_rates.csv → إحصائيات معدات حسب الفئة
suppliers.csv → قائمة الموردين مع التقييمات
```

#### Risk Analyzer
```
risks.csv → 40,141 سجل مخاطر → تجميع حسب category + projectType
projects.csv → ربط أنواع المشاريع بالمخاطر
→ حساب mean probability, impact, risk score لكل فئة
```

#### Quality Inspector
```
quality_defects.csv → 14,985 سجل عيوب → تجميع حسب defectType
→ حساب severity averages, confidence averages, location distribution
```

#### Schedule Optimizer
```
projects.csv → تجميع حسب projectType → إحصائيات duration:
  mean, median, min, max, stddev لكل نوع
  + area mean و floors avg
```

#### Supplier Intelligence
```
suppliers.csv → 125 مورد → فهرسة حسب speciality + city
material_prices.csv → 380 سجل سعر → ربط المواد بالموردين
```

### 7.2 من أين يحصل كل نموذج على بياناته

جميع النماذج السبعة تحصل على بياناتها من **8 ملفات CSV** في `packages/databases/training/csv/`.

**ملاحظة هامة:** كل نموذج يقرأ ملف CSV بشكل مستقل — لا يوجد `TrainingDataBridge` وسيط.

### 7.3 كيف يتم تخزين البيانات

| النوع | مكان التخزين | آلية التخزين |
|-------|-------------|-------------|
| CSV raw | `packages/databases/training/csv/` | ملفات نصية مفصولة بفواصل |
| JSON mirror | `packages/databases/training/json/` | JSON arrays |
| Training bridges | In-memory في `TrainingDataBridge.data` | Objects JS في RAM |
| Aggregates | In-memory في `KnowledgeDatasetLoader.dataset` | Objects JS في RAM |
| Model state | In-memory في كل model instance | Objects JS في RAM |
| EDL state | `data/edl-state.json` | JSON serialization كل 60s |
| Continuous learning | `data/continuous-learning.json` | JSON append كل approval |
| KB projects | `data/kb-projects.json` | JSON array |
| Phase state | `data/phases/*.json` | JSON per phase |
| SQLite | `packages/vision-ai/storage/vision-ai.db` | SQLite database |
| Training platform | `packages/training-platform/data/*.json` | JSON collections |
| Generated images | `packages/vision-ai/storage/projects/` | PNG/WebP files |
| Vision training images | `packages/vision-training/dataset/datasets/images/` | PNG files |

### 7.4 كيف يتم استخدام البيانات

```
1. CSV → TrainingDataBridge.loadAll() → in-memory data store
2. TrainingDataBridge → KnowledgeDatasetLoader.initialize() → compute statistical aggregates
3. KnowledgeDatasetLoader → 7 AI Models (indirectly, models read CSV directly)
4. TrainingDataBridge → KnowledgeGrowthSystem → record approved projects
5. TrainingDataBridge → BenchmarkLibrary → run benchmarks
6. TrainingDataBridge → UnifiedKnowledgeBase → query interface
7. TrainingDataBridge → DataQualityPipeline → quality checks
8. EDL projects → TrainingDataBridge.addEDLRecord() → continuous learning
9. Generated images → TrainingCollector → SQLite training_data
10. TrainingCollector → getTrainingBatch() → model training pipeline
```

---

## 8. Integration Plan

### 8.1 Philosophy

سيتم بناء UETS على مبدأ **Single Source of Engineering Truth**:

```
جميع النماذج تتدرب من ─── Engineering Ground Truth ─── لكل مشروع تدريبي
نفس الحقيقة الهندسية
```

### 8.2 How Training Changes

#### Before (Current):
```
CSV (projects) ───→ ProjectAnalyzer (يحسب متوسطات خاصة به)
CSV (boq_items) ───→ QuantityEstimator (يحسب إحصائيات خاصة به)
CSV (material_prices) ───→ CostEstimator (يحسب إحصائيات خاصة به)
CSV (risks) ───→ RiskAnalyzer (يحسب إحصائيات خاصة به)
CSV (quality) ───→ QualityInspector (يحسب إحصائيات خاصة به)
CSV (projects) ───→ ScheduleOptimizer (يحسب إحصائيات خاصة به)
CSV (suppliers) ───→ SupplierIntelligence (يحسب إحصائيات خاصة به)
صور + JSONL ───→ Vision Training (LoRA منفصل)
JSONL ───→ Python AI Training (Qwen2.5-7B منفصل)
```

#### After (UETS):
```
Engineering Ground Truth ───→ UETS Dataset Generator
         │                        │
         ├──→ ProjectAnalyzer     │  (يقرأ من Ground Truth)
         ├──→ QuantityEstimator   │  (يقرأ من Ground Truth)
         ├──→ CostEstimator       │  (يقرأ من Ground Truth)
         ├──→ RiskAnalyzer        │  (يقرأ من Ground Truth)
         ├──→ QualityInspector    │  (يقرأ من Ground Truth)
         ├──→ ScheduleOptimizer   │  (يقرأ من Ground Truth)
         ├──→ SupplierIntelligence│  (يقرأ من Ground Truth)
         ├──→ Vision Training     │  (يقرأ من Ground Truth)
         ├──→ Python AI Training  │  (يقرأ من Ground Truth)
         └──→ 3D Navigation       │  (يقرأ من Ground Truth)
```

### 8.3 Engineering Ground Truth Schema

كل مشروع تدريبي في UETS سيحتوي على الهيكل التالي:

```typescript
interface EngineeringGroundTruth {
  // المعرفات
  projectUUID: string;           // UUID فريد لكل مشروع
  projectDescription: string;    // وصف المشروع بالعربية والإنجليزية
  projectUnderstanding: string;  // فهم الذكاء الاصطناعي للمشروع
  
  // التصنيف
  projectClassification: {
    mainCategory: string;
    subCategory: string;
    complexity: number;          // 1-10
    constructionStage: string;
  };
  projectType: string;           // Villa, Building, Tower, etc.
  
  // الهندسة المعمارية
  buildingGeometry: {
    landArea: number;            // م²
    buildingArea: number;        // م²
    totalArea: number;           // م²
    height: number;              // م
    setbacks: object;
    orientation: string;
  };
  floors: {
    count: number;
    belowGround: number;
    floorHeights: number[];      // ارتفاع كل دور
    floorFunctions: string[];    // وظيفة كل دور
  };
  rooms: {
    total: number;
    rooms: RoomSpec[];           // تفاصيل كل غرفة
  };
  
  // الأنظمة الإنشائية
  structure: {
    system: string;              // RC Frame, Steel, etc.
    foundation: string;
    columns: ColumnSpec[];
    beams: BeamSpec[];
    slabs: SlabSpec[];
    walls: WallSpec[];
    seismicDesign: boolean;
    constructionMethod: string;
  };
  finishing: FinishingSpec;     // تشطيب لكل غرفة
  architecture: ArchitectureSpec; // واجهات، نوافذ، أبواب
  MEP: MEPSpec;                 // ميكانيكا، كهرباء، سباكة، حريق
  
  // المناظر الطبيعية
  landscape: {
    area: number;
    features: string[];
    irrigation: string;
    hardscape: number;
    softscape: number;
  };
  
  // الكميات
  BOQ: BOQItem[];               // Bill of Quantities
  engineeringElements: ElementSpec[];
  materials: MaterialSpec[];
  materialSpecifications: MaterialSpecSheet[];  // مواصفات المواد
  saudiCodes: SaudiCodeRef[];   // كود السعودي
  standards: StandardRef[];     // معايير دولية
  
  // التبعيات
  dependencies: Dependency[];
  
  // المخرجات
  cost: CostBreakdown;
  schedule: SchedulePlan;
  risk: RiskAssessment;
  quality: QualityPlan;
  
  // الصور والفيديو
  generatedImages: ImageRef[];
  generatedVideos: VideoRef[];
  generated3DNavigation: NavigationRef[];
  
  // التوأم الرقمي
  digitalTwin: DigitalTwinRef;
  constructionSequence: ConstructionStep[];
  
  // اقتراحات
  supplierSuggestions: SupplierSuggestion[];
  executionNotes: string[];
  
  // الحقيقة النهائية
  finalGroundTruth: {
    actualBOQ: BOQItem[];
    actualCost: number;
    actualSchedule: Duration;
    actualRisks: RiskEvent[];
    actualQuality: QualityMetric[];
    lessonsLearned: string[];
    confidence: number;          // 0-1 مدى الثقة في هذه الحقيقة
    validationResult: ValidationReport;
    errorReport: ErrorReport;
  };
}
```

### 8.4 Training Data Flow in UETS

```
Engineering Ground Truth (EGT) Repository
         │
         ▼
┌─────────────────────────────────────────────────┐
│             UETS Dataset Generator               │
│  يولد من EGT:                                    │
│  - CSV training data (لـ 7 نماذج JS)            │
│  - JSONL training data (لـ Python AI training)  │
│  - Image prompts (لـ Vision AI)                 │
│  - 3D model params (لـ Navigation)              │
│  - Digital Twin params                           │
└─────────────────────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────────────┐
│             UETS Dataset Validator                │
│  - Schema compliance                             │
│  - Completeness check                            │
│  - Consistency check (BOQ vs Cost vs Schedule)   │
│  - Integrity check (no missing references)       │
└─────────────────────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────────────┐
│             UETS Training Manager                 │
│  يدير قوائم الانتظار:                            │
│  - Training Queue                                │
│  - Retraining Queue                              │
│  - Evaluation Queue                              │
│  - Feedback Queue                                │
└─────────────────────────────────────────────────┘
         │
         ├─────────┬─────────┬──────────┬──────────┐
         ▼         ▼         ▼          ▼          ▼
   Project     Quantity   Cost      Schedule    Risk
   Analyzer    Estimator  Estimator  Optimizer   Analyzer
         │         │         │          │          │
         ├─────────┴─────────┴──────────┴──────────┘
         ▼
   Quality      Supplier    Vision    Python AI   3D/Digital
   Inspector    Intellig.   Training  Training     Twin
```

### 8.5 Dataset Versioning Strategy

```
UETS Dataset Registry
├── Version 1.0 (Initial CSV → EGT conversion)
│   ├── projects: 10,001 records
│   ├── boq_items: 85,063 records
│   └── ... 
├── Version 1.1 (After EDL continuous learning addition)
│   ├── projects: 10,015 records (+14 EDL projects)
│   └── ...
├── Version 2.0 (After user-approved projects)
│   └── ...
└── Version N (current)
```

Each version is immutable and includes:
- All `EngineeringGroundTruth` records
- A version manifest (date, change log, hash)
- Migration path from previous version
- Per-model evaluation results at this version

---

## 9. Execution Plan

### Phase 1: Analysis (Current — هذا التقرير)
- ✅ Complete system architecture analysis
- ✅ Identify all training locations
- ✅ Identify all data locations
- ✅ Identify all duplication and conflict points
- ⬜ **Output:** `Unified_Training_System_Analysis.md`

### Phase 2: EGT Schema Implementation

#### Step 2.1 — Create EGT Core Module
**المسار المقترح:** `packages/uets/engineering-ground-truth.js`
**الإجراء:**
1. إنشاء `EngineeringGroundTruth` class مع schema كامل
2. إنشاء `EGTFactory` لتحويل CSV records → EGT
3. إنشاء `EGTRepository` للتخزين والاسترجاع
4. إنشاء `EGTValidator` للتحقق من صحة البيانات

**ما سيتم تعديله:**
- `packages/ai-engine/shared-constants.js` → إضافة ثوابت EGT
- `packages/construction-knowledge/entities/` → توحيد V1/V2

**ما لن يتم تعديله:**
- أي API endpoint موجود
- أي model `.train()` method
- أي model `.estimate*()` method

#### Step 2.2 — Create UETS Dataset Generator
**المسار المقترح:** `packages/uets/dataset-generator.js`
**الإجراء:**
1. قراءة EGT records ← توليد training data لكل نموذج
2. توليد CSV vectors من EGT (لـ 7 نماذج JS)
3. توليد JSONL samples من EGT (لـ Python training)
4. توليد image prompts من EGT (لـ Vision)
5. توليد 3D parameters من EGT (لـ Navigation)

**ما سيتم تعديله:**
- `packages/ai-engine/training-data-bridge.js` → إضافة `generateFromEGT()`
- `packages/ai-data-factory/generate_datasets.py` → إضافة مصدر EGT

#### Step 2.3 — Create UETS Training Manager
**المسار المقترح:** `packages/uets/training-manager.js`
**الإجراء:**
1. إنشاء `TrainingQueue` ← يغذي جميع النماذج بالتسلسل
2. إنشاء `RetrainingQueue` ← يعيد تدريب النماذج عند تحديث EGT
3. إنشاء `EvaluationQueue` ← يقيم جميع النماذج بعد كل تدريب
4. إنشاء `FeedbackQueue` ← يسجل feedback من المستخدمين

**ما سيتم تعديله:**
- `packages/ai-engine/retraining-orchestrator.js` → استخدام TrainingManager
- `packages/ai-engine/selective-retraining.js` → استخدام EvaluationQueue
- `packages/ai-engine/learning-feedback-engine.js` → استخدام FeedbackQueue

#### Step 2.4 — Create UETS Dataset Validator
**المسار المقترح:** `packages/uets/dataset-validator.js`
**الإجراء:**
1. `DatasetVersioning` ← version control للـ EGT
2. `DatasetValidation` ← schema + completeness + consistency
3. `DatasetIntegrityChecker` ← تحقق من سلامة العلاقات
4. `DatasetConsistencyChecker` ← تحقق من تناسق BOQ/Cost/Schedule

**ما سيتم تعديله:**
- `packages/ai-engine/data-standards.js` ← إضافة معايير EGT
- `packages/ai-engine/data-quality-pipeline.js` ← إضافة فحص EGT

### Phase 3: Model Integration

#### Step 3.1 — Train All 7 Models from EGT
**الإجراء:**
1. تعديل `models/trainer.js` ← ليأخذ EGT data بدلاً من CSV
2. تعديل `TrainingDataBridge.loadAll()` ← تحميل من EGT Repository
3. كل model يستخدم `KnowledgeDatasetLoader` ← الذي يقرأ من EGT

**ما سيتم تعديله:**
- `packages/ai-engine/models/trainer.js`
- `packages/ai-engine/training-data-bridge.js`
- `packages/ai-engine/knowledge-dataset-loader.js`

#### Step 3.2 — Integrate Vision Training
**الإجراء:**
1. `EGT → image prompts` يقوم بإنشاء prompts تدريبية للـ Vision
2. `TrainingCollector` يقرأ من EGT gallery images
3. `TrainingPlatform` يصبح واجهة لـ EGT images

**ما سيتم تعديله:**
- `packages/vision-ai/training/training-collector.js`
- `packages/training-platform/integration.js`

#### Step 3.3 — Integrate Python AI Training
**الإجراء:**
1. `EGT → JSONL converter` يولد JSONL datasets من EGT
2. `run_pipeline.py` يقرأ من EGT بدلاً من `packages/datasets/`

**ما سيتم تعديله:**
- `packages/ai-data-factory/generate_datasets.py`
- `packages/ai-training/dataset.py`

### Phase 4: Data Migration

#### Step 4.1 — CSV → EGT Migration
**الإجراء:**
1. قراءة 8 CSV files + 9 JSON files
2. تحويل كل record إلى EngineeringGroundTruth schema
3. حفظ في EGT Repository
4. التحقق من عدم فقدان البيانات

#### Step 4.2 — KB Hardcoded Data → EGT
**الإجراء:**
1. دمج V1 + V2 data
2. إزالة التعارضات بين V1 و V2
3. حفظ المواد والكودات والعناصر في EGT

#### Step 4.3 — EDL State → EGT
**الإجراء:**
1. تحويل `edl-state.json` records إلى EGT
2. تحويل `continuous-learning.json` records إلى EGT
3. توحيد Project ID system

### Phase 5: Validation & Testing

#### Step 5.1 — Run All 133 Benchmarks
**الإجراء:**
1. تشغيل `BenchmarkLibrary.runAll()` بعد كل تغيير
2. التأكد من عدم انخفاض الدقة عن 100%

#### Step 5.2 — Cross-Model Consistency Validation
**الإجراء:**
1. لنفس المشروع، BOQ من QuantityEstimator يجب أن يطابق BOQ من EGT
2. Cost من CostEstimator يجب أن يكون متسقاً مع BOQ
3. Schedule من ScheduleOptimizer يجب أن يكون متسقاً مع Cost
4. الصور المولدة يجب أن تتطابق مع BOQ
5. 3D Navigation يجب أن تتطابق مع الواقع الهندسي

### Phase 6: Documentation & Handover

#### Step 6.1 — Code Updates
- `AGENTS.md` ← تحديث مع بنية UETS الجديدة
- `packages/uets/README.md` ← توثيق كامل للنظام

#### Step 6.2 — API Documentation
- توثيق أي API endpoints جديدة
- التأكيد على عدم تغيير الـ APIs الموجودة

---

## 10. Components to Restructure

### 10.1 سيتم إعادة هيكلتها بالكامل

| المكون | السبب | الإجراء |
|--------|-------|---------|
| `TrainingDataBridge` | يقرأ CSV مباشرة، يجب أن يقرأ من EGT | إضافة EGT data source + backward compatibility مع CSV |
| `KnowledgeDatasetLoader` | يحسب aggregates من TrainingDataBridge | يجب أن يحسب من EGT |
| `models/trainer.js` | يدرب 7 نماذج بتسلسل بسيط | يجب أن يستخدم Training Queue |
| `Continuous Learner` | يكتب إلى ملف JSON منفصل | يجب أن يكتب إلى EGT Repository |
| `LearningFeedbackEngine` | يسجل في array ذاكرة | يجب أن يسجل في Feedback Queue |
| `KnowledgeGrowthSystem` | يحلل بيانات التدريب | يجب أن يستخدم EGT Coverage Analysis |

### 10.2 سيتم دمجها في UETS

| المكون | الوجهة | الإجراء |
|--------|--------|---------|
| `packages/databases/training/csv/` | UETS → CSV generator | CSV يصبح output من EGT وليس input |
| `packages/databases/training/json/` | UETS → JSON generator | JSON يصبح output من EGT |
| `packages/datasets/*.jsonl` | UETS → JSONL generator | JSONL يصبح output من EGT |
| `data/continuous-learning.json` | UETS → EGT Repository | نقل البيانات إلى EGT |
| `data/edl-state.json` | UETS → EGT Repository | نقل البيانات إلى EGT |
| `data/kb-projects.json` | UETS → EGT Repository | نقل البيانات إلى EGT |

### 10.3 سيتم تعديلها لتستخدم EGT

| المكون | التعديل |
|--------|---------|
| `project-analyzer.js` | `train()` يقرأ من KnowledgeDatasetLoader بدلاً من CSV مباشرة |
| `quantity-estimator.js` | `train()` يقرأ من KnowledgeDatasetLoader |
| `cost-estimator.js` | `train()` يقرأ من KnowledgeDatasetLoader |
| `risk-analyzer.js` | `train()` يقرأ من KnowledgeDatasetLoader |
| `quality-inspector.js` | `train()` يقرأ من KnowledgeDatasetLoader |
| `schedule-optimizer.js` | `train()` يقرأ من KnowledgeDatasetLoader |
| `supplier-intelligence.js` | `train()` يقرأ من KnowledgeDatasetLoader |
| `packages/ai-training/dataset.py` | `load_all_datasets()` يقرأ من UETS API |
| `packages/ai-data-factory/generate_datasets.py` | `generate_for_domain()` يقرأ من EGT |
| `packages/vision-ai/training/training-collector.js` | `recordApproval()` يكتب إلى EGT |
| `packages/training-platform/integration.js` | `captureGeneratedImage()` يكتب إلى EGT |
| `packages/vision-training/training/lora-trainer.js` | `train()` يقرأ dataset من EGT |

---

## 11. Components NOT to Modify

### 11.1 لن يتم تعديلها أبداً

| المكون | السبب |
|--------|-------|
| كل `server.js` API endpoints | "لا تغير أي Endpoint موجود" |
| كل models `estimate*()` methods | "لا تكسر أي API موجود" |
| كل models `analyze*()` methods | تعمل بشكل صحيح، فقط مصدر البيانات سيتغير |
| `packages/construction-knowledge/` entities (V1) | قد تستخدمها أنظمة أخرى |
| `packages/construction-knowledge/` data files | قد تستخدمها أنظمة أخرى |
| `packages/ai-engine/ai-orchestrator.js` | يعمل بشكل صحيح، فقط سيتغير مصدر البيانات |
| `packages/ai-engine/evidence-validator.js` | منطق التحقق مستقل عن التدريب |
| `packages/ai-engine/unified-knowledge-base.js` | query interface لن يتغير |
| `packages/ai-engine/benchmark-library.js` | آلية القياس لن تتغير |
| `packages/ai-engine/benchmark.js` | نفس الشيء |
| `packages/ai-engine/shared-constants.js` | ثوابت عامة |
| `packages/ai-engine/data-standards.js` | معايير التحقق |
| `packages/ai-engine/data-quality-pipeline.js` | فحوصات الجودة |
| `packages/vision-ai/providers/*` | مقدمي الخدمة |
| `packages/vision-ai/3d-engine/*` | محرك 3D |
| `packages/ai-services/*` | 9 خدمات TypeScript — لا تحتوي تدريب |
| `packages/engines/*` | محركات TypeScript |
| `packages/platforms/*` | منصات الأعمال |
| `integration-layer.js` | طبقة التكامل القديمة |
| جميع ملفات UI و Frontend | واجهة المستخدم |

### 11.2 سيتم إضافة واجهات (Adapters) وليس تعديلها

| المكون | نوع الواجهة |
|--------|-------------|
| `project-analyzer.js` → `train()` | EGT Source Adapter |
| `quantity-estimator.js` → `train()` | EGT Source Adapter |
| `cost-estimator.js` → `train()` | EGT Source Adapter |
| `risk-analyzer.js` → `train()` | EGT Source Adapter |
| `quality-inspector.js` → `train()` | EGT Source Adapter |
| `schedule-optimizer.js` → `train()` | EGT Source Adapter |
| `supplier-intelligence.js` → `train()` | EGT Source Adapter |

بدلاً من تعديل `train()` methods نفسها، سنقوم بتعديل `TrainingDataBridge` و `KnowledgeDatasetLoader` لتوفير البيانات بصيغة متوافقة.

---

## 12. System Impact Analysis

### 12.1 تأثير على الأداء (Performance Impact)

| المقياس | قبل UETS | بعد UETS | التغيير |
|---------|----------|----------|---------|
| وقت بدء التشغيل | 35-45 ثانية (7 نماذج تقرأ CSV) | 40-50 ثانية (+ تحميل EGT) | ~10% زيادة |
| استخدام الذاكرة | 8 CSV files في الذاكرة | EGT Repository + CSV | ~20% زيادة |
| وقت إعادة التدريب | 35-45 ثانية | 30-40 ثانية (EGT أسرع في القراءة) | ~10% نقصان |
| دقة النماذج | 87-100% حسب النموذج | >95% متوقع (بيانات أكثر اتساقاً) | تحسن |

### 12.2 تأثير على وحدات التخزين (Storage Impact)

| المكون | الحجم الحالي | الحجم بعد UETS |
|--------|-------------|----------------|
| CSV files | ~15 MB | ~15 MB (يبقى للتوافق) |
| JSON files | ~20 MB | ~20 MB (يبقى للتوافق) |
| JSONL datasets | ~5 MB | ~5 MB (يبقى للتوافق) |
| EGT Repository | 0 (جديد) | ~50 MB (تقديري) |
| **الإجمالي** | ~40 MB | ~90 MB |

### 12.3 تأثير على API Compatibility

| النوع | التأثير |
|-------|---------|
| API Endpoints الموجودة | **لا تغيير** — كل نقطة نهاية تعمل كما هي |
| Request/Response schemas | **لا تغيير** — كل schema يبقى متوافقاً |
| Internal data flow | **يتغير** — لكن بشفافية كاملة للـ API |
| Training APIs (`/api/v1/retraining/*`) | **تضاف endpoints جديدة** دون تغيير الموجودة |

### 12.4 تأثير على التوسعية (Scalability Impact)

| المجال | قبل UETS | بعد UETS |
|--------|----------|----------|
| إضافة نوع مشروع جديد | يجب تعديل 7 نماذج + KB + CSV | إضافة EGT واحد ← كل النماذج تتدرب تلقائياً |
| إضافة نموذج جديد | يجب ربطه بـ CSV مباشرة | يقرأ من EGT Repository مباشرة |
| تدريب متعدد اللغات | دعم عربي/إنجليزي محدود | EGT ثنائي اللغة افتراضياً |
| تكامل مع أنظمة خارجية | صعب (بيانات موزعة) | سهل (API واحد للـ EGT) |

---

## 13. UETS Architecture Design

### 13.1 Directory Structure المقترح

```
packages/uets/
├── index.js                          # UETS main entry point
├── package.json                      # @acep/unified-training-system
├── README.md                         # Documentation
│
├── core/
│   ├── engineering-ground-truth.js   # EGT class + schema
│   ├── egt-factory.js                # EGT builder from various sources
│   ├── egt-repository.js             # EGT storage & retrieval
│   └── egt-validator.js              # EGT schema & integrity validation
│
├── dataset/
│   ├── index.js                      # Dataset module entry
│   ├── generator.js                  # Dataset generator (CSV, JSONL, etc.)
│   ├── version-manager.js            # Dataset versioning
│   ├── splitter.js                   # Train/val/test splitting
│   ├── balancer.js                   # Class balancing
│   └── augmenter.js                  # Data augmentation
│
├── training/
│   ├── index.js                      # Training module entry
│   ├── training-manager.js           # Training orchestration
│   ├── training-queue.js             # Training queue management
│   ├── retraining-queue.js           # Retraining trigger management
│   ├── evaluation-queue.js           # Evaluation scheduling
│   └── feedback-queue.js             # User feedback processing
│
├── validation/
│   ├── index.js                      # Validation module entry
│   ├── dataset-validator.js          # Cross-dataset validation
│   ├── integrity-checker.js          # Reference integrity
│   └── consistency-checker.js        # BOQ/Cost/Schedule consistency
│
├── adapters/
│   ├── csv-adapter.js                # CSV → EGT conversion
│   ├── json-adapter.js               # JSON → EGT conversion
│   ├── edl-adapter.js                # EDL state → EGT
│   ├── continuous-learning-adapter.js # Continuous learning → EGT
│   ├── training-platform-adapter.js  # Training platform → EGT
│   └── vision-adapter.js             # Vision training → EGT
│
└── api/
    └── routes.js                     # UETS API routes (new endpoints only)
```

### 13.2 Core Data Flow in UETS

```
                          ┌──────────────────────┐
                          │   EGT Repository      │
                          │   (الملف الوحيد)       │
                          └──────┬───────────────┘
                                 │
              ┌──────────────────┼──────────────────┐
              ▼                  ▼                  ▼
     ┌──────────────┐   ┌──────────────┐   ┌──────────────┐
     │ CSV Adapter  │   │ JSON Adapter │   │ EDL Adapter  │
     │ (قراءة CSV)  │   │ (قراءة JSON) │   │ (قراءة EDL)  │
     └──────┬───────┘   └──────┬───────┘   └──────┬───────┘
            │                  │                  │
            └──────────────────┼──────────────────┘
                               ▼
                     ┌──────────────────┐
                     │  EGT Factory     │
                     │  (بناء EGT من    │
                     │   مصادر متعددة)  │
                     └──────────────────┘
                               │
                               ▼
                     ┌──────────────────┐
                     │  EGT Validator   │
                     │  (تحقق من صحة    │
                     │   البيانات)      │
                     └──────────────────┘
                               │
                               ▼
                     ┌──────────────────┐
                     │  Dataset Gen.    │
                     │  (توليد بيانات   │
                     │   التدريب)       │
                     └──────────────────┘
                               │
              ┌────────────────┼────────────────┐
              ▼                ▼                ▼
     ┌──────────────┐  ┌──────────────┐  ┌──────────────┐
     │ 7 JS Models  │  │ Vision       │  │ Python AI    │
     │ (إحصائية)    │  │ Training     │  │ Training     │
     └──────────────┘  └──────────────┘  └──────────────┘
```

### 13.3 Training Manager State Machine

```
                    ┌──────────┐
                    │  IDLE    │
                    └────┬─────┘
                         │
              EGT update or user request
                         │
                         ▼
                    ┌──────────┐
                    │ QUEUED   │──→ Training Queue
                    └────┬─────┘
                         │
                    ┌──────────┐
                    │ PREPARE  │──→ Generate dataset from EGT
                    └────┬─────┘
                         │
              ┌──────────┼──────────┐
              ▼          ▼          ▼
        ┌─────────┐ ┌─────────┐ ┌─────────┐
        │ TRAIN   │ │ TRAIN   │ │ TRAIN   │
        │ Model 1 │ │ Model 2 │ │ Model N │
        └────┬────┘ └────┬────┘ └────┬────┘
             │           │           │
             └───────────┼───────────┘
                         ▼
                    ┌──────────┐
                    │ EVALUATE │──→ Run benchmarks
                    └────┬─────┘
                         │
                    ┌──────────┐
                    │ VALIDATE │──→ Cross-model consistency
                    └────┬─────┘
                         │
              ┌──────────┼──────────┐
              ▼          ▼          ▼
        ┌─────────┐ ┌─────────┐ ┌─────────┐
        │ DEPLOY  │ │ DEPLOY  │ │ DEPLOY  │
        │ Model 1 │ │ Model 2 │ │ Model N │
        └────┬────┘ └────┬────┘ └────┬────┘
             │           │           │
             └───────────┼───────────┘
                         ▼
                    ┌──────────┐
                    │  IDLE    │
                    └──────────┘
```

---

## 14. Engineering Ground Truth Schema (Detailed)

### 14.1 Mini Schema for UETS version 1.0

```javascript
// Ground Truth for each training project
{
  // === المعرفات الأساسية ===
  "uuid": "550e8400-e29b-41d4-a716-446655440000",
  "source": "csv|json|edl|continuous-learning|vision|user",
  "originalId": "proj-1234567890",
  "createdAt": "2026-07-30T00:00:00.000Z",
  "version": 1,
  
  // === الوصف الهندسي ===
  "description": {
    "ar": "فيلا سكنية دورين مساحة 500 متر مربع",
    "en": "Two-story residential villa, 500 sqm"
  },
  
  // === التصنيف ===
  "classification": {
    "projectType": "Villa",
    "subType": "residential",
    "complexity": 5,
    "constructionStage": "shell_and_core",
    "confidence": 0.95
  },
  
  // === الهندسة ===
  "geometry": {
    "landArea": 600,
    "buildingArea": 250,
    "totalArea": 500,
    "floors": 2,
    "floorHeight": 3.2,
    "totalHeight": 8.5,
    "rooms": 12,
    "structure": "RC Frame",
    "foundation": "Isolated Footing",
    "finishing": "Good"
  },
  
  // === الموقع ===
  "location": {
    "city": "Riyadh",
    "region": "Central",
    "country": "Saudi Arabia"
  },
  
  // === الكميات (Bill of Quantities) ===
  "boq": [
    { "code": "CON-001", "description": "خرسانة عادية", "unit": "m³", "quantity": 120, "unitPrice": 350 },
    { "code": "STL-001", "description": "حديد تسليح 16 مم", "unit": "ton", "quantity": 8.5, "unitPrice": 2800 },
    // ... 30-100 items
  ],
  
  // === التكلفة ===
  "cost": {
    "total": 850000,
    "perM2": 1700,
    "breakdown": {
      "materials": 380000,
      "labor": 210000,
      "equipment": 85000,
      "subcontractor": 110000,
      "overhead": 65000
    }
  },
  
  // === الجدول الزمني ===
  "schedule": {
    "totalDurationMonths": 12,
    "phases": [
      { "name": "Excavation", "duration": 1, "order": 1 },
      { "name": "Foundation", "duration": 2, "order": 2 },
      // ... 10-18 phases
    ]
  },
  
  // === المخاطر ===
  "risks": [
    { "category": "structural", "description": "تربة ضعيفة", "probability": 0.3, "impact": 0.7 }
  ],
  
  // === الجودة ===
  "quality": {
    "expectedDefects": 5,
    "defectTypes": [
      { "type": "cracking", "severity": 2, "confidence": 0.85 }
    ]
  },
  
  // === الصور ===
  "images": {
    "generated": ["path/to/image1.png", "path/to/image2.png"],
    "reference": ["path/to/reference1.jpg"],
    "prompts": ["modern villa exterior photorealistic 8K"]
  },
  
  // === الملاحة ثلاثية الأبعاد ===
  "navigation": {
    "modelPath": "/3d-models/villa-123.glb",
    "elements": ["COL-001", "SLB-001", "WAL-001"]
  },
  
  // === التوأم الرقمي ===
  "digitalTwin": {
    "status": "active",
    "lastSync": "2026-07-30T00:00:00.000Z",
    "dataSources": ["bim", "ifc", "edl"]
  },
  
  // === التحقق والمصادقة ===
  "validation": {
    "schemeCompliance": true,
    "completeness": 0.95,
    "consistency": {
      "boqVsCost": 0.98,
      "costVsSchedule": 0.92,
      "boqVsImages": 0.88
    },
    "integrity": "pass",
    "errors": [],
    "warnings": []
  },
  
  // === الدروس المستفادة ===
  "lessonsLearned": [
    "زيادة كمية الخرسانة في الأساسات بنسبة 10% عن التقدير",
    "الجدول الزمني يحتاج 3 أشهر إضافية بسبب ظروف التربة"
  ],
  
  // === الثقة ===
  "confidence": 0.94  // إجمالي الثقة في هذه الحقيقة الهندسية
}
```

---

## 15. Strict Rules & Constraints

### 15.1 القواعد الصارمة (Hard Rules)

| # | القاعدة | الانتهاك | الإجراء |
|---|---------|----------|---------|
| 1 | **لا تكسر أي API موجود** | تعديل endpoint قائم | رفض التعديل |
| 2 | **لا تغير أي Endpoint موجود** | تغيير request/response schema | رفض التعديل |
| 3 | **لا تحذف أي كود يعمل** | إزالة ملف أو دالة تعمل | رفض الحذف |
| 4 | **لا تكرر البيانات** | إنشاء dataset جديد والبيانات موجودة | استخدام EGT Reference |
| 5 | **لا تنشئ Dataset جديد إذا كانت البيانات موجودة** | إضافة ملف CSV جديد لنفس البيانات | رفض الإضافة |
| 6 | **أعد استخدام النظام الحالي** | بناء حل من الصفر | تعديل الحل الموجود |
| 7 | **اجعل جميع النماذج تعتمد على EGT** | نموذج يقرأ من مصدر آخر | إضافة EGT adapter |
| 8 | **اجعل النظام قابل للتوسع** | إضافة أنواع مشاريع تتطلب تعديل البنية | رفض — يجب أن يكون auto-extensible |

### 15.2 مبادئ التصميم (Design Principles)

1. **Backward Compatibility First**: أي تغيير يجب أن يكون متوافقاً مع الإصدارات السابقة
2. **Adapter Pattern**: استخدام Adapters للتواصل مع المكونات الموجودة بدلاً من تعديلها
3. **Gradual Migration**: تحويل البيانات من CSV → EGT تدريجياً (يمكن العودة للـ CSV)
4. **Immutable EGT Versions**: كل إصدار من EGT غير قابل للتعديل (immutable)
5. **Source Tracking**: كل EGT record يتذكر مصدره الأصلي
6. **Audit Trail**: كل تغيير على EGT مسجل مع timestamp
7. **Self-Healing**: إذا فشل EGT، النظام يتراجع إلى CSV مباشرة

### 15.3 الـ APIs التي لن تتغير أبداً

```javascript
// === Training APIs (ستضاف endpoints جديدة فقط) ===
POST /api/v1/retraining/analyze         // يبقى كما هو
POST /api/v1/retraining/run             // يبقى كما هو
POST /api/v1/retraining/orchestrate     // يبقى كما هو
POST /api/v1/retraining/fix-weak-areas  // يبقى كما هو
GET  /api/v1/training/stats             // يبقى كما هو
GET  /api/v1/training/projects          // يبقى كما هو
POST /api/v1/benchmark-library/run      // يبقى كما هو
POST /api/v1/evaluation/run             // يبقى كما هو
GET  /api/v1/phases/status              // يبقى كما هو

// === New UETS APIs (ستضاف فقط) ===
GET  /api/v1/uets/status                // UETS system status
POST /api/v1/uets/generate-dataset      // Generate training dataset from EGT
POST /api/v1/uets/train-all             // Train all models from EGT
POST /api/v1/uets/validate              // Validate EGT consistency
GET  /api/v1/uets/versions              // List EGT versions
POST /api/v1/uets/version/create        // Create new EGT version
GET  /api/v1/uets/coverage              // Training coverage analysis
```

### 15.4 خطة الطوارئ (Fallback Plan)

| السيناريو | الإجراء |
|-----------|---------|
| EGT Repository فشل | العودة إلى CSV المباشر (كل نموذج يقرأ CSV) |
| Dataset Generator فشل | العودة إلى TrainingDataBridge الحالي |
| Training Manager فشل | العودة إلى trainer.trainAllModels() الحالي |
| EGT Validator رفض بيانات | استخدام data-standards.js كبديل |

**مبدأ أساسي:** UETS هو **طبقة إضافية** فوق النظام الحالي، وليس بديلاً عنه. إذا فشل UETS، النظام يعمل كما كان من قبل.

---

## Report Summary

### المستفيدون من هذا التقرير

| المستفيد | القسم |
|----------|-------|
| كبير مهندسي AI | القسم 1-8 (لفهم المشكلة والحل) |
| فريق التطوير | القسم 8-10 (لفهم خطة التنفيذ) |
| فريق ضمان الجودة | القسم 12 (فهم التأثير على النظام) |
| مدير المشروع | القسم 1, 9, 15 (الملخص التنفيذي والجدول الزمني) |

### Ready for Implementation

هذا التقرير يمثل **نهاية مرحلة التحليل** و **بداية مرحلة التنفيذ**.

قبل كتابة أي كود جديد، يرجى مراجعة القسم 15 (القواعد الصارمة) و القسم 11 (المكونات التي لن يتم تعديلها) للتأكد من الامتثال للقيود.

**انتهى التقرير**
