type NotificationType = 'info' | 'warning' | 'error' | 'success';
interface Notification {
    id: string;
    userId: string;
    type: NotificationType;
    title: string;
    message: string;
    projectId?: string;
    read: boolean;
    readAt?: string;
    createdAt: string;
    metadata?: Record<string, unknown>;
}
interface CreateNotificationRequest {
    userId: string;
    type: NotificationType;
    title: string;
    message: string;
    projectId?: string;
    metadata?: Record<string, unknown>;
}
interface PaginatedNotifications {
    items: Notification[];
    total: number;
    unreadCount: number;
    page: number;
    pageSize: number;
    totalPages: number;
}
declare class NotificationService {
    private notifications;
    create(request: CreateNotificationRequest): Notification;
    markAsRead(notificationId: string, userId: string): boolean;
    markAllAsRead(userId: string): number;
    list(userId: string, page?: number, pageSize?: number, filter?: {
        type?: NotificationType;
        read?: boolean;
        projectId?: string;
    }): PaginatedNotifications;
    delete(notificationId: string, userId: string): boolean;
    getUnreadCount(userId: string): number;
    deleteAllForUser(userId: string): number;
}
declare class NotificationApp {
    private service;
    constructor();
    handleRequest(action: string, payload: unknown): Promise<unknown>;
}
export { NotificationService, NotificationApp, Notification, NotificationType, CreateNotificationRequest, PaginatedNotifications };
//# sourceMappingURL=index.d.ts.map