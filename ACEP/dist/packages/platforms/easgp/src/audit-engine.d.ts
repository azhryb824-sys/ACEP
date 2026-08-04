import { AuditLog, AuditEventType, Identity } from './types';
import { IAuditEngine } from './interfaces';
export declare class AuditEngine implements IAuditEngine {
    private logs;
    private chain;
    private lastHash;
    private logOrder;
    log(event: Omit<AuditLog, 'id' | 'timestamp' | 'tamperHash' | 'previousHash' | 'signature' | 'nonEditable'>, actor: Identity): Promise<AuditLog>;
    getLog(logId: string): Promise<AuditLog>;
    queryLogs(filters: {
        eventType?: AuditEventType;
        actorId?: string;
        resource?: string;
        startDate?: Date;
        endDate?: Date;
    }): Promise<AuditLog[]>;
    verifyIntegrity(logId: string): Promise<boolean>;
    verifyChain(): Promise<boolean>;
    generateReport(startDate: Date, endDate: Date): Promise<string>;
    exportLogs(format: 'json' | 'csv'): Promise<string>;
    getLogCount(): number;
}
//# sourceMappingURL=audit-engine.d.ts.map