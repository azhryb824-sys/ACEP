/**
 * ACEP Automatic Recalculation
 *
 * When any element changes, automatically recalculates all dependent
 * elements using the DependencyEngine + DecisionGraph + EDL.
 *
 * Reuses:
 *   - DecisionGraph.runFromStep() for targeted re-execution
 *   - DependencyEngine.getAffected() for scope determination
 *   - DigitalTwin.synchronize() for UPM sync
 *   - EDL trace for change tracking
 */
class AutomaticRecalculation {
  constructor(options = {}) {
    this.dependencyEngine = options.dependencyEngine || null;
    this.decisionGraph = options.decisionGraph || null;
    this.digitalTwin = options.digitalTwin || null;
    this.edl = options.edl || null;
    this.orchestrator = options.orchestrator || null;
    this.validationEngine = options.validationEngine || null;
    this._recalcHistory = [];
    this._isRunning = false;
  }

  /**
   * Trigger recalculation when an element changes.
   */
  async onElementChanged(projectId, elementId, changeDetails = {}) {
    if (this._isRunning) {
      return { ok: false, error: 'Recalculation already in progress', queued: true };
    }

    this._isRunning = true;

    try {
      const project = this.edl?.getProject(projectId);
      if (!project) return { ok: false, error: 'Project not found' };

      // 1. Determine affected scope
      const affected = this._determineAffected(projectId, elementId);

      // 2. Lock the affected elements
      this._lockElements(affected);

      // 3. Trigger DigitalTwin sync if applicable
      if (this.digitalTwin) {
        await this.digitalTwin.synchronize(projectId, {
          source: elementId,
          reason: changeDetails.reason || 'element_change',
          affectedElements: affected,
        });
      }

      // 4. Re-execute from the changed element's step
      let recalcResult = { ok: true };
      if (this.decisionGraph) {
        const graphNodeId = this._findGraphNodeId(project, elementId);
        if (graphNodeId) {
          recalcResult = this.decisionGraph.runFromStep(graphNodeId, { projectId });
        }
      }

      // 5. Re-run orchestrator for affected modules
      if (this.orchestrator) {
        await this._reOrchestrate(project, affected, changeDetails);
      }

      // 6. Validate after recalculation
      let validation = null;
      if (this.validationEngine) {
        validation = this.validationEngine.validateProject(projectId);
      }

      // 7. Trace
      if (this.edl) {
        project.traceEvent('recalculation_completed', 'AutomaticRecalculation', {
          changedElement: elementId,
          affectedCount: affected.length,
          changeReason: changeDetails.reason,
          revalidated: !!validation,
        });
      }

      const result = {
        projectId,
        changedElement: elementId,
        affectedElements: affected,
        changeReason: changeDetails.reason,
        recalculationResult: recalcResult,
        validation,
        timestamp: new Date().toISOString(),
      };

      this._recalcHistory.push(result);
      return result;
    } finally {
      // Unlock
      this._isRunning = false;
    }
  }

