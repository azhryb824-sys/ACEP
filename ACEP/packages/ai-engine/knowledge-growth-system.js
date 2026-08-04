const path = require('path');
const fs = require('fs');

class KnowledgeGrowthSystem {
  constructor(knowledgeDataset, trainingBridge, learningFeedback, edl) {
    this.dataset = knowledgeDataset;
    this.bridge = trainingBridge;
    this.learningFeedback = learningFeedback;
    this.edl = edl;
    this.growthLog = [];
  }

  recordApprovedProject(projectId) {
    const project = this.edl?.getProject(projectId);
    if (!project) return { ok: false, error: 'Project not found' };

    const ext = project.extracted || {};
    const boq = project.boq || { items: [] };
    const cost = project.cost || {};
    const schedule = project.schedule || {};

    const entry = {
      projectId,
      type: ext.type,
      area: ext.area,
      floors: ext.floors,
      city: ext.city,
      boqItems: boq.items.length,
      boqTotalCost: boq.summary?.totalCost || 0,
      costTotal: cost.totalCost || 0,
      costPerM2: cost.costPerM2 || 0,
      scheduleMonths: schedule.totalMonths || 0,
      recordedAt: new Date().toISOString(),
      source: 'orchestration_approval',
    };

    if (this.bridge && this.bridge.addEDLRecord) {
      this.bridge.addEDLRecord(project);
    }

    this.growthLog.push({ action: 'approved_project', entry });
    return { ok: true, entry };
  }

  learnFromFeedback(projectId) {
    if (!this.learningFeedback) return { ok: false, error: 'LearningFeedback not available' };

    const summary = this.learningFeedback.getFeedbackSummary(projectId);
    if (!summary) return { ok: false, error: 'No feedback found' };

    const insights = {
      projectId,
      totalDecisions: summary.totalDecisions || 0,
      approvals: summary.approvals || 0,
      rejections: summary.rejections || 0,
      topRejectionReasons: summary.topReasons || [],
      approvalRate: summary.totalDecisions > 0 ? Math.round((summary.approvals / summary.totalDecisions) * 100) : 0,
      analyzedAt: new Date().toISOString(),
    };

    const sq = this.dataset.getStandardQuantities();
    if (insights.approvalRate < 50 && sq.projectTypes.length > 0) {
      insights.recommendation = 'High rejection rate — consider reviewing standard quantities for this project type';
    }

    this.growthLog.push({ action: 'feedback_analysis', insights });
    return { ok: true, insights };
  }

  suggestDatasetUpdates() {
    const data = this.bridge?.data;
    if (!data) return { ok: false, error: 'No training data' };

    const suggestions = [];
    const projects = data.projects || [];
    const boqItems = data.boqItems || [];

    const typeCounts = {};
    for (const p of projects) {
      const t = p.projectType || 'Unknown';
      typeCounts[t] = (typeCounts[t] || 0) + 1;
    }

    for (const [type, count] of Object.entries(typeCounts)) {
      if (count < 10) {
        suggestions.push({ type: 'low_sample', entity: 'projectType', name: type, count, message: `Only ${count} projects for type "${type}" — more data needed for reliable statistics`, priority: count < 5 ? 'high' : 'medium' });
      }
    }

    const codeCounts = {};
    for (const item of boqItems) {
      const code = item.itemCode || 'Unknown';
      codeCounts[code] = (codeCounts[code] || 0) + 1;
    }

    const sortedCodes = Object.entries(codeCounts).sort((a, b) => a[1] - b[1]);
    for (const [code, count] of sortedCodes.slice(0, 10)) {
      if (count < 5) {
        suggestions.push({ type: 'low_sample', entity: 'boqItemCode', name: code, count, message: `Only ${count} samples for BOQ code "${code}" — price statistics may be unreliable`, priority: 'medium' });
      }
    }

    return { suggestions, totalSuggestions: suggestions.length };
  }

  getKnowledgeGrowthReport() {
    const sq = this.dataset.getStandardQuantities();
    const dsStats = this.dataset.getStats();

    const projectTypesWithData = sq.projectTypes.filter(t => {
      const info = sq.data[t];
      return info && info.samples >= 10;
    });

    const projectTypesLowData = sq.projectTypes.filter(t => {
      const info = sq.data[t];
      return info && info.samples < 10;
    });

    return {
      generatedAt: new Date().toISOString(),
      datasetStats: dsStats,
      coverage: {
        projectTypesWithGoodData: projectTypesWithData.length,
        projectTypesWithLowData: projectTypesLowData.length,
        projectTypesLowDataList: projectTypesLowData,
        totalProjectTypes: sq.projectTypes.length,
      },
      growthHistory: this.growthLog.slice(-50),
      growthEvents: this.growthLog.length,
    };
  }

  exportGrowthLog() {
    return this.growthLog;
  }
}

module.exports = KnowledgeGrowthSystem;
