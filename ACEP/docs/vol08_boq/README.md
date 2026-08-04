# Volume 08: BOQ Intelligence Engine (BIE)

## محرك ذكاء جدول الكميات

### Overview

The BOQ Intelligence Engine (BIE) automatically generates comprehensive Bills of Quantities from the Virtual Building Engine's digital twin, using standard classification systems and customizable templates.

### BOQ Generation Pipeline

```
Virtual Building Model (from VBE)
        │
        ▼
┌────────────────────┐
│  Element Grouping   │  Group by classification
└────────┬───────────┘
         │
         ▼
┌────────────────────┐
│  Quantity Takeoff  │  Extract dimensions
└────────┬───────────┘
         │
         ▼
┌────────────────────┐
│  Waste Adjustment  │  Apply waste factors
└────────┬───────────┘
         │
         ▼
┌────────────────────┐
│  BOQ Template      │  Apply format/layout
│  Application       │
└────────┬───────────┘
         │
         ▼
┌────────────────────┐
│  Item Description  │  Generate descriptions
└────────┬───────────┘
         │
         ▼
┌────────────────────┐
│  Review & Approve  │  Engineer review
└────────┬───────────┘
         │
         ▼
   Final BOQ Document
```

### BOQ Template

```typescript
interface BOQTemplate {
  id: string;
  name: string;
  classification: 'uniformat' | 'masterformat' | 'custom';
  sections: BOQSection[];
  format: {
    currency: string;
    language: 'ar' | 'en' | 'both';
    decimalPlaces: number;
    includeUnitRate: boolean;
    includeTotal: boolean;
  };
}

interface BOQSection {
  id: string;
  code: string;
  title: string;
  titleAr: string;
  items: BOQItem[];
}

interface BOQItem {
  id: string;
  code: string;
  description: string;
  descriptionAr: string;
  unit: string;
  quantity: number;
  wasteFactor: number;
  adjustedQuantity: number;
  unitRate?: number;
  total?: number;
}
```

### Generated BOQ Example

```json
{
  "boqId": "BOQ-PRJ-0088-001",
  "projectId": "proj-0088",
  "template": "standard-building-v2",
  "classification": "masterformat",
  "generatedAt": "2025-03-15T10:00:00Z",
  "version": 1,
  "currency": "SAR",
  "items": [
    {
      "code": "03 30 00",
      "description": "Cast-in-Place Concrete",
      "descriptionAr": "خرسانة مصبوبة في الموقع",
      "items": [
        {
          "code": "03 31 00",
          "description": "Structural Concrete",
          "descriptionAr": "خرسانة إنشائية",
          "items": [
            {
              "id": "BOQ-001",
              "code": "03 31 13",
              "description": "Concrete for Foundations (C35)",
              "descriptionAr": "خرسانة للأساسات (C35)",
              "unit": "m³",
              "quantity": 850,
              "wasteFactor": 0.05,
              "adjustedQuantity": 892.5,
              "unitRate": 350,
              "total": 312375
            },
            {
              "id": "BOQ-002",
              "code": "03 31 16",
              "description": "Concrete for Columns (C40)",
              "descriptionAr": "خرسانة للأعمدة (C40)",
              "unit": "m³",
              "quantity": 320,
              "wasteFactor": 0.08,
              "adjustedQuantity": 345.6,
              "unitRate": 380,
              "total": 131328
            }
          ]
        }
      ]
    }
  ],
  "summary": {
    "totalItems": 45,
    "totalQuantity": 15250,
    "totalAmount": 5872500,
    "currency": "SAR"
  }
}
```

### Classification Systems

| System | Description | Typical Use |
|--------|-------------|-------------|
| MasterFormat | 48-division standard | CSI-based specifications |
| UniFormat | Element-based classification | Early design estimates |
| SBC-145 | Saudi Building Code BOQ | Local authority compliance |
| Custom | User-defined formats | Company standards |

### Item Description Generation

The BIE auto-generates item descriptions using templates:

```
Input: Column element with C40 concrete, 4.5m height
Output: "Reinforced concrete column C40, 500x500mm,
         height up to 4.5m, including formwork,
         reinforcement and concrete placement"
```

### BOQ Version Control

```typescript
interface BOQVersion {
  id: string;
  boqId: string;
  version: number;
  changes: ChangeLog;
  approvedBy: string;
  approvedAt: Date;
  status: 'draft' | 'review' | 'approved' | 'revised';
  supersedes: string;
}
```

### Comparison and Analysis

The BIE supports BOQ comparison:

| Feature | Description |
|---------|-------------|
| Version Diff | Compare two BOQ versions |
| Benchmarking | Compare against historical projects |
| Cost Analysis | Unit rate analysis and trends |
| Material Takeoff | Detailed material quantities |
| Waste Analysis | Waste factor optimization |

### Integration Points

- **Input**: Virtual Building Model from VBE
- **Output**: Complete BOQ document (Excel, PDF, structured JSON)
- **Knowledge Base**: Unit rates, item descriptions, templates
- **Engines**: EQIE (detailed quantities), CIE (cost estimation)

### Performance Targets

| Metric | Target |
|--------|--------|
| BOQ generation time | < 10 seconds |
| Item accuracy | > 98% |
| Waste factor accuracy | ±2% |
| Classification accuracy | > 95% |
| Template rendering | < 3 seconds |
