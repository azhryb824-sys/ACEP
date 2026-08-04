class SearchEngine {
  constructor(knowledgeBase) {
    this.kb = knowledgeBase;
    this.index = new Map();
    this._buildIndex();
  }

  _buildIndex() {
    this.index.clear();
    const indexTerms = (text, source) => {
      if (!text) return;
      const tokens = text.toLowerCase().split(/[\s,._\-/]+/);
      for (const token of tokens) {
        if (token.length < 2) continue;
        if (!this.index.has(token)) this.index.set(token, []);
        this.index.get(token).push(source);
      }
    };
    const { elements, materials, boqData, scheduleData, codes, projectTypes } = this.kb._getDataRefs();
    for (const el of Object.values(elements)) {
      indexTerms(el.name, { type: 'element', id: el.id, name: el.name, nameEn: el.nameEn });
      indexTerms(el.nameEn, { type: 'element', id: el.id, name: el.name, nameEn: el.nameEn });
      indexTerms(el.boqCategory, { type: 'element', id: el.id, name: el.name });
      indexTerms(el.category, { type: 'element', id: el.id, name: el.name });
    }
    for (const mat of Object.values(materials)) {
      indexTerms(mat.name, { type: 'material', id: mat.id, name: mat.name, nameEn: mat.nameEn, avgPrice: mat.avgPrice });
      indexTerms(mat.nameEn, { type: 'material', id: mat.id, name: mat.name, nameEn: mat.nameEn });
    }
    if (boqData) {
      for (const item of boqData.items) {
        indexTerms(item.name, { type: 'boq', code: item.code, name: item.name, unit: item.unit, unitPrice: item.unitPrice });
        indexTerms(item.code, { type: 'boq', code: item.code, name: item.name });
        indexTerms(item.elementType, { type: 'boq', code: item.code, name: item.name });
      }
    }
    for (const code of Object.values(codes)) {
      indexTerms(code.name, { type: 'code', code: code.code, name: code.name, organization: code.organization });
      indexTerms(code.code, { type: 'code', code: code.code, name: code.name });
    }
    for (const pt of Object.values(projectTypes)) {
      indexTerms(pt.name, { type: 'project_type', id: pt.id, name: pt.name, nameEn: pt.nameEn });
      indexTerms(pt.nameEn, { type: 'project_type', id: pt.id, name: pt.name, nameEn: pt.nameEn });
    }
    if (scheduleData) {
      for (const task of scheduleData.tasks) {
        indexTerms(task.name, { type: 'schedule', id: task.id, name: task.name, duration: task.duration });
      }
    }
  }

  search(query, options = {}) {
    const q = query.toLowerCase();
    const tokens = q.split(/[\s]+/).filter(t => t.length >= 2);
    if (tokens.length === 0) return [];

    let results = [];
    const resultMap = new Map();

    for (const token of tokens) {
      for (const [indexToken, sources] of this.index) {
        if (indexToken.includes(token)) {
          for (const source of sources) {
            const key = `${source.type}:${source.id || source.code || source.name}`;
            if (!resultMap.has(key)) resultMap.set(key, { ...source, score: 0 });
            resultMap.get(key).score += 1;
          }
        }
      }
    }

    if (options.type) {
      results = Array.from(resultMap.values()).filter(r => r.type === options.type);
    } else {
      results = Array.from(resultMap.values());
    }

    results.sort((a, b) => (b.score || 0) - (a.score || 0));

    if (options.limit) results = results.slice(0, options.limit);

    return results;
  }

  searchByType(query, type) {
    return this.search(query, { type, limit: 20 });
  }

  smartSearch(query) {
    const results = this.search(query, { limit: 30 });
    return {
      query,
      total: results.length,
      elements: results.filter(r => r.type === 'element'),
      materials: results.filter(r => r.type === 'material'),
      boq: results.filter(r => r.type === 'boq'),
      codes: results.filter(r => r.type === 'code'),
      projects: results.filter(r => r.type === 'project_type'),
      schedule: results.filter(r => r.type === 'schedule'),
      all: results.slice(0, 20),
    };
  }

  rebuildIndex() {
    this._buildIndex();
  }
}

module.exports = { SearchEngine };
