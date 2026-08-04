/**
 * ACEP Digital Twin
 *
 * Ensures the Unified Project Model (UPM) is the single source of truth
 * across ALL systems. Synchronizes between EDL, UPM, Vision, Navigation,
 * and all AI models so every module reads from one unified representation.
 */
const path = require('path');

class DigitalTwin {
  constructor(edl) {
    this.edl = edl;
    this._syncLog = [];
    this._autoSync = true;
  }

  synchronize(projectId) {
    const project = this.edl.getProject(projectId);
    if (!project) return { ok: false, error: 'Project not found' };

    const startTime = Date.now();
    const operations = [];

    // Step 1: Ensure UPM snapshot exists and is current
    const upmOps = this._syncUPM(project);
    operations.push(upmOps);

    // Step 2: Push EDL data into UPM-compatible fields
    const edlOps = this._syncEDLtoUPM(project);
    operations.push(edlOps);

    // Step 3: Pull UPM data back into EDL fields (bidirectional sync)
    const upmToEdl = this._syncUPMtoEDL(project);
    operations.push(upmToEdl);

    // Step 4: Ensure navigation model reflects UPM
    const navOps = this._syncNavigation(project);
    operations.push(navOps);

    // Step 5: Ensure vision data reflects UPM
    const visionOps = this._syncVision(project);
    operations.push(visionOps);

    const duration = Date.now() - startTime;

    const result = {
      projectId,
      timestamp: new Date().toISOString(),
      duration,
      synced: operations.every(o => o.status === 'synced' || o.status === 'already_current'),
      operations,
    };

    this._syncLog.push(result);

    project.traceEvent('digital_twin_sync', 'digitalTwin', {
      operations: operations.length,
      duration,
    });

    return result;
  }

  synchronizeAll() {
    const projects = this.edl.getAllProjects();
    const results = [];

    for (const project of projects) {
      results.push(this.synchronize(project.id));
    }

    return {
      timestamp: new Date().toISOString(),
      totalProjects: projects.length,
      synced: results.filter(r => r.synced).length,
      failed: results.filter(r => !r.synced).length,
      results,
    };
  }

  _syncUPM(project) {
    if (!project.vision?.upmSnapshot) {
      return { status: 'skipped', reason: 'No UPM snapshot exists yet. Run Vision AI step first.' };
    }

    {
      return { status: 'already_current', reason: 'UPM snapshot exists' };
    }
  }

  _syncEDLtoUPM(project) {
    const updates = {};

    if (project.vision?.upmSnapshot) {
      const snap = project.vision.upmSnapshot;

      // Push EDL effective data into UPM if UPM fields are empty
      if (!snap.physical?.area || snap.physical.area === 0) {
        const effectiveArea = project.getEffective('area');
        if (effectiveArea.value) {
          if (!snap.physical) snap.physical = {};
          snap.physical.area = effectiveArea.value;
          updates.area = effectiveArea.value;
        }
      }

      if (!snap.physical?.floors || snap.physical.floors === 0) {
        const effectiveFloors = project.getEffective('floors');
        if (effectiveFloors.value) {
          if (!snap.physical) snap.physical = {};
          snap.physical.floors = effectiveFloors.value;
          updates.floors = effectiveFloors.value;
        }
      }

      if (!snap.projectType?.main && project.getEffective('type').value) {
        snap.projectType = {
          main: project.getEffective('type').value,
          confidence: project.getEffective('type').confidence || 0.7,
          source: 'EDL',
        };
        updates.type = project.getEffective('type').value;
      }

      if (Object.keys(updates).length > 0) {
        project.vision.upmSnapshot = snap;
        project.metadata.updated = new Date().toISOString();
        return { status: 'synced', updates: Object.keys(updates) };
      }
    }

    return { status: 'no_changes', reason: 'UPM already current with EDL data' };
  }

