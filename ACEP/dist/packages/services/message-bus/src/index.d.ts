declare enum EventType {
    ProjectCreated = "ProjectCreated",
    ProjectUpdated = "ProjectUpdated",
    BOQGenerated = "BOQGenerated",
    QuantityUpdated = "QuantityUpdated",
    CostChanged = "CostChanged",
    ScheduleChanged = "ScheduleChanged",
    RiskDetected = "RiskDetected",
    ReviewFinished = "ReviewFinished",
    SimulationCompleted = "SimulationCompleted"
}
interface EventMessage {
    id: string;
    type: EventType;
    source: string;
    projectId?: string;
    payload: Record<string, unknown>;
    timestamp: string;
    correlationId?: string;
}
interface EventHandler {
    id: string;
    type: EventType;
    callback: (event: EventMessage) => Promise<void> | void;
    filter?: (event: EventMessage) => boolean;
}
interface EventHistoryEntry {
    event: EventMessage;
    handlerCalls: {
        handlerId: string;
        success: boolean;
        error?: string;
        timestamp: string;
    }[];
    completedAt: string;
}
interface IMessageBus {
    publish(topic: string, message: unknown): Promise<void>;
    subscribe(topic: string, handler: (message: unknown) => void): Promise<void>;
    unsubscribe(topic: string, handler: (message: unknown) => void): Promise<void>;
}
declare class InMemoryMessageBus implements IMessageBus {
    private handlers;
    private history;
    private maxHistorySize;
    publish(topic: string, message: unknown): Promise<void>;
    subscribe(topic: string, handler: (message: unknown) => void): Promise<void>;
    unsubscribe(topic: string, handler: (message: unknown) => void): Promise<void>;
    getTopics(): string[];
    getSubscriberCount(topic: string): number;
    getHistory(filter?: {
        type?: EventType;
        source?: string;
        since?: string;
    }): EventHistoryEntry[];
    clearHistory(): void;
    protected addToHistory(entry: EventHistoryEntry): void;
}
declare class MessageBusService extends InMemoryMessageBus {
    private eventHandlers;
    private eventHistory;
    publishEvent(type: EventType, payload: Record<string, unknown>, source: string, projectId?: string, correlationId?: string): Promise<EventMessage>;
    subscribeToEvent(type: EventType, handler: EventHandler['callback'], filter?: EventHandler['filter']): string;
    unsubscribeFromEvent(handlerId: string): boolean;
    getEventHistory(filter?: {
        type?: EventType;
        source?: string;
        projectId?: string;
        since?: string;
    }): EventHistoryEntry[];
    getStats(): {
        totalEvents: number;
        handlersByType: Record<string, number>;
    };
}
export { MessageBusService, InMemoryMessageBus, IMessageBus, EventType, EventMessage, EventHandler, EventHistoryEntry };
//# sourceMappingURL=index.d.ts.map