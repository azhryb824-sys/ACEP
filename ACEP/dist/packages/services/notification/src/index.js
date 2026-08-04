"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.NotificationApp = exports.NotificationService = void 0;
const uuid_1 = require("uuid");
class NotificationService {
    notifications = new Map();
    create(request) {
        if (!request.userId || !request.title || !request.message) {
            throw new Error('userId, title, and message are required');
        }
        if (!['info', 'warning', 'error', 'success'].includes(request.type)) {
            throw new Error(`Invalid notification type: ${request.type}`);
        }
        const notification = {
            id: (0, uuid_1.v4)(),
            userId: request.userId,
            type: request.type,
            title: request.title,
            message: request.message,
            projectId: request.projectId,
            read: false,
            createdAt: new Date().toISOString(),
            metadata: request.metadata,
        };
        this.notifications.set(notification.id, notification);
        return notification;
    }
    markAsRead(notificationId, userId) {
        const notification = this.notifications.get(notificationId);
        if (!notification || notification.userId !== userId)
            return false;
        notification.read = true;
        notification.readAt = new Date().toISOString();
        return true;
    }
    markAllAsRead(userId) {
        let count = 0;
        for (const notification of this.notifications.values()) {
            if (notification.userId === userId && !notification.read) {
                notification.read = true;
                notification.readAt = new Date().toISOString();
                count++;
            }
        }
        return count;
    }
    list(userId, page = 1, pageSize = 20, filter) {
        let items = Array.from(this.notifications.values()).filter(n => n.userId === userId);
        if (filter?.type)
            items = items.filter(n => n.type === filter.type);
        if (filter?.read !== undefined)
            items = items.filter(n => n.read === filter.read);
        if (filter?.projectId)
            items = items.filter(n => n.projectId === filter.projectId);
        items.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        const unreadCount = items.filter(n => !n.read).length;
        const total = items.length;
        const totalPages = Math.ceil(total / pageSize);
        const start = (page - 1) * pageSize;
        const paged = items.slice(start, start + pageSize);
        return { items: paged, total, unreadCount, page, pageSize, totalPages };
    }
    delete(notificationId, userId) {
        const notification = this.notifications.get(notificationId);
        if (!notification || notification.userId !== userId)
            return false;
        return this.notifications.delete(notificationId);
    }
    getUnreadCount(userId) {
        let count = 0;
        for (const notification of this.notifications.values()) {
            if (notification.userId === userId && !notification.read)
                count++;
        }
        return count;
    }
    deleteAllForUser(userId) {
        let count = 0;
        for (const [id, notification] of this.notifications.entries()) {
            if (notification.userId === userId) {
                this.notifications.delete(id);
                count++;
            }
        }
        return count;
    }
}
exports.NotificationService = NotificationService;
class NotificationApp {
    service;
    constructor() {
        this.service = new NotificationService();
    }
    async handleRequest(action, payload) {
        switch (action) {
            case 'create':
                return this.service.create(payload);
            case 'markAsRead':
                return this.service.markAsRead(payload.notificationId, payload.userId);
            case 'markAllAsRead':
                return this.service.markAllAsRead(payload);
            case 'list':
                return this.service.list(payload.userId, payload.page || 1, payload.pageSize || 20, payload.filter);
            case 'delete':
                return this.service.delete(payload.notificationId, payload.userId);
            case 'unreadCount':
                return this.service.getUnreadCount(payload);
            case 'deleteAll':
                return this.service.deleteAllForUser(payload);
            default:
                throw new Error(`Unknown action: ${action}`);
        }
    }
}
exports.NotificationApp = NotificationApp;
function main() {
    const app = new NotificationApp();
    console.log('[Notification Service] Initialized');
    console.log('[Notification Service] Types: info, warning, error, success');
}
if (require.main === module) {
    main();
}
//# sourceMappingURL=index.js.map