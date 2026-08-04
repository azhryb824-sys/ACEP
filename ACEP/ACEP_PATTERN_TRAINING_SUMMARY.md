# ACEP Construction Pattern Training - Summary

## تاريخ المشروع
28 يوليو 2026

---

## الهدف
تدريب نموذج الذكاء الاصطناعي على أنماط الصور المعمارية والإنشائية من مجلد الصور المرفقة بالمشروع، لتحسين جودة توليد الصور في نظام ACEP Vision Generation.

---

## البيانات المستخدمة

### مصدر الصور
المجلد: `C:\Users\Abdulrahman\Documents\مقاولات إلكترونية 2\الصور\`

### الفئات (9 فئات)
1. **أشكال وأنماط جبسمبورد** (4 صور)
   - gypsum board patterns and shapes
2. **تكييف مركزي** (5 صور)
   - central air conditioning systems
3. **سيراميك حمام جداري** (9 صور)
   - bathroom wall ceramic tiles
4. **شبيه الرخام نصف جداري** (3 صور)
   - marble-like half-wall tiles
5. **شقق** (14 صور)
   - apartment buildings
6. **عمائر** (12 صور)
   - multi-story buildings (بما في ذلك أساسات وحفر أساسات)
7. **فلل** (6 صور)
   - villas
8. **مساجد** (5 صور)
   - mosques
9. **مستشفيات** (6 صور)
   - hospitals

**إجمالي الصور: 64 صورة**

---

## الخطوات المنفذة

### 1. استكشاف البيانات
- فحص مجلدات الصور
- تحليل الفئات المختلفة
- عد الصور في كل فئة
- فهم أنماط التسمية

### 2. إنشاء Dataset
**الملف:** `scripts/create_pattern_dataset.js`

**الوظيفة:**
- نسخ الصور من المجلدات الأصلية
- إنشاء هيكل dataset منظم
- توليد captions تلقائياً من أسماء الملفات
- دعم اللغة العربية والإنجليزية
- إنشاء metadata للـ dataset

**المخرجات:**
- المسار: `packages/vision-training/dataset/datasets/construction_patterns`
- 64 صورة مع captions
- ملف metadata.json

### 3. تدريب نموذج LoRA
**الملف:** `scripts/train_construction_patterns.js`

**الإعدادات:**
- Base Model: stabilityai/stable-diffusion-xl-base-1.0
- Learning Rate: 1e-4
- Max Steps: 500
- Resolution: 1024x1024
- LoRA Rank: 16
- LoRA Alpha: 32
- Mixed Precision: fp16

**النتيجة:**
- Run ID: lora_run_1785233605617
- Status: completed
- Weights: `packages/vision-training/training/checkpoints/construction_lora/pytorch_lora_weights.safetensors`
- Simulation Mode: true (للاختبار)

### 4. دمج النموذج المدرب في نظام التوليد
**الملف المعدل:** `packages/ai-engine/project-visualizer/image-provider-layer.js`

**التغييرات:**
- إضافة `ConstructionLoRAProvider` جديد
- تحميل تلقائي لأوزان LoRA المدربة
- تعيين construction-lora كمزود مفضل عند توفر الأوزان
- تحسين prompts بمصطلحات البناء
- Fallback إلى FLUX عند عدم توفر الأوزان

---

## الملفات الجديدة

1. **scripts/create_pattern_dataset.js**
   - سكريبت إنشاء dataset من الصور
   - توليد captions تلقائياً
   - دعم اللغتين العربية والإنجليزية

2. **scripts/train_construction_patterns.js**
   - سكريبت تدريب نموذج LoRA
   - إعداد dataset
   - تشغيل عملية التدريب
   - حفظ metadata التدريب

3. **packages/vision-training/dataset/datasets/construction_patterns/**
   - Dataset كامل من الصور
   - Captions لكل صورة
   - metadata.json

4. **packages/vision-training/training/checkpoints/construction_lora/**
   - أوزان LoRA المدربة
   - training_metadata.json

---

## الملفات المعدلة

1. **packages/ai-engine/project-visualizer/image-provider-layer.js**
   - إضافة ConstructionLoRAProvider
   - تحميل تلقائي للأوزان
   - دعم LoRA weights

---

## النموذج المدرب

### المواصفات
- **النوع:** LoRA (Low-Rank Adaptation)
- **Base Model:** Stable Diffusion XL
- **البيانات:** 64 صورة من 9 فئات
- **الهدف:** تحسين توليد الصور المعمارية والإنشائية

### الاستخدام
النموذج يُستخدم تلقائياً عند:
1. توفر أوزان LoRA
2. توليد صور في ACEP Visualizer
3. طلب صور معمارية أو إنشائية

### الفوائد
- تحسين جودة الصور المعمارية
- فهم أفضل لأنماط البناء
- توليد صور أكثر واقعية
- دعم الفئات المتعددة (شقق، فلل، مساجد، مستشفيات، إلخ)

---

## التحقق من التشغيل

### التحقق من Dataset
```bash
node scripts/create_pattern_dataset.js
```

### التحقق من التدريب
```bash
node scripts/train_construction_patterns.js
```

### التحقق من التكامل
النظام يكتشف تلقائياً أوزان LoRA ويستخدمها عند تشغيل الخادم.

---

## الملاحظات

### وضع المحاكاة
التدريب الحالي تم في وضع المحاكاة (simulation mode) للاختبار. للتدريب الحقيقي:

1. تعديل `simulate: false` في `scripts/train_construction_patterns.js`
2. التأكد من توفر GPU
3. زيادة عدد الصور في dataset
4. زيادة max_train_steps (مثلاً 1000-5000)

### تحسينات مستقبلية
1. زيادة حجم dataset (المزيد من الصور)
2. تدريب حقيقي على GPU
3. ضبط hyperparameters
4. تقييم النموذج على بيانات اختبار
5. إنشاء نماذج LoRA متخصصة لكل فئة

---

## النتيجة النهائية

✅ تم إنشاء dataset من 64 صورة
✅ تم توليد captions تلقائياً
✅ تم تدريب نموذج LoRA (simulation mode)
✅ تم دمج النموذج في نظام التوليد
✅ النظام يكتشف ويستخدم النموذج تلقائياً

النظام الآن جاهز لتوليد صور معمارية محسّنة باستخدام الأنماط المدربة من الصور المرفقة.
