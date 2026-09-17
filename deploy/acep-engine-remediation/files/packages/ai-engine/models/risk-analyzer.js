const { readRows } = require('./csv-rows');
const path = require('path');
const millionProjectModel = require('./million-project-model');

class RiskAnalyzer {
  constructor() {
    this.trained = false;
    this.risks = [];
    this.byProjectType = {};
    this.byCategory = {};
  }

  async train(csvPath, projectsPath) {
    this.byProjectType = {};
    this.byCategory = {};
    const fp = csvPath || path.join(__dirname, '..', '..', '..', 'packages', 'databases', 'training', 'csv', 'risks.csv');
    this.risks = readRows(fp).map(l => {
      const c = l;
      return {
        projectId: c[0], category: c[1], description: c[2],
        probability: parseInt(c[3]) || 1, impact: parseInt(c[4]) || 1,
        mitigation: c[5] || '', detectedByAI: c[6] === 'true'
      };
    });

    const projMap = this._loadProjectTypes(projectsPath);
    for (const risk of this.risks) {
      const pt = projMap[risk.projectId] || 'Unknown';
      if (!this.byProjectType[pt]) this.byProjectType[pt] = [];
      this.byProjectType[pt].push(risk);
      if (!this.byCategory[risk.category]) this.byCategory[risk.category] = [];
      this.byCategory[risk.category].push(risk);
    }

    for (const [k, v] of Object.entries(this.byProjectType)) {
      this.byProjectType[k] = this._computeStats(v);
    }
    for (const [k, v] of Object.entries(this.byCategory)) {
      this.byCategory[k] = this._computeStats(v);
    }

    this.trained = true;
    return { total: this.risks.length, categories: Object.keys(this.byCategory).length };
  }

  _loadProjectTypes(projectsPath) {
    try {
      const fp = projectsPath || path.join(__dirname, '..', '..', '..', 'packages', 'databases', 'training', 'csv', 'projects.csv');
      const map = {};
      readRows(fp).forEach(l => {
        const c = l;
        map[c[0]] = c[3];
      });
      return map;
    } catch (e) { if (projectsPath) throw e; return {}; }
  }

  _computeStats(risks) {
    const probs = risks.map(r => r.probability / 5);
    const impacts = risks.map(r => r.impact / 5);
    probs.sort(); impacts.sort();
    const n = risks.length;
    return {
      count: n,
      probMean: probs.reduce((s, v) => s + v, 0) / n,
      probMedian: probs[Math.floor(n / 2)],
      impactMean: impacts.reduce((s, v) => s + v, 0) / n,
      impactMedian: impacts[Math.floor(n / 2)],
      riskScoreMean: (probs.reduce((s, v) => s + v, 0) / n) * (impacts.reduce((s, v) => s + v, 0) / n),
      mitigations: [...new Set(risks.filter(r => r.mitigation).map(r => r.mitigation))].slice(0, 5),
      descriptions: [...new Set(risks.map(r => r.description))].slice(0, 10)
    };
  }

  analyzeRisks(projectType, totalArea, floors, region, finishing, modelInputs = {}) {
    if (!this.trained) return { error: 'Not trained', risks: [] };

    const trainedPrediction = millionProjectModel.predict({
      projectType: modelInputs.modelType || projectType,
      grossBuiltArea: totalArea,
      footprintArea: modelInputs.footprintArea,
      landArea: modelInputs.landArea,
      floors,
      basements: modelInputs.basements,
      buildings: modelInputs.buildings,
      capacity: modelInputs.capacity,
      city: region,
      finishing,
      method: modelInputs.method
    });
    if (trainedPrediction.blocked) return { status: 'blocked', reason: trainedPrediction.reason, risks: [], overallRiskScore: null, riskLevel: null };
    if (trainedPrediction.available) return this._trainedRisks(trainedPrediction);

    const ptStats = this.byProjectType[projectType];
    const allCategories = Object.keys(this.byCategory);
    const scaleFactor = Math.max(0.5, Math.min(2, 1 + (totalArea / 10000) * 0.2 + (floors / 10) * 0.15));

    const risks = [];
    for (const cat of allCategories) {
      const catStats = this.byCategory[cat];
      const stats = (ptStats && ptStats.categories && ptStats.categories[cat]) ? ptStats.categories[cat] : catStats;
      if (!stats) continue;

      const baseProb = stats.probMean || 0.4;
      const baseImpact = stats.impactMean || 0.4;
      const prob = Math.min(0.95, baseProb * scaleFactor * (1 + (finishing === 'Luxury' ? 0.15 : finishing === 'Premium' ? 0.1 : 0)));
      const impact = Math.min(0.95, baseImpact * scaleFactor * (1 + (totalArea > 50000 ? 0.15 : 0)));
      const score = prob * impact;
      const desc = stats.descriptions[0] || `${cat} risk`;
      const mitigation = stats.mitigations[0] || 'Regular monitoring';

      risks.push({
        category: cat, risk: desc,
        probability: Math.round(prob * 100) / 100,
        impact: Math.round(impact * 100) / 100,
        score: Math.round(score * 100) / 100,
        mitigation,
        trainingSamples: stats.count
      });
    }

    risks.sort((a, b) => b.score - a.score);
    const overallScore = risks.length > 0 ? risks.reduce((s, r) => s + r.score, 0) / risks.length : 0;
    const riskLevel = overallScore > 0.5 ? 'High' : overallScore > 0.25 ? 'Medium' : 'Low';

    return {
      risks: risks.slice(0, 10).map(r => ({ ...r, researchPriorityIndex: r.score, probability: null, impact: null, score: null })),
      overallRiskScore: null,
      riskLevel: null,
      researchIndicator: { score: overallScore, band: riskLevel, fieldCalibrated: false },
      totalRisksInTraining: this.risks.length,
      projectSpecificData: ptStats ? ptStats.count : 0,
      status: risks.length > 0 ? 'experimental' : 'not_evaluated',
      dataProvenance: process.env.ACEP_DATA_PROVENANCE || 'synthetic',
      contractualUse: false,
      requiresHumanReview: true
    };
  }

