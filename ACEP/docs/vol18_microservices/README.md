# Volume 18: Microservices Architecture (EMA)

## بنية الخدمات المصغرة

### Overview

The ACEP Microservices Architecture (EMA) defines the complete service decomposition, communication patterns, deployment strategy, and plugin system that makes the platform extensible, scalable, and resilient.

### Service Map

```
                         ┌──────────────┐
                         │  API Gateway  │
                         │    (Kong)     │
                         └──────┬───────┘
                                │
        ┌───────────────────────┼───────────────────────┐
        │                       │                       │
        ▼                       ▼                       ▼
┌───────────────┐     ┌─────────────────┐     ┌─────────────────┐
│  Auth Service  │     │  Project Service │     │   User Service   │
└───────────────┘     └─────────────────┘     └─────────────────┘
        │                       │                       │
        ▼                       ▼                       ▼
┌─────────────────────────────────────────────────────────────┐
│                     Engine Services (12)                      │
│  ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐  │
│  │ PUE │ │ SQE │ │ ERE │ │ VBE │ │ BIE │ │ EQIE│ │ CIE │  │
│  └─────┘ └─────┘ └─────┘ └─────┘ └─────┘ └─────┘ └─────┘  │
│  ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐                    │
│  │ LIE │ │ EIE │ │CMIE │ │ SIE │ │ERIE │                    │
│  └─────┘ └─────┘ └─────┘ └─────┘ └─────┘                    │
└─────────────────────────────────────────────────────────────┘
        │                       │                       │
        ▼                       ▼                       ▼
┌───────────────┐     ┌─────────────────┐     ┌─────────────────┐
│ Knowledge Svc │     │   Plugin Svc    │     │   Agent Svc     │
└───────────────┘     └─────────────────┘     └─────────────────┘
        │                       │                       │
        ▼                       ▼                       ▼
┌─────────────────────────────────────────────────────────────┐
│                    Infrastructure Services                    │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌────────────────┐ │
│  │ Logging  │ │ Monitoring│ │ Notific. │ │   Document     │ │
│  └──────────┘ └──────────┘ └──────────┘ │   Service      │ │
│  ┌──────────┐ ┌──────────┐               └────────────────┘ │
│  │ Reporting│ │ Analytics│                                    │
│  └──────────┘ └──────────┘                                    │
└─────────────────────────────────────────────────────────────┘
```

### Event-Driven Communication

```typescript
enum EventType {
  // Project Events
  PROJECT_CREATED = 'project.created',
  PROJECT_UPDATED = 'project.updated',
  PROJECT_ARCHIVED = 'project.archived',

  // Engine Pipeline Events
  PIPELINE_STARTED = 'pipeline.started',
  PIPELINE_COMPLETED = 'pipeline.completed',
  ENGINE_COMPLETED = 'engine.completed',
  ENGINE_FAILED = 'engine.failed',

  // Knowledge Events
  KNOWLEDGE_UPDATED = 'knowledge.updated',
  KNOWLEDGE_VERSIONED = 'knowledge.versioned',

  // Plugin Events
  PLUGIN_INSTALLED = 'plugin.installed',
  PLUGIN_UNINSTALLED = 'plugin.uninstalled',
  PLUGIN_ERROR = 'plugin.error',

  // Review Events
  REVIEW_REQUESTED = 'review.requested',
  REVIEW_APPROVED = 'review.approved',
  REVIEW_REJECTED = 'review.rejected',
}

interface DomainEvent {
  id: string;
  type: EventType;
  source: string;
  timestamp: Date;
  data: Record<string, unknown>;
  correlationId: string;
  tenantId: string;
}
```

### Service Communication

| Pattern | Protocol | Use Case |
|---------|----------|----------|
| Synchronous | HTTP/REST + gRPC | CRUD operations, queries |
| Asynchronous | RabbitMQ / Kafka | Event publishing, long tasks |
| Streaming | WebSocket | Real-time updates, progress |
| Batch | S3 + SQS | Large file processing |

### Service Template

```typescript
interface MicroService {
  name: string;
  version: string;
  dependencies: string[];
  events: {
    publishes: EventType[];
    subscribes: EventType[];
  };
  health: HealthCheck;
  config: ServiceConfig;
}

interface ServiceConfig {
  port: number;
  database: DatabaseConfig;
  cache: CacheConfig;
  rateLimit: RateLimitConfig;
  circuitBreaker: CircuitBreakerConfig;
}
```

### Plugin System Architecture

