import { v4 as uuidv4 } from 'uuid';

enum EventType {
  ProjectCreated = 'ProjectCreated',
  ProjectUpdated = 'ProjectUpdated',
  BOQGenerated = 'BOQGenerated',
  QuantityUpdated = 'QuantityUpdated',
  CostChanged = 'CostChanged',
  ScheduleChanged = 'ScheduleChanged',
  RiskDetected = 'RiskDetected',
  ReviewFinished = 'ReviewFinished',
  SimulationCompleted = 'SimulationCompleted',
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
  handlerCalls: { handlerId: string; success: boolean; error?: string; timestamp: string }[];
  completedAt: string;
}

interface IMessageBus {
  publish(topic: string, message: unknown): Promise<void>;
  subscribe(topic: string, handler: (message: unknown) => void): Promise<void>;
  unsubscribe(topic: string, handler: (message: unknown) => void): Promise<void>;
}

class InMemoryMessageBus implements IMessageBus {
  private handlers: Map<string, Set<(message: unknown) => void>> = new Map();
  private history: EventHistoryEntry[] = [];
  private maxHistorySize = 10000;

  async publish(topic: string, message: unknown): Promise<void> {
    const topicHandlers = this.handlers.get(topic);
    if (topicHandlers) {
      for (const handler of topicHandlers) {
        try {
          await handler(message);
        } catch (err) {
          console.error(`[MessageBus] Handler error for topic ${topic}:`, err);
        }
      }
    }
  }

  async subscribe(topic: string, handler: (message: unknown) => void): Promise<void> {
    if (!this.handlers.has(topic)) {
      this.handlers.set(topic, new Set());
    }
    this.handlers.get(topic)!.add(handler);
  }

  async unsubscribe(topic: string, handler: (message: unknown) => void): Promise<void> {
    const topicHandlers = this.handlers.get(topic);
    if (topicHandlers) {
      topicHandlers.delete(handler);
      if (topicHandlers.size === 0) {
        this.handlers.delete(topic);
      }
    }
  }

  getTopics(): string[] {
    return Array.from(this.handlers.keys());
  }

  getSubscriberCount(topic: string): number {
    return this.handlers.get(topic)?.size || 0;
  }

  getHistory(filter?: { type?: EventType; source?: string; since?: string }): EventHistoryEntry[] {
    let results = [...this.history];
    if (filter?.type) results = results.filter(e => e.event.type === filter.type);
    if (filter?.source) results = results.filter(e => e.event.source === filter.source);
    if (filter?.since) results = results.filter(e => new Date(e.event.timestamp) >= new Date(filter.since!));
    return results.reverse();
  }

  clearHistory(): void {
    this.history = [];
  }

  protected addToHistory(entry: EventHistoryEntry): void {
    this.history.push(entry);
    if (this.history.length > this.maxHistorySize) {
      this.history = this.history.slice(-this.maxHistorySize);
    }
  }
}

class MessageBusService extends InMemoryMessageBus {
  private eventHandlers: Map<EventType, Set<EventHandler>> = new Map();
  private eventHistory: EventHistoryEntry[] = [];

  async publishEvent(type: EventType, payload: Record<string, unknown>, source: string, projectId?: string, correlationId?: string): Promise<EventMessage> {
    const event: EventMessage = {
      id: uuidv4(),
      type,
      source,
      projectId,
      payload,
      timestamp: new Date().toISOString(),
      correlationId: correlationId || uuidv4(),
    };

    console.log(`[MessageBus] Publishing event: ${type} (${event.id})`);

    const handlers = this.eventHandlers.get(type) || new Set();
    const handlerCalls: EventHistoryEntry['handlerCalls'] = [];

    for (const handler of handlers) {
      if (handler.filter && !handler.filter(event)) continue;

      try {
        await handler.callback(event);
        handlerCalls.push({
          handlerId: handler.id,
          success: true,
          timestamp: new Date().toISOString(),
        });
      } catch (err) {
        const errorMsg = (err as Error).message;
        console.error(`[MessageBus] Handler ${handler.id} failed for event ${type}: ${errorMsg}`);
        handlerCalls.push({
          handlerId: handler.id,
          success: false,
          error: errorMsg,
          timestamp: new Date().toISOString(),
        });
      }
    }

    const entry: EventHistoryEntry = {
      event,
      handlerCalls,
      completedAt: new Date().toISOString(),
    };

    this.eventHistory.push(entry);
    if (this.eventHistory.length > 10000) {
      this.eventHistory = this.eventHistory.slice(-10000);
    }

    await super.publish(type, event);

    return event;
  }

  subscribeToEvent(type: EventType, handler: EventHandler['callback'], filter?: EventHandler['filter']): string {
    const handlerId = uuidv4();
    const eventHandler: EventHandler = { id: handlerId, type, callback: handler, filter };

    if (!this.eventHandlers.has(type)) {
      this.eventHandlers.set(type, new Set());
    }
    this.eventHandlers.get(type)!.add(eventHandler);
    super.subscribe(type, handler as unknown as (message: unknown) => void);

    return handlerId;
  }

  unsubscribeFromEvent(handlerId: string): boolean {
    for (const [type, handlers] of this.eventHandlers.entries()) {
      for (const handler of handlers) {
        if (handler.id === handlerId) {
          handlers.delete(handler);
          if (handlers.size === 0) {
            this.eventHandlers.delete(type);
          }
          super.unsubscribe(type, handler.callback as unknown as (message: unknown) => void);
          return true;
        }
      }
    }
    return false;
  }

  getEventHistory(filter?: { type?: EventType; source?: string; projectId?: string; since?: string }): EventHistoryEntry[] {
    let results = [...this.eventHistory];
    if (filter?.type) results = results.filter(e => e.event.type === filter.type);
    if (filter?.source) results = results.filter(e => e.event.source === filter.source);
    if (filter?.projectId) results = results.filter(e => e.event.projectId === filter.projectId);
    if (filter?.since) results = results.filter(e => new Date(e.event.timestamp) >= new Date(filter.since));
    return results.reverse();
  }

  getStats(): { totalEvents: number; handlersByType: Record<string, number> } {
    const handlersByType: Record<string, number> = {};
    for (const [type, handlers] of this.eventHandlers.entries()) {
      handlersByType[type] = handlers.size;
    }
    return {
      totalEvents: this.eventHistory.length,
      handlersByType,
    };
  }
}

function main(): void {
  const bus = new MessageBusService();
  console.log('[Message Bus] Initialized');
  console.log(`[Message Bus] Supported event types: ${Object.values(EventType).join(', ')}`);
}

if (require.main === module) {
  main();
}

export { MessageBusService, InMemoryMessageBus, IMessageBus, EventType, EventMessage, EventHandler, EventHistoryEntry };
