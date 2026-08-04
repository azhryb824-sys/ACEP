# ACEP Engineering OS

**AI Construction Engineering Platform - Complete Engineering OS Implementation**

Version 2.0.0

---

## Overview

ACEP Engineering OS is a comprehensive artificial intelligence platform for construction engineering that implements advanced reasoning, digital twin technology, and intelligent estimation engines. The platform follows the official engineering specifications across 8 major volumes.

## Architecture

### Core Volumes

1. **Volume 19: Engineering Knowledge Graph & World Model (EKGWM)**
   - Knowledge graph for engineering entities and relationships
   - World model for project representation
   - Semantic reasoning capabilities

2. **Volume 20: Engineering Digital Twin & Simulation Engine (EDTSE)**
   - Digital twin creation and management
   - Scenario simulation and prediction
   - Lifecycle tracking and performance metrics

3. **Volume 21: Engineering Knowledge Base & Global Engineering Codes (EKB-GEC)**
   - Engineering codes library (SBC, ACI, NFPA, ASHRAE, etc.)
   - Material specifications and standards
   - Code validation and conflict detection

4. **Volume 22: Engineering Reasoning Engine (ERE)**
   - Logical reasoning and inference
   - Error detection and validation
   - Alternative suggestions

5. **Volume 23: Intelligent BOQ Generation Engine (IBGE)**
   - Automated Bill of Quantities generation
   - Evidence chain tracking
   - Confidence scoring

6. **Volume 24: Intelligent Quantity Estimation Engine (IQEE)**
   - Precise quantity calculations
   - Formula-based estimation
   - Outlier detection

7. **Volume 25: Intelligent Pricing & Cost Intelligence Engine (IPCIE)**
   - Cost breakdown and estimation
   - Supplier comparison
   - Sensitivity analysis

8. **Volume 26: Intelligent Planning & Scheduling Engine (IPSE)**
   - Schedule generation and optimization
   - Resource allocation
   - Critical path analysis

## Project Structure

```
ACEP/
├── packages/
│   ├── ace-core/              # Core types and interfaces
│   │   ├── src/
│   │   │   ├── types.ts       # Type definitions
│   │   │   ├── IntegrationLayer.ts  # Engine integration
│   │   │   └── ...
│   ├── knowledge-base/        # Knowledge management
│   │   ├── src/
│   │   │   ├── graph/         # Knowledge graph
│   │   │   ├── libraries/     # Material, labor, equipment libraries
│   │   │   ├── rules/         # Rule engine
│   │   │   └── EngineeringCodesLibrary.ts
│   ├── engines/              # Engineering engines
│   │   ├── boq/              # BOQ Generation Engine
│   │   ├── reasoning/        # Reasoning Engine
│   │   ├── quantity/         # Quantity Engine
│   │   ├── cost/             # Cost Engine
│   │   ├── schedule/         # Schedule Engine
│   │   ├── virtual-building/ # Virtual Building Engine
│   │   └── digital-twin/     # Digital Twin Engine
│   ├── agents/               # AI agents
│   ├── services/             # Microservices
│   └── ui/                   # User interface
├── server.js                 # Express API server
├── package.json              # Root package configuration
└── README.md                # This file
```

## Installation

```bash
# Install dependencies
npm install

# Build TypeScript packages
npm run build

# Start the server
npm start
```

## API Endpoints

### Health & Status

- `GET /` - Platform overview and available endpoints
- `GET /health` - Health check with engine status
- `GET /api/v1/engines` - Engine registration status

### Analysis

- `POST /api/v1/analyze` - Quick project analysis
- `POST /api/v1/full-analysis` - Complete engineering analysis

### Digital Twin

- `POST /api/v1/digital-twin` - Create/update digital twin
- `POST /api/v1/simulation` - Run scenario simulation

### Knowledge Base

- `GET /api/v1/codes` - Query engineering codes
  - Query params: `country`, `category`

### Projects

- `GET /api/v1/projects` - List all projects
- `GET /api/v1/projects/:id` - Get project details

## Usage Examples

### Quick Analysis

```bash
curl -X POST http://localhost:3000/api/v1/analyze \
  -H "Content-Type: application/json" \
  -d '{
    "description": "Villa with 3 bedrooms, 2 bathrooms, kitchen, and living room on 2 floors"
  }'
```

### Full Analysis

```bash
curl -X POST http://localhost:3000/api/v1/full-analysis \
  -H "Content-Type: application/json" \
  -d '{
    "description": "Commercial building with 5 floors, office spaces, and parking",
    "config": {
      "enableDigitalTwin": true,
      "selectedCountry": "Saudi Arabia"
    }
  }'
```

### Digital Twin Simulation

```bash
curl -X POST http://localhost:3000/api/v1/simulation \
  -H "Content-Type: application/json" \
  -d '{
    "scenario": {
      "id": "sim-001",
      "name": "Increased Labor Scenario",
      "changes": [
        { "type": "labor", "target": "crew", "value": 1.5 }
      ]
    }
  }'
```

