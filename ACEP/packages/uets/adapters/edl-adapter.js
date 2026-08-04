class EDLAdapter {
  constructor(uetsCore) {
    this.core = uetsCore;
  }

  migrateEDLState(edlData) {
    if (!edlData || !edlData.projects) return { migrated: 0 };

    let count = 0;
    for (const [id, project] of Object.entries(edlData.projects)) {
      const egt = this.core.factory.fromEDLProject(project);
      const existing = this.core.query({ originalId: id, source: 'edl' });
      if (existing.length === 0) {
        this.core.add(egt);
        count++;
      }
    }
    console.log(`[EDL-Adapter] Migrated ${count} EDL projects to EGT`);
    return { migrated: count };
  }

  recordOrchestrationResult(orchestrationResult, continuousLearnerData) {
    if (!orchestrationResult) return null;

    const projectData = {
      projectId: orchestrationResult.projectId || `orch-${Date.now()}`,
      projectType: orchestrationResult.projectType,
      area: orchestrationResult.area || orchestrationResult.geometry?.totalArea,
      floors: orchestrationResult.floors || orchestrationResult.geometry?.floors,
      city: orchestrationResult.city || orchestrationResult.location?.city,
      finishing: orchestrationResult.finishing || orchestrationResult.geometry?.finishing,
      boq: orchestrationResult.boqItems || orchestrationResult.boq || [],
      cost: orchestrationResult.cost || {},
      schedule: orchestrationResult.schedule || {},
      risks: orchestrationResult.risks || [],
      quality: orchestrationResult.quality || {},
      confidence: orchestrationResult.confidence || 0.75
    };

    const egt = this.core.factory.fromEDLProject(projectData);

    if (orchestrationResult.images) {
      egt.images.generated = (orchestrationResult.images.generated || orchestrationResult.images || []).map(i =>
        typeof i === 'string' ? i : (i.url || i.path || '')
      ).filter(Boolean);
    }

    if (orchestrationResult.navigation) {
      egt.navigation.modelPath = orchestrationResult.navigation.modelPath || '';
      egt.navigation.elements = orchestrationResult.navigation.elements || [];
    }

    if (continuousLearnerData) {
      const priceTrends = continuousLearnerData.priceTrends || [];
      for (const trend of priceTrends) {
        const mat = egt.materials.find(m => m.name === trend.material);
        if (mat && trend.newPrice) mat.unitPrice = trend.newPrice;
      }
    }

    const validation = this.core.validator.validate(egt);
    egt.validation.schemaCompliance = validation.valid;
    egt.validation.completeness = this.core.validator.calculateCompleteness(egt);
    egt.validation.errors = validation.errors;
    egt.validation.warnings = validation.warnings;

    const consistency = this.core.validator.checkConsistency(egt);
    egt.validation.consistency = consistency.checks;

    const integrity = this.core.validator.checkIntegrity(egt);
    egt.validation.integrity = integrity.status;

    this.core.add(egt);
    return egt;
  }
}

module.exports = { EDLAdapter };