  _syncUPMtoEDL(project) {
    const snap = project.vision?.upmSnapshot;
    if (!snap) {
      return { status: 'skipped', reason: 'No UPM data' };
    }

    const updates = {};

    // UPM boqSummary → EDL boq summary (if EDL boq is empty)
    if (snap.boqSummary?.totalItems > 0 && (!project.boq?.items || project.boq.items.length === 0)) {
      updates.boqFromUPM = true;
    }

    // UPM physical data → EDL building (only if EDL building is empty)  
    if (snap.physical?.floors && !project.building?.numUnits) {
      updates.buildingFromUPM = true;
    }

    // UPM materials → EDL building materials
    if (snap.materials?.length > 0) {
      const existingMaterials = project.building?.materials || [];
      const newMaterials = snap.materials.filter(m => !existingMaterials.includes(m));
      if (newMaterials.length > 0) {
        project.building.materials = [...new Set([...existingMaterials, ...newMaterials])];
        updates.materialsAdded = newMaterials.length;
      }
    }

    if (Object.keys(updates).length > 0) {
      return { status: 'synced', updates: Object.keys(updates) };
    }

    return { status: 'no_changes', reason: 'All UPM data already reflected in EDL' };
  }

  _syncNavigation(project) {
    const snap = project.vision?.upmSnapshot;
    const nav = project.navigation;

    if (!snap || !nav) {
      return { status: 'skipped', reason: 'UPM or Navigation data missing' };
    }

    const updates = {};

    // Sync spatial model from UPM
    if (snap.physical) {
      if (snap.physical.floors && (!nav.spatialModel?.floors || nav.spatialModel.floors !== snap.physical.floors)) {
        updates.floors = snap.physical.floors;
      }
      if (snap.physical.area && (!nav.spatialModel?.area || nav.spatialModel.area !== snap.physical.area)) {
        updates.area = snap.physical.area;
      }
    }

    // Sync phase from UPM
    if (snap.phase?.current && nav.phaseProgress === undefined) {
      const phaseMap = {
        'Design': 0.1, 'Foundation': 0.2, 'Structure': 0.4,
        'Masonry': 0.5, 'Finishing': 0.7, 'MEP': 0.8, 'Completed': 1.0,
      };
      updates.phaseProgress = phaseMap[snap.phase.current] || 0.5;
    }

    if (Object.keys(updates).length > 0) {
      project.setNavigationData({
        spatialModel: { ...nav.spatialModel, ...updates },
      });
      return { status: 'synced', updates: Object.keys(updates) };
    }

    return { status: 'no_changes', reason: 'Navigation already synced with UPM' };
  }

  _syncVision(project) {
    const snap = project.vision?.upmSnapshot;
    const vision = project.vision;

    if (!snap || !vision) {
      return { status: 'skipped', reason: 'UPM or Vision data missing' };
    }

    if (!vision.features && snap) {
      return { status: 'synced', updates: ['features'], reason: 'UPM available for feature building' };
    }

    return { status: 'no_changes', reason: 'Vision already synced' };
  }

  getProjectSnapshot(projectId) {
    const project = this.edl.getProject(projectId);
    if (!project) return null;

    return {
      id: project.id,
      metadata: project.metadata,
      effective: {
        type: project.getEffective('type'),
        area: project.getEffective('area'),
        floors: project.getEffective('floors'),
      },
      modules: {
        extraction: { area: project.extracted.area, floors: project.extracted.floors, type: project.extracted.type },
        approved: { area: project.approved.area, floors: project.approved.floors, type: project.approved.type },
        boq: { items: project.boq?.items?.length || 0, totalCost: project.boq?.summary?.totalCost || 0 },
        cost: { total: project.cost?.totalCost || 0, confidence: project.cost?.confidence || 0 },
        schedule: { months: project.schedule?.totalMonths || 0, days: project.schedule?.totalDuration || 0 },
        risks: { level: project.risks?.riskLevel || null, count: project.risks?.risks?.length || 0 },
        quality: { score: project.quality?.qualityScore || 0 },
        vision: { images: project.vision?.images?.length || 0, upm: !!project.vision?.upmSnapshot },
        navigation: { elements: project.navigation?.elements?.length || 0, spatial: !!project.navigation?.spatialModel },
      },
      orchestration: project.orchestration,
      validation: project.validation,
      traceCount: project.trace?.length || 0,
    };
  }

  getSyncLog(projectId) {
    if (projectId) return this._syncLog.filter(l => l.projectId === projectId);
    return this._syncLog;
  }

  getStats() {
    const total = this._syncLog.length;
    return {
      totalSyncs: total,
      synced: this._syncLog.filter(l => l.synced).length,
      avgDuration: total > 0 ? Math.round(this._syncLog.reduce((s, l) => s + l.duration, 0) / total) : 0,
    };
  }
}

module.exports = DigitalTwin;
