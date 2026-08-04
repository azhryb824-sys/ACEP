import { v4 as uuidv4 } from 'uuid';
import { createHash } from 'crypto';

type AuditAction =
  | 'CREATE'
  | 'UPDATE'
  | 'DELETE'
  | 'READ'
  | 'LOGIN'
  | 'LOGOUT'
  | 'EXECUTE'
  | 'APPROVE'
  | 'REJECT'
  | 'EXPORT'
  | 'IMPORT'
  | 'CONFIGURE';

type AuditResource =
  | 'PROJECT'
  | 'USER'
  | 'BOQ'
  | 'COST'
  | 'SCHEDULE'
  | 'RISK'
  | 'WORKFLOW'
  | 'PLUGIN'
  | 'AGENT'
  | 'KNOWLEDGE'
  | 'SETTINGS';

interface AuditEntry {
  id: string;
  userId: string;
  userName: string;
  action: AuditAction;
  resource: AuditResource;
  resourceId?: string;
  details: Record<string, unknown>;
  previousHash: string;
  hash: string;
  timestamp: string;
  ipAddress?: string;
  userAgent?: string;
}

interface CreateAuditEntryRequest {
  userId: string;
  userName: string;
  action: AuditAction;
  resource: AuditResource;
  resourceId?: string;
  details?: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
}

interface AuditQuery {
  userId?: string;
  action?: AuditAction;
  resource?: AuditResource;
  resourceId?: string;
  startDate?: string;
  endDate?: string;
  page?: number;
  pageSize?: number;
}

interface PaginatedAuditEntries {
  items: AuditEntry[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

class AuditService {
  private entries: AuditEntry[] = [];
  private previousHash = '0'.repeat(64);
  private maxEntries = 100000;

  log(request: CreateAuditEntryRequest): AuditEntry {
    if (!request.userId || !request.action || !request.resource) {
      throw new Error('userId, action, and resource are required');
    }

    const entry: AuditEntry = {
      id: uuidv4(),
      userId: request.userId,
      userName: request.userName,
      action: request.action,
      resource: request.resource,
      resourceId: request.resourceId,
      details: request.details || {},
      previousHash: this.previousHash,
      hash: '',
      timestamp: new Date().toISOString(),
      ipAddress: request.ipAddress,
      userAgent: request.userAgent,
    };

    entry.hash = this.computeHash(entry);
    this.previousHash = entry.hash;

    this.entries.push(entry);
    if (this.entries.length > this.maxEntries) {
      this.entries = this.entries.slice(-this.maxEntries);
    }

    return entry;
  }

  query(query: AuditQuery): PaginatedAuditEntries {
    let results = [...this.entries];

    if (query.userId) results = results.filter(e => e.userId === query.userId);
    if (query.action) results = results.filter(e => e.action === query.action);
    if (query.resource) results = results.filter(e => e.resource === query.resource);
    if (query.resourceId) results = results.filter(e => e.resourceId === query.resourceId);
    if (query.startDate) results = results.filter(e => new Date(e.timestamp) >= new Date(query.startDate!));
    if (query.endDate) results = results.filter(e => new Date(e.timestamp) <= new Date(query.endDate!));

    results.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    const page = query.page || 1;
    const pageSize = query.pageSize || 50;
    const total = results.length;
    const totalPages = Math.ceil(total / pageSize);
    const start = (page - 1) * pageSize;
    const paged = results.slice(start, start + pageSize);

    return { items: paged, total, page, pageSize, totalPages };
  }

  getById(id: string): AuditEntry | null {
    return this.entries.find(e => e.id === id) || null;
  }

  verifyChain(): { valid: boolean; brokenAtIndex?: number; error?: string } {
    let previousHash = '0'.repeat(64);

    for (let i = 0; i < this.entries.length; i++) {
      const entry = this.entries[i];

      if (entry.previousHash !== previousHash) {
        return {
          valid: false,
          brokenAtIndex: i,
          error: `Hash chain broken at index ${i}: expected previousHash ${previousHash}, got ${entry.previousHash}`,
        };
      }

      const computedHash = this.computeHash({ ...entry, hash: '' });
      if (computedHash !== entry.hash) {
        return {
          valid: false,
          brokenAtIndex: i,
          error: `Entry ${i} hash mismatch: computed ${computedHash}, stored ${entry.hash}`,
        };
      }

      previousHash = entry.hash;
    }

    return { valid: true };
  }

  getStats(): { totalEntries: number; actions: Record<string, number>; resources: Record<string, number> } {
    const actions: Record<string, number> = {};
    const resources: Record<string, number> = {};

    for (const entry of this.entries) {
      actions[entry.action] = (actions[entry.action] || 0) + 1;
      resources[entry.resource] = (resources[entry.resource] || 0) + 1;
    }

    return { totalEntries: this.entries.length, actions, resources };
  }

  private computeHash(entry: Omit<AuditEntry, 'hash'>): string {
    const data = `${entry.id}:${entry.userId}:${entry.action}:${entry.resource}:${entry.resourceId || ''}:${JSON.stringify(entry.details)}:${entry.previousHash}:${entry.timestamp}`;
    return createHash('sha256').update(data).digest('hex');
  }
}

class AuditApp {
  private service: AuditService;

  constructor() {
    this.service = new AuditService();
  }

  async handleRequest(action: string, payload: unknown): Promise<unknown> {
    switch (action) {
      case 'log':
        return this.service.log(payload as CreateAuditEntryRequest);
      case 'query':
        return this.service.query(payload as AuditQuery);
      case 'getById':
        return this.service.getById(payload as string);
      case 'verifyChain':
        return this.service.verifyChain();
      case 'stats':
        return this.service.getStats();
      default:
        throw new Error(`Unknown action: ${action}`);
    }
  }
}

function main(): void {
  const app = new AuditApp();
  console.log('[Audit Service] Initialized');
  console.log('[Audit Service] Immutable audit chain with SHA-256 integrity verification');
}

if (require.main === module) {
  main();
}

export { AuditService, AuditApp, AuditEntry, AuditAction, AuditResource, CreateAuditEntryRequest, AuditQuery, PaginatedAuditEntries };
