import { v4 as uuidv4 } from 'uuid';

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

class NotificationService {
  private notifications: Map<string, Notification> = new Map();

  create(request: CreateNotificationRequest): Notification {
    if (!request.userId || !request.title || !request.message) {
      throw new Error('userId, title, and message are required');
    }

    if (!['info', 'warning', 'error', 'success'].includes(request.type)) {
      throw new Error(`Invalid notification type: ${request.type}`);
    }

    const notification: Notification = {
      id: uuidv4(),
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

  markAsRead(notificationId: string, userId: string): boolean {
    const notification = this.notifications.get(notificationId);
    if (!notification || notification.userId !== userId) return false;
    notification.read = true;
    notification.readAt = new Date().toISOString();
    return true;
  }

  markAllAsRead(userId: string): number {
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

  list(userId: string, page = 1, pageSize = 20, filter?: { type?: NotificationType; read?: boolean; projectId?: string }): PaginatedNotifications {
    let items = Array.from(this.notifications.values()).filter(n => n.userId === userId);

    if (filter?.type) items = items.filter(n => n.type === filter.type);
    if (filter?.read !== undefined) items = items.filter(n => n.read === filter.read);
    if (filter?.projectId) items = items.filter(n => n.projectId === filter.projectId);

    items.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    const unreadCount = items.filter(n => !n.read).length;
    const total = items.length;
    const totalPages = Math.ceil(total / pageSize);
    const start = (page - 1) * pageSize;
    const paged = items.slice(start, start + pageSize);

    return { items: paged, total, unreadCount, page, pageSize, totalPages };
  }

  delete(notificationId: string, userId: string): boolean {
    const notification = this.notifications.get(notificationId);
    if (!notification || notification.userId !== userId) return false;
    return this.notifications.delete(notificationId);
  }

  getUnreadCount(userId: string): number {
    let count = 0;
    for (const notification of this.notifications.values()) {
      if (notification.userId === userId && !notification.read) count++;
    }
    return count;
  }

  deleteAllForUser(userId: string): number {
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

class NotificationApp {
  private service: NotificationService;

  constructor() {
    this.service = new NotificationService();
  }

  async handleRequest(action: string, payload: unknown): Promise<unknown> {
    switch (action) {
      case 'create':
        return this.service.create(payload as CreateNotificationRequest);
      case 'markAsRead':
        return this.service.markAsRead(
          (payload as Record<string, unknown>).notificationId as string,
          (payload as Record<string, unknown>).userId as string
        );
      case 'markAllAsRead':
        return this.service.markAllAsRead(payload as string);
      case 'list':
        return this.service.list(
          (payload as Record<string, unknown>).userId as string,
          (payload as Record<string, unknown>).page as number || 1,
          (payload as Record<string, unknown>).pageSize as number || 20,
          (payload as Record<string, unknown>).filter as any
        );
      case 'delete':
        return this.service.delete(
          (payload as Record<string, unknown>).notificationId as string,
          (payload as Record<string, unknown>).userId as string
        );
      case 'unreadCount':
        return this.service.getUnreadCount(payload as string);
      case 'deleteAll':
        return this.service.deleteAllForUser(payload as string);
      default:
        throw new Error(`Unknown action: ${action}`);
    }
  }
}

function main(): void {
  const app = new NotificationApp();
  console.log('[Notification Service] Initialized');
  console.log('[Notification Service] Types: info, warning, error, success');
}

if (require.main === module) {
  main();
}

export { NotificationService, NotificationApp, Notification, NotificationType, CreateNotificationRequest, PaginatedNotifications };
