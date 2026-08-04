# ACEP UI/UX Analysis & Design Specification

## 1. تحليل الوثيقة - Document Analysis

### 1.1 المستخدمون - User Types

| الدور | الوصف | الصلاحيات |
|-------|-------|-----------|
| **مالك/مطور المشروع (Project Owner)** | صاحب المشروع أو المطور العقاري | الاطلاع على لوحات المعلومات والتقارير، اعتماد الموافقات |
| **المهندس المدني (Civil Engineer)** | مهندس تصميم أو تنفيذ | إدارة المشاريع، تحليل المخططات، استخراج البنود والكميات |
| **مهندس المكافحة (Quantity Surveyor)** | مختص بجدول الكميات والتكاليف | BOQ، تحليل الأسعار، التكاليف |
| **مدير المشروع (Project Manager)** | إشراف على التنفيذ والجدول والمخاطر | لوحة التحكم، الجدول الزمني، المخاطر، الفرق |
| **مشرف السلامة (Safety Officer)** | السلامة المهنية | تحليل المخاطر، تقارير السلامة، التصاريح |
| **مهندس الجودة (Quality Engineer)** | مراقبة الجودة والفحص | التفتيش، NCR، فحص العيوب |
| **مشتريات/مورّد (Procurement)** | إدارة المشتريات والموردين | السوق، المناقصات، الموردين |
| **مدير تنفيذي (Executive)** | إدارة عليا | مؤشرات الأداء، لوحات BI، التقارير الاستراتيجية |
| **مشرف أنظمة (System Admin)** | إدارة النظام والمستخدمين | المستخدمين، الصلاحيات، الأمان، الإعدادات |
| **مطور (Developer)** | تكامل API وتطوير إضافات | بوابة المطور، API، Webhooks, SDK |

### 1.2 الوحدات الرئيسية - Core Modules

| # | الوحدة | الوصف | مرجع الوثيقة |
|---|--------|-------|-------------|
| 1 | **المشاريع (Projects)** | إدارة دورة حياة المشروع بالكامل | Vol 04-06 |
| 2 | **المخططات (Drawings)** | رفع وتحليل المخططات CAD/PDF/BIM | Vol 07 |
| 3 | **جدول الكميات (BOQ)** | BOQ ذكي مع تحليل الكميات | Vol 08-09 |
| 4 | **التكاليف (Cost)** | تحليل الأسعار، الميزانية، التوقعات | Vol 10 |
| 5 | **الجدول الزمني (Schedule)** | جدولة ذكية، مسار حاسم | Vol 14 |
| 6 | **المخاطر (Risks)** | تحليل وإدارة المخاطر | Vol 15 |
| 7 | **GIS** | تحليل الموقع والتربة والمناخ | GGIP |
| 8 | **IoT** | استشعار ذكي وإنترنت الأشياء | ISEIP |
| 9 | **الصيانة (Maintenance)** | صيانة تنبؤية وإدارة الأصول | PMIAMP |
| 10 | **الروبوتات (Robotics)** | إدارة الأسطول والروبوتات | CRAEP |
| 11 | **ذكاء الأعمال (BI)** | مؤشرات الأداء والتقارير التنفيذية | EBISDP |
| 12 | **الاستدامة (ESG)** | بصمة كربونية وتقارير ESG | SECIP |
| 13 | **الجودة (Quality)** | تفتيش وفحص العيوب بالذكاء الاصطناعي | QAIIP |
| 14 | **السلامة (Safety)** | تحليل المخاطر والسلامة بالرؤية الحاسوبية | SIAPP |
| 15 | **السوق (Marketplace)** | منصة الموردين والمناقصات | CMPEP |
| 16 | **الإدارة (Admin)** | المستخدمين، الأمان، الامتثال | EASGP |
| 17 | **المطورين (Developer)** | API، SDK، Webhooks | SADP |
| 18 | **العولمة (Global)** | لغات متعددة، معايير دولية | GDLMSP |

### 1.3 تدفقات العمل الأساسية - Core User Flows

#### التدفق الرئيسي: تحليل مشروع
```
رفع وصف/مخططات ← فهم المشروع ← أسئلة ذكية ← استنتاج ←
مبنى افتراضي ← BOQ ← كميات ← تكاليف ← عمالة ← معدات ←
أساليب بناء ← جدول ← مخاطر ← توأم رقمي ← تقارير
```

