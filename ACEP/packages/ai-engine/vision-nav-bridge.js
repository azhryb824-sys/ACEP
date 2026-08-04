/**
 * ACEP Vision AI + Navigation AI Integration Layer
 *
 * Bridges the independent Vision AI and 3D Navigation systems.
 * Maps features between image generation and spatial models.
 * Allows vision results to inform 3D navigation and vice versa.
 */
const path = require('path');

class VisionNavBridge {
  constructor(edl, visionCore) {
    this.edl = edl;
    this.visionCore = visionCore;
    this._syncLog = [];
  }

  synchronizeProject(projectId) {
    const project = this.edl.getProject(projectId);
    if (!project) return { ok: false, error: 'Project not found' };

    const operations = [];

    // Vision → Navigation: Use vision features to enhance spatial model
    const visionResult = this._visionToNav(project);
    operations.push(visionResult);

    // Navigation → Vision: Use 3D spatial data to inform generation
    const navResult = this._navToVision(project);
    operations.push(navResult);

    // Resolve conflicts between vision and navigation data
    const conflictResult = this._resolveConflicts(project);
    operations.push(conflictResult);

    this._syncLog.push({
      projectId, timestamp: new Date().toISOString(),
      operations: operations.map(o => o.status),
    });

    return { ok: true, operations };
  }

  _visionToNav(project) {
    const visionData = project.vision;
    const navData = project.navigation;

    if (!visionData || !navData) {
      return { status: 'skipped', reason: 'Vision or Navigation data missing' };
    }

    const updates = {};

    // Map vision features to navigation layers
    if (visionData.features) {
      const feat = visionData.features;

      if (feat.structure) {
        updates.layers = { ...navData.layers, structure: true };
      }
      if (feat.facade || feat.paint) {
        updates.layers = { ...(updates.layers || navData.layers), architecture: true };
      }
      if (feat.flooring || feat.ceilings || feat.doors) {
        updates.layers = { ...(updates.layers || navData.layers), finishing: true };
      }
      if (feat.mep) {
        updates.layers = { ...(updates.layers || navData.layers), mep: true };
      }
    }

    // Vision UPM snapshot can refine spatial elements
    if (visionData.upmSnapshot) {
      const snap = visionData.upmSnapshot;
      if (snap.physical && snap.physical.floors && (!navData.elements || navData.elements.length === 0)) {
        updates.spatialModel = {
          ...navData.spatialModel,
          type: snap.projectType?.main || navData.spatialModel?.type,
          area: snap.physical.area || navData.spatialModel?.area,
          floors: snap.physical.floors || navData.spatialModel?.floors,
        };
      }

      // Vision-generated color palette can enhance overlay data
      if (snap.colors && snap.colors.paint && navData.overlays) {
        const overlayWithColor = navData.overlays.map(o => ({
          ...o,
          colorPalette: snap.colors,
        }));
        updates.overlays = overlayWithColor;
      }
    }

    if (Object.keys(updates).length > 0) {
      project.setNavigationData(updates);
      project.traceEvent('vision_to_nav', 'visionNavBridge', { updates: Object.keys(updates) });
      return { status: 'synced', updates: Object.keys(updates) };
    }

    return { status: 'no_changes', reason: 'No new data to sync from Vision to Navigation' };
  }

  _navToVision(project) {
    const navData = project.navigation;
    const visionData = project.vision;

    if (!navData || !visionData) {
      return { status: 'skipped', reason: 'Navigation or Vision data missing' };
    }

    const updates = {};

    // Use 3D spatial model to enhance vision prompts
    if (navData.spatialModel) {
      const sm = navData.spatialModel;
      if (sm.elementCount && sm.elementCount > 0) {
        updates.prompts = visionData.prompts || [];
        updates.prompts.push({
          source: 'navigation',
          timestamp: new Date().toISOString(),
          type: 'spatial_enhancement',
          data: {
            elements: sm.elementCount,
            dimensions: sm.dimensions || {},
          },
        });
      }
    }

    // Navigation phase progress informs vision generation phase
    if (navData.phaseProgress && navData.phaseProgress > 0) {
      updates.phaseProgress = navData.phaseProgress;
    }

    // Navigation elements can suggest features for vision
    if (navData.elements && navData.elements.length > 0) {
      const elementTypes = new Set(navData.elements.map(e => e.type));
      const suggestedFeatures = [];
      if ([...elementTypes].some(t => t.toLowerCase().includes('wall'))) {
        suggestedFeatures.push('interior_walls');
      }
      if ([...elementTypes].some(t => t.toLowerCase().includes('column'))) {
        suggestedFeatures.push('columns');
      }
      if ([...elementTypes].some(t => t.toLowerCase().includes('window') || t.toLowerCase().includes('نافذة'))) {
        suggestedFeatures.push('windows');
      }
      if (suggestedFeatures.length > 0) {
        updates.navSuggestedFeatures = suggestedFeatures;
      }
    }

    if (Object.keys(updates).length > 0) {
      if (updates.prompts && !visionData.prompts) {
        project.vision.prompts = updates.prompts;
      }
      if (updates.navSuggestedFeatures) {
        project.vision.navSuggestedFeatures = updates.navSuggestedFeatures;
      }
      project.metadata.updated = new Date().toISOString();
      project.traceEvent('nav_to_vision', 'visionNavBridge', { updates: Object.keys(updates) });
      return { status: 'synced', updates: Object.keys(updates) };
    }

    return { status: 'no_changes', reason: 'No new data to sync from Navigation to Vision' };
  }

  _resolveConflicts(project) {
    const visionData = project.vision;
    const navData = project.navigation;

    if (!visionData || !navData) return { status: 'skipped', reason: 'Insufficient data for conflict resolution' };

    const conflictsBefore = project.orchestration.conflicts.length;
    const resolved = [];

    // Conflict 1: Floor count mismatch
    const visionFloors = visionData.features?.floors || visionData.upmSnapshot?.physical?.floors;
    const navFloors = navData.spatialModel?.floors || navData.elements?.length;
    if (visionFloors && navFloors && visionFloors !== navFloors) {
      project.addConflict('vision_nav_bridge', 'navigation',
        `Bridge resolved: using navigation floor count (${navFloors}) over vision (${visionFloors})`,
        'info');
      resolved.push('floor_count');
    }

    // Conflict 2: Area mismatch
    const visionArea = visionData.features?.area || visionData.upmSnapshot?.physical?.area;
    const navArea = navData.spatialModel?.area;
    if (visionArea && navArea && Math.abs(visionArea - navArea) > visionArea * 0.3) {
      project.addConflict('vision_nav_bridge', 'navigation',
        `Area mismatch (vision: ${visionArea}, nav: ${navArea}), using EDL effective`,
        'info');
      resolved.push('area');
    }

    const conflictsAfter = project.orchestration.conflicts.length;

    return {
      status: resolved.length > 0 ? 'resolved' : 'no_conflicts',
      resolved,
      conflictsFound: conflictsAfter - conflictsBefore,
    };
  }

  getSyncLog(projectId) {
    if (projectId) return this._syncLog.filter(e => e.projectId === projectId);
    return this._syncLog;
  }

  getStats() {
    const count = this._syncLog.length;
    return {
      totalSyncs: count,
      synced: this._syncLog.filter(e => e.operations.includes('synced')).length,
      skipped: this._syncLog.filter(e => e.operations.includes('skipped')).length,
    };
  }
}

module.exports = VisionNavBridge;
