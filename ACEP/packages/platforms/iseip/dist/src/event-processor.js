"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RealTimeEventIntelligence = void 0;
const uuid_1 = require("uuid");
const types_1 = require("./types");
class RealTimeEventIntelligence {
    activeEvents = new Map();
    eventHistory = [];
    knowledgeGraph;
    constructor(kg) {
        this.knowledgeGraph = kg;
    }
    async processEvents(readings, sensors) {
        const detected = await this.detectEvents(readings, sensors);
        const classified = [];
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
            if (severity === types_1.AlertSeverity.Critical || severity === types_1.AlertSeverity.High) {
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
    async detectEvents(readings, sensors) {
        const events = [];
        const sensorMap = new Map(sensors.map(s => [s.id, s]));
        for (const reading of readings) {
            const sensor = sensorMap.get(reading.sensorId);
            if (!sensor || !sensor.thresholds)
                continue;
            const t = sensor.thresholds;
            if (t.criticalMax !== undefined && reading.value > t.criticalMax) {
                events.push(this.buildEvent(types_1.EventType.ThresholdCrossed, types_1.AlertSeverity.Critical, reading, sensor, `Critical: ${sensor.name} value ${reading.value}${reading.unit} exceeds max threshold ${t.criticalMax}`));
            }
            if (t.criticalMin !== undefined && reading.value < t.criticalMin) {
                events.push(this.buildEvent(types_1.EventType.ThresholdCrossed, types_1.AlertSeverity.Critical, reading, sensor, `Critical: ${sensor.name} value ${reading.value}${reading.unit} below min threshold ${t.criticalMin}`));
            }
            if (t.max !== undefined && reading.value > t.max && (t.criticalMax === undefined || reading.value <= t.criticalMax)) {
                events.push(this.buildEvent(types_1.EventType.ThresholdCrossed, types_1.AlertSeverity.High, reading, sensor, `Warning: ${sensor.name} value ${reading.value}${reading.unit} exceeds warning threshold ${t.max}`));
            }
            if (t.min !== undefined && reading.value < t.min && (t.criticalMin === undefined || reading.value >= t.criticalMin)) {
                events.push(this.buildEvent(types_1.EventType.ThresholdCrossed, types_1.AlertSeverity.High, reading, sensor, `Warning: ${sensor.name} value ${reading.value}${reading.unit} below warning threshold ${t.min}`));
            }
            if (sensor.type === 'Temperature' && reading.value > 80) {
                events.push(this.buildEvent(types_1.EventType.EquipmentFailure, types_1.AlertSeverity.Critical, reading, sensor, `Engine overheat: ${sensor.name} at ${reading.value}°C — alert engineer + create inspection order`));
            }
            if (sensor.type === 'Tilt' && Math.abs(reading.value) > 5) {
                events.push(this.buildEvent(types_1.EventType.StructuralAlert, types_1.AlertSeverity.Critical, reading, sensor, `Crane tilt detected: ${sensor.name} tilt ${reading.value}° — emergency stop + urgent alert`));
            }
            if (sensor.type === 'Gas' && reading.value > 0) {
                events.push(this.buildEvent(types_1.EventType.SafetyViolation, types_1.AlertSeverity.Critical, reading, sensor, `Gas leak detected: ${sensor.name} — evacuate zone immediately`));
            }
            if (sensor.type === 'Smoke' && reading.value > 0) {
                events.push(this.buildEvent(types_1.EventType.SafetyViolation, types_1.AlertSeverity.Critical, reading, sensor, `Smoke detected: ${sensor.name} — activate fire protocol`));
            }
            if (sensor.type === 'Fall' && reading.value > 0) {
                events.push(this.buildEvent(types_1.EventType.SafetyViolation, types_1.AlertSeverity.Critical, reading, sensor, `Worker fall detected at ${sensor.location} — dispatch medical team`));
            }
            if (sensor.type === 'Vibration' && reading.value > 10) {
                events.push(this.buildEvent(types_1.EventType.StructuralAlert, types_1.AlertSeverity.High, reading, sensor, `Excessive vibration: ${sensor.name} at ${reading.value} mm/s — structural inspection required`));
            }
            if (sensor.type === 'Energy' && reading.value > 500) {
                events.push(this.buildEvent(types_1.EventType.EnergySpike, types_1.AlertSeverity.High, reading, sensor, `Energy spike: ${sensor.name} consuming ${reading.value} kW — investigate load`));
            }
        }
        return events;
    }
    async classifyEvent(event) {
        const classification = {
            eventId: event.id,
            type: event.type,
            severity: event.severity,
            confidence: event.severity === types_1.AlertSeverity.Critical ? 0.95 : 0.85,
            description: event.description,
            affectedAssets: [],
            requiresEscalation: event.severity === types_1.AlertSeverity.Critical
        };
        switch (event.type) {
            case types_1.EventType.EquipmentFailure:
                classification.subType = 'Mechanical';
                classification.affectedAssets = ['engine', 'hydraulics', 'transmission'];
                break;
            case types_1.EventType.StructuralAlert:
                classification.subType = 'StructuralIntegrity';
                classification.affectedAssets = ['crane', 'scaffolding', 'foundation'];
                break;
            case types_1.EventType.SafetyViolation:
                classification.subType = 'PersonnelSafety';
                classification.affectedAssets = ['workers', 'zone'];
                break;
            case types_1.EventType.EnvironmentalAlert:
                classification.subType = 'Environmental';
                classification.affectedAssets = ['site', 'surroundings'];
                break;
            case types_1.EventType.EnergySpike:
                classification.subType = 'PowerQuality';
                classification.affectedAssets = ['generator', 'panel', 'equipment'];
                break;
            default:
                classification.subType = 'General';
                classification.affectedAssets = [event.sourceId];
        }
        return classification;
    }
    async assessSeverity(event) {
        return event.severity;
    }
    async determineAffectedParties(event) {
        const parties = [];
        const sev = event.severity;
        switch (event.type) {
            case types_1.EventType.EquipmentFailure:
            case types_1.EventType.EnergySpike:
                parties.push({ role: 'Chief Engineer', contact: 'engineer@site.com', notificationMethod: 'SMS', notified: false });
                parties.push({ role: 'Maintenance Team', contact: 'maintenance@site.com', notificationMethod: 'Push', notified: false });
                if (sev === types_1.AlertSeverity.Critical) {
                    parties.push({ role: 'Project Manager', contact: 'pm@site.com', notificationMethod: 'Email', notified: false });
                }
                break;
            case types_1.EventType.StructuralAlert:
                parties.push({ role: 'Safety Officer', contact: 'safety@site.com', notificationMethod: 'Alarm', notified: false });
                parties.push({ role: 'Structural Engineer', contact: 'struct.eng@site.com', notificationMethod: 'SMS', notified: false });
                parties.push({ role: 'Project Manager', contact: 'pm@site.com', notificationMethod: 'Email', notified: false });
                break;
            case types_1.EventType.SafetyViolation:
                parties.push({ role: 'Safety Officer', contact: 'safety@site.com', notificationMethod: 'Alarm', notified: false });
                parties.push({ role: 'Medical Team', contact: 'medic@site.com', notificationMethod: 'Push', notified: false });
                parties.push({ role: 'Site Supervisor', contact: 'supervisor@site.com', notificationMethod: 'SMS', notified: false });
                parties.push({ role: 'Project Manager', contact: 'pm@site.com', notificationMethod: 'Email', notified: false });
                break;
            case types_1.EventType.EnvironmentalAlert:
                parties.push({ role: 'Environmental Officer', contact: 'env@site.com', notificationMethod: 'Email', notified: false });
                parties.push({ role: 'Site Supervisor', contact: 'supervisor@site.com', notificationMethod: 'Push', notified: false });
                break;
            default:
                parties.push({ role: 'Site Supervisor', contact: 'supervisor@site.com', notificationMethod: 'Push', notified: false });
        }
        return parties;
    }
    async dispatchNotifications(event, parties) {
        const dispatches = [];
        const channels = [...new Set(parties.map(p => p.notificationMethod))];
        for (const party of parties) {
            party.notified = true;
            party.notifiedAt = new Date().toISOString();
        }
        const dispatch = {
            id: (0, uuid_1.v4)(),
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
    async triggerAgents(event) {
        const triggered = [];
        const sev = event.severity;
        switch (event.type) {
            case types_1.EventType.EquipmentFailure:
                if (sev === types_1.AlertSeverity.Critical) {
                    triggered.push('MaintenanceAgent:create_work_order');
                    triggered.push('EngineerAgent:inspect');
                }
                triggered.push('MonitorAgent:increase_sampling');
                break;
            case types_1.EventType.StructuralAlert:
                triggered.push('SafetyAgent:initiate_evacuation');
                triggered.push('StructuralAgent:assess_damage');
                triggered.push('MonitorAgent:activate_high_frequency');
                break;
            case types_1.EventType.SafetyViolation:
                triggered.push('SafetyAgent:initiate_evacuation');
                triggered.push('MedicalAgent:dispatch_team');
                triggered.push('SecurityAgent:lockdown_zone');
                break;
            case types_1.EventType.EnergySpike:
                triggered.push('EnergyAgent:optimize_load');
                triggered.push('MaintenanceAgent:inspect_panel');
                break;
            default:
                triggered.push('MonitorAgent:log_event');
        }
        this.log(`Agents triggered: ${triggered.join(', ')}`);
        return triggered;
    }
    async updateDigitalTwin(event) {
        try {
            await this.knowledgeGraph.addNode({
                id: event.id,
                type: 'CriticalEvent',
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
                confidence: event.severity === types_1.AlertSeverity.Critical ? 0.95 : 0.8,
                source: 'RealTimeEventIntelligence',
                timestamp: new Date().toISOString()
            });
        }
        catch (err) {
            this.log(`Digital twin update failed: ${err}`);
        }
    }
    async createAuditLog(event) {
        this.log(`AUDIT [${event.timestamp}] ${event.severity} | ${event.type} | ${event.description} | Source: ${event.sourceId} | Acknowledged: ${event.acknowledged}`);
    }
    async createInspectionOrder(event) {
        if (event.severity !== types_1.AlertSeverity.Critical && event.severity !== types_1.AlertSeverity.High) {
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
    async acknowledgeEvent(eventId, userId) {
        const event = this.activeEvents.get(eventId);
        if (event) {
            event.acknowledged = true;
            event.acknowledgedBy = userId;
            this.activeEvents.set(eventId, event);
            this.log(`Event ${eventId} acknowledged by ${userId}`);
        }
    }
    async resolveEvent(eventId, resolution) {
        const event = this.activeEvents.get(eventId) || this.eventHistory.find(e => e.id === eventId);
        if (event) {
            event.resolved = true;
            event.resolvedAt = new Date().toISOString();
            event.metadata = { ...event.metadata, resolution };
            this.activeEvents.delete(eventId);
            this.log(`Event ${eventId} resolved: ${resolution}`);
        }
    }
    getActiveEvents() {
        return Array.from(this.activeEvents.values());
    }
    getEventHistory(limit = 100) {
        return this.eventHistory.slice(-limit);
    }
    buildEvent(type, severity, reading, sensor, description) {
        return {
            id: (0, uuid_1.v4)(),
            type,
            severity,
            sourceId: sensor.id,
            sourceType: sensor.type,
            description,
            descriptionAr: description,
            timestamp: reading.timestamp,
            value: reading.value,
            location: sensor.location,
            requiresImmediateAction: severity === types_1.AlertSeverity.Critical,
            suggestedAction: severity === types_1.AlertSeverity.Critical ? 'Immediate intervention required' : 'Schedule inspection',
            acknowledged: false,
            resolved: false,
            metadata: { sensorName: sensor.name, unit: sensor.unit, protocol: sensor.protocol }
        };
    }
    logEventAction(event, classification) {
        const action = event.requiresImmediateAction ? 'ACTION REQUIRED' : 'Monitor';
        this.log(`[${action}] ${classification.severity} | ${classification.type}${classification.subType ? '/' + classification.subType : ''} | ${classification.description} | Confidence: ${(classification.confidence * 100).toFixed(0)}%`);
    }
    enrichKnowledgeGraph(events) {
        const severities = events.map(e => e.severity);
        const criticalCount = severities.filter(s => s === types_1.AlertSeverity.Critical).length;
        if (criticalCount > 2) {
            this.log(`ALERT: ${criticalCount} critical events in batch — escalation recommended`);
        }
    }
    getInspectorForEvent(event) {
        const map = {
            [types_1.EventType.EquipmentFailure]: 'Maintenance Engineer',
            [types_1.EventType.StructuralAlert]: 'Structural Engineer',
            [types_1.EventType.SafetyViolation]: 'Safety Officer',
            [types_1.EventType.EnvironmentalAlert]: 'Environmental Officer',
            [types_1.EventType.EnergySpike]: 'Electrical Engineer',
            [types_1.EventType.AnomalyDetected]: 'Site Engineer'
        };
        return map[event.type] || 'Site Supervisor';
    }
    log(message) {
        console.log(`[RealTimeEventIntelligence] ${message}`);
    }
}
exports.RealTimeEventIntelligence = RealTimeEventIntelligence;
//# sourceMappingURL=event-processor.js.map