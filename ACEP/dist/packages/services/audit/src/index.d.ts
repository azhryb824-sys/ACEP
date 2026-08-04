type AuditAction = 'CREATE' | 'UPDATE' | 'DELETE' | 'READ' | 'LOGIN' | 'LOGOUT' | 'EXECUTE' | 'APPROVE' | 'REJECT' | 'EXPORT' | 'IMPORT' | 'CONFIGURE';
type AuditResource = 'PROJECT' | 'USER' | 'BOQ' | 'COST' | 'SCHEDULE' | 'RISK' | 'WORKFLOW' | 'PLUGIN' | 'AGENT' | 'KNOWLEDGE' | 'SETTINGS';
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
declare class AuditService {
    private entries;
    private previousHash;
    private maxEntries;
    log(request: CreateAuditEntryRequest): AuditEntry;
    query(query: AuditQuery): PaginatedAuditEntries;
    getById(id: string): AuditEntry | null;
    verifyChain(): {
        valid: boolean;
        brokenAtIndex?: number;
        error?: string;
    };
    getStats(): {
        totalEntries: number;
        actions: Record<string, number>;
        resources: Record<string, number>;
    };
    private computeHash;
}
declare class AuditApp {
    private service;
    constructor();
    handleRequest(action: string, payload: unknown): Promise<unknown>;
}
export { AuditService, AuditApp, AuditEntry, AuditAction, AuditResource, CreateAuditEntryRequest, AuditQuery, PaginatedAuditEntries };
//# sourceMappingURL=index.d.ts.map