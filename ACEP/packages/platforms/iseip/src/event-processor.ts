import { KnowledgeGraph } from '@acep/knowledge-base';
import { v4 as uuid } from 'uuid';
import {
  IEventProcessor, EventClassification, NotificationDispatch, InspectionOrder
} from './interfaces';
import {
  CriticalEvent, SensorReading, SensorConfig, EventType, AlertSeverity,
  Alert, AlertType, AffectedParty
} from './types';

export class RealTimeEventIntelligence implements IEventProcessor {
  private activeEvents: Map<string, CriticalEvent> = new Map();
  private eventHistory: CriticalEvent[] = [];
  private knowledgeGraph: KnowledgeGraph;

  constructor(kg: KnowledgeGraph) {
    this.knowledgeGraph = kg;
  }

  async processEvents(readings: SensorReading[], sensors: SensorConfig[]): Promise<CriticalEvent[]> {
    const detected = await this.detectEvents(readings, sensors);
    const classified: CriticalEvent[] = [];

    for (const event of detected) {
      const classification = await this.classifyEvent(event);
      const severity = classification.severity;
      event.severity = severity;

      const parties = await this.determineAffectedParties(event);
      event.affectedParties = parties;

      const notifications = await this.dispatchNotifications(event, parties);
      await this.triggerAgents(event);
      await this.updateDigitalTwin(event);
      await this.createAuditLog(event);

      if (severity === AlertSeverity.Critical || severity === AlertSeverity.High) {
        const order = await this.createInspectionOrder(event);
        if (order) {
          this.log(`Inspection order created: ${order.id} -> ${order.assignedTo}`);
        }
      }

      this.activeEvents.set(event.id, event);
      this.eventHistory.push(event);
      classified.push(event);

      this.logEventAction(event, classification);
    }

    if (classified.length > 0) {
      this.enrichKnowledgeGraph(classified);
    }

    return classified;
  }

  async detectEvents(readings: SensorReading[], sensors: SensorConfig[]): Promise<CriticalEvent[]> {
    const events: CriticalEvent[] = [];
    const sensorMap = new Map(sensors.map(s => [s.id, s]));

    for (const reading of readings) {
      const sensor = sensorMap.get(reading.sensorId);
      if (!sensor || !sensor.thresholds) continue;

      const t = sensor.thresholds;

      if (t.criticalMax !== undefined && reading.value > t.criticalMax) {
        events.push(this.buildEvent(EventType.ThresholdCrossed, AlertSeverity.Critical, reading, sensor,
          `Critical: ${sensor.name} value ${reading.value}${reading.unit} exceeds max threshold ${t.criticalMax}`));
      }
      if (t.criticalMin !== undefined && reading.value < t.criticalMin) {
        events.push(this.buildEvent(EventType.ThresholdCrossed, AlertSeverity.Critical, reading, sensor,
          `Critical: ${sensor.name} value ${reading.value}${reading.unit} below min threshold ${t.criticalMin}`));
      }
      if (t.max !== undefined && reading.value > t.max && (t.criticalMax === undefined || reading.value <= t.criticalMax)) {
        events.push(this.buildEvent(EventType.ThresholdCrossed, AlertSeverity.High, reading, sensor,
          `Warning: ${sensor.name} value ${reading.value}${reading.unit} exceeds warning threshold ${t.max}`));
      }
      if (t.min !== undefined && reading.value < t.min && (t.criticalMin === undefined || reading.value >= t.criticalMin)) {
        events.push(this.buildEvent(EventType.ThresholdCrossed, AlertSeverity.High, reading, sensor,
          `Warning: ${sensor.name} value ${reading.value}${reading.unit} below warning threshold ${t.min}`));
      }

      if (sensor.type === 'Temperature' as any && reading.value > 80) {
        events.push(this.buildEvent(EventType.EquipmentFailure, AlertSeverity.Critical, reading, sensor,
          `Engine overheat: ${sensor.name} at ${reading.value}°C — alert engineer + create inspection order`));
      }
      if (sensor.type === 'Tilt' as any && Math.abs(reading.value) > 5) {
        events.push(this.buildEvent(EventType.StructuralAlert, AlertSeverity.Critical, reading, sensor,
          `Crane tilt detected: ${sensor.name} tilt ${reading.value}° — emergency stop + urgent alert`));
      }
      if (sensor.type === 'Gas' as any && reading.value > 0) {
        events.push(this.buildEvent(EventType.SafetyViolation, AlertSeverity.Critical, reading, sensor,
          `Gas leak detected: ${sensor.name} — evacuate zone immediately`));
      }
      if (sensor.type === 'Smoke' as any && reading.value > 0) {
        events.push(this.buildEvent(EventType.SafetyViolation, AlertSeverity.Critical, reading, sensor,
          `Smoke detected: ${sensor.name} — activate fire protocol`));
      }
      if (sensor.type === 'Fall' as any && reading.value > 0) {
        events.push(this.buildEvent(EventType.SafetyViolation, AlertSeverity.Critical, reading, sensor,
          `Worker fall detected at ${sensor.location} — dispatch medical team`));
      }
      if (sensor.type === 'Vibration' as any && reading.value > 10) {
        events.push(this.buildEvent(EventType.StructuralAlert, AlertSeverity.High, reading, sensor,
          `Excessive vibration: ${sensor.name} at ${reading.value} mm/s — structural inspection required`));
      }
      if (sensor.type === 'Energy' as any && reading.value > 500) {
        events.push(this.buildEvent(EventType.EnergySpike, AlertSeverity.High, reading, sensor,
          `Energy spike: ${sensor.name} consuming ${reading.value} kW — investigate load`));
      }
    }

    return events;
  }

  async classifyEvent(event: CriticalEvent): Promise<EventClassification> {
    const classification: EventClassification = {
      eventId: event.id,
      type: event.type,
      severity: event.severity,
      confidence: event.severity === AlertSeverity.Critical ? 0.95 : 0.85,
      description: event.description,
      affectedAssets: [],
      requiresEscalation: event.severity === AlertSeverity.Critical
    };

    switch (event.type) {
      case EventType.EquipmentFailure:
        classification.subType = 'Mechanical';
        classification.affectedAssets = ['engine', 'hydraulics', 'transmission'];
        break;
      case EventType.StructuralAlert:
        classification.subType = 'StructuralIntegrity';
        classification.affectedAssets = ['crane', 'scaffolding', 'foundation'];
        break;
      case EventType.SafetyViolation:
        classification.subType = 'PersonnelSafety';
        classification.affectedAssets = ['workers', 'zone'];
        break;
      case EventType.EnvironmentalAlert:
        classification.subType = 'Environmental';
        classification.affectedAssets = ['site', 'surroundings'];
        break;
      case EventType.EnergySpike:
        classification.subType = 'PowerQuality';
        classification.affectedAssets = ['generator', 'panel', 'equipment'];
        break;
      default:
        classification.subType = 'General';
        classification.affectedAssets = [event.sourceId];
    }

    return classification;
  }

  async assessSeverity(event: CriticalEvent): Promise<AlertSeverity> {
    return event.severity;
  }

