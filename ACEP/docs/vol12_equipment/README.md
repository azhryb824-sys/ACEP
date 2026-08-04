# Volume 12: Equipment Intelligence Engine (EIE)

## محرك ذكاء المعدات

### Overview

The Equipment Intelligence Engine (EIE) selects optimal equipment for construction activities, tracks utilization, calculates equipment costs, and provides maintenance scheduling.

### Equipment Categories

| Category | Examples | Typical Application |
|----------|----------|-------------------|
| Earthmoving | Excavators, bulldozers, scrapers | Site preparation |
| Material Handling | Cranes, forklifts, hoists | Vertical transport |
| Concrete | Mixers, pumps, vibrators | Concrete placement |
| Compaction | Rollers, compactors | Soil compaction |
| Piling | Pile drivers, drilling rigs | Foundation work |
| Lifting | Mobile cranes, tower cranes | Heavy lifting |
| Transport | Dump trucks, concrete mixers | Material transport |

### Equipment Selection

```typescript
interface EquipmentRequirement {
  activity: string;
  task: string;
  capacity: number;
  liftHeight?: number;
  reach?: number;
  terrain: string;
  constraints: string[];
}

interface EquipmentOption {
  id: string;
  name: string;
  category: string;
  specifications: Record<string, number>;
  hourlyRate: number;
  availability: number;
  fuelConsumption: number;
  operatorRequired: boolean;
  certification?: string;
}

function selectEquipment(
  requirement: EquipmentRequirement,
  available: EquipmentOption[]
): SelectionResult {
  // Score each option
  const scored = available.map(equipment => ({
    equipment,
    score: calculateFitness(equipment, requirement),
    cost: estimateOperatingCost(equipment, requirement),
  }));

  // Sort by score
  scored.sort((a, b) => b.score - a.score);

  return {
    primary: scored[0],
    alternatives: scored.slice(1, 4),
    analysis: {
      capacityUtilization: calculateUtilization(scored[0].equipment, requirement),
      costEfficiency: scored[0].cost,
      recommendations: generateRecommendations(scored[0].equipment),
    },
  };
}
```

### Selection Example

```json
{
  "requirement": {
    "activity": "concrete_placement",
    "task": "pump_concrete_to_10th_floor",
    "capacity": 40,
    "unit": "m³/hour",
    "liftHeight": 35,
    "reach": 30,
    "terrain": "urban"
  },
  "options": [
    {
      "equipment": "Concrete Pump - 45m Boom",
      "specifications": {
        "maxOutput": 45,
        "maxHeight": 45,
        "maxReach": 38,
        "power": 200
      },
      "hourlyRate": 450,
      "operatorRequired": true,
      "score": 0.92,
      "cost": {
        "hourlyRate": 450,
        "operatorCost": 35,
        "fuelCost": 120,
        "mobilizationCost": 2500,
        "totalHourly": 605,
        "totalProject": 96800,
        "currency": "SAR"
      }
    }
  ],
  "recommendation": {
    "primary": "Concrete Pump - 45m Boom",
    "reason": "Best fit for height (35m) and output (40m³/hr) requirements",
    "utilization": 0.89,
    "confidence": 0.91
  }
}
```

### Utilization Tracking

```typescript
interface EquipmentUtilization {
  equipmentId: string;
  projectId: string;
  period: DateRange;
  totalHours: number;
  operatingHours: number;
  idleHours: number;
  maintenanceHours: number;
  utilizationRate: number;  // operating / total
  efficiency: number;
}
```

### Equipment Cost Breakdown

| Cost Component | Description | Calculation |
|---------------|-------------|-------------|
| Ownership Cost | Depreciation + interest | Purchase price / useful life |
| Operating Cost | Fuel + consumables | Hours × consumption rate |
| Maintenance Cost | Repairs + service | % of ownership cost |
| Operator Cost | Labor cost per hour | Hourly wage + benefits |
| Mobilization | Transport + setup | Fixed per project |
| Insurance | Coverage cost | % of equipment value |

### Fleet Optimization

```typescript
interface FleetOptimization {
  required: EquipmentRequirement[];
  available: EquipmentInventory;
  schedule: ProjectSchedule;
  optimization: {
    allocation: EquipmentAllocation[];
    conflicts: EquipmentConflict[];
    suggestion: EquipmentSuggestion[];
  };
}
```

### Maintenance Scheduling

| Maintenance Type | Interval | Typical Action |
|----------------|----------|---------------|
| Daily | Every shift | Fluid check, visual inspection |
| Weekly | 40 hours | Filter cleaning, lubrication |
| Monthly | 160 hours | Oil change, belt adjustment |
| Quarterly | 500 hours | Major service, component check |
| Annual | 2000 hours | Overhaul, replacement |

### Equipment Database

The EIE maintains a comprehensive equipment database:

| Field | Example |
|-------|---------|
| ID | EQ-CR-042 |
| Name | Tower Crane T7020-10 |
| Category | Lifting |
| Max Lift | 10 tons |
| Max Height | 60m |
| Power | 45 kW |
| Fuel Type | Electric |
| Hourly Rate | 280 SAR |
| Operator Required | Yes |
| Emissions Tier | Stage V |
| Availability | Riyadh region |

### Integration Points

- **Input**: Activity requirements from CMIE, schedule from SIE
- **Output**: Equipment selection, cost estimates, utilization plan
- **Knowledge Base**: Equipment catalog, rates, specifications
- **Engines**: CIE (equipment costs), SIE (schedule constraints)

### Performance Targets

| Metric | Target |
|--------|--------|
| Equipment selection | < 3 seconds |
| Fleet optimization | < 15 seconds |
| Utilization calculation | < 2 seconds |
| Selection accuracy | > 90% |
| Cost estimate deviation | < 5% |