```
┌──────────────────────────────────────────────────────────────┐
│                    Plugin System                              │
├──────────────────────────────────────────────────────────────┤
│                                                              │
│  Plugin SDK (@acep/plugin-sdk)                              │
│  ┌────────────────────────────────────────────────────────┐ │
│  │ PluginBase   PluginContext   PluginManifestValidator   │ │
│  │ HookSystem   PluginAPI       PluginSandbox             │ │
│  └────────────────────────────────────────────────────────┘ │
│                                                              │
│  Plugin Marketplace                                          │
│  ┌────────────────────────────────────────────────────────┐ │
│  │ Search  │  Install  │  Uninstall  │  Version Mgmt      │ │
│  │ Dependency Resolution │ Config UI │  Publishing         │ │
│  └────────────────────────────────────────────────────────┘ │
│                                                              │
│  Plugin Types                                                 │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌────────────────┐ │
│  │ Engine   │ │Knowledge │ │    UI    │ │  Integration   │ │
│  │ Plugin   │ │ Plugin   │ │ Plugin   │ │   Plugin       │ │
│  └──────────┘ └──────────┘ └──────────┘ └────────────────┘ │
│  ┌──────────┐ ┌──────────┐                                  │
│  │ AI Plugin│ │ Report   │                                  │
│  │          │ │ Plugin   │                                  │
│  └──────────┘ └──────────┘                                  │
└──────────────────────────────────────────────────────────────┘
```

### Deployment Architecture

```
┌──────────────────────────────────────────────┐
│           Kubernetes Cluster                   │
│  ┌──────────────────────────────────────────┐ │
│  │  Namespace: acep-core                     │ │
│  │  ├── auth-service: 2 replicas            │ │
│  │  ├── project-service: 3 replicas         │ │
│  │  ├── engine-pue: 2 replicas              │ │
│  │  ├── engine-sqe: 2 replicas              │ │
│  │  └── ...                                 │ │
│  └──────────────────────────────────────────┘ │
│  ┌──────────────────────────────────────────┐ │
│  │  Namespace: acep-data                     │ │
│  │  ├── postgresql: statefulset             │ │
│  │  ├── neo4j: statefulset                  │ │
│  │  ├── redis: statefulset                  │ │
│  │  └── elasticsearch: statefulset          │ │
│  └──────────────────────────────────────────┘ │
│  ┌──────────────────────────────────────────┐ │
│  │  Namespace: acep-infra                   │ │
│  │  ├── rabbitmq: statefulset               │ │
│  │  ├── prometheus: deployment              │ │
│  │  ├── grafana: deployment                 │ │
│  │  └── kong: deployment                    │ │
│  └──────────────────────────────────────────┘ │
└──────────────────────────────────────────────┘
```

### API Gateway Routes

| Route | Service | Method | Auth |
|-------|---------|--------|------|
| `/api/v1/projects` | Project Service | CRUD | JWT |
| `/api/v1/boqs` | BIE Service | CRUD | JWT |
| `/api/v1/engine/pue` | PUE Service | POST | JWT + Scope |
| `/api/v1/engine/*` | Engine Services | Various | JWT + Scope |
| `/api/v1/knowledge` | Knowledge Service | CRUD | JWT + Admin |
| `/api/v1/plugins` | Plugin Service | CRUD | JWT + Admin |
| `/api/v1/agents` | Agent Service | POST | JWT |
| `/ws/*` | WebSocket | Stream | JWT (token) |

### Scalability

| Service | Scaling Strategy | Max Replicas |
|---------|-----------------|--------------|
| API Gateway | Horizontal (CPU) | 10 |
| Engine Services | Horizontal (queue depth) | 20 |
| Knowledge Service | Horizontal (query load) | 10 |
| Database | Vertical + Read replicas | 5 |
| Cache | Redis Cluster | 3 nodes |

### Resilience Patterns

| Pattern | Implementation |
|---------|---------------|
| Circuit Breaker | Opossum library |
| Retry | Exponential backoff + jitter |
| Timeout | Configurable per service |
| Bulkhead | Thread pool isolation |
| Rate Limiting | Token bucket algorithm |
| Saga Pattern | Orchestration-based |
| Health Checks | /health endpoint |
| Graceful Shutdown | Signal handling |

### Monitoring and Observability

| Component | Tool | Metrics |
|-----------|------|---------|
| Metrics | Prometheus | Request count, latency, errors |
| Logging | ELK Stack | Structured JSON logs |
| Tracing | Jaeger | Distributed request tracing |
| Alerting | Alertmanager | PagerDuty, Slack, Email |
| Dashboard | Grafana | Real-time service health |

### Performance Targets

| Metric | Target |
|--------|--------|
| API response time (p95) | < 500ms |
| Event propagation | < 100ms |
| Service startup | < 30 seconds |
| Zero-downtime deployment | Yes |
| Recovery time | < 5 minutes |
| Plugin installation | < 10 seconds |
