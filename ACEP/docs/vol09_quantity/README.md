# Volume 09: Quantity Intelligence Engine (EQIE)

## محرك ذكاء الكميات المشتقة

### Overview

The Engineering Quantity Intelligence Engine (EQIE) computes derived quantities from the virtual building model and BOQ items, applying engineering formulas and providing complete calculation traces for every quantity.

### Derived Quantity Types

| Quantity | Formula | Example |
|----------|---------|---------|
| Concrete Volume | L × W × H | 0.5 × 0.5 × 3.0 = 0.75 m³ |
| Reinforcement Weight | Volume × Density × Ratio | 0.75 × 7850 × 0.012 = 70.65 kg |
| Formwork Area | 2(L+W) × H | 2(0.5+0.5) × 3.0 = 6.0 m² |
| Excavation Volume | (Base + 2×Slope) × Depth × Length | Variable |
| Backfill Volume | Excavation - Structure Volume | Variable |
| Plaster Area | 2(L+W) × H × No. Faces | Variable |
| Paint Area | Same as plaster | Variable |

### Calculation Engine

```typescript
interface Calculation {
  id: string;
  elementId: string;
  quantityType: string;
  formula: string;
  parameters: Record<string, number>;
  steps: CalculationStep[];
  result: number;
  unit: string;
  tolerance: number;
}

interface CalculationStep {
  stepNumber: number;
  description: string;
  descriptionAr: string;
  formula: string;
  values: Record<string, number>;
  intermediateResult: number;
  notes: string;
}
```

### Calculation Trace Example

```json
{
  "calculationId": "CALC-CLM-001",
  "elementId": "CLM-01-A",
  "elementType": "column",
  "quantityType": "concrete_volume",
  "formula": "width * depth * height",
  "parameters": {
    "width": 0.5,
    "depth": 0.5,
    "height": 3.0
  },
  "steps": [
    {
      "step": 1,
      "description": "Calculate cross-sectional area",
      "descriptionAr": "حساب مساحة المقطع العرضي",
      "formula": "width × depth",
      "values": { "width": 0.5, "depth": 0.5 },
      "result": 0.25,
      "unit": "m²"
    },
    {
      "step": 2,
      "description": "Calculate volume",
      "descriptionAr": "حساب الحجم",
      "formula": "area × height",
      "values": { "area": 0.25, "height": 3.0 },
      "result": 0.75,
      "unit": "m³"
    }
  ],
  "result": 0.75,
  "unit": "m³",
  "tolerance": 0.01
}
```

### Reinforcement Calculation

```json
{
  "calculationId": "CALC-CLM-001-REBAR",
  "elementId": "CLM-01-A",
  "quantityType": "reinforcement_weight",
  "formula": "sum(mainBars) + sum(ties)",
  "mainBars": {
    "bars": [
      { "size": "T20", "count": 8, "length": 3.5, "weightPerMeter": 2.47 },
      { "size": "T20", "count": 8, "length": 3.5, "weightPerMeter": 2.47 }
    ],
    "totalWeight": 69.16,
    "unit": "kg"
  },
  "ties": {
    "bars": [
      { "size": "T10", "count": 15, "length": 1.8, "weightPerMeter": 0.617 }
    ],
    "totalWeight": 16.66,
    "unit": "kg"
  },
  "totalWeight": 85.82,
  "unit": "kg",
  "formula": "8 × 3.5 × 2.47 + 15 × 1.8 × 0.617"
}
```

### Quantity Validation

The EQIE performs cross-validation:

| Validation | Method |
|------------|--------|
| Cross-check | Compare volume from VBE vs BOQ |
| Historical | Compare against similar projects |
| Ratio Check | Verify reinforcement ratio is within range |
| Unit Consistency | Ensure all units are compatible |
| Tolerance | Check against acceptable variance |

### Aggregation Rules

```typescript
interface AggregationRule {
  id: string;
  name: string;
  sourceItems: string[];
  targetItem: string;
  formula: string;
  description: string;
}
```

Example: Aggregating all concrete quantities:

```
Concrete Total = Σ(Foundation Concrete + Column Concrete 
                 + Beam Concrete + Slab Concrete + Wall Concrete)
```

### Integration Points

- **Input**: BOQ items from BIE, element geometry from VBE
- **Output**: Detailed quantities with traces
- **Knowledge Base**: Formulas, material properties, conversion factors
- **Engines**: CIE (uses quantities for pricing), LIE (labor productivity)

### Performance Targets

| Metric | Target |
|--------|--------|
| Single quantity calculation | < 100ms |
| Complete project takeoff | < 30 seconds |
| Trace generation | < 500ms |
| Validation time | < 5 seconds |
| Formula coverage | > 90% of standard quantities |
