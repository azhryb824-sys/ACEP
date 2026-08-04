# Volume 10: Cost Intelligence Engine (CIE)

## محرك ذكاء التكاليف

### Overview

The Cost Intelligence Engine (CIE) provides dynamic pricing for all BOQ items, supplier comparison, market rate analysis, and comprehensive cost estimation with transparency and traceability.

### Pricing Model

```
┌──────────────────────────────────────────────┐
│              Cost Calculation                  │
├──────────────────────────────────────────────┤
│  Direct Costs                                 │
│  ├── Materials (quantity × unit price)        │
│  ├── Labor (man-hours × hourly rate)          │
│  ├── Equipment (hours × hourly rate)          │
│  └── Subcontractor (quoted rates)             │
│                                               │
│  Indirect Costs                               │
│  ├── Site overhead                            │
│  ├── Office overhead                          │
│  ├── Insurance and bonds                      │
│  └── Permits and fees                         │
│                                               │
│  Markup                                       │
│  ├── Profit margin                            │
│  ├── Risk contingency                         │
│  ├── Escalation                               │
│  └── VAT/taxes                                │
│                                               │
│  = Total Price                                │
└──────────────────────────────────────────────┘
```

### Cost Item Structure

```typescript
interface CostItem {
  id: string;
  boqItemId: string;
  directCost: CostBreakdown;
  indirectCost: CostBreakdown;
  markup: Markup;
  total: number;
  currency: string;
  confidence: number;
  priceSources: PriceSource[];
}

interface CostBreakdown {
  materials: number;
  labor: number;
  equipment: number;
  subcontractor: number;
  total: number;
}

interface Markup {
  profitMargin: number;
  riskContingency: number;
  escalation: number;
  tax: number;
  total: number;
}
```

### Pricing Example

```json
{
  "costItemId": "COST-BOQ-001",
  "boqItem": "Concrete for Foundations (C35)",
  "quantity": 892.5,
  "unit": "m³",
  "directCost": {
    "materials": {
      "cement": 167.0,
      "aggregate": 85.0,
      "sand": 45.0,
      "admixture": 12.0,
      "total": 309.0
    },
    "labor": {
      "mixer": 15.0,
      "placement": 25.0,
      "finishing": 10.0,
      "total": 50.0
    },
    "equipment": {
      "concretePump": 20.0,
      "vibrator": 5.0,
      "total": 25.0
    },
    "totalDirect": 384.0
  },
  "indirectCost": {
    "siteOverhead": 25.0,
    "officeOverhead": 18.0,
    "insurance": 8.0,
    "total": 51.0
  },
  "markup": {
    "profitMargin": 0.10,
    "riskContingency": 0.05,
    "escalation": 0.03,
    "total": 0.18
  },
  "unitPrice": 513.3,
  "totalPrice": 458122.5,
  "currency": "SAR",
  "confidence": 0.88,
  "priceSources": [
    { "source": "supplier_quote", "supplier": "Saudi Readymix", "price": 375, "date": "2025-03-01" },
    { "source": "market_index", "index": "Saudi Construction Index", "price": 365, "date": "2025-Q1" },
    { "source": "historical", "project": "Tower A", "price": 355, "date": "2024-12" }
  ]
}
```

### Supplier Integration

| Data | Source | Update Frequency |
|------|--------|-----------------|
| Material prices | Supplier API | Daily |
| Labor rates | Market indices | Monthly |
| Equipment rental | Vendor catalogs | Weekly |
| Subcontractor quotes | Request system | Per project |
| Fuel/energy costs | Government rates | Quarterly |

### Market Rate Analysis

```typescript
interface MarketRate {
  itemCode: string;
  description: string;
  currentPrice: number;
  priceRange: { min: number; max: number; average: number };
  trend: 'rising' | 'stable' | 'falling';
  volatility: number;
  lastUpdated: Date;
  source: string;
  region: string;
}
```

### Cost Breakdown Structure

| Level | Example | Usage |
|-------|---------|-------|
| CBS Level 1 | Project Total | Executive summary |
| CBS Level 2 | Substructure | Cost control |
| CBS Level 3 | Foundations | Detailed tracking |
| CBS Level 4 | Raft Foundation | Procurement |
| CBS Level 5 | Concrete C35 | Unit price analysis |

### Escalation and Inflation

```typescript
interface EscalationFactor {
  id: string;
  category: string;
  baseDate: Date;
  factor: number;
  source: string;
  formula: string;
  notes: string;
}
```

### Cost Comparison

The CIE can compare costs across scenarios:

| Scenario | Material | Labor | Equipment | Total |
|----------|----------|-------|-----------|-------|
| Cast-in-place | 309 | 50 | 25 | 384 |
| Precast | 340 | 30 | 35 | 405 |
| Steel frame | 420 | 45 | 20 | 485 |

### Integration Points

- **Input**: BOQ from BIE, quantities from EQIE
- **Output**: Cost estimate with full breakdown
- **Knowledge Base**: Market rates, supplier data, historical costs
- **Engines**: LIE, EIE (labor and equipment costs)

### Performance Targets

| Metric | Target |
|--------|--------|
| Unit price estimation | < 2 seconds |
| Complete cost estimate | < 30 seconds |
| Supplier quote integration | < 5 seconds |
| Price confidence | > 85% |
| Market data freshness | < 24 hours |