### Query Engineering Codes

```bash
curl "http://localhost:3000/api/v1/codes?country=Saudi Arabia&category=Structural"
```

## Engine Integration

### Using the Integration Layer

```typescript
import { IntegrationLayer } from '@acep/core';
import { KnowledgeGraph } from '@acep/knowledge-base';

// Initialize knowledge graph
const kg = new KnowledgeGraph();

// Create integration layer
const integration = new IntegrationLayer(kg, {
  enableReasoning: true,
  enableBOQGeneration: true,
  enableQuantityCalculation: true,
  enableCostEstimation: true,
  enableScheduleGeneration: true,
  enableDigitalTwin: true,
  selectedCountry: 'Saudi Arabia'
});

// Register engines
integration.registerEngine('ProjectUnderstandingEngine', projectUnderstandingEngine);
integration.registerEngine('VirtualBuildingEngine', virtualBuildingEngine);
// ... register other engines

// Analyze project
const result = await integration.analyzeProject('Villa with 3 bedrooms');

console.log(result);
// {
//   projectId: 'proj-123',
//   facts: { ... },
//   building: { ... },
//   boq: { ... },
//   cost: { ... },
//   schedule: [ ... ],
//   twin: { ... },
//   reasoning: [ ... ],
//   metadata: { ... }
// }
```

## Key Features

### Evidence Chain Tracking

Every calculation and decision includes a complete evidence chain:

```typescript
{
  calculationTrace: [
    {
      step: 1,
      description: "Matched template to spaces",
      formula: "space matching",
      input: 3,
      output: 3,
      unit: "count",
      confidence: 0.9
    },
    {
      step: 2,
      description: "Estimated quantity based on building parameters",
      formula: "floorArea * thickness * 0.3",
      input: 200,
      output: 60,
      unit: "m³",
      confidence: 0.8
    }
  ]
}
```

### Confidence Scoring

All results include confidence scores:

- **Overall confidence**: Aggregate score across all engines
- **Item confidence**: Per-item confidence based on data quality
- **Breakdown**: Detailed confidence by category

### Digital Twin Capabilities

- Real-time state tracking
- Lifecycle stage management
- Performance metrics monitoring
- Scenario simulation and prediction
- Monte Carlo simulation for risk analysis

### Engineering Codes Integration

- Multi-country code support (Saudi Arabia, USA, etc.)
- Code validation and conflict detection
- Applicable code recommendation based on project type
- Reference tracking and versioning

## Development

### Building TypeScript Packages

```bash
# Build all packages
npm run build

# Watch mode for development
npm run build -- --watch
```

### Running Tests

```bash
# Run all tests
npm test

# Run specific package tests
npm test -- packages/engines/boq
```

### Adding New Engines

1. Create new engine package under `packages/engines/`
2. Implement the engine interface from `@acep/core`
3. Register with the Integration Layer
4. Add API endpoints in `server.js`

## Configuration

### Engine Configuration

```typescript
{
  enableReasoning: boolean;
  enableBOQGeneration: boolean;
  enableQuantityCalculation: boolean;
  enableCostEstimation: boolean;
  enableScheduleGeneration: boolean;
  enableDigitalTwin: boolean;
  selectedCountry: string;
  selectedCodes: string[];
}
```

### Knowledge Base Configuration

The knowledge base can be extended with:

- Custom materials
- Local engineering codes
- Project-specific rules
- Regional pricing data

## Performance Considerations

- **Caching**: Results are cached where appropriate
- **Parallel Processing**: Engines run in parallel where possible
- **Incremental Updates**: Only affected components are recalculated
- **Lazy Loading**: Knowledge base loads on demand

## Security

- Input validation on all API endpoints
- SQL injection prevention
- XSS protection
- Rate limiting (recommended for production)

## Roadmap

### Phase 1 (Current)
- Core engine implementation
- Basic API endpoints
- Knowledge base foundation

### Phase 2 (Planned)
- Advanced simulation capabilities
- Machine learning integration
- Real-time collaboration
- Mobile application

### Phase 3 (Future)
- Construction metaverse
- AR/VR integration
- Autonomous site monitoring
- Sustainability twin

## Contributing

Contributions are welcome. Please follow these guidelines:

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests
5. Submit a pull request

## License

ISC

## Support

For support and questions:
- Email: support@acep.engineering
- Documentation: docs.acep.engineering
- Issues: github.com/acep/engineering-os/issues

## Acknowledgments

- Saudi Building Code (SBC)
- American Concrete Institute (ACI)
- National Fire Protection Association (NFPA)
- American Society of Heating, Refrigerating and Air-Conditioning Engineers (ASHRAE)

---

**ACEP Engineering OS** - Transforming Construction Engineering with AI
