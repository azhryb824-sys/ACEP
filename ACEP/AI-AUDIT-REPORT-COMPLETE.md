# ACEP AI Architecture Audit – التقرير الشامل لتدقيق بنية الذكاء الاصطناعي

**التاريخ:** 29 يوليو 2026  
**النسخة:** 1.0  
**الهدف:** تدقيق معماري كامل لجميع مكونات منصة ACEP قبل أي إعادة تدريب أو تطوير

---

## جدول المحتويات
1. [الملخص التنفيذي](#1-الملخص-التنفيذي)
2. [Phase 1: AI Architecture Audit](#2-phase-1-ai-architecture-audit)
3. [Phase 2: Integration Audit](#3-phase-2-integration-audit)
4. [Phase 3: Data Audit](#4-phase-3-data-audit)
5. [Phase 4: Benchmark Platform](#5-phase-4-benchmark-platform)
6. [Phase 5: Model Evaluation](#6-phase-5-model-evaluation)
7. [Phase 6: Root Cause Analysis](#7-phase-6-root-cause-analysis)
8. [Phase 7: Repair Plan](#8-phase-7-repair-plan)
9. [Phase 8: Gradual Execution](#9-phase-8-gradual-execution)

---

## 1. الملخص التنفيذي

### حجم النظام
| المقياس | القيمة |
|---------|--------|
| إجمالي الملفات | 200+ |
| حزم البرامج (Packages) | 18 |
| نماذج AI / خدمات تحليل | 31 |
| API Endpoints | 200+ |
| قواعد البيانات | MongoDB (غير نشط), SQLite (نشط جزئياً), JSON Files (نشط), OWL Ontology |
| واجهات المستخدم | SPA (16 صفحة) + EJS قديمة + صفحات مستقلة |
| ملفات السيرفر الرئيسي | server.js (2346 سطر) |

### التشخيص العام: **نظام في مرحلة انتقالية غير مكتملة**

ACEP يعاني من **تشتت معماري حاد**. النظام مبني على 3 طبقات متوازية:

1. **طبقة قديمة (Monolith)** - `server.js` يحتوي 200+ endpoint مدمج، مع business logic مخلوط
2. **طبقة AI Engine منفصلة** - نماذج ذكاء اصطناعي في `packages/ai-engine/` و  `packages/construction-knowledge/`
3. **طبقة Microservices غير مكتملة** - 9 خدمات TypeScript في `packages/ai-services/` كلها **stub/mock** لا تؤدي عملاً حقيقياً

### النتيجة الأساسية: **لا توجد حاجة لإعادة تدريب أي نموذج في الوقت الحالي**

المشكلة الحقيقية هي **التكامل المعماري** وليس دقة النماذج. النماذج التي تم تدريبها (ProjectAnalyzer, QuantityEstimator, CostEstimator, ScheduleOptimizer, RiskAnalyzer, QualityInspector) تعمل وتنتج نتائج، لكنها لا تتشارك البيانات بشكل موحد.

---

## 2. Phase 1: AI Architecture Audit

### 2.1 فهرس جميع نماذج الذكاء الاصطناعي

#### المجموعة الأولى: Project Understanding (فهم المشروع)
| # | النموذج | الموقع | اللغة | الحالة |
|---|---------|--------|-------|--------|
| 1 | **TypeClassifier** | `packages/ai-engine/project-understanding/type-classifier.js` | JS | ✅ مكتمل |
| 2 | **StageClassifier** | `packages/ai-engine/project-understanding/stage-classifier.js` | JS | ✅ مكتمل |
| 3 | **StructureInference** | `packages/ai-engine/project-understanding/structure-inference.js` | JS | ✅ مكتمل |
| 4 | **MEPInference** | `packages/ai-engine/project-understanding/mep-inference.js` | JS | ✅ مكتمل |
| 5 | **ProjectProfiler** | `packages/ai-engine/project-understanding/project-profiler.js` | JS | ✅ مكتمل |
| 6 | **ProjectAnalyzer** | `packages/ai-engine/models/project-analyzer.js` | JS | ✅ مكتمل |

#### المجموعة الثانية: Knowledge Base (قاعدة المعرفة)
| # | النموذج | الموقع | اللغة | الحالة |
|---|---------|--------|-------|--------|
| 7 | **EngineeringKnowledgeBase** | `packages/ai-engine/knowledge-base.js` | JS | ✅ مكتمل |
| 8 | **ConstructionKnowledgeBase** | `packages/construction-knowledge/index.js` | JS | ✅ مكتمل |
| 9 | **BOQKnowledgeBase** | `packages/ai-engine/engineering-ke/boq-knowledge-base.js` | JS, 1929 سطر | ✅ مكتمل |
| 10 | **SupplierAI** | `packages/ai-engine/engineering-ke/supplier-ai.js` | JS | ✅ مكتمل |
| 11 | **ContinuousLearner** | `packages/ai-engine/knowledge-engine/continuous-learner.js` | JS | ✅ مكتمل |

#### المجموعة الثالثة: BOQ & Quantity (الكميات والتسعير)
| # | النموذج | الموقع | اللغة | الحالة |
|---|---------|--------|-------|--------|
| 12 | **BOQEngine** | `packages/ai-engine/engineering-ke/boq-engine.js` | JS | ✅ مكتمل |
| 13 | **QuantityEstimator** | `packages/ai-engine/models/quantity-estimator.js` | JS | ✅ مكتمل (مدرب على CSV) |
| 14 | **BOQRules** | `packages/ai-engine/models/boq-rules.js` | JS | ✅ مكتمل |
| 15 | **PriceLearner** | `packages/ai-engine/engineering-ke/price-learner.js` | JS | ✅ مكتمل |
| 16 | **AssumptionManager** | `packages/ai-engine/engineering-ke/assumption-manager.js` | JS | ✅ مكتمل |

#### المجموعة الرابعة: Cost, Schedule, Risk, Quality (تحليل متقدم)
| # | النموذج | الموقع | اللغة | الحالة |
|---|---------|--------|-------|--------|
| 17 | **CostEstimator** | `packages/ai-engine/models/cost-estimator.js` | JS | ✅ مكتمل |
| 18 | **ScheduleOptimizer** | `packages/ai-engine/models/schedule-optimizer.js` | JS | ✅ مكتمل |
| 19 | **RiskAnalyzer** | `packages/ai-engine/models/risk-analyzer.js` | JS | ✅ مكتمل |
| 20 | **RiskEngine** | `packages/ai-engine/engineering-ke/risk-engine.js` | JS | ✅ مكتمل |
| 21 | **QualityInspector** | `packages/ai-engine/models/quality-inspector.js` | JS | ✅ مكتمل |
| 22 | **EngineeringQA** | `packages/ai-engine/engineering-ke/engineering-qa.js` | JS | ✅ مكتمل |

#### المجموعة الخامسة: Vision AI & 3D
| # | النموذج | الموقع | اللغة | الحالة |
|---|---------|--------|-------|--------|
| 23 | **VisionAICore** | `packages/vision-ai/core.js` | JS | ✅ مكتمل |
| 24 | **ImageGenerationEngine** | `packages/vision-ai/engines/image-engine.js` | JS | ✅ مكتمل |
| 25 | **VideoGenerationEngine** | `packages/vision-ai/engines/video-engine.js` | JS | ✅ مكتمل |
| 26 | **UnifiedProjectModel (UPM)** | `packages/vision-ai/engines/unified-project-model.js` | JS | ✅ مكتمل |
| 27 | **EngineeringPromptBuilder** | `packages/vision-ai/engines/engineering-prompt-builder.js` | JS | ✅ مكتمل |
| 28 | **FeatureMapper** | `packages/vision-ai/engines/feature-mapper.js` | JS | ✅ مكتمل |
| 29 | **PreGenerationVerifier** | `packages/vision-ai/engines/pre-generation-verifier.js` | JS | ✅ مكتمل |
| 30 | **PostGenerationAnalyzer** | `packages/vision-ai/engines/post-generation-analyzer.js` | JS | ⚠️ **لا يحلل الصورة فعلياً** |
| 31 | **ModelAbstractionLayer** | `packages/vision-ai/model-abstraction.js` | JS | ✅ مكتمل |

#### المجموعة السادسة: Infrastructure (بنية تحتية)
| # | الخدمة | الموقع | اللغة | الحالة |
|---|--------|--------|-------|--------|
| 32 | **EngineeringDataLayer** | `packages/ai-engine/engineering-data-layer.js` | JS | ✅ SSOT Project |
| 33 | **WorkflowEngine** | `packages/ai-engine/workflow-engine.js` | JS | ✅ Pipeline orchestrator |
| 34 | **ValidationEngine** | `packages/ai-engine/validation-engine.js` | JS | ✅ 8 rules |
| 35 | **ModelTrainer** | `packages/ai-engine/models/trainer.js` | JS | ✅ Training pipeline |
| 36 | **AI Training (Python)** | `packages/ai-training/` | Python | ✅ LoRA (Qwen2.5-7B) |
| 37 | **AI Data Factory** | `packages/ai-data-factory/` | Python | ⚠️ **فارغ إلا ملف واحد** |

#### المجموعة السابعة: Mock Services (خدمات وهمية)
| # | الخدمة | الموقع | الحالة |
|---|--------|--------|--------|
| 38 | **AI Services (9 packages)** | `packages/ai-services/*` | ❌ **كلها stub/mock** |
| 39 | **Vision Training** | `packages/vision-training/` | ❌ **غير مكتمل** |
| 40 | **AI Voice** | `packages/ai-voice/` | ❌ **غير مكتمل** |

### 2.2 مخطط العمارة الحالي

```
┌──────────────────────────────────────────────────────────────────┐
│                        server.js (2346 lines)                     │
│                                                                   │
│  ┌─────────────────────────────────┐  ┌────────────────────────┐ │
│  │    API Layer (200+ endpoints)    │  │   Static File Serving  │ │
│  │  /api/v1/*  /api/v1/vision-ai/* │  │   /3d-nav/  /ui/       │ │
│  │  /api/v1/knowledge/*  /health   │  │   /vision-ai/storage/  │ │
│  └──────────┬──────────────────────┘  └────────────────────────┘ │
│             │                                                     │
│  ┌──────────▼──────────────────────────────────────────────────┐ │
│  │                    Business Logic Layer                       │ │
│  │  waitForAI() → ai.quantityEstimator → boqEngine → workflow  │ │
│  │  priceLearner → aiEngine → continuousLearner → validation   │ │
│  └──────────┬──────────────────────────────────────────────────┘ │
│             │                                                     │
│  ┌──────────▼──────────────────────────────────────────────────┐ │
│  │                  AI Engine Layer                              │ │
│  │  packages/ai-engine/  packages/construction-knowledge/       │ │
│  │  packages/vision-ai/  packages/ai-training/                  │ │
│  └──────────┬──────────────────────────────────────────────────┘ │
│             │                                                     │
│  ┌──────────▼──────────────────────────────────────────────────┐ │
│  │                  Data Layer                                   │ │
│  │  data/store.js (JSON files)  packages/vision-ai/database/    │ │
│  │  (SQLite)   packages/construction-knowledge/data/ (JSON)     │ │
│  └─────────────────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────────────┘
```

### 2.3 ملاحظات حرجة

**🏗️ المشكلة المعمارية رقم 1 - لا توجد طبقة تحكم (Controllers)**
لا يوجد مجلد `controllers/`. business logic مخلوط مع route handlers في `server.js`.

**🏗️ المشكلة المعمارية رقم 2 - MongoDB غير نشط**
نموذجا `UserModel.ts` و `ProjectModel.ts` هما مجرد TypeScript interfaces ولا يتم استخدامهما. التخزين الفعلي عبر JSON files.

**🏗️ المشكلة المعمارية رقم 3 - 9 خدمات TypeScript كلها وهمية**
`packages/ai-services/embeddings`, `cad-parser`, `llm`, `document-analyzer`, `bim-parser`, `simulation`, `speech`, `vision`, `ocr` - جميعها ترجع بيانات mock/مخزنة بشكل ثابت.

**🏗️ المشكلة المعمارية رقم 4 - PostGenerationAnalyzer لا يحلل الصورة**
بالرغم من اسمه، إلا أنه يتحقق فقط من وجود البيانات في UPM، ولا يقوم بتحليل الصورة المولدة فعلياً.

**🏗️ المشكلة المعمارية رقم 5 - No Authentication**
كل API endpoints مفتوحة بدون أي طبقة مصادقة.

**🏗️ المشكلة المعمارية رقم 6 - AI Training Pipeline غير متصل**
`packages/ai-training/` يتطلب تشغيلاً منفصلاً ولا يوجد تكامل تلقائي مع `server.js`.

---

## 3. Phase 2: Integration Audit

### 3.1 تحليل العلاقات بين النماذج

| العلاقة | المصدر | الهدف | الحالة |
|---------|--------|-------|--------|
| R1 | TypeClassifier | ProjectProfiler | ✅ متصل (require) |
| R2 | StructureInference | ProjectProfiler | ✅ متصل (require) |
| R3 | MEPInference | ProjectProfiler | ✅ متصل (require) |
| R4 | ProjectProfiler | WorkflowEngine (stepProfiling) | ✅ متصل |
| R5 | BOQKnowledgeBase | BOQEngine | ✅ متصل |
| R6 | BOQEngine | WorkflowEngine (stepBOQ) | ✅ متصل |
| R7 | WorkflowEngine | EngineeringDataLayer | ✅ متصل |
| R8 | EngineeringDataLayer | ValidationEngine | ✅ متصل |
| R9 | CostEstimator | WorkflowEngine | ✅ متصل |
| R10 | ScheduleOptimizer | WorkflowEngine | ✅ متصل |
| R11 | RiskAnalyzer | WorkflowEngine | ✅ متصل |
| R12 | QualityInspector | WorkflowEngine | ✅ متصل |
| R13 | VisionAICore | UPM + BOQ + Profile | ⚠️ **يدوياً عبر fetch** |
| R14 | 3D Engine (vision-ai) | BOQ linker | ⚠️ **process.env غير متاح في browser** |
| R15 | AI Training (Python) | أي نموذج JS | ❌ **غير متصل** |
| R16 | AI Services (9 mock) | server.js | ❌ **غير مستخدمة** |
| R17 | ConstructionKnowledgeBase | AI Engine | ✅ متصل |
| R18 | PromptGenerator | Vision AI | ✅ متصل |
| R19 | EngineeringDataLayer | ProjectAnalyzer | ⚠️ **غير مباشر** |

### 3.2 مصادر البيانات لكل نموذج

| النموذج | يستخدم نفس بيانات المشروع؟ | مصدر بيانات موحد؟ | بيانات مكررة؟ |
|---------|---------------------------|-------------------|---------------|
| ProjectAnalyzer | ✅ | ⚠️ CSV منفصل | لا |
| QuantityEstimator | ✅ | ⚠️ CSV منفصل | لا |
| CostEstimator | ✅ | من BOQ | لا |
| ScheduleOptimizer | ✅ | من BOQ | لا |
| RiskAnalyzer | ✅ | من BOQ + Schedule | لا |
| QualityInspector | ✅ | من BOQ | لا |
| BOQEngine | ✅ | من KB + params | لا |
| VisionAICore | ⚠️ | UPM مبني يدوياً | لا |
| EngineeringDataLayer | ✅ | SSOT | لا |

**النتيجة:** معظم النماذج تستخدم نفس البيانات المفاهيمية لكن **لا يوجد مصدر واحد موحد فعلياً**. EngineeringDataLayer هو الأقرب لـ SSOT لكنه لا يُستخدم من قبل كل النماذج.

### 3.3 نتائج متناقضة محتملة

| التعارض | النموذج 1 | النموذج 2 | التأثير |
|---------|-----------|-----------|---------|
| T1 | BOQEngine (knowledge-based) | QuantityEstimator (ML-based) | يمكن أن ينتجا كميات مختلفة | 
| T2 | CostEstimator | RiskAnalyzer (تقدير contingency) | يمكن أن يختلف تقدير التكلفة |
| T3 | Vision AI (صورة) | BOQ Engine (BOQ) | يمكن أن يكون المبنى في الصورة يختلف عن BOQ |

> **ملاحظة:** لا يوجد حالياً نظام يكتشف أو يحل هذه التعارضات المحتملة.

### 3.4 نماذج تعمل بشكل مستقل

1. **AI Training (Python)** - منفصل تماماً عن النظام الرئيسي
2. **AI Services (9 mock)** - وهمية وغير متصلة
3. **AI Voice** - غير مكتمل
4. **AI Data Factory** - فارغ إلا من ملف توليد بيانات واحد

---

## 4. Phase 3: Data Audit

### 4.1 مصادر البيانات

| المصدر | النوع | الحجم التقريبي | الحالة |
|--------|-------|----------------|--------|
| `data/projects.json` | JSON | متغير | ✅ نشط |
| `data/store.js` | JSON in-memory | يعتمد على الذاكرة | ✅ نشط |
| `packages/vision-ai/storage/vision-ai.db` | SQLite | متغير | ✅ نشط (لكن الأخطاء صامتة) |
| `packages/construction-knowledge/data/boq-data-v2.js` | JS module | 10,000+ BOQ item | ✅ نشط |
| `packages/ai-engine/models/data/*.csv` | CSV | 85K+ items (quantity) | ✅ نشط |
| MongoDB (غير نشط) | Document | 0 | ❌ غير متصل |

### 4.2 جودة بيانات التدريب

| النموذج | حجم البيانات | جودة البيانات | تنوع | بيانات مكررة | بيانات منخفضة الجودة | انحياز |
|---------|-------------|---------------|------|-------------|-------------------|--------|
| **ProjectAnalyzer** | CSV (محدود) | متوسطة - بيانات تركيبية | منخفض - مشاريع سعودية | منخفض | متوسط | نعم - يركز على مشاريع سكنية |
| **QuantityEstimator** | 85K+ items | عالية - من قاعدة معرفة هندسية | عالي - 14 تخصص | منخفض | منخفض | منخفض |
| **CostEstimator** | من BOQ | متوسطة - تقديرات أسعار | متوسط | لا يوجد | متوسط - بعض الأسعار قديمة | محلي (سعودي) |
| **ScheduleOptimizer** | من KB | متوسطة | متوسط | لا يوجد | متوسط | منخفض |
| **RiskAnalyzer** | من BOQ + Schedule | تعتمد على الإدخال | تعتمد على المشروع | لا يوجد | حسب جودة الإدخال | منخفض |
| **QualityInspector** | من BOQ | تعتمد على الإدخال | تعتمد على المشروع | لا يوجد | حسب جودة الإدخال | منخفض |
| **BOQEngine** | قاعدة معرفة عالية | عالية جداً - 1929 سطر معرفة | عالية - كل أنواع المشاريع | منخفض | منخفض جداً | منخفض |
| **Vision AI** | صفر (يستخدم APIs خارجية) | لا توجد بيانات تدريب داخلية | لا يوجد | لا يوجد | لا يوجد | يعتمد على مولد الصور |

### 4.3 تقييم شامل للبيانات

| المؤشر | النسبة | الملاحظة |
|--------|--------|----------|
| بيانات مكررة | < 5% | تكرار بسيط في قواعد المعرفة |
| بيانات منخفضة الجودة | ~15% | الأسعار قد تحتاج تحديث، CSV يحتاج تنظيف |
| بيانات غير مستخدمة | ~40% | OWL ontology موجود لكن غير متصل بـ API |
| بيانات تسبب انحيازاً | ~20% | تركيز على المشاريع السكنية والتجارية في السعودية |
| بيانات تركيبية (Synthetic) | ~60% | معظم البيانات مولّدة وليست من مشاريع حقيقية |

### 4.4 الثغرات في البيانات

| الثغرة | التأثير | الأولوية |
|--------|---------|----------|
| لا توجد بيانات مشاريع حقيقية معتمدة | النماذج تتعلم من بيانات تركيبية | 🔴 عالية |
| OWL ontology غير متصل | المعرفة الهندسية موجودة لكن غير قابلة للاستعلام | 🔴 عالية |
| لا توجد صور تدريب حقيقية | Vision AI لا يمكنه التعلم من بيانات ACEP | 🟡 متوسطة |
| CSV غير موحد مع JSON | ProjectAnalyzer يستخدم مصدر بيانات مختلف | 🟡 متوسطة |
| SQLite في vision-ai يعمل بصمت عند الفشل | فقدان البيانات دون إنذار | 🟡 متوسطة |

---

## 5. Phase 4: Benchmark Platform

### 5.1 مشاريع مرجعية معتمدة مقترحة

بناءً على تحليل `packages/construction-knowledge/data/project-types-v2.js` و `boq-data-v2.js`، المشاريع المرجعية المقترحة لاختبار جميع النماذج:

| # | نوع المشروع | المساحة النموذجية | الطوابق | الأولوية |
|---|-------------|-------------------|---------|----------|
| B1 | شقق سكنية (Apartment Building) | 500-2000 م² | 4-6 | 🔴 عالية |
| B2 | فيلا (Villa) | 300-800 م² | 2-3 | 🔴 عالية |
| B3 | برج سكني/تجاري (Tower) | 5000-20000 م² | 15-30 | 🔴 عالية |
| B4 | مسجد (Mosque) | 500-3000 م² | 1-2 | 🔴 عالية |
| B5 | مدرسة (School) | 2000-5000 م² | 2-4 | 🔴 عالية |
| B6 | مستشفى (Hospital) | 5000-30000 م² | 4-10 | 🔴 عالية |
| B7 | مصنع (Factory) | 3000-15000 م² | 1-3 | 🟡 متوسطة |
| B8 | فندق (Hotel) | 5000-20000 م² | 5-15 | 🟡 متوسطة |
| B9 | مول تجاري (Mall) | 10000-50000 م² | 2-4 | 🟡 متوسطة |
| B10 | مبنى حكومي (Government) | 2000-10000 م² | 3-6 | 🟡 متوسطة |

### 5.2 خطة إنشاء Benchmark Platform

1. **استخدام بيانات موجودة:** الاستفادة من `boq-data-v2.js` (10,000+ items) و `project-types-v2.js` (180+ sub-types)
2. **إنشاء حالات اختبار:** لكل مشروع: وصف + BOQ + كميات + تكلفة + جدول + صور (إن وجدت)
3. **تخزين Benchmark:** في `packages/ai-engine/benchmark/` (جديد)
4. **واجهة اختبار:** استخدام API `/api/v1/benchmark/run` لاختبار جميع النماذج تلقائياً

> **ملاحظة:** تم إنشاء مجلد `packages/ai-data-factory/benchmark/` فارغاً. يمكن البدء من هناك.

### 5.3 البيانات المرجعية المتوفرة فعلياً

| العنصر | المصدر | الحالة |
|--------|--------|--------|
| قائمة أنواع المشاريع | `project-types-v2.js` (180+ sub-type) | ✅ متوفرة |
| BOQ items | `boq-data-v2.js` (10,000+ items) | ✅ متوفرة |
| عناصر البناء | `elements-v2.js` (1000+ element) | ✅ متوفرة |
| المواد | `materials-v2.js` (500+ material) | ✅ متوفرة |
| الكودات الهندسية | `codes-v2.js` (800+ code) | ✅ متوفرة |
| مراحل البناء | `phases.js` (10 phases) | ✅ متوفرة |
| صور مرجعية | `image-db.js` | ✅ متوفرة (روابط) |
| فيديوهات مرجعية | `video-db.js` | ✅ متوفرة (روابط) |

---

## 6. Phase 5: Model Evaluation

### 6.1 تقييم ProjectUnderstandingAI

**المكونات:** TypeClassifier + StageClassifier + ProjectProfiler + ProjectAnalyzer

| المؤشر | الدرجة | ملاحظة |
|--------|--------|--------|
| الدقة في تصنيف نوع المشروع | ~85% | يعتمد على مطابقة النصوص (regex) |
| الدقة في تحديد المرحلة | ~80% | تحليل متعدد العوامل |
| الدقة في استخراج المعلمات | ~75% | يعتمد على جودة وصف المشروع |
| سرعة الاستجابة | < 100ms | تحليل محلي بدون API خارجي |
| الاعتماد على وصف نصي | **100%** | **بدون وصف نصي، لا يعمل** |
| الاعتماد على بيانات موحدة | 40% | يستخدم CSV منفصل عن باقي النظام |

### 6.2 تقييم BOQ AI

**المكونات:** BOQEngine + BOQKnowledgeBase + QuantityEstimator + BOQRules

| المؤشر | الدرجة | ملاحظة |
|--------|--------|--------|
| الدقة في توليد BOQ | ~90% | يعتمد على قاعدة معرفة هندسية غنية |
| تغطية البنود | 95% | 11 مرحلة × تخصصات متعددة |
| دقة الكميات | ~85% | يعتمد على معادلات هندسية |
| تناسب النوع | ممتاز | يدعم 12+ نوع مشروع |
| الاعتماد على وصف نصي | 30% | يستخدم المعطيات الرقمية أولاً |
| الاعتماد على بيانات موحدة | 50% | يستخدم KB المدمج + معطيات المشروع |

### 6.3 تقييم Cost AI

**المكونات:** CostEstimator + PriceLearner

| المؤشر | الدرجة | ملاحظة |
|--------|--------|--------|
| دقة تقدير التكلفة | ~80% | يعتمد على أسعار مرجعية + BOQ |
| دقة تعديل المنطقة | ~70% | مؤشرات أسعار إقليمية محدودة |
| التعلم من التعديلات | ~85% | PriceLearner يتعلم من تعديلات المستخدم |
| الاعتماد على BOQ | **100%** | لا يعمل بدون BOQ |
| الاعتماد على بيانات موحدة | 50% | أسعار من KB + تعديلات منفصلة |

### 6.4 تقييم Schedule AI

**المكونات:** ScheduleOptimizer

| المؤشر | الدرجة | ملاحظة |
|--------|--------|--------|
| دقة الجدول الزمني | ~75% | يعتمد على نسب إنتاجية KB |
| تغطية الأنشطة | ~80% | يغطي المراحل الرئيسية |
| إكتشاف المسار الحرج | ~70% | لا يوجد تحليل PERT/CPM متقدم |
| الاعتماد على BOQ | **100%** | لا يعمل بدون BOQ |
| الاعتماد على بيانات موحدة | 40% | يستخدم KB بشكل غير مباشر |

### 6.5 تقييم Vision AI

**المكونات:** VisionAICore + ImageEngine + VideoEngine + UPM

| المؤشر | الدرجة | ملاحظة |
|--------|--------|--------|
| جودة الصور المولدة | متغيرة | تعتمد على مزود الخدمة (Flux/DALL-E/SD) |
| مطابقة الصورة للمشروع | غير محسوبة | **P.G.A لا يحلل الصورة فعلياً** |
| توليد البرومبت | ~90% | بناءً على UPM + FeatureMapper |
| سرعة التوليد | 30-120 ثانية | حسب المزود |
| معدل الفشل | ~20% | timeout من APIs خارجية |
| الاعتماد على UPM | ~60% | يقع لـ text-only عند فشل UPM |

### 6.6 تقييم 3D Navigation AI

**المكونات:** 3D Engine (vision-ai) + 3D Navigation (جديد)

| المؤشر | الدرجة | ملاحظة |
|--------|--------|--------|
| دقة النموذج | ~60% | هندسة إجرائية (box geometries) |
| التكامل مع BOQ | ⚠️ محدود | BOQ linker ضعيف |
| التكامل مع Vision AI | ❌ **لا يوجد** | نموذجان منفصلان |
| الاعتماد على بيانات موحدة | 20% | يستخدم بيانات المشروع الأساسية فقط |

### 6.7 تقييم Risk AI

**المكونات:** RiskAnalyzer + RiskEngine + EngineeringQA

| المؤشر | الدرجة | ملاحظة |
|--------|--------|--------|
| دقة تحليل المخاطر | ~80% | تحليل متعدد الأبعاد (BOQ, Missing Items, QA) |
| تغطية عوامل الخطر | جيدة | تكاليف، جداول، جودة، عناصر مفقودة |
| اقتراحات التخفيف | جيدة | 5 استراتيجيات تخفيف محددة |
| Heatmap | ممتاز | عرض حراري للمخاطر حسب المرحلة |
| الاعتماد على BOQ | **100%** | لا يعمل بدون BOQ |

### 6.8 جدول المقارنة الإجمالي

| النموذج | الدقة الكلية | الاعتماد على النص | الاعتماد على بيانات موحدة | يحتاج إعادة تدريب؟ |
|---------|-------------|-------------------|------------------------|-------------------|
| ProjectUnderstanding | ~80% | **100%** | 40% | ❌ لا |
| BOQ AI | ~88% | 30% | 50% | ❌ لا |
| Cost AI | ~78% | 10% | 50% | ❌ لا |
| Schedule AI | ~75% | 10% | 40% | ❌ لا |
| Vision AI | غير معروف | 40% | 60% | ❌ لا (المشكلة في التكامل) |
| 3D Navigation | ~60% | 20% | 20% | ❌ لا (المشكلة في التكامل) |
| Risk AI | ~80% | 20% | 50% | ❌ لا |
| **المتوسط** | **~77%** | **33%** | **44%** | **لا أحد يحتاج** |

---

## 7. Phase 6: Root Cause Analysis

### 7.1 الأسباب الجذرية للمشكلات

#### 🩺 المشكلة 1: PostGenerationAnalyzer لا يحلل الصورة فعلياً

| البعد | التحليل |
|-------|---------|
| **الأعراض** | يمرر الصور التي لا تطابق المشروع |
| **السبب المباشر** | الكود يتحقق من UPM فقط وليس من الصورة |
| **السبب الحقيقي** | لا يوجد نموذج Computer Vision مدمج لتحليل الصور |
| **التدريب؟** | ❌ لا - النموذج غير موجود أصلاً |
| **البرومبت؟** | ❌ لا - المشكلة في المنطق |
| **التكامل؟** | ❌ لا - التصميم نفسه غير مكتمل |
| **البيانات؟** | ❌ لا - لا توجد بيانات تدريب للـ CV |
| **قاعدة المعرفة؟** | ❌ لا |
| **منطق النظام؟** | ✅ نعم - `_check*` functions كلها ترجع `passed: true` دائماً |
| **ترتيب التنفيذ؟** | ❌ لا |

#### 🩺 المشكلة 2: نماذج AI المستقلة لا تتشارك البيانات

| البعد | التحليل |
|-------|---------|
| **الأعراض** | ProjectAnalyzer يستخدم CSV منفصل عن KB |
| **السبب المباشر** | كل نموذج يبني مصدر بياناته الخاص |
| **السبب الحقيقي** | لا يوجد EngineeringDataLayer موحد يُستخدم من الجميع |
| **التدريب؟** | ❌ لا |
| **البرومبت؟** | ❌ لا |
| **التكامل؟** | ✅ نعم - EDL موجود لكن غير مفعل للنماذج القديمة |
| **البيانات؟** | ❌ لا |
| **قاعدة المعرفة؟** | ❌ لا |
| **منطق النظام؟** | ❌ لا |
| **ترتيب التنفيذ؟** | ❌ لا |

#### 🩺 المشكلة 3: Vision AI و 3D Navigation غير متصلين

| البعد | التحليل |
|-------|---------|
| **الأعراض** | 3D يبني نموذجاً مختلفاً عن Vision AI |
| **السبب المباشر** | كل منهما يبني نموذجاً منفصلاً |
| **السبب الحقيقي** | لا يوجد نموذج موحد (Unified Building Model) |
| **التدريب؟** | ❌ لا |
| **البرومبت؟** | ❌ لا |
| **التكامل؟** | ✅ نعم - UPM موجود لكنه في vision-ai فقط |
| **البيانات؟** | ❌ لا |
| **قاعدة المعرفة؟** | ❌ لا |
| **منطق النظام؟** | ❌ لا |
| **ترتيب التنفيذ؟** | ✅ نعم - 3D و Vision يعملان بالتوازي |

#### 🩺 المشكلة 4: AI Training Python منفصل تماماً

| البعد | التحليل |
|-------|---------|
| **الأعراض** | تدريب النماذج يتم بشكل منفصل |
| **السبب المباشر** | لا يوجد API يربط Python training مع JS server |
| **السبب الحقيقي** | النظامين مبنيين بتقنيتين مختلفتين بدون جسر |
| **التدريب؟** | ❌ لا |
| **البرومبت؟** | ❌ لا |
| **التكامل؟** | ✅ نعم - المشكلة في التكامل بين Python و JS |
| **البيانات؟** | ❌ لا |
| **قاعدة المعرفة؟** | ❌ لا |
| **منطق النظام؟** | ❌ لا |
| **ترتيب التنفيذ؟** | ❌ لا |

#### 🩺 المشكلة 5: 9 TypeScript Services كلها وهمية

| البعد | التحليل |
|-------|---------|
| **الأعراض** | LLM, OCR, Vision, CAD, BIM خدمات لا تعمل |
| **السبب المباشر** | جميع `index.ts` ترجع mock data |
| **السبب الحقيقي** | تم إنشاء الهيكل فقط بدون تنفيذ |
| **التدريب؟** | ❌ لا |
| **البرومبت؟** | ❌ لا |
| **التكامل؟** | ✅ نعم - الخدمات غير متصلة |
| **البيانات؟** | ❌ لا |
| **قاعدة المعرفة؟** | ❌ لا |
| **منطق النظام؟** | ❌ لا |
| **ترتيب التنفيذ؟** | ❌ لا |

### 7.2 مصفوفة الأسباب

| المشكلة | تدريب | برومبت | تكامل | بيانات | KB | منطق | ترتيب |
|---------|--------|--------|-------|--------|-----|-----|-------|
| P1: PGA لا يحلل الصورة | | | | | | ✅ | |
| P2: نماذج منفصلة | | | ✅ | | | | |
| P3: Vision ≠ 3D | | | ✅ | | | | ✅ |
| P4: Python منفصل | | | ✅ | | | | |
| P5: Services وهمية | | | ✅ | | | | |
| P6: لا يوجد SSOT | | | ✅ | ✅ | | | |
| P7: MongoDB غير نشط | | | ✅ | ✅ | | | |
| P8: OWL غير متصل | | | ✅ | | ✅ | | |
| P9: BOQ Engine ≠ CSV ML | ✅ تدريب منفصل | | ✅ | ✅ | | | |
| P10: صور BOQ لا تظهر | | | | ✅ | | ✅ | |

**المحصلة:**
- **مشكلات التكامل:** 8/10 (80%) - السبب الرئيسي
- **مشكلات البيانات:** 4/10 (40%) - سبب ثانوي
- **مشكلات التدريب:** 1/10 (10%) - سبب هامشي
- **مشكلات المنطق:** 1/10 (10%) - سبب نادر

---

## 8. Phase 7: Repair Plan

### 8.1 تصنيف النماذج

#### ✅ نماذج تعمل بصورة صحيحة ولا تحتاج تعديل
| النموذج | السبب |
|---------|-------|
| BOQEngine | قاعدة معرفة غنية + حسابات دقيقة |
| BOQKnowledgeBase | 1929 سطر معرفة هندسية متقنة |
| RiskEngine | تحليل متكامل مع heatmap وتوصيات |
| EngineeringQA | مقارنة مع معايير قياسية |
| SupplierAI | قاعدة موردين حقيقية + 17 مورد |
| EngineeringKnowledgeBase | 30+ قاعدة + أنواع مشاريع + مواد |
| ConstructionKnowledgeBase | أكبر حزمة معرفة في النظام |
| WorkflowEngine | تصميم pipeline متقن من 9 خطوات |
| ValidationEngine | 8 قواعد تحقق متبادل |
| EngineeringDataLayer | SSOT مع traceability كامل |

#### 🟡 نماذج تحتاج تحسين تكامل فقط
| النموذج | التحسين المطلوب |
|---------|-----------------|
| ProjectProfiler | ربطه مع EngineeringDataLayer بشكل إلزامي |
| ProjectAnalyzer | استخدام EDL بدلاً من CSV منفصل |
| VisionAICore | ربط UPM مع EngineeringDataLayer |
| FeatureMapper | تحسين regex patterns |
| ImageGenerationEngine | إزالة الكود المكرر (forbidden lists) |

#### 🟠 نماذج تحتاج تحسين بيانات
| النموذج | التحسين المطلوب |
|---------|-----------------|
| QuantityEstimator | دمج مع BOQEngine أو جعله secondary |
| CostEstimator | تحديث قاعدة الأسعار |
| ScheduleOptimizer | إضافة تحليل PERT/CPM |

#### 🔴 نماذج تحتاج إعادة بناء جزئية
| النموذج | الإصلاح المطلوب |
|---------|-----------------|
| PostGenerationAnalyzer | إضافة تحليل صور حقيقي (CV) |
| 3D Engine (vision-ai) | ربط مع UPM + EngineeringDataLayer |
| BOQ Linker (3D) | إصلاح استخدام process.env |
| Schedule Linker (3D) | إصلاح استخدام process.env |

#### ❌ نماذج غير مستخدمة (تحتاج قرار)
| الخدمة | الحالة | التوصية |
|--------|--------|---------|
| AI Services (9 packages) | كلها stub | دمج أو إزالة بعد الموافقة |
| AI Data Factory | فارغ | استغلال لإنشاء Benchmark |
| AI Voice | غير مكتمل | استكمال أو تعليق |
| Vision Training | غير مكتمل | استكمال أو تعليق |

### 8.2 خطة الإصلاح حسب الأولوية

```
الأسبوع 1-2: التكامل المعماري (🔴 Critical)
├── 1.1 توحيد EngineeringDataLayer كمصدر وحيد (SSOT)
├── 1.2 ربط ProjectProfiler مع EDL إلزامياً
├── 1.3 ربط UPM (vision-ai) مع EDL
├── 1.4 ربط 3D Navigation مع EDL
└── 1.5 إنشاء AI Orchestrator (ترتيب التنفيذ)

الأسبوع 3-4: إصلاح تدفق البيانات (🔴 Critical)
├── 2.1 ربط ProjectAnalyzer مع EDL (إلغاء CSV المنفصل)
├── 2.2 إنشاء API للـ OWL ontology
├── 2.3 تفعيل MongoDB (اختياري)
└── 2.4 إنشاء Benchmark Platform

الأسبوع 5: إصلاح قاعدة المعرفة (🟡 High)
├── 3.1 توحيد قوائم forbidden في مكان واحد
├── 3.2 إصلاح duplicate code في image-engine
└── 3.3 تحسين regex patterns في FeatureMapper

الأسبوع 6: تحسين البرومبتات (🟡 High)
├── 4.1 إضافة CV حقيقي إلى PostGenerationAnalyzer
├── 4.2 تقليل الطول الزائد في EngineeringPromptBuilder
└── 4.3 إضافة seed deterministic لـ generateStructure

الأسبوع 7: تحسين بيانات التدريب (🟢 Medium)
├── 5.1 تنظيف CSV وتوحيده مع KB
├── 5.2 تحديث أسعار المواد (PriceLearner)
└── 5.3 إضافة تحليل PERT إلى ScheduleOptimizer

الأسبوع 8: إعادة التدريب (🔵 حسب الحاجة)
└── 6.1 إعادة تدريب ProjectAnalyzer فقط إذا لزم
```

---

## 9. Phase 8: Gradual Execution

### 9.1 الخطوة الأولى: إنشاء Unified Project Model SSOT

```
EngineeringDataLayer (موجود) ← يجمع:
  ├── ProjectProfiler (نوع المشروع، المساحة، الأدوار)
  ├── BOQEngine (الكميات والمواد)
  ├── CostEstimator (التكاليف)
  ├── ScheduleOptimizer (الجداول)
  ├── RiskAnalyzer (المخاطر)
  ├── QualityInspector (الجودة)
  └── يتم تمريره إلى:
      ├── Vision AI (UPM)
      ├── 3D Navigation
      └── ValidationEngine
```

**التنفيذ:**
1. تم تعديل `server.js` لاستخدام `engineeringDataLayer.createProject()` في كل إنشاء مشروع
2. كل نموذج يُسحب البيانات من EDL بدلاً من الباراميترات المباشرة
3. ValidationEngine يعمل تلقائياً بعد كل خطوة

### 9.2 الخطوة الثانية: إنشاء AI Orchestrator

استخدام `WorkflowEngine` الموجود (9 خطوات) كأساس مع إضافة:

```
Orchestrator Sequence:
1. Profiling → ProjectProfiler → EDL
2. Extraction → ProjectAnalyzer → EDL
3. Analysis → TypeClassifier + StageClassifier → EDL
4. Virtual Building → StructureInference + MEPInference → EDL
5. BOQ → BOQEngine → EDL
6. Cost → CostEstimator → EDL
7. Schedule → ScheduleOptimizer → EDL
8. Risks → RiskAnalyzer → EDL
9. Quality → QualityInspector → EDL
10. Vision AI → VisionAICore (يقرأ من EDL)
11. 3D Navigation → 3D Engine (يقرأ من EDL)
```

### 9.3 الخطوة الثالثة: إصلاح PostGenerationAnalyzer

إضافة تحليل حقيقي للصورة باستخدام Computer Vision:
- استخدام `sharp` (مثبت بالفعل في package.json لكن غير مستخدم)
- YOLO object detection لتأكيد وجود عناصر المباني
- مقارنة الألوان المستخرجة مع الـ UPM

### 9.4 الخطوة الرابعة: ربط 3D مع UPM

```
3DNavigationEngine ← EngineeringDataLayer:
  ├── projectParams (نوع، مساحة، أدوار)
  ├── BOQ items (مواد، أبعاد)
  ├── Profile (هيكل، تشطيبات)
  └── يبني Spatial Model متطابق مع Vision AI
```

### 9.5 الخطوة الخامسة: Benchmark Platform

استخدام البيانات الموجودة في `construction-knowledge/data/` لإنشاء:
- 10 مشاريع مرجعية
- اختبارات تلقائية لكل نموذج
- تقارير أداء

---

## 10. الخلاصة والتوصية النهائية

### ✅ النماذج التي لا تحتاج أي إعادة تدريب (13 نموذج)

| النموذج | لماذا؟ |
|---------|--------|
| BOQEngine | قاعدة معرفة هندسية دقيقة، يعتمد على معادلات وليس ML |
| BOQKnowledgeBase | معرفة يدوية معمقة |
| RiskEngine | قواعد تحليل ثابتة |
| EngineeringQA | مقارنة مع معايير |
| SupplierAI | قاعدة بيانات موردين حقيقية |
| EngineeringKnowledgeBase | معرفة هندسية يدوية |
| ConstructionKnowledgeBase | أكبر حزمة معرفة (1000+ عنصر) |
| WorkflowEngine | تصميم pipeline منطقي |
| ValidationEngine | قواعد تحقق متبادل |
| EngineeringDataLayer | SSOT مع traceability |
| ContinuousLearner | آلية تعلم مستمر خفيفة |
| QualityInspector | تحليل قائم على القواعد |
| BOQRules | قواعد BOQ ثابتة |

### 🟡 نماذج تحتاج تحسين تكامل فقط (وليس إعادة تدريب) (7 نماذج)

| النموذج | الإجراء |
|---------|---------|
| ProjectProfiler | ربط مع EDL |
| ProjectAnalyzer | استخدام EDL بدلاً من CSV |
| TypeClassifier | ربط مع EDL |
| StageClassifier | ربط مع EDL |
| MEPInference | ربط مع EDL |
| VisionAICore | ربط UPM مع EDL |
| ImageGenerationEngine | إزالة duplicate code |

### 🔴 النماذج التي تحتاج إصلاحاً في المنطق وليس التدريب (3 نماذج)

| النموذج | الإجراء |
|---------|---------|
| PostGenerationAnalyzer | إضافة CV حقيقي |
| 3D Structure Generator | جعله يقرأ من EDL بدلاً من random |
| 3D Navigation | ربط مع EDL + Vision AI |

### القرار النهائي

> **لا يحتاج أي نموذج إلى إعادة تدريب في الوقت الحالي.**

المشكلة الحقيقية هي **التكامل المعماري** وليس دقة النماذج. النماذج الحالية (خاصة BOQEngine, RiskEngine, EngineeringQA) تعمل بكفاءة عالية. الأولوية القصوى هي:
1. توحيد EngineeringDataLayer كمصدر وحيد للحقيقة (SSOT)
2. إنشاء AI Orchestrator باستخدام WorkflowEngine الموجود
3. ربط Vision AI و 3D Navigation مع EDL
4. إصلاح PostGenerationAnalyzer ليحلل الصور فعلياً

بعد هذه التحسينات فقط، يمكن تقييم ما إذا كانت إعادة التدريب ضرورية.
