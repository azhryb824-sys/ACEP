# Volume 11: Labor Intelligence Engine (LIE)

## محرك ذكاء العمالة

### Overview

The Labor Intelligence Engine (LIE) optimizes crew composition, estimates labor productivity, calculates man-hour requirements, and tracks labor costs across all construction activities.

### Labor Categories

| Category | Example Roles | Skill Level |
|----------|--------------|-------------|
| Skilled | Steel fixer, carpenter, mason | High |
| Semi-Skilled | Concrete finisher, bar bender | Medium |
| Unskilled | Laborer, helper | Basic |
| Supervisory | Foreman, site engineer | Management |
| Specialist | Welder, crane operator | Certified |

### Crew Composition

```typescript
interface CrewDefinition {
  id: string;
  name: string;
  activity: string;
  composition: CrewMember[];
  defaultProductivity: number;
  unit: string;
  factors: ProductivityFactor[];
}

interface CrewMember {
  role: string;
  count: number;
  hourlyRate: number;
  skillLevel: string;
  certification?: string;
}

interface ProductivityFactor {
  name: string;
  impact: number;  // 0.0 to 2.0 multiplier
  condition: string;
  source: string;
}
```

### Productivity Factors

```json
{
  "activity": "concrete_placement",
  "baseProductivity": 2.5,
  "unit": "m³/hour",
  "factors": [
    {
      "factor": "temperature",
      "condition": "> 45°C",
      "impact": 0.7,
      "description": "30% reduction in hot weather"
    },
    {
      "factor": "height",
      "condition": "> 10m",
      "impact": 0.85,
      "description": "15% reduction for elevated work"
    },
    {
      "factor": "congestion",
      "condition": "high_rebar_density",
      "impact": 0.8,
      "description": "20% reduction in congested areas"
    },
    {
      "factor": "experience",
      "condition": "experienced_crew",
      "impact": 1.15,
      "description": "15% boost for experienced crew"
    }
  ]
}
```

### Man-Hour Estimation

```typescript
function estimateManHours(
  quantity: number,
  activity: Activity,
  crew: CrewDefinition,
  factors: ProductivityFactor[]
): ManHourEstimate {
  let productivity = crew.defaultProductivity;

  // Apply all relevant factors
  for (const factor of factors) {
    if (factor.applies) {
      productivity *= factor.impact;
    }
  }

  const totalHours = quantity / productivity;
  const crewSize = crew.composition.reduce((sum, m) => sum + m.count, 0);
  const manHours = totalHours * crewSize;

  return {
    totalHours,
    manHours,
    crewSize,
    productivity,
    duration: totalHours / 8,  // 8-hour workday
    cost: calculateLaborCost(manHours, crew),
  };
}
```

### Labor Cost Calculation

```json
{
  "laborEstimateId": "LBR-CONC-001",
  "activity": "Concrete Placement - Foundation",
  "quantity": 892.5,
  "unit": "m³",
  "crew": {
    "name": "Concrete Crew Type A",
    "composition": [
      { "role": "Foreman", "count": 1, "rate": 35 },
      { "role": "Concrete Finisher", "count": 2, "rate": 25 },
      { "role": "Laborer", "count": 4, "rate": 15 },
      { "role": "Mixer Operator", "count": 1, "rate": 28 }
    ],
    "totalStrength": 8
  },
  "productivityAnalysis": {
    "baseProductivity": 2.5,
    "adjustedProductivity": 1.7,
    "adjustmentFactors": [
      { "factor": "Temperature > 45°C", "multiplier": 0.70 },
      { "factor": "Foundation depth > 3m", "multiplier": 0.90 },
      { "factor": "Experienced crew", "multiplier": 1.10 },
      { "factor": "Pump access limited", "multiplier": 0.85 }
    ]
  },
  "estimates": {
    "totalHours": 525,
    "manHours": 4200,
    "workDays": 66,
    "totalCost": 75600,
    "costPerUnit": 84.7
  },
  "currency": "SAR"
}
```

### Workforce Optimization

| Strategy | Description | Typical Saving |
|----------|-------------|----------------|
| Crew Balancing | Match crew size to activity | 5-10% |
| Shift Planning | Optimal shift allocation | 8-12% |
| Skills Matrix | Match skills to tasks | 10-15% |
| Learning Curve | Account for repetition gains | 3-8% |
| Overtime Analysis | Cost-benefit of overtime | Variable |

### Labor Rate Database

| Region | Role | Rate (SAR/hour) | Source |
|--------|------|-----------------|--------|
| Riyadh | Steel Fixer | 22-28 | Market Survey Q1 2025 |
| Riyadh | Carpenter | 22-28 | Market Survey Q1 2025 |
| Riyadh | Mason | 20-25 | Market Survey Q1 2025 |
| Riyadh | Laborer | 12-16 | Market Survey Q1 2025 |
| Jeddah | Steel Fixer | 20-26 | Market Survey Q1 2025 |
| Dammam | Steel Fixer | 21-27 | Market Survey Q1 2025 |

### Productivity Benchmarks

| Activity | Unit | Base Productivity | Range |
|----------|------|-------------------|-------|
| Concrete Placement | m³/day | 12-20 | 8-25 |
| Rebar Fixing | kg/day | 150-250 | 100-350 |
| Formwork Erecting | m²/day | 8-15 | 5-20 |
| Blockwork | m²/day | 10-18 | 7-22 |
| Plastering | m²/day | 15-25 | 10-30 |
| Tiling | m²/day | 8-14 | 5-18 |

### Integration Points

- **Input**: Quantities from EQIE, schedule from SIE
- **Output**: Labor estimates, crew composition, cost breakdown
- **Knowledge Base**: Labor rates, productivity factors, crew definitions
- **Engines**: CIE (total cost), SIE (schedule integration)

### Performance Targets

| Metric | Target |
|--------|--------|
| Man-hour estimation | < 3 seconds |
| Crew optimization | < 10 seconds |
| Productivity adjustment | < 1 second |
| Rate accuracy | ±5% |
| Optimal crew suggestion | > 90% acceptance |
