# Volume 05: Smart Question Engine (SQE)

## محرك الأسئلة الذكي

### Overview

The Smart Question Engine (SQE) identifies missing or ambiguous information from the Project Blueprint and generates targeted questions to fill knowledge gaps. It uses information gain to prioritize questions.

### Question Generation Flow

```
Project Blueprint (from PUE)
        │
        ▼
┌────────────────────────┐
│   Gap Analysis          │  Identify missing fields
│   ─────────────────     │
│   • Missing fields      │
│   • Low-confidence      │
│   • Inconsistent        │
└────────┬───────────────┘
         │
         ▼
┌────────────────────────┐
│   Question Generator   │  Create natural language
│   ─────────────────     │  questions
│   • Template-based     │
│   • Dynamic            │
│   • Follow-up          │
└────────┬───────────────┘
         │
         ▼
┌────────────────────────┐
│   Information Gain     │  Score and prioritize
│   Calculator           │
└────────┬───────────────┘
         │
         ▼
┌────────────────────────┐
│   Question Prioritizer │  Order by importance
└────────┬───────────────┘
         │
         ▼
      Questions to User
```

### Question Categories

| Category | Priority | Example |
|----------|----------|---------|
| Structural Design | Critical | "What is the intended structural system?" |
| Geotechnical | Critical | "What is the soil bearing capacity?" |
| Materials | High | "What concrete grade is specified?" |
| Dimensions | High | "What is the floor-to-floor height?" |
| Finishing | Medium | "What type of facade finish is required?" |
| Mechanical | Medium | "What is the cooling load requirement?" |
| Electrical | Low | "What is the connected load?" |
| Site Conditions | Variable | "What is the site accessibility?" |

### Question Format

```json
{
  "id": "Q-0042",
  "category": "structural_design",
  "field": "structuralSystem",
  "priority": "critical",
  "question": {
    "ar": "ما هو النظام الإنشائي المقترح للمبنى؟",
    "en": "What is the proposed structural system for the building?"
  },
  "options": [
    { "value": "flat_slab", "label": "Flat Slab", "label_ar": "بلاطة مسطحة" },
    { "value": "two_way_slab", "label": "Two-Way Slab", "label_ar": "بلاطة باتجاهين" },
    { "value": "precast", "label": "Precast Concrete", "label_ar": "خرسانة مسبقة الصب" },
    { "value": "steel_frame", "label": "Steel Frame", "label_ar": "هيكل حديدي" },
    { "value": "composite", "label": "Composite", "label_ar": "مركب" }
  ],
  "informationGain": 0.85,
  "dependsOn": ["Q-0010"],
  "followUp": ["Q-0043", "Q-0044"]
}
```

### Information Gain Calculation

```typescript
function calculateInformationGain(
  missingField: Field,
  projectContext: ProjectContext,
  knowledgeBase: KnowledgeBase
): number {
  let gain = 0;

  // Fields that affect many downstream decisions
  gain += missingField.downstreamImpact * 0.4;

  // Fields with high uncertainty reduction
  gain += missingField.uncertainty * 0.3;

  // Fields mandated by engineering codes
  if (knowledgeBase.isRequiredByCode(missingField)) {
    gain += 0.2;
  }

  // Fields requested by user preference
  gain += missingField.userPriority * 0.1;

  return Math.min(gain, 1.0);
}
```

### Dynamic Questioning

The SQE supports adaptive questioning:

```
User answers: "Structural system is flat slab"
                    │
                    ▼
SQE generates follow-up:
┌──────────────────────────────────────┐
│ "What is the slab thickness?"         │
│ "What is the column grid spacing?"    │
│ "Is a drop panel required?"          │
└──────────────────────────────────────┘
```

### Answer Processing

| Answer Type | Processing |
|-------------|-----------|
| Direct Value | Validate and store |
| Selection from list | Map to enum value |
| Numeric Range | Check against code limits |
| File Upload | Trigger PUE re-processing |
| Skip | Mark as assumption, note risk |

### Integration Points

- **Input**: Project Blueprint from PUE
- **Output**: Completed Questionaire with answers
- **Knowledge Base**: Question templates, validation rules
- **Storage**: Redis for session state, PostgreSQL for persistent answers

### Questionnaire Lifecycle

```
Created → Active → Partially Answered → Complete → Validated
    ↑          ↑           ↓
    └──────────┴──── Pending Review
```

### Performance Targets

| Metric | Target |
|--------|--------|
| Questions generated | ≤ 50 per project |
| Time to answer all questions | ≤ 2 hours |
| Information gain coverage | ≥ 95% |
| Follow-up relevance | ≥ 90% satisfaction |
