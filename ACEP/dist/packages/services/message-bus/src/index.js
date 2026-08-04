"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.EventType = exports.InMemoryMessageBus = exports.MessageBusService = void 0;
const uuid_1 = require("uuid");
var EventType;
(function (EventType) {
    EventType["ProjectCreated"] = "ProjectCreated";
    EventType["ProjectUpdated"] = "ProjectUpdated";
    EventType["BOQGenerated"] = "BOQGenerated";
    EventType["QuantityUpdated"] = "QuantityUpdated";
    EventType["CostChanged"] = "CostChanged";
    EventType["ScheduleChanged"] = "ScheduleChanged";
    EventType["RiskDetected"] = "RiskDetected";
    EventType["ReviewFinished"] = "ReviewFinished";
    EventType["SimulationCompleted"] = "SimulationCompleted";
})(EventType || (exports.EventType = EventType = {}));
class InMemoryMessageBus {
    handlers = new Map();
    history = [];
    maxHistorySize = 10000;
    async publish(topic, message) {
        const topicHandlers = this.handlers.get(topic);
        if (topicHandlers) {
            for (const handler of topicHandlers) {
                try {
                    await handler(message);
                }
                catch (err) {
                    console.error(`[MessageBus] Handler error for topic ${topic}:`, err);
                }
            }
        }
    }
    async subscribe(topic, handler) {
        if (!this.handlers.has(topic)) {
            this.handlers.set(topic, new Set());
        }
        this.handlers.get(topic).add(handler);
    }
    async unsubscribe(topic, handler) {
        const topicHandlers = this.handlers.get(topic);
        if (topicHandlers) {
            topicHandlers.delete(handler);
            if (topicHandlers.size === 0) {
                this.handlers.delete(topic);
            }
        }
    }
    getTopics() {
        return Array.from(this.handlers.keys());
    }
    getSubscriberCount(topic) {
        return this.handlers.get(topic)?.size || 0;
    }
    getHistory(filter) {
        let results = [...this.history];
        if (filter?.type)
            results = results.filter(e => e.event.type === filter.type);
        if (filter?.source)
            results = results.filter(e => e.event.source === filter.source);
        if (filter?.since)
            results = results.filter(e => new Date(e.event.timestamp) >= new Date(filter.since));
        return results.reverse();
    }
    clearHistory() {
        this.history = [];
    }
    addToHistory(entry) {
        this.history.push(entry);
        if (this.history.length > this.maxHistorySize) {
            this.history = this.history.slice(-this.maxHistorySize);
        }
    }
}
exports.InMemoryMessageBus = InMemoryMessageBus;
class MessageBusService extends InMemoryMessageBus {
    eventHandlers = new Map();
    eventHistory = [];
    async publishEvent(type, payload, source, projectId, correlationId) {
        const event = {
            id: (0, uuid_1.v4)(),
            type,
            source,
            projectId,
            payload,
            timestamp: new Date().toISOString(),
            correlationId: correlationId || (0, uuid_1.v4)(),
        };
        console.log(`[MessageBus] Publishing event: ${type} (${event.id})`);
        const handlers = this.eventHandlers.get(type) || new Set();
        const handlerCalls = [];
        for (const handler of handlers) {
            if (handler.filter && !handler.filter(event))
                continue;
            try {
                await handler.callback(event);
                handlerCalls.push({
                    handlerId: handler.id,
                    success: true,
                    timestamp: new Date().toISOString(),
                });
            }
            catch (err) {
                const errorMsg = err.message;
                console.error(`[MessageBus] Handler ${handler.id} failed for event ${type}: ${errorMsg}`);
                handlerCalls.push({
                    handlerId: handler.id,
                    success: false,
                    error: errorMsg,
                    timestamp: new Date().toISOString(),
                });
            }
        }
        const entry = {
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
    subscribeToEvent(type, handler, filter) {
        const handlerId = (0, uuid_1.v4)();
        const eventHandler = { id: handlerId, type, callback: handler, filter };
        if (!this.eventHandlers.has(type)) {
            this.eventHandlers.set(type, new Set());
        }
        this.eventHandlers.get(type).add(eventHandler);
        super.subscribe(type, handler);
        return handlerId;
    }
    unsubscribeFromEvent(handlerId) {
        for (const [type, handlers] of this.eventHandlers.entries()) {
            for (const handler of handlers) {
                if (handler.id === handlerId) {
                    handlers.delete(handler);
                    if (handlers.size === 0) {
                        this.eventHandlers.delete(type);
                    }
                    super.unsubscribe(type, handler.callback);
                    return true;
                }
            }
        }
        return false;
    }
    getEventHistory(filter) {
        let results = [...this.eventHistory];
        if (filter?.type)
            results = results.filter(e => e.event.type === filter.type);
        if (filter?.source)
            results = results.filter(e => e.event.source === filter.source);
        if (filter?.projectId)
            results = results.filter(e => e.event.projectId === filter.projectId);
        if (filter?.since)
            results = results.filter(e => new Date(e.event.timestamp) >= new Date(filter.since));
        return results.reverse();
    }
    getStats() {
        const handlersByType = {};
        for (const [type, handlers] of this.eventHandlers.entries()) {
            handlersByType[type] = handlers.size;
        }
        return {
            totalEvents: this.eventHistory.length,
            handlersByType,
        };
    }
}
exports.MessageBusService = MessageBusService;
function main() {
    const bus = new MessageBusService();
    console.log('[Message Bus] Initialized');
    console.log(`[Message Bus] Supported event types: ${Object.values(EventType).join(', ')}`);
}
if (require.main === module) {
    main();
}
//# sourceMappingURL=index.js.map