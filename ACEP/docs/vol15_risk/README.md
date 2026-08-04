# Volume 15: Engineering Risk Intelligence Engine (ERIE)

## محرك ذكاء المخاطر الهندسية

### Overview

The Engineering Risk Intelligence Engine (ERIE) automatically identifies, assesses, and mitigates engineering and project risks by analyzing the virtual building model, BOQ, schedule, costs, and historical data.

### Risk Categories

| Category | Examples | Severity Range |
|----------|----------|---------------|
| Technical | Design errors, code non-compliance | High |
| Construction | Method failure, quality issues | High |
| Schedule | Delay risks, dependency failures | Medium |
| Cost | Budget overrun, price escalation | Medium |
| Safety | Workplace hazards, structural collapse | Critical |
| Environmental | Weather, site conditions | Medium |
| Resource | Labor shortage, equipment breakdown | Medium |
| Contractual | Claims, disputes | Low |
| External | Regulatory changes, market conditions | Low |

### Risk Detection Pipeline

```
Project Data (VBE, BOQ, Schedule, Cost)
        │
        ▼
┌──────────────────────────┐
│  Rule-Based Detection    │  Apply risk rules from KB
└────────┬─────────────────┘
         │
         ▼
┌──────────────────────────┐
│  Pattern-Based Detection │  Compare with historical patterns
└────────┬─────────────────┘
         │
         ▼
┌──────────────────────────┐
│  ML-Based Prediction     │  Predictive risk models
└────────┬─────────────────┘
         │
         ▼
┌──────────────────────────┐
│  Risk Assessment         │  Probability × Impact
└────────┬─────────────────┘
         │
         ▼
┌──────────────────────────┐
│  Mitigation Generation   │  Suggest mitigation actions
└────────┬─────────────────┘
         │
         ▼
┌──────────────────────────┐
│  Risk Register Update    │  Record all risks
└──────────────────────────┘
```

### Risk Identification Rules

```typescript
interface RiskRule {
  id: string;
  category: RiskCategory;
  description: string;
  descriptionAr: string;
  condition: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  detectionMethod: 'rule' | 'pattern' | 'ml';
  mitigation: MitigationSuggestion[];
}
```

| Rule ID | Condition | Risk | Severity |
|---------|-----------|------|----------|
| RSK-001 | Slab span > 8m without beams | Excessive deflection | High |
| RSK-002 | Excavation depth > 5m | Shoring failure | Critical |
| RSK-003 | Single source supplier for critical material | Supply chain disruption | Medium |
| RSK-004 | Overlapping critical path activities > 3 | Schedule compression risk | High |
| RSK-005 | Concrete volume > 500m³ continuous pour | Cold joint risk | Medium |

### Risk Assessment

```json
{
  "riskId": "RSK-PRJ-0088-042",
  "category": "construction",
  "type": "concrete_quality",
  "title": "Cold joint risk in foundation pour",
  "description": "Foundation concrete volume of 850m³ exceeds recommended continuous pour limit",
  "probability": 0.65,
  "impact": {
    "cost": 250000,
    "schedule": 14,
    "quality": "structural_weakness",
    "safety": "low"
  },
  "riskScore": 0.65 * 250000 = 162500,
  "riskLevel": "high",
  "detectedBy": "RSK-005",
  "detectedAt": "2025-03-15T10:00:00Z",
  "affected": {
    "elements": ["FND-ALL"],
    "schedule": ["A-0120"],
    "cost": ["BOQ-001"]
  },
  "mitigation": [
    {
      "id": "MIT-001",
      "description": "Divide pour into 2 sections with waterstop",
      "descriptionAr": "تقسيم الصبة إلى قسمين بإستخدام ووترستوب",
      "cost": 45000,
      "effectiveness": 0.85,
      "status": "recommended"
    },
    {
      "id": "MIT-002",
      "description": "Use retarding admixture to extend setting time",
      "descriptionAr": "استخدام مضافات تأخير الشك لتمديد وقت العمل",
      "cost": 15000,
      "effectiveness": 0.70,
      "status": "alternative"
    }
  ]
}
```

### Risk Register

```typescript
interface RiskRegister {
  id: string;
  projectId: string;
  risks: RiskItem[];
  summary: RiskSummary;
  lastUpdated: Date;
}

interface RiskItem {
  id: string;
  rank: number;
  title: string;
  category: RiskCategory;
  probability: number;
  impact: number;
  score: number;
  level: 'low' | 'medium' | 'high' | 'critical';
  owner: string;
  mitigation: string;
  status: 'open' | 'mitigated' | 'closed' | 'occurred';
}

interface RiskSummary {
  totalRisks: number;
  criticalCount: number;
  highCount: number;
  mediumCount: number;
  lowCount: number;
  topRisk: string;
  totalExposure: number;
}
```

### Risk Dashboard

```
Risk Register Summary
═══════════════════════════════════════════════
Total Risks: 47    │   Critical: 3    │   High: 12
Medium: 18         │   Low: 14       │   Exposure: 4.5M SAR

Top 5 Risks by Score:
┌────────────────────────────────────┬─────┬──────┬──────┬────────┐
│ Risk                              │ P   │ I    │ Score│ Level  │
├────────────────────────────────────┼─────┼──────┼──────┼────────┤
│ Excavation shoring failure        │ 0.30│ 1.8M │ 540K │ Crit.  │
│ Concrete cold joint               │ 0.65│ 250K │ 162K │ High   │
│ Steel price escalation            │ 0.70│ 200K │ 140K │ High   │
│ Tower crane availability          │ 0.40│ 300K │ 120K │ Medium │
│ Design change - foundation depth  │ 0.25│ 400K │ 100K │ Medium │
└────────────────────────────────────┴─────┴──────┴──────┴────────┘
```

### Monte Carlo Simulation

The ERIE can run Monte Carlo simulations for schedule and cost risk:

```typescript
interface MonteCarloResult {
  simulationId: string;
  targetVariable: 'cost' | 'duration';
  iterations: number;
  results: {
    p10: number;
    p50: number;
    p90: number;
    mean: number;
    standardDeviation: number;
    distribution: HistogramBin[];
  };
  sensitivity: SensitivityAnalysis[];
}
```

### Mitigation Library

| Mitigation | Typical Cost | Effectiveness | Applicable Risks |
|------------|-------------|---------------|-----------------|
| Quality Control Plan | 50,000 SAR | 80% | Technical risks |
| Safety Training | 25,000 SAR | 70% | Safety risks |
| Supplier Diversification | 0 SAR | 85% | Supply risks |
| Schedule Buffers | 5% of cost | 75% | Schedule risks |
| Design Peer Review | 2% of cost | 90% | Technical risks |
| Insurance | 1.5% of project | 60% | Catastrophic risks |

### Integration Points

- **Input**: VBE model, BOQ, schedule, cost estimate
- **Output**: Risk register, mitigation plan, risk dashboard
- **Knowledge Base**: Risk rules, historical risk data, mitigation library
- **Engines**: All engines (risk detection), Governance (risk approval)

### Performance Targets

| Metric | Target |
|--------|--------|
| Risk detection | < 10 seconds |
| Risk assessment | < 5 seconds |
| Monte Carlo simulation (1000 iterations) | < 30 seconds |
| Detection coverage | > 80% of known risks |
| False positive rate | < 15% |