  _trainedRisks(prediction) {
    const baseScore = prediction.predictions.riskScore;
    const common = [
      ['Schedule', 0.90, 1.04, 'Interface and approval delays', 'Maintain an approval register and a constraint-removal plan.'],
      ['Cost', 0.82, 1.08, 'Escalation and scope growth', 'Freeze the cost basis, track scope changes, and update the risk allowance.'],
      ['Quality', 0.72, 0.96, 'Rework from coordination or workmanship gaps', 'Use discipline hold points, mock-ups, and coordinated inspection plans.'],
      ['Safety', 0.68, 1.12, 'High-risk construction activities', 'Issue activity-specific permits, method statements, and independent supervision.'],
      ['Procurement', 0.76, 1.00, 'Long-lead equipment and material availability', 'Approve long-lead registers and dual-source critical packages.'],
      ['Design', 0.70, 0.94, 'Incomplete or conflicting design information', 'Run multidisciplinary design reviews and close clashes before release.']
    ];
    const specific = {
      hospital: [
        ['Clinical systems', 0.86, 1.14, 'Medical gases, infection control, and clinical commissioning', 'Validate clinical workflows and commission critical systems with the operator.'],
        ['Medical equipment', 0.80, 1.10, 'Late equipment data affecting rooms and services', 'Freeze equipment schedules and interface loads before coordinated design release.']
      ],
      data_center: [
        ['Resilience', 0.88, 1.16, 'Power and cooling redundancy not meeting the required tier', 'Witness integrated systems testing under credible failure scenarios.']
      ],
      tunnel: [
        ['Geotechnical', 0.92, 1.18, 'Unknown ground, groundwater, and settlement behavior', 'Use staged investigation, instrumentation, and observational controls.']
      ],
      bridge: [
        ['Temporary works', 0.84, 1.14, 'Launching, lifting, or falsework instability', 'Independently check temporary works and lifting sequences.']
      ],
      road: [
        ['Traffic interface', 0.88, 1.14, 'Live traffic staging and public-interface incidents', 'Approve staged traffic management and audit barriers, lighting, and transitions.'],
        ['Pavement performance', 0.78, 1.04, 'Subgrade variability or pavement materials not meeting design assumptions', 'Verify geotechnical sections, trial compaction, and pavement acceptance lots.']
      ],
      railway: [
        ['Rail systems integration', 0.86, 1.14, 'Track, signalling, traction power, and rolling-stock interfaces', 'Maintain an interface register and execute staged dynamic testing.'],
        ['Possessions', 0.82, 1.08, 'Insufficient access or possession windows', 'Freeze possession strategy and protect critical access windows.']
      ],
      renewable_energy: [
        ['Grid connection', 0.86, 1.12, 'Grid studies, interconnection approval, or energization delay', 'Close grid studies and protection settings against a dated connection programme.'],
        ['Generation yield', 0.72, 1.08, 'Resource, soiling, wake, or equipment performance below the energy model', 'Independently validate yield assumptions and require performance guarantees.']
      ],
      water: [
        ['Hydraulic performance', 0.82, 1.12, 'Capacity, pressure, surge, or process performance shortfall', 'Validate the hydraulic/process model and witness performance testing.'],
        ['Water quality', 0.76, 1.16, 'Contamination or treatment compliance failure', 'Apply cleanliness controls, sampling plans, disinfection, and hold points.']
      ],
      dam: [
        ['Hydrology and diversion', 0.90, 1.18, 'Flood exceedance or diversion failure during construction', 'Use updated hydrology, staged diversion assurance, and an emergency action plan.'],
        ['Foundation behavior', 0.86, 1.18, 'Seepage, settlement, or foundation discontinuities', 'Use staged investigation, grouting trials, instrumentation, and trigger levels.']
      ],
      power: [
        ['Energization', 0.86, 1.18, 'Protection, interlock, or grid-interface failure at energization', 'Freeze settings, boundaries, and witnessed energization procedures.'],
        ['Long-lead equipment', 0.84, 1.12, 'Transformer or switchgear delivery delay', 'Secure factory slots, inspection milestones, and contingency logistics.']
      ],
      telecom: [
        ['Network integration', 0.80, 1.10, 'Interoperability, coverage, or capacity shortfall', 'Use end-to-end design validation and staged service acceptance.'],
        ['Wayleave and permits', 0.82, 1.04, 'Route access or authority permit delay', 'Maintain route-by-route permit and access readiness.']
      ],
      factory: [
        ['Process interfaces', 0.82, 1.12, 'Building, utilities, and production-equipment interfaces', 'Freeze process loads and run multidisciplinary interface reviews.']
      ],
      warehouse: [
        ['Operational layout', 0.74, 1.06, 'Racking, fire strategy, and material-handling conflicts', 'Coordinate racking, egress, sprinklers, and equipment clearances before release.']
      ],
      renovation: [
        ['Existing conditions', 0.90, 1.08, 'Concealed conditions and undocumented services', 'Survey, scan, open up, and maintain a controlled discovery allowance.']
      ],
      heritage: [
        ['Conservation', 0.90, 1.15, 'Irreversible loss of historic fabric', 'Use conservation trials and authority-approved intervention limits.']
      ]
    };
    if (['road', 'railway', 'water', 'power', 'telecom'].includes(prediction.projectType)) {
      common.push(['Utilities and access', 0.86, 1.10, 'Unknown utilities, traffic, and right-of-way constraints', 'Verify utilities and phase access/traffic before construction release.']);
    }
    const definitions = [...common, ...(specific[prediction.projectType] || [])];
    const root = Math.sqrt(Math.max(0.01, baseScore));
    const risks = definitions.map(([category, probabilityFactor, impactFactor, risk, mitigation], index) => {
      const probability = Math.max(0.05, Math.min(0.90, root * probabilityFactor * (1 + (index % 3 - 1) * 0.035)));
      const impact = Math.max(0.08, Math.min(0.93, root * impactFactor * (1 + ((index + 1) % 4 - 1.5) * 0.025)));
      return {
        category,
        risk,
        probability: null,
        impact: null,
        score: null,
        assessmentStatus: 'hazard_identification_only',
        researchPriorityIndex: Math.round(probability * impact * 100) / 100,
        mitigation,
        trainingSamples: prediction.trainingRecords,
        projectSpecific: Boolean((specific[prediction.projectType] || []).some(item => item[0] === category))
      };
    });
    const riskLevel = baseScore >= 0.60 ? 'High' : baseScore >= 0.35 ? 'Medium' : 'Low';
    return {
      risks: risks.slice(0, 10).map(r => ({ ...r, researchPriorityIndex: r.score, probability: null, impact: null, score: null })),
      overallRiskScore: null,
      riskRange: null,
      riskLevel: null,
      researchIndicator: { score: Math.round(baseScore * 100) / 100, band: riskLevel, range: prediction.intervals.riskScore,
        meaning: 'synthetic_prior_index_not_event_probability', fieldCalibrated: false },
      totalRisksInTraining: prediction.trainingRecords,
      projectSpecificData: prediction.trainingRecords,
      modelId: prediction.modelId,
      projectType: prediction.projectType,
      status: 'experimental',
      dataProvenance: prediction.dataProvenance,
      contractualUse: false,
      suitableForModelApproval: false,
      requiresHumanReview: true,
      limitations: prediction.limitations
    };
  }

  getRiskTrends(projectId) {
    const projRisks = this.risks.filter(r => r.projectId === projectId);
    const byCat = {};
    projRisks.forEach(r => {
      if (!byCat[r.category]) byCat[r.category] = [];
      byCat[r.category].push(r);
    });
    return Object.entries(byCat).map(([cat, items]) => ({
      category: cat,
      count: items.length,
      avgScore: items.reduce((s, r) => s + (r.probability / 5) * (r.impact / 5), 0) / items.length,
      topRisks: items.slice(0, 3).map(r => r.description)
    }));
  }
}

module.exports = new RiskAnalyzer();
