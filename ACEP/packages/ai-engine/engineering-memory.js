/**
 * ACEP Engineering Memory
 *
 * Persistent store for:
 *   - Decisions (with alternatives considered)
 *   - Rejection reasons
 *   - KB references used for each decision
 *   - Similar projects with outcomes
 *   - Confidence scores over time
 *
 * Reuses:
 *   - EDL trace (already stores events)
 *   - LearningFeedbackEngine decisions
 *   - EngineeringGraph for relationships
 *   - Existing MemoryAgent (TypeScript stub in packages/agents/memory)
 *   - File-based persistence (like EDL persist/load)
 */
const fs = require('fs');
const path = require('path');

class EngineeringMemory {
  constructor(options = {}) {
    this.edl = options.edl || null;
    this.learningFeedback = options.learningFeedback || null;
    this.memoryAgent = options.memoryAgent || null;
    this.storagePath = options.storagePath || path.join(__dirname, '..', '..', 'data', 'engineering-memory.json');
    this._memory = { decisions: [], similarProjects: [], references: {}, stats: {} };
    this._initialized = false;
    this._saveTimer = null;
  }

  async initialize() {
    if (this._initialized) return;
    await this._load();
    this._initialized = true;
  }

  /**
   * Record a decision with alternatives considered.
   */
  recordDecision(projectId, decision) {
    const entry = {
      projectId,
      id: decision.id || `decision_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      type: decision.type || 'general',
      decision: decision.decision,
      alternatives: decision.alternatives || [],
      reason: decision.reason || '',
      kbReferences: decision.kbReferences || [],
      confidence: decision.confidence || null,
      source: decision.source || 'system',
      timestamp: decision.timestamp || new Date().toISOString(),
      metadata: decision.metadata || {},
    };

    this._memory.decisions.push(entry);

    // Keep both EDL and LearningFeedback in sync
    if (this.edl) {
      this.edl.logEvent(projectId, 'engineering_memory_decision', {
        decisionId: entry.id,
        type: entry.type,
        decision: entry.decision,
      });
    }
    if (this.learningFeedback) {
      this.learningFeedback.recordDecision(projectId, {
        module: 'engineering_memory',
        decisionType: entry.type,
        reason: entry.reason,
        context: entry.metadata,
      });
    }

    this._scheduleSave();
    return entry;
  }

  /**
   * Get all decisions for a project.
   */
  getDecisions(projectId, filter = {}) {
    let results = [...this._memory.decisions];

    if (projectId) results = results.filter(d => d.projectId === projectId);
    if (filter.type) results = results.filter(d => d.type === filter.type);
    if (filter.minConfidence) results = results.filter(d => d.confidence >= filter.minConfidence);
    if (filter.since) results = results.filter(d => new Date(d.timestamp) >= new Date(filter.since));

    return results.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
  }

  /**
   * Find decisions similar to a given query.
   */
  findSimilarDecisions(query, limit = 5) {
    const q = query.toLowerCase();
    const scored = this._memory.decisions
      .map(d => {
        let score = 0;
        if ((d.decision || '').toLowerCase().includes(q)) score += 3;
        if ((d.reason || '').toLowerCase().includes(q)) score += 2;
        if ((d.type || '').toLowerCase().includes(q)) score += 1;
        if ((d.source || '').toLowerCase().includes(q)) score += 1;
        return { ...d, relevance: score };
      })
      .filter(d => d.relevance > 0)
      .sort((a, b) => b.relevance - a.relevance)
      .slice(0, limit);

    return {
      query,
      totalMatches: this._memory.decisions.filter(d => d.relevance > 0).length,
      results: scored,
    };
  }

  /**
   * Store a similar project reference.
   */
  storeSimilarProject(projectRef) {
    const entry = {
      projectId: projectRef.projectId,
      name: projectRef.name || projectRef.projectId,
      type: projectRef.type || 'unknown',
      area: projectRef.area || 0,
      cost: projectRef.cost || 0,
      duration: projectRef.duration || 0,
      similarity: projectRef.similarity || 1.0,
      outcome: projectRef.outcome || '',
      lessons: projectRef.lessons || [],
      timestamp: new Date().toISOString(),
    };

    this._memory.similarProjects.push(entry);
    this._scheduleSave();
    return entry;
  }

  /**
   * Find similar projects by type and size.
   */
  findSimilarProjects(criteria, limit = 5) {
    let results = [...this._memory.similarProjects];

    if (criteria.type) results = results.filter(p => p.type === criteria.type);

    if (criteria.area) {
      results = results.filter(p => {
        const ratio = Math.abs(p.area - criteria.area) / Math.max(p.area, criteria.area);
        return ratio < 0.3;
      });
    }

    results.sort((a, b) => {
      let scoreA = 0, scoreB = 0;
      if (criteria.type && a.type === criteria.type) scoreA += 10;
      if (criteria.type && b.type === criteria.type) scoreB += 10;
      if (criteria.area) {
        const ratioA = Math.abs(a.area - criteria.area) / Math.max(a.area, criteria.area);
        const ratioB = Math.abs(b.area - criteria.area) / Math.max(b.area, criteria.area);
        scoreA += (1 - ratioA) * 5;
        scoreB += (1 - ratioB) * 5;
      }
      return scoreB - scoreA;
    });

    return results.slice(0, limit);
  }

  /**
   * Store a KB reference used for a decision.
   */
  addReference(key, value) {
    if (!this._memory.references[key]) {
      this._memory.references[key] = [];
    }
    this._memory.references[key].push({
      value,
      timestamp: new Date().toISOString(),
    });
    this._scheduleSave();
  }

  /**
   * Get KB references.
   */
  getReferences(key) {
    if (key) return this._memory.references[key] || [];
    return this._memory.references;
  }

  /**
   * Get memory statistics.
   */
  getStats() {
    return {
      totalDecisions: this._memory.decisions.length,
      totalSimilarProjects: this._memory.similarProjects.length,
      totalReferences: Object.keys(this._memory.references).length,
      storagePath: this.storagePath,
      lastSaved: this._lastSaved,
    };
  }

  /**
   * Search across all memory types.
   */
  search(query, limit = 10) {
    const q = query.toLowerCase();
    const results = [];

    // Search decisions
    for (const d of this._memory.decisions) {
      if ((d.decision || '').toLowerCase().includes(q) ||
          (d.reason || '').toLowerCase().includes(q) ||
          (d.projectId || '').toLowerCase().includes(q)) {
        results.push({ type: 'decision', ...d });
      }
    }

    // Search similar projects
    for (const p of this._memory.similarProjects) {
      if ((p.name || '').toLowerCase().includes(q) ||
          (p.type || '').toLowerCase().includes(q) ||
          (p.lessons || []).some(l => l.toLowerCase().includes(q))) {
        results.push({ type: 'similar_project', ...p });
      }
    }

    return results.slice(0, limit);
  }

  /**
   * Forget/remove memory entries.
   */
  forget(projectId, type) {
    if (type === 'decision') {
      this._memory.decisions = this._memory.decisions.filter(d => d.projectId !== projectId);
    } else if (type === 'similar_project') {
      this._memory.similarProjects = this._memory.similarProjects.filter(p => p.projectId !== projectId);
    } else {
      this._memory.decisions = this._memory.decisions.filter(d => d.projectId !== projectId);
      this._memory.similarProjects = this._memory.similarProjects.filter(p => p.projectId !== projectId);
    }
    this._scheduleSave();
    return { ok: true, projectId, cleared: type || 'all' };
  }

  /**
   * Get all memory as exportable JSON.
   */
  exportAll() {
    return {
      version: '1.0',
      exportedAt: new Date().toISOString(),
      stats: this.getStats(),
      memory: this._memory,
    };
  }

  _scheduleSave() {
    if (this._saveTimer) clearTimeout(this._saveTimer);
    this._saveTimer = setTimeout(() => this._save(), 500);
  }

  async _save() {
    try {
      const dir = path.dirname(this.storagePath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      fs.writeFileSync(this.storagePath, JSON.stringify(this._memory, null, 2), 'utf8');
      this._lastSaved = new Date().toISOString();
    } catch (err) {
      console.error('EngineeringMemory save error:', err.message);
    }
  }

  async _load() {
    try {
      if (fs.existsSync(this.storagePath)) {
        const data = fs.readFileSync(this.storagePath, 'utf8');
        this._memory = JSON.parse(data);
      }
    } catch (err) {
      console.error('EngineeringMemory load error:', err.message);
    }
  }
}

module.exports = EngineeringMemory;