#### تدفق مدير المشروع
```
لوحة التحكم ← متابعة المشاريع ← تحليل الأداء ←
مراجعة BOQ ← اعتماد التكاليف ← متابعة الجدول ←
إدارة المخاطر ← تقارير
```

#### تدفق المهندس
```
استلام مشروع ← رفع المخططات ← تحليل AI ←
مراجعة الكميات ← تعديل BOQ ← تسعير ←
مقارنة موردين ← اعتماد ← إرسال للجدولة
```

#### تدفق المالك
```
نظرة عامة ← مؤشرات الأداء ← تقارير المشاريع ←
مخاطر ← تكاليف ← اعتماد ← لوحة BI
```

## 2. خريطة الشاشات - Screen Map

### 2.1 قائمة جميع الشاشات

#### الشاشات الرئيسية (Core Screens)
| # | الشاشة | الرابط | المستخدمون | مرجع الوثيقة |
|---|--------|--------|------------|-------------|
| S01 | تسجيل الدخول | /login | الكل | EASGP |
| S02 | الصفحة الرئيسية | / | الكل | Vol 01 |
| S03 | لوحة التحكم | /dashboard | مدير، مهندس، مالك | Vol 02 |
| S04 | قائمة المشاريع | /projects | الكل | Vol 04 |
| S05 | تفاصيل المشروع | /projects/:id | الكل | Vol 04 |
| S06 | إنشاء مشروع | /projects/new | مهندس، مدير | Vol 04 |
| S07 | تحليل AI | /projects/:id/analysis | مهندس، مدير | Vol 04-06 |
| S08 | أسئلة ذكية | /projects/:id/questions | مهندس | Vol 05 |
| S09 | المبنى الافتراضي | /projects/:id/virtual-building | مهندس | Vol 07 |
| S10 | المخططات | /projects/:id/drawings | مهندس | Vol 07 |
| S11 | جدول الكميات | /projects/:id/boq | مهندس، QS | Vol 08 |
| S12 | تحليل الكميات | /projects/:id/quantities | QS | Vol 09 |
| S13 | التكاليف | /projects/:id/cost | QS، مدير | Vol 10 |
| S14 | العمالة | /projects/:id/labor | مهندس، مدير | Vol 11 |
| S15 | المعدات | /projects/:id/equipment | مهندس، مدير | Vol 12 |
| S16 | أساليب البناء | /projects/:id/methods | مهندس | Vol 13 |
| S17 | الجدول الزمني | /projects/:id/schedule | مدير مشروع | Vol 14 |
| S18 | المخاطر | /projects/:id/risks | مدير مشروع | Vol 15 |
| S19 | التوأم الرقمي | /projects/:id/digital-twin | مدير، مالك | Vol 07 |

#### شاشات المنصات المتخصصة
| # | الشاشة | الرابط | المستخدمون | مرجع الوثيقة |
|---|--------|--------|------------|-------------|
| S20 | GIS | /platforms/gis | مهندس مدني | GGIP |
| S21 | IoT | /platforms/iot | مشرف أنظمة | ISEIP |
| S22 | الصيانة | /platforms/maintenance | مهندس صيانة | PMIAMP |
| S23 | الروبوتات | /platforms/robotics | مشرف روبوتات | CRAEP |
| S24 | BI | /platforms/bi | مدير تنفيذي | EBISDP |
| S25 | ESG | /platforms/sustainability | مستشار ESG | SECIP |
| S26 | الجودة | /platforms/quality | مهندس جودة | QAIIP |
| S27 | السلامة | /platforms/safety | مشرف سلامة | SIAPP |
| S28 | السوق | /platforms/marketplace | مشتريات | CMPEP |
| S29 | الإدارة | /admin | مشرف نظام | EASGP |
| S30 | المطورين | /developer | مطور | SADP |
| S31 | الإعدادات | /admin/settings | مشرف نظام | EASGP |
| S32 | المستخدمين | /admin/users | مشرف نظام | EASGP |
| S33 | التقارير | /reports | الكل | EBISDP |
| S34 | مساعد AI | /ai-assistant | الكل | Vol 17 |
| S35 | ملف المستخدم | /profile | الكل | EASGP |

## 3. Design System - نظام التصميم

### 3.1 هوية العلامة - Brand Identity
- **الاسم**: ACEP - AI Construction Engineering Platform
- **الجمهور**: شركات المقاولات، المكاتب الهندسية، المطورون العقاريون
- **النمط**: احترافي، تقني، موثوق، مبتكر بالذكاء الاصطناعي
- **الألوان**: كحلي أساسي، سماوي تقني، أخضر للاستدامة

