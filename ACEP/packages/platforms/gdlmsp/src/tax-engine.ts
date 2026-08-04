import { TaxRule, TaxType } from './types';

export class TaxEngine {
  private rules = new Map<string, TaxRule>();
  private auditLog: Array<{ action: string; ruleId: string; user: string; timestamp: string; reason?: string }> = [];

  async addRule(rule: TaxRule): Promise<void> {
    this.rules.set(rule.id, rule);
    this.auditLog.push({ action: 'create', ruleId: rule.id, user: rule.createdBy, timestamp: new Date().toISOString() });
  }

  async updateRule(id: string, updates: Partial<TaxRule>): Promise<void> {
    const existing = this.rules.get(id);
    if (!existing) throw new Error(`Tax rule ${id} not found`);
    Object.assign(existing, updates, { lastModifiedAt: new Date().toISOString() });
    this.rules.set(id, existing);
    this.auditLog.push({ action: 'update', ruleId: id, user: updates.lastModifiedBy || 'system', timestamp: new Date().toISOString(), reason: updates.modificationReason });
  }

  async removeRule(id: string): Promise<void> {
    this.rules.delete(id);
    this.auditLog.push({ action: 'delete', ruleId: id, user: 'system', timestamp: new Date().toISOString() });
  }

  async calculate(amount: number, countryId?: string, entityId?: string): Promise<{ total: number; taxAmount: number; breakdown: TaxRule[] }> {
    const now = new Date().toISOString();
    const applicableRules = Array.from(this.rules.values())
      .filter(r => r.active && (!r.startDate || r.startDate <= now) && (!r.endDate || r.endDate >= now))
      .filter(r => !countryId || !r.region || r.region === countryId)
      .filter(r => !entityId || !r.exemptEntities.includes(entityId))
      .sort((a, b) => a.priority - b.priority);

    let taxAmount = 0;
    const breakdown: TaxRule[] = [];
    for (const rule of applicableRules) {
      const base = rule.type === TaxType.Percentage ? amount * (rule.rate / 100) : rule.rate;
      taxAmount += base;
      breakdown.push(rule);
    }
    return { total: amount + taxAmount, taxAmount, breakdown };
  }

  async getRules(countryId?: string): Promise<TaxRule[]> {
    return Array.from(this.rules.values()).filter(r => !countryId || !r.region || r.region === countryId);
  }

  async generateEInvoice(data: unknown): Promise<unknown> {
    return { invoiceId: `INV-${Date.now()}`, issuedAt: new Date().toISOString(), data, status: 'generated' };
  }

  getAuditLog() { return this.auditLog; }
}
