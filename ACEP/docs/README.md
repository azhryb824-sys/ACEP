# ACEP - AI Construction Engineering Platform

## منصة هندسة البناء بالذكاء الاصطناعي

ACEP (AI Construction Engineering Platform) is a hybrid engineering intelligence platform that combines AI, engineering knowledge graphs, reasoning engines, and digital twin technology to assist engineers, contractors, and consultants throughout all project phases.

### Architecture Overview

```
Presentation Layer
       ↓
Application Layer
       ↓
Engineering Intelligence Layer
       ↓
  Knowledge Layer
       ↓
   Data Layer
```

### Core Philosophy

> AI must never make decisions alone. Every decision results from combining AI, engineering knowledge, reasoning rules, constraints, codes, project data, and logical review.

### 18 Specification Volumes

| Volume | Title | Description |
|--------|-------|-------------|
| 01 | Executive Vision | Platform vision, mission, principles, goals |
| 02 | Enterprise Architecture | 5-layer architecture, ACE Core, engine pipeline |
| 03 | Engineering Knowledge System (EKS) | Knowledge graph, libraries, rules |
| 04 | Project Understanding Engine (PUE) | NLP-to-structured-data conversion |
| 05 | Smart Question Engine (SQE) | Intelligent questioning with information gain |
| 06 | Engineering Reasoning Engine (ERE) | Multi-stage reasoning, decision traces |
| 07 | Virtual Building Engine (VBE) | Building digital representation |
| 08 | BOQ Intelligence Engine (BIE) | BOQ generation from virtual building |
| 09 | Quantity Intelligence Engine (EQIE) | Derived quantities with calculation traces |
| 10 | Cost Intelligence Engine (CIE) | Dynamic pricing, supplier comparison |
| 11 | Labor Intelligence Engine (LIE) | Crew optimization, productivity analysis |
| 12 | Equipment Intelligence Engine (EIE) | Equipment selection, utilization tracking |
| 13 | Construction Method Engine (CMIE) | Method comparison and selection |
| 14 | Schedule Intelligence Engine (SIE) | Auto-generated schedules, critical path |
| 15 | Risk Intelligence Engine (ERIE) | Automated risk detection and mitigation |
| 16 | Governance & Self-Evolution (EGSI) | Knowledge layers, version control, AI council |
| 17 | Agentic Operating System (AEOS) | 21 specialized AI agents, Engineering Brain |
| 18 | Microservices Architecture (EMA) | 12+ microservices, event-driven, plugin system |

### Project Structure

```
ACEP/
├── docs/                          # Documentation (18 volumes)
├── packages/
│   ├── ace-core/                  # Core types, interfaces, base classes
│   ├── knowledge-base/            # Engineering Knowledge System
│   ├── engines/                   # 12 intelligence engines
│   ├── services/                  # 8 microservices
│   ├── agents/                    # 8 AI agents + Engineering Brain
│   ├── ai-services/              # AI/ML service interfaces
│   ├── plugins/                   # Plugin SDK and marketplace
│   ├── databases/                 # Database models and migrations
│   └── ui/                        # Presentation layer
├── infrastructure/               # Docker, K8s, CI/CD
├── scripts/                       # Build and utility scripts
└── benchmarks/                    # Performance benchmarks
```

### Key Concepts

| Concept | Description |
|---------|-------------|
| **ACE Core** | Central orchestration bus connecting all engines |
| **Knowledge Graph** | Structured engineering knowledge with entities and relationships |
| **Digital Twin** | Virtual representation of physical building |
| **Engine Pipeline** | Sequential processing through intelligence engines |
| **Reasoning Trace** | Complete audit trail of how decisions were made |
| **Agent Collaboration** | Multi-agent system with specialized roles |

### Getting Started

```bash
# Clone the repository
git clone https://github.com/acep/acep-platform.git

# Install dependencies
cd acep-platform
npm install

# Build all packages
npm run build

# Run the platform
npm run start
```

### License

ACEP is licensed under the MIT License. See LICENSE for details.