  async determineAffectedParties(event: CriticalEvent): Promise<AffectedParty[]> {
    const parties: AffectedParty[] = [];
    const sev = event.severity;

    switch (event.type) {
      case EventType.EquipmentFailure:
      case EventType.EnergySpike:
        parties.push({ role: 'Chief Engineer', contact: 'engineer@site.com', notificationMethod: 'SMS', notified: false });
        parties.push({ role: 'Maintenance Team', contact: 'maintenance@site.com', notificationMethod: 'Push', notified: false });
        if (sev === AlertSeverity.Critical) {
          parties.push({ role: 'Project Manager', contact: 'pm@site.com', notificationMethod: 'Email', notified: false });
        }
        break;
      case EventType.StructuralAlert:
        parties.push({ role: 'Safety Officer', contact: 'safety@site.com', notificationMethod: 'Alarm', notified: false });
        parties.push({ role: 'Structural Engineer', contact: 'struct.eng@site.com', notificationMethod: 'SMS', notified: false });
        parties.push({ role: 'Project Manager', contact: 'pm@site.com', notificationMethod: 'Email', notified: false });
        break;
      case EventType.SafetyViolation:
        parties.push({ role: 'Safety Officer', contact: 'safety@site.com', notificationMethod: 'Alarm', notified: false });
        parties.push({ role: 'Medical Team', contact: 'medic@site.com', notificationMethod: 'Push', notified: false });
        parties.push({ role: 'Site Supervisor', contact: 'supervisor@site.com', notificationMethod: 'SMS', notified: false });
        parties.push({ role: 'Project Manager', contact: 'pm@site.com', notificationMethod: 'Email', notified: false });
        break;
      case EventType.EnvironmentalAlert:
        parties.push({ role: 'Environmental Officer', contact: 'env@site.com', notificationMethod: 'Email', notified: false });
        parties.push({ role: 'Site Supervisor', contact: 'supervisor@site.com', notificationMethod: 'Push', notified: false });
        break;
      default:
        parties.push({ role: 'Site Supervisor', contact: 'supervisor@site.com', notificationMethod: 'Push', notified: false });
    }

    return parties;
  }

  async dispatchNotifications(event: CriticalEvent, parties: AffectedParty[]): Promise<NotificationDispatch[]> {
    const dispatches: NotificationDispatch[] = [];
    const channels = [...new Set(parties.map(p => p.notificationMethod))];

    for (const party of parties) {
      party.notified = true;
      party.notifiedAt = new Date().toISOString();
    }

    const dispatch: NotificationDispatch = {
      id: uuid(),
      eventId: event.id,
      recipients: parties.map(p => p.contact),
      channels: channels.map(c => c.toString()),
      message: `[${event.severity}] ${event.description} — Location: ${event.location || 'N/A'}`,
      sentAt: new Date().toISOString(),
      delivered: true
    };
    dispatches.push(dispatch);

    this.log(`Notifications dispatched to ${parties.length} parties via ${channels.join(', ')}`);
    return dispatches;
  }

  async triggerAgents(event: CriticalEvent): Promise<string[]> {
    const triggered: string[] = [];
    const sev = event.severity;

    switch (event.type) {
      case EventType.EquipmentFailure:
        if (sev === AlertSeverity.Critical) {
          triggered.push('MaintenanceAgent:create_work_order');
          triggered.push('EngineerAgent:inspect');
        }
        triggered.push('MonitorAgent:increase_sampling');
        break;
      case EventType.StructuralAlert:
        triggered.push('SafetyAgent:initiate_evacuation');
        triggered.push('StructuralAgent:assess_damage');
        triggered.push('MonitorAgent:activate_high_frequency');
        break;
      case EventType.SafetyViolation:
        triggered.push('SafetyAgent:initiate_evacuation');
        triggered.push('MedicalAgent:dispatch_team');
        triggered.push('SecurityAgent:lockdown_zone');
        break;
      case EventType.EnergySpike:
        triggered.push('EnergyAgent:optimize_load');
        triggered.push('MaintenanceAgent:inspect_panel');
        break;
      default:
        triggered.push('MonitorAgent:log_event');
    }

    this.log(`Agents triggered: ${triggered.join(', ')}`);
    return triggered;
  }

  async updateDigitalTwin(event: CriticalEvent): Promise<void> {
    try {
      await this.knowledgeGraph.addNode({
        id: event.id,
        type: 'CriticalEvent' as any,
        name: `${event.type} - ${event.severity}`,
        location: event.location || 'unknown',
        properties: {
          eventType: event.type,
          severity: event.severity,
          description: event.description,
          sourceId: event.sourceId,
          value: event.value,
          resolved: event.resolved,
          timestamp: event.timestamp
        },
        relationships: [],
        confidence: event.severity === AlertSeverity.Critical ? 0.95 : 0.8,
        source: 'RealTimeEventIntelligence',
        timestamp: new Date().toISOString()
      } as any);
    } catch (err) {
      this.log(`Digital twin update failed: ${err}`);
    }
  }

  async createAuditLog(event: CriticalEvent): Promise<void> {
    this.log(`AUDIT [${event.timestamp}] ${event.severity} | ${event.type} | ${event.description} | Source: ${event.sourceId} | Acknowledged: ${event.acknowledged}`);
  }

  async createInspectionOrder(event: CriticalEvent): Promise<InspectionOrder | null> {
    if (event.severity !== AlertSeverity.Critical && event.severity !== AlertSeverity.High) {
      return null;
    }

    const assignedTo = this.getInspectorForEvent(event);

    return {
      id: `INSP-${Date.now()}`,
      eventId: event.id,
      title: `${event.severity} inspection required: ${event.type}`,
      description: event.description,
      assignedTo,
      priority: event.severity,
      createdAt: new Date().toISOString(),
      scheduledAt: new Date(Date.now() + 3600000).toISOString(),
      status: 'Pending'
    };
  }

  async acknowledgeEvent(eventId: string, userId: string): Promise<void> {
    const event = this.activeEvents.get(eventId);
    if (event) {
      event.acknowledged = true;
      event.acknowledgedBy = userId;
      this.activeEvents.set(eventId, event);
      this.log(`Event ${eventId} acknowledged by ${userId}`);
    }
  }

  async resolveEvent(eventId: string, resolution: string): Promise<void> {
    const event = this.activeEvents.get(eventId) || this.eventHistory.find(e => e.id === eventId);
    if (event) {
      event.resolved = true;
      event.resolvedAt = new Date().toISOString();
      event.metadata = { ...event.metadata, resolution };
      this.activeEvents.delete(eventId);
      this.log(`Event ${eventId} resolved: ${resolution}`);
    }
  }

  getActiveEvents(): CriticalEvent[] {
    return Array.from(this.activeEvents.values());
  }

  getEventHistory(limit: number = 100): CriticalEvent[] {
    return this.eventHistory.slice(-limit);
  }

  private buildEvent(
    type: EventType, severity: AlertSeverity,
    reading: SensorReading, sensor: SensorConfig,
    description: string
  ): CriticalEvent {
    return {
      id: uuid(),
      type,
      severity,
      sourceId: sensor.id,
      sourceType: sensor.type,
      description,
      descriptionAr: description,
      timestamp: reading.timestamp,
      value: reading.value,
      location: sensor.location,
      requiresImmediateAction: severity === AlertSeverity.Critical,
      suggestedAction: severity === AlertSeverity.Critical ? 'Immediate intervention required' : 'Schedule inspection',
      acknowledged: false,
      resolved: false,
      metadata: { sensorName: sensor.name, unit: sensor.unit, protocol: sensor.protocol }
    };
  }

  private logEventAction(event: CriticalEvent, classification: EventClassification): void {
    const action = event.requiresImmediateAction ? 'ACTION REQUIRED' : 'Monitor';
    this.log(`[${action}] ${classification.severity} | ${classification.type}${classification.subType ? '/' + classification.subType : ''} | ${classification.description} | Confidence: ${(classification.confidence * 100).toFixed(0)}%`);
  }

  private enrichKnowledgeGraph(events: CriticalEvent[]): void {
    const severities = events.map(e => e.severity);
    const criticalCount = severities.filter(s => s === AlertSeverity.Critical).length;
    if (criticalCount > 2) {
      this.log(`ALERT: ${criticalCount} critical events in batch — escalation recommended`);
    }
  }

  private getInspectorForEvent(event: CriticalEvent): string {
    const map: Partial<Record<EventType, string>> = {
      [EventType.EquipmentFailure]: 'Maintenance Engineer',
      [EventType.StructuralAlert]: 'Structural Engineer',
      [EventType.SafetyViolation]: 'Safety Officer',
      [EventType.EnvironmentalAlert]: 'Environmental Officer',
      [EventType.EnergySpike]: 'Electrical Engineer',
      [EventType.AnomalyDetected]: 'Site Engineer'
    };
    return map[event.type] || 'Site Supervisor';
  }

  private log(message: string): void {
    console.log(`[RealTimeEventIntelligence] ${message}`);
  }
}