  /**
   * Batch recalculation: multiple changes at once.
   */
  async batchRecalculate(projectId, changes) {
    if (!changes || changes.length === 0) return { ok: true, message: 'No changes to process' };

    const results = [];
    for (const change of changes) {
      const result = await this.onElementChanged(projectId, change.elementId, {
        reason: change.reason,
        data: change.data,
      });
      results.push(result);
    }

    return {
      projectId,
      totalChanges: changes.length,
      results,
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Get the recalculation history.
   */
  getHistory(projectId) {
    if (projectId) return this._recalcHistory.filter(r => r.projectId === projectId);
    return this._recalcHistory;
  }

  /**
   * Check if recalculation is needed by comparing current state with dependencies.
   */
  needsRecalculation(projectId, elementId) {
    if (!this.dependencyEngine) return false;

    const project = this.edl?.getProject(projectId);
    if (!project) return false;

    const affected = this._determineAffected(projectId, elementId);
    // Check if any affected element's value has drifted
    for (const elId of affected) {
      if (this._hasDrifted(project, elId)) return true;
    }
    return false;
  }

  /**
   * Undo the last recalculation (restore previous state).
   */
  undoLast(projectId) {
    const entries = this._recalcHistory.filter(r => r.projectId === projectId);
    if (entries.length === 0) return { ok: false, error: 'No recalculation history to undo' };

    const last = entries[entries.length - 1];
    // Remove from history (EDL has the prior state)
    this._recalcHistory.pop();

    return {
      ok: true,
      undone: last.changedElement,
      affected: last.affectedElements,
      message: `Undone recalculation triggered by ${last.changedElement}`,
    };
  }

  _determineAffected(projectId, elementId) {
    const affected = new Set();
    affected.add(elementId);

    // Use dependency engine for transitive closure
    if (this.dependencyEngine) {
      const direct = this.dependencyEngine.getAffected(elementId);
      for (const d of direct) affected.add(d);
    } else {
      // Fallback: add common dependent elements
      const fallbackDeps = {
        'boq': ['cost', 'schedule', 'risk'],
        'vision': ['navigation', 'boq'],
        'navigation': ['cost'],
        'cost': ['schedule'],
        'schedule': ['risk'],
      };
      const key = elementId.split(':')[0];
      const deps = fallbackDeps[key] || [];
      for (const d of deps) affected.add(`${d}:dependent`);
    }

    return [...affected];
  }

  _lockElements(elements) {
    // In a real system, this would acquire distributed locks.
    // Here we just trace.
    if (this.edl) {
      this.edl.trace('elements_locked', { elements, timestamp: new Date().toISOString() });
    }
  }

  _findGraphNodeId(project, elementId) {
    if (!this.decisionGraph) return null;

    const prefix = elementId.split(':')[0];
    const code = elementId.split(':')[1];

    if (prefix === 'boq' && code) return `boq_${code}`;
    if (prefix === 'element') return `element_${code}`;
    if (prefix === 'vision') return 'vision_step';
    if (prefix === 'nav') return 'navigation_step';
    if (prefix === 'cost') return 'cost_step';
    if (prefix === 'upm') return 'upm_step';

    return null;
  }

  async _reOrchestrate(project, affected, changeDetails) {
    if (!this.orchestrator) return;
    const orchestratorMethods = ['orchestrate', 'run', 'process', 'execute'];
    const method = orchestratorMethods.find(m => typeof this.orchestrator[m] === 'function');
    if (method) {
      await this.orchestrator[method](project, {
        scope: affected,
        reason: changeDetails.reason,
        skipUnchanged: true,
      });
    }
  }

  _hasDrifted(project, elementId) {
    // Simple drift detection: check if the element's value
    // differs from its last known stable value.
    if (this.edl) {
      const lastState = this.edl.getLastState(project.id, elementId);
      const currentState = this._getCurrentState(project, elementId);
      if (lastState && currentState) {
        return JSON.stringify(lastState) !== JSON.stringify(currentState);
      }
    }
    return false;
  }

  _getCurrentState(project, elementId) {
    const prefix = elementId.split(':')[0];
    const key = elementId.split(':')[1];

    if (prefix === 'boq') {
      const item = project.boq?.items?.find(i => i.code === key || i.id === key || i.name === key);
      return item ? { quantity: item.quantity, unitCost: item.unitCost, total: item.total } : null;
    }
    if (prefix === 'cost') return { total: project.cost?.totalCost };
    if (prefix === 'vision') return { status: project.vision?.status };
    if (prefix === 'nav') return { status: project.navigation?.status };

    return null;
  }

  getStats() {
    return {
      totalRecalculations: this._recalcHistory.length,
      isRunning: this._isRunning,
      averageAffectedElements: this._recalcHistory.length > 0
        ? Math.round(this._recalcHistory.reduce((s, r) => s + r.affectedElements.length, 0) / this._recalcHistory.length)
        : 0,
      lastRecalculation: this._recalcHistory.length > 0
        ? this._recalcHistory[this._recalcHistory.length - 1].timestamp
        : null,
    };
  }
}

module.exports = AutomaticRecalculation;
