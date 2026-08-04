# Volume 14: Schedule Intelligence Engine (SIE)

## محرك ذكاء الجدول الزمني

### Overview

The Schedule Intelligence Engine (SIE) automatically generates construction schedules from the virtual building model, identifies critical paths, allocates resources, and tracks progress against baselines.

### Schedule Generation Pipeline

```
Project Data (VBE, CMIE, CIE, LIE, EIE)
        │
        ▼
┌────────────────────────┐
│  Activity Definition    │  Break project into work packages
└────────┬───────────────┘
         │
         ▼
┌────────────────────────┐
│  Dependency Mapping    │  Identify logic links (FS, SS, FF, SF)
└────────┬───────────────┘
         │
         ▼
┌────────────────────────┐
│  Duration Estimation   │  Apply productivity rates
└────────┬───────────────┘
         │
         ▼
┌────────────────────────┐
│  Resource Allocation   │  Assign labor, equipment, materials
└────────┬───────────────┘
         │
         ▼
┌────────────────────────┐
│  CPM Calculation       │  Forward/backward pass
└────────┬───────────────┘
         │
         ▼
┌────────────────────────┐
│  Optimization          │  Level resources, compress schedule
└────────┬───────────────┘
         │
         ▼
   Baseline Schedule
```

### Schedule Structure

```typescript
interface Schedule {
  id: string;
  projectId: string;
  version: number;
  activities: Activity[];
  calendars: Calendar[];
  baselines: ScheduleBaseline[];
  criticalPath: string[];
  constraints: ScheduleConstraint[];
}

interface Activity {
  id: string;
  name: string;
  nameAr: string;
  wbsCode: string;
  duration: number;
  durationUnit: 'days' | 'weeks';
  earlyStart: Date;
  earlyFinish: Date;
  lateStart: Date;
  lateFinish: Date;
  float: number;
  isCritical: boolean;
  predecessors: Dependency[];
  successors: Dependency[];
  resources: ResourceAssignment[];
  progress: ProgressData;
}

interface Dependency {
  activityId: string;
  type: 'FS' | 'SS' | 'FF' | 'SF';
  lag: number;
}
```

### Schedule Example

```json
{
  "scheduleId": "SCH-PRJ-0088",
  "project": "10-Story Residential Tower",
  "duration": 720,
  "unit": "days",
  "phases": [
    {
      "phase": "Mobilization",
      "start": "2025-04-01",
      "finish": "2025-04-30",
      "duration": 30,
      "activities": [
        { "id": "A-0010", "name": "Site Setup", "duration": 20 },
        { "id": "A-0020", "name": "Survey", "duration": 10 }
      ]
    },
    {
      "phase": "Substructure",
      "start": "2025-05-01",
      "finish": "2025-07-15",
      "duration": 75,
      "activities": [
        { "id": "A-0100", "name": "Excavation", "duration": 25 },
        { "id": "A-0110", "name": "Piling", "duration": 30 },
        { "id": "A-0120", "name": "Raft Foundation", "duration": 20 }
      ]
    },
    {
      "phase": "Superstructure",
      "start": "2025-07-01",
      "finish": "2026-02-28",
      "duration": 240,
      "activities": [
        { "id": "A-0200", "name": "Ground Floor Columns & Slab", "duration": 20 },
        { "id": "A-0201", "name": "Floor 1 Columns & Slab", "duration": 18 },
        { "id": "A-0202", "name": "Floor 2 Columns & Slab", "duration": 18 }
      ]
    },
    {
      "phase": "Finishing",
      "start": "2025-09-01",
      "finish": "2026-08-01",
      "duration": 330
    },
    {
      "phase": "Commissioning",
      "start": "2026-07-01",
      "finish": "2026-10-01",
      "duration": 90
    }
  ],
  "criticalPath": [
    "A-0010", "A-0100", "A-0110", "A-0120",
    "A-0200", "A-0201", "A-0202", "...", "A-0900"
  ],
  "totalFloat": 45,
  "days"
}
```

### Critical Path Method

The SIE computes the critical path using:

```
Forward Pass:
  ES(activity) = max(EF(predecessors))
  EF(activity) = ES(activity) + Duration(activity)

Backward Pass:
  LF(activity) = min(LS(successors))
  LS(activity) = LF(activity) - Duration(activity)

Float:
  Total Float = LS - ES = LF - EF
```

### Resource Leveling

```typescript
interface ResourceLeveling {
  resourceId: string;
  originalDemand: ResourceDemand[];
  leveledDemand: ResourceDemand[];
  peakReduction: number;
  conflicts: ResourceConflict[];
  adjustments: ScheduleAdjustment[];
}
```

### Progress Tracking

| Method | Description | Update Frequency |
|--------|-------------|-----------------|
| Physical % Complete | Visual inspection | Weekly |
| Earned Value | Cost + schedule performance | Bi-weekly |
| Weighted Milestones | Key deliverables | Monthly |
| Automated Tracking | IoT sensor data | Real-time |

### Schedule Compression

| Technique | Description | Typical Reduction |
|-----------|-------------|------------------|
| Crashing | Add more resources | 10-20% |
| Fast Tracking | Overlap activities | 15-25% |
| Phased Construction | Early start for early finishes | 20-30% |
| Value Engineering | Method change | 15-35% |

### Performance Metrics

```typescript
interface ScheduleMetrics {
  totalDuration: number;
  criticalPathLength: number;
  totalFloat: number;
  resourceLoad: number;
  costLoaded: CostLoad;
  milestoneCompletion: MilestoneProgress[];
  earnedValue: EarnedValueMetrics;
}
```

### Integration Points

- **Input**: Activities from CMIE, quantities from EQIE, resources from LIE/EIE
- **Output**: Complete schedule, critical path, resource plan
- **Knowledge Base**: Activity templates, productivity data, sequencing rules
- **Engines**: ERIE (schedule risk), all other engines (schedule constraints)

### Performance Targets

| Metric | Target |
|--------|--------|
| Schedule generation | < 30 seconds |
| CPM computation | < 5 seconds |
| Resource leveling | < 20 seconds |
| Update processing | < 10 seconds |
| Schedule accuracy | ±5% of actual |
