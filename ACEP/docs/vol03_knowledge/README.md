# Volume 03: Engineering Knowledge System (EKS)

## نظام المعرفة الهندسية

### Overview

The Engineering Knowledge System (EKS) is the central repository of all engineering knowledge in ACEP. It uses a graph-based structure to store entities, relationships, rules, and constraints that power all intelligence engines.

### Knowledge Graph Structure

```
┌──────────────┐       ┌──────────────┐
│   Material   │──────▶│   Standard   │
└──────────────┘       └──────────────┘
       │                       │
       │                       │
       ▼                       ▼
┌──────────────┐       ┌──────────────┐
│   Assembly   │──────▶│    Method    │
└──────────────┘       └──────────────┘
       │                       │
       │                       │
       ▼                       ▼
┌──────────────┐       ┌──────────────┐
│    Element   │──────▶│    Labor     │
└──────────────┘       └──────────────┘
       │
       │
       ▼
┌──────────────┐
│  Equipment   │
└──────────────┘
```

### Knowledge Categories

| Category | Description | Examples |
|----------|-------------|----------|
| **Materials** | Construction materials with properties | Concrete, steel, glass, insulation |
| **Assemblies** | Composed construction systems | Wall assembly, roof system |
| **Elements** | Building components | Columns, beams, slabs, foundations |
| **Standards** | Engineering codes and standards | SBC, ACI, ASCE, ASTM |
| **Methods** | Construction methodologies | Cast-in-place, precast, steel frame |
| **Equipment** | Construction equipment | Cranes, excavators, concrete pumps |
| **Labor** | Labor classifications and productivity | Steel fixer, carpenter, mason |
| **Rules** | Engineering rules and constraints | Minimum reinforcement, spacing limits |

### Libraries

#### Material Library

| Property | Type | Example |
|----------|------|---------|
| Concrete compressive strength | Number | 30 MPa |
| Steel yield strength | Number | 420 MPa |
| Thermal conductivity | Number | 1.4 W/mK |
| Density | Number | 2400 kg/m³ |
| Cost per unit | Number | 350 SAR/m³ |
| Supplier | String | "Saudi Readymix" |

#### Assembly Library

```typescript
interface Assembly {
  id: string;
  name: string;
  components: AssemblyComponent[];
  rules: RuleRef[];
  defaultMethod: string;
  productivityFactors: ProductivityFactor[];
  costEstimate: CostBreakdown;
}

interface AssemblyComponent {
  material: string;
  quantity: number;
  unit: string;
  wasteFactor: number;
  laborRequired: string[];
  equipmentRequired: string[];
}
```

### Rules Engine

Rules are structured as triplets:

```
IF [condition] THEN [action] BECAUSE [reason]
```

| Rule ID | Condition | Action | Reason | Source |
|---------|-----------|--------|--------|--------|
| R-001 | Slab thickness < 100mm | Flag warning | Minimum slab thickness per SBC 301 | SBC 301 |
| R-002 | Concrete cover < 20mm | Reject design | Corrosion protection per ACI 318 | ACI 318 |
| R-003 | Beam span/depth > 24 | Flag warning | Excessive deflection risk | SBC 306 |
| R-004 | Rebar spacing > 300mm | Flag warning | Temperature and shrinkage | ACI 318 |

### Knowledge Versioning

Each knowledge entity has versioning:

```typescript
interface VersionedEntity {
  id: string;
  version: number;
  effectiveDate: Date;
  supersedes: string;
  status: 'draft' | 'active' | 'deprecated' | 'archived';
  changeLog: ChangeEntry[];
  approvedBy: string;
}
```

### Import/Export

The EKS supports standard format exchange:

```json
{
  "format": "ACEP-KNOWLEDGE-1.0",
  "entities": [
    {
      "type": "material",
      "id": "MAT-CONC-30",
      "name": "Concrete 30MPa",
      "properties": {
        "compressiveStrength": 30,
        "unitWeight": 24,
        "costPerM3": 300
      },
      "relations": [
        { "type": "COMPLIES_WITH", "target": "STD-SBC-301" }
      ]
    }
  ]
}
```

### Search and Retrieval

| Method | Description |
|--------|-------------|
| Semantic Search | Natural language query over knowledge |
| Graph Traversal | Navigate relationships between entities |
| Filtered Query | Search by type, properties, tags |
| Vector Search | Embedding-based similarity matching |
| Rule Matching | Forward/backward chaining over rules |

### Knowledge Contribution Workflow

1. **Proposal** — User suggests new knowledge
2. **Validation** — Automated checks for consistency
3. **Review** — Expert engineer validates
4. **AI Council Review** — For critical changes
5. **Publish** — New version becomes active
6. **Notification** — Affected projects notified
