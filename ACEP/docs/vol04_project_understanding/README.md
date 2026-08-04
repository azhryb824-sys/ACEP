# Volume 04: Project Understanding Engine (PUE)

## محرك فهم المشروع

### Overview

The Project Understanding Engine (PUE) converts unstructured project documents (RFP, drawings, specifications) into structured, machine-readable project data using NLP and document parsing.

### Input Sources

| Source | Format | Extraction Method |
|--------|--------|-------------------|
| RFP Documents | PDF, DOCX, TXT | NLP text parsing |
| Drawings | DWG, DXF, PDF | CAD parser + OCR |
| Specifications | PDF, DOCX | Section extractor |
| Bill of Quantities | XLSX, PDF | Table extraction |
| Site Photos | JPEG, PNG | Image captioning |
| Emails | EML, MSG | Relationship extraction |
| Contracts | PDF, DOCX | Clause extraction |

### Processing Pipeline

```
Raw Document Input
        │
        ▼
┌─────────────────┐
│  Document Parser │  Extract raw text + metadata
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│   Sectionizer   │  Identify document sections
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│   Entity        │  Extract: locations, materials,
│   Extractor     │  quantities, dates, parties
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Relation Builder│  Connect extracted entities
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Confidence     │  Score each extraction
│  Scorer         │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Structured      │  Output as Project Blueprint
│  Output         │
└─────────────────┘
```

### Extraction Example

**Input Text:**
> "The proposed building is a 10-story residential tower in Riyadh. The structure is reinforced concrete with a total built-up area of approximately 12,500 square meters. Foundations are raft foundation on 35m deep piles. The project duration is 24 months."

**Structured Output:**

```json
{
  "projectType": "residential_tower",
  "stories": 10,
  "location": {
    "city": "Riyadh",
    "country": "Saudi Arabia",
    "region": "Central"
  },
  "structureType": "reinforced_concrete",
  "totalArea": {
    "value": 12500,
    "unit": "sqm"
  },
  "foundation": {
    "type": "raft",
    "pileDepth": 35,
    "pileUnit": "m"
  },
  "duration": {
    "value": 24,
    "unit": "months"
  },
  "extractions": [
    {
      "entity": "stories",
      "value": 10,
      "confidence": 0.95,
      "source": "direct_statement"
    },
    {
      "entity": "foundation_type",
      "value": "raft",
      "confidence": 0.88,
      "source": "inferred_from_description"
    }
  ]
}
```

### Project Blueprint

```typescript
interface ProjectBlueprint {
  id: string;
  metadata: ProjectMetadata;
  building: BuildingSpecification;
  site: SiteInfo;
  requirements: ProjectRequirements;
  constraints: ProjectConstraint[];
  extractedFrom: string[];
  confidence: number;
  missingInfo: MissingField[];
}
```

### Entity Recognition

| Entity Type | Examples | Recognition Method |
|-------------|----------|-------------------|
| Dimensions | 10 stories, 12500 sqm | Regex + NER |
| Materials | Concrete, steel, glass | Domain dictionary |
| Quantities | 5000 m³ concrete | Quantity pattern matching |
| Locations | Riyadh, Jeddah | Gazetteer matching |
| Standards | SBC 301, ACI 318 | Reference matching |
| Dates | Q2 2025, 24 months | Date parser |
| Parties | Contractor, consultant | Role identification |

### Confidence Scoring

| Level | Score | Action |
|-------|-------|--------|
| High | > 90% | Auto-accept |
| Medium | 70-90% | Flag for review |
| Low | 50-70% | Require manual input |
| Missing | < 50% | Mark as question for SQE |

### NLP Models

| Model | Purpose | Framework |
|-------|---------|-----------|
| Document Classifier | Identify document type | Transformers |
| Named Entity Recognition | Extract domain entities | SpaCy + Custom |
| Relation Extraction | Connect extracted entities | BERT-based |
| Table Extractor | Parse tabular data | LayoutLM |
| Summarization | Document summarization | T5 |

### Integration Points

- **Input**: File upload service, email integration
- **Output**: Project Blueprint to SQE and VBE
- **Knowledge Base**: Entity definitions, patterns
- **Error Handling**: Low-confidence items logged for human review
