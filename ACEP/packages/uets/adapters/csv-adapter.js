const path = require('path');
const fs = require('fs');

class CSVAdapter {
  constructor(uetsCore) {
    this.core = uetsCore;
    this.CSV_BASE = path.join(__dirname, '..', '..', '..', 'packages', 'databases', 'training', 'csv');
  }

  migrateAllToEGT() {
    const projects = this._loadCSV('projects.csv');
    const boqItems = this._loadCSV('boq_items.csv');
    const materialPrices = this._loadCSV('material_prices.csv');
    const risks = this._loadCSV('risks.csv');
    const qualityDefects = this._loadCSV('quality_defects.csv');

    let totalEGT = 0;

    const groupBy = (rows, key) => {
      const map = new Map();
      for (const row of rows) {
        const k = row[key];
        if (!k) continue;
        if (!map.has(k)) map.set(k, []);
        map.get(k).push(row);
      }
      return map;
    };

    const boqByProject = groupBy(boqItems, 'project_id');
    const risksByProject = groupBy(risks, 'project_id');
    const defectsByProject = groupBy(qualityDefects, 'project_id');

    for (const proj of projects) {
      const originalId = proj.project_id || `csv-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
      const existing = this.core.query({ originalId, source: 'csv' });
      if (existing.length > 0) continue;

      const egt = this.core.fromCSV(proj);

      const projBOQ = boqByProject.get(proj.project_id) || [];
      for (const boq of projBOQ) {
        const item = this.core.factory.fromCSVBOQItem(boq);
        const existing = egt.boq.find(e => e.code === item.code);
        if (!existing) egt.boq.push(item);
      }

      const projRisks = risksByProject.get(proj.project_id) || [];
      for (const risk of projRisks) {
        const r = this.core.factory.fromCSVRisk(risk);
        egt.risks.push(r);
      }

      const projDefects = defectsByProject.get(proj.project_id) || [];
      for (const defect of projDefects) {
        const d = this.core.factory.fromCSVQualityDefect(defect);
        if (!egt.quality) egt.quality = { expectedDefects: 0, defectTypes: [] };
        egt.quality.defectTypes.push(d);
      }
      egt.quality.expectedDefects = egt.quality.defectTypes.length;

      const validation = this.core.validator.validate(egt);
      egt.validation.schemaCompliance = validation.valid;
      egt.validation.completeness = this.core.validator.calculateCompleteness(egt);
      egt.validation.errors = validation.errors;
      egt.validation.warnings = validation.warnings;

      this.core.add(egt);
      totalEGT++;
    }

    const allEGTs = this.core.getAll();
    const cityIndex = new Map();
    for (const egt of allEGTs) {
      const city = (egt.location.city || '').toLowerCase();
      if (!cityIndex.has(city)) cityIndex.set(city, []);
      cityIndex.get(city).push(egt);
    }

    for (const mp of materialPrices) {
      const mat = this.core.factory.fromCSVMaterialPrice(mp);
      const candidates = mp.city ? (cityIndex.get(String(mp.city).toLowerCase()) || []) : allEGTs;
      for (const egt of candidates) {
        const existing = egt.materials.find(m => m.name === mat.name);
        if (!existing && mat.unitPrice > 0) {
          egt.materials.push({ ...mat, city: mp.city || '' });
        }
      }
    }

    console.log(`[CSV-Adapter] Migrated ${totalEGT} projects + ${boqItems.length} BOQ items + ${risks.length} risks + ${qualityDefects.length} quality defects to EGT`);
    return { projects: totalEGT, boqItems: boqItems.length, risks: risks.length, qualityDefects: qualityDefects.length };
  }

  _loadCSV(filename) {
    const filePath = path.join(this.CSV_BASE, filename);
    try {
      if (!fs.existsSync(filePath)) {
        console.warn(`[CSV-Adapter] File not found: ${filePath}`);
        return [];
      }
      const content = fs.readFileSync(filePath, 'utf8');
      const lines = content.split('\n').filter(l => l.trim());
      if (lines.length < 2) return [];

      const headers = this._parseLine(lines[0]);
      const records = [];

      for (let i = 1; i < lines.length; i++) {
        const values = this._parseLine(lines[i]);
        if (values.length === headers.length) {
          const record = {};
          for (let j = 0; j < headers.length; j++) {
            record[headers[j].trim()] = values[j].trim();
          }
          records.push(record);
        }
      }
      return records;
    } catch (e) {
      console.warn(`[CSV-Adapter] Error loading ${filename}: ${e.message}`);
      return [];
    }
  }

  _parseLine(line) {
    const result = [];
    let current = '';
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const c = line[i];
      if (c === '"') {
        inQuotes = !inQuotes;
      } else if (c === ',' && !inQuotes) {
        result.push(current);
        current = '';
      } else {
        current += c;
      }
    }
    result.push(current);
    return result;
  }
}

module.exports = { CSVAdapter };
