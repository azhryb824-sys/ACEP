const fs = require('fs');
const path = require('path');

class KBAdapter {
  constructor(uetsCore) {
    this.core = uetsCore;
    this.KB_PATH = path.join(__dirname, '..', '..', '..', 'data', 'kb-projects.json');
  }

  _flatten(record) {
    const physical = record.physical || {};
    const cost = record.cost || {};
    const schedule = record.schedule || {};
    const boq = record.boq || {};
    return {
      id: record.id || record.projectId || `kb-${Date.now()}`,
      projectType: record.projectType || record.type || 'Building',
      descriptionAr: record.descriptionAr || record.name || record.description || '',
      description: record.description || record.name || '',
      totalArea: parseFloat(physical.area || record.area || record.totalArea || 0),
      floors: parseInt(physical.floors || record.floors || 1),
      city: physical.city || record.city || '',
      region: physical.region || record.region || '',
      totalCost: parseFloat(cost.totalCost || cost.total || record.cost || 0),
      confidence: record.confidence || 0.7,
      boqItems: Array.isArray(boq.items) ? boq.items : [],
      scheduleMonths: parseFloat(schedule.totalDurationMonths || schedule.totalDuration ? (schedule.totalDuration / 30) : 0),
    };
  }

  migrateKB() {
    try {
      if (!fs.existsSync(this.KB_PATH)) return { migrated: 0, error: 'File not found' };
      const raw = fs.readFileSync(this.KB_PATH, 'utf8');
      const data = JSON.parse(raw);
      if (!Array.isArray(data)) return { migrated: 0, error: 'Expected array' };

      let count = 0;
      for (const record of data) {
        const flat = this._flatten(record);
        const egt = this.core.factory.fromKBProject(flat);
        if (Array.isArray(flat.boqItems)) {
          egt.boq = flat.boqItems.map(item => ({
            code: item.code || '',
            description: item.description || '',
            category: item.category || '',
            unit: item.unit || 'm³',
            quantity: parseFloat(item.quantity || 0),
            unitPrice: parseFloat(item.unitPrice || 0),
            totalPrice: parseFloat(item.totalPrice || (item.quantity || 0) * (item.unitPrice || 0)),
            confidence: item.confidence || 0.7
          }));
        }
        if (flat.scheduleMonths > 0) egt.schedule.totalDurationMonths = flat.scheduleMonths;

        const existing = this.core.query({ originalId: egt.originalId, source: 'knowledge-base' });
        if (existing.length === 0) {
          this.core.add(egt);
          count++;
        }
      }
      console.log(`[KB-Adapter] Migrated ${count} knowledge-base projects to EGT`);
      return { migrated: count };
    } catch (e) {
      console.warn(`[KB-Adapter] Error: ${e.message}`);
      return { migrated: 0, error: e.message };
    }
  }
}

module.exports = { KBAdapter };
