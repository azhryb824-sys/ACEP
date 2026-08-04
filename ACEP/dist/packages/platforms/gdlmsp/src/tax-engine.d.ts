import { TaxRule } from './types';
export declare class TaxEngine {
    private rules;
    private auditLog;
    addRule(rule: TaxRule): Promise<void>;
    updateRule(id: string, updates: Partial<TaxRule>): Promise<void>;
    removeRule(id: string): Promise<void>;
    calculate(amount: number, countryId?: string, entityId?: string): Promise<{
        total: number;
        taxAmount: number;
        breakdown: TaxRule[];
    }>;
    getRules(countryId?: string): Promise<TaxRule[]>;
    generateEInvoice(data: unknown): Promise<unknown>;
    getAuditLog(): {
        action: string;
        ruleId: string;
        user: string;
        timestamp: string;
        reason?: string;
    }[];
}
//# sourceMappingURL=tax-engine.d.ts.map