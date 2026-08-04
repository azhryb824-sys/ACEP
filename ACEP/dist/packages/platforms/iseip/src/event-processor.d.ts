import { KnowledgeGraph } from '@acep/knowledge-base';
import { IEventProcessor, EventClassification, NotificationDispatch, InspectionOrder } from './interfaces';
import { CriticalEvent, SensorReading, SensorConfig, AlertSeverity, AffectedParty } from './types';
export declare class RealTimeEventIntelligence implements IEventProcessor {
    private activeEvents;
    private eventHistory;
    private knowledgeGraph;
    constructor(kg: KnowledgeGraph);
    processEvents(readings: SensorReading[], sensors: SensorConfig[]): Promise<CriticalEvent[]>;
    detectEvents(readings: SensorReading[], sensors: SensorConfig[]): Promise<CriticalEvent[]>;
    classifyEvent(event: CriticalEvent): Promise<EventClassification>;
    assessSeverity(event: CriticalEvent): Promise<AlertSeverity>;
    determineAffectedParties(event: CriticalEvent): Promise<AffectedParty[]>;
    dispatchNotifications(event: CriticalEvent, parties: AffectedParty[]): Promise<NotificationDispatch[]>;
    triggerAgents(event: CriticalEvent): Promise<string[]>;
    updateDigitalTwin(event: CriticalEvent): Promise<void>;
    createAuditLog(event: CriticalEvent): Promise<void>;
    createInspectionOrder(event: CriticalEvent): Promise<InspectionOrder | null>;
    acknowledgeEvent(eventId: string, userId: string): Promise<void>;
    resolveEvent(eventId: string, resolution: string): Promise<void>;
    getActiveEvents(): CriticalEvent[];
    getEventHistory(limit?: number): CriticalEvent[];
    private buildEvent;
    private logEventAction;
    private enrichKnowledgeGraph;
    private getInspectorForEvent;
    private log;
}
//# sourceMappingURL=event-processor.d.ts.map