# Volume 02: Enterprise Architecture

## العمارة المؤسسية

### 5-Layer Architecture

```
┌─────────────────────────────────────────────────────┐
│           PRESENTATION LAYER                         │
│   Web App  │  Mobile App  │  CLI  │  API Gateway    │
├─────────────────────────────────────────────────────┤
│           APPLICATION LAYER                          │
│   Dashboard  │  Project Mgr  │  Reports  │  Admin   │
├─────────────────────────────────────────────────────┤
│           ENGINEERING INTELLIGENCE LAYER             │
│   PUE  │  SQE  │  ERE  │  VBE  │  BIE  │  EQIE     │
│   CIE  │  LIE  │  EIE  │  CMIE │  SIE  │  ERIE     │
├─────────────────────────────────────────────────────┤
│           KNOWLEDGE LAYER                            │
│   Knowledge Graph  │  Code Library  │  Rules Engine │
│   Material DB      │  Equipment DB  │  Method DB    │
├─────────────────────────────────────────────────────┤
│           DATA LAYER                                 │
│   PostgreSQL  │  Neo4j  │  Redis  │  S3  │  Elastic │
└─────────────────────────────────────────────────────┘
```

### ACE Core

The ACE Core is the central orchestration bus that coordinates all engines, services, and agents. It provides:

- **Engine Pipeline Orchestration** — Sequential and parallel engine execution
- **Event Management** — Publish/subscribe event bus
- **State Management** — Centralized project state
- **Plugin Registry** — Discovery and lifecycle management
- **Authentication & Authorization** — Role-based access control

```typescript
interface ACE Core {
  pipeline: EnginePipeline;
  events: EventBus;
  state: StateManager;
  plugins: PluginRegistry;
  auth: AuthManager;
}
```

### Engine Pipeline Flow

```
Project Created
      │
      ▼
┌─────────────┐
│     PUE     │  Project Understanding
└──────┬──────┘
       │
       ▼
┌─────────────┐
│     SQE     │  Smart Questioning
└──────┬──────┘
       │
       ▼
┌─────────────┐
│     ERE     │  Engineering Reasoning
└──────┬──────┘
       │
       ▼
┌─────────────┐
│     VBE     │  Virtual Building
└──────┬──────┘
       │
       ▼
┌─────────────┐     ┌─────────────┐
│     BIE     │────▶│    EQIE     │
└─────────────┘     └──────┬──────┘
                           │
              ┌────────────┼────────────┐
              ▼            ▼            ▼
        ┌─────────┐  ┌─────────┐  ┌─────────┐
        │   CIE   │  │   LIE   │  │   EIE   │
        └────┬────┘  └────┬────┘  └────┬────┘
             │            │            │
              └────────────┼────────────┘
                           ▼
                    ┌─────────────┐
                    │    CMIE     │
                    └──────┬──────┘
                           │
                           ▼
                    ┌─────────────┐
                    │    SIE      │
                    └──────┬──────┘
                           │
                           ▼
                    ┌─────────────┐
                    │    ERIE     │
                    └─────────────┘
```

### Technology Stack

| Component | Technology | Purpose |
|-----------|------------|---------|
| Backend | Node.js + TypeScript | Runtime for all services |
| Graph Database | Neo4j | Knowledge graph storage |
| Relational DB | PostgreSQL | Project data, users, BOQs |
| Cache | Redis | Session management, real-time |
| Search | Elasticsearch | Full-text search across projects |
| File Storage | S3-compatible | Documents, drawings, models |
| Message Queue | RabbitMQ | Event-driven communication |
| Container | Docker + K8s | Deployment orchestration |
| API Gateway | Kong | API management and routing |
| Monitoring | Prometheus + Grafana | System observability |

### Microservices Architecture

The platform consists of 12+ microservices:

| Service | Responsibility |
|---------|---------------|
| `api-gateway` | Request routing, auth, rate limiting |
| `project-service` | Project CRUD and lifecycle |
| `knowledge-service` | Knowledge graph operations |
| `engine-orchestrator` | Pipeline coordination |
| `pue-service` | Project Understanding Engine |
| `sqe-service` | Smart Question Engine |
| `ere-service` | Engineering Reasoning Engine |
| `vbe-service` | Virtual Building Engine |
| `bie-service` | BOQ Intelligence Engine |
| `eqie-service` | Quantity Intelligence Engine |
| `cie-service` | Cost Intelligence Engine |
| `lie-service` | Labor Intelligence Engine |
| `eie-service` | Equipment Intelligence Engine |
| `cmie-service` | Construction Method Engine |
| `sie-service` | Schedule Intelligence Engine |
| `erie-service` | Risk Intelligence Engine |
| `egsi-service` | Governance and Self-Evolution |
| `plugin-service` | Plugin lifecycle management |
| `agent-service` | AI agent execution |
| `notification-service` | Alerts and notifications |

### Design Patterns

| Pattern | Usage |
|---------|-------|
| Event Sourcing | Project state changes |
| CQRS | Separate read/write for complex queries |
| Saga | Distributed transaction orchestration |
| Strangler Fig | Gradual legacy system migration |
| Circuit Breaker | Service resilience |
| Bulkhead | Resource isolation per tenant |
| Sidecar | Logging, monitoring, proxy |
| Ambassador | External service communication |