### 3.2 لوحة الألوان - Color Palette

| الوظيفة | اللون | HEX | الاستخدام |
|---------|-------|-----|-----------|
| Primary/أساسي | كحلي داكن | `#0B1D3A` | خلفية الشريط العلوي، headings |
| Primary Light | كحلي فاتح | `#1A4A7A` | أزرار، روابط، hover |
| Secondary/ثانوي | سماوي | `#0EA5E9` | عناصر AI، مؤشرات، أكسنت |
| Accent/مميز | زمردي | `#10B981` | نجاح، استدامة، مؤشرات إيجابية |
| Warning/تحذير | كهرماني | `#F59E0B` | تحذيرات، متأخر، متوسط |
| Danger/خطر | أحمر | `#EF4444` | أخطاء، مخاطر عالية، عاجل |
| Info/معلومات | بنفسجي | `#8B5CF6` | معلومات، ذكاء اصطناعي |
| Surface | رملي فاتح | `#F1F5F9` | خلفية الصفحة |
| Card | أبيض | `#FFFFFF` | بطاقات، modals |
| Text Primary | كحلي غامق | `#0F172A` | نصوص رئيسية |
| Text Secondary | رمادي | `#64748B` | نصوص ثانوية |

### 3.3 الخطوط - Typography
- **الخط العربي**: "Cairo" أو "Noto Sans Arabic"
- **الخط الإنجليزي**: "Inter" أو "SF Pro Display"
- **Scale**: 12, 14, 16, 18, 20, 24, 30, 36, 48, 60, 72px

### 3.4 المسافات - Spacing
- 4px base unit
- Scale: 4, 8, 12, 16, 20, 24, 32, 40, 48, 64, 80, 96, 128px

### 3.5 المكونات - Components

| المكون | الحالات | الوصف |
|--------|---------|-------|
| Button | Default, Hover, Active, Disabled, Loading | Primary, Secondary, Outline, Ghost, Danger |
| Input | Default, Focus, Error, Disabled, with Icon | نص، رقم، بريد، كلمة سر |
| Select | Default, Focus, Error | قائمة منسدلة |
| Card | Default, Hover, Selected | حاوية محتوى مع border/shadow |
| Table | Normal, Striped, Hover, with Selection | جداول هندسية مع sorting/filtering |
| Badge | Success, Warning, Danger, Info, Neutral | تصنيفات وحالات |
| Modal | Open, Closing | نافذة منبثقة |
| Toast | Success, Error, Warning, Info | إشعارات |
| Tabs | Active, Inactive | تبويب محتوى |
| Accordion | Expanded, Collapsed | قائمة قابلة للطي |
| Progress Bar | Determinate, Indeterminate | شريط تقدم |
| Sidebar | Expanded, Collapsed, Mobile | قائمة جانبية |
| Header | With/Without search | شريط علوي |
| AI Panel | Loading, Results, Empty | لوحة تحليل AI |
| Chart | Line, Bar, Pie, Doughnut | رسوم بيانية |
| Timeline | Vertical, Horizontal | خط زمني |

### 3.6 حالات المكونات - Component States
- **Loading**: Skeleton loader لكل المكونات
- **Empty**: رسم توضيحي + رسالة + إجراء (CTA)
- **Error**: رسالة خطأ + إعادة محاولة
- **Success**: تأكيد مع رسالة
- **Disabled**: عنصر غير نشط مع tooltip

## 4. Experience Specifications

### 4.1 AI Experience
- إظهار **نسبة الثقة (Confidence Score)** لكل تحليل AI
- عرض **سلسلة التفكير (Reasoning Trace)** للمستخدم المتقدم
- أيقونات AI متحركة أثناء المعالجة
- لوحة جانبية للـ AI Assistant في كل الشاشات
- زر "اسأل AI" في كل صفحة

### 4.2 Data Visualization
- جداول هندسية مع تنسيق احترافي
- Charts تفاعلية (مخططات زمنية، مقارنة)
- Heat maps للمخاطر
- Gantt chart للجدول الزمني
- Tree map لبنود BOQ

### 4.3 Responsive Breakpoints
- Desktop: >1280px (العرض الكامل)
- Laptop: 1024-1280px (شريط جانبي مصغر)
- Tablet: 768-1024px (قائمة سفلى)
- Mobile: <768px (شريط تنقل سفلي)
