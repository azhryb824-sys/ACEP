# Volume 07: Virtual Building Engine (VBE)

## محرك المبنى الافتراضي

### Overview

The Virtual Building Engine (VBE) creates and manages a complete digital representation of the building — a digital twin — that is used by all downstream engines for quantity extraction, cost estimation, scheduling, and risk analysis.

### Digital Twin Structure

```
┌──────────────────────────────────────────────┐
│              Virtual Building                  │
├──────────────────────────────────────────────┤
│  Site Context                                 │
│  ├── Topography                               │
│  ├── Geotechnical data                        │
│  └── Utilities                                │
│                                               │
│  Building Elements                            │
│  ├── Foundations (raft, piles, strip)         │
│  ├── Columns (rectangular, circular)          │
│  ├── Beams (main, secondary, edge)            │
│  ├── Slabs (flat, two-way, ribbed)            │
│  ├── Walls (shear, retaining, partition)      │
│  ├── Stairs                                   │
│  └── Roof                                     │
│                                               │
│  Systems                                      │
│  ├── Structural frame                         │
│  ├── MEP systems                              │
│  ├── Fire protection                          │
│  └── Vertical transport                       │
│                                               │
│  Finishes                                     │
│  ├── Flooring                                 │
│  ├── Ceiling                                  │
│  ├── Wall finishes                            │
│  └── Facade                                   │
└──────────────────────────────────────────────┘
```

### Building Element Model

```typescript
interface BuildingElement {
  id: string;
  type: ElementType;
  category: ElementCategory;
  level: number;
  zone: string;

  // Geometry
  geometry: ElementGeometry;
  position: XYZCoordinates;
  orientation: number;

  // Properties
  material: MaterialSpec;
  properties: Record<string, unknown>;

  // Relations
  connectedTo: Connection[];
  supports: string[];
  supportedBy: string[];

  // Classification
  uniformat: string;
  masterFormat: string;

  // Metadata
  createdBy: string;
  source: 'extracted' | 'designed' | 'imported';
  confidence: number;
  status: 'proposed' | 'approved' | 'revised' | 'as_built';
}
```

### Geometry Representation

```json
{
  "elementId": "CLM-01-A",
  "type": "column",
  "geometry": {
    "shape": "rectangular",
    "dimensions": {
      "width": 500,
      "depth": 500,
      "height": 3000
    },
    "unit": "mm"
  },
  "position": {
    "x": 12500,
    "y": 8500,
    "z": 0
  },
  "material": {
    "type": "reinforced_concrete",
    "concreteGrade": "C35",
    "steelGrade": "B420",
    "reinforcement": {
      "mainBars": "8T20",
      "ties": "T10@200"
    }
  },
  "properties": {
    "volume": 0.75,
    "weight": 1800,
    "reinforcementRatio": 1.2
  }
}
```

### Levels and Zones

```typescript
interface BuildingLevel {
  id: string;
  number: number;
  name: string;
  nameAr: string;
  elevation: number;
  height: number;
  floorArea: number;
  zones: BuildingZone[];
}

interface BuildingZone {
  id: string;
  name: string;
  type: ZoneType;
  area: number;
  elements: string[];  // element IDs
}
```

### Model Import

The VBE supports importing from various sources:

| Source | Format | Pipeline |
|--------|--------|----------|
| BIM Models | IFC, RVT | Direct import with element mapping |
| CAD Drawings | DWG, DXF | Vector extraction and classification |
| PDF Plans | PDF | OCR + vectorization |
| Manual Input | Form | User-guided creation |
| PUE Extraction | Structured | Auto-generated from RFP |

### Quantity Takeoff (Pre-BOQ)

The VBE performs automatic quantity takeoff:

```json
{
  "takeoffId": "QTO-BLDG-001",
  "elements": {
    "concrete": {
      "totalVolume": 2850,
      "unit": "m³",
      "breakdown": {
        "foundations": 850,
        "columns": 320,
        "beams": 450,
        "slabs": 980,
        "walls": 250
      }
    },
    "reinforcement": {
      "totalWeight": 285000,
      "unit": "kg",
      "breakdown": {
        "T10": 45000,
        "T12": 62000,
        "T16": 88000,
        "T20": 65000,
        "T25": 25000
      }
    },
    "formwork": {
      "totalArea": 12500,
      "unit": "m²"
    }
  }
}
```

### Digital Twin Lifecycle

```
         ┌─────────────────────────┐
         │   Conceptual Model      │  From PUE/RFP
         └──────────┬──────────────┘
                    │
         ┌──────────▼──────────────┐
         │   Detailed Model        │  Refined by engineer
         └──────────┬──────────────┘
                    │
         ┌──────────▼──────────────┐
         │   Approved Model        │  For BOQ and pricing
         └──────────┬──────────────┘
                    │
         ┌──────────▼──────────────┐
         │   As-Built Model        │  Updated during construction
         └─────────────────────────┘
```

### Synchronization

The VBE maintains synchronization with:
- **BIM 360 / Autodesk** — Bi-directional model sync
- **Revit** — Direct plugin integration
- **Tekla** — Structural model import
- **Navisworks** — Clash detection integration

### Performance Targets

| Metric | Target |
|--------|--------|
| Element extraction from IFC | < 5 seconds |
| Quantity takeoff computation | < 2 seconds |
| Model load time | < 3 seconds |
| Element count support | > 100,000 |
| Concurrent models | > 50 |
