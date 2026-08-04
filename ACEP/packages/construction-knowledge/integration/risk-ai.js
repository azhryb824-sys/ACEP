class RiskAIIntegration {
  constructor(kb) {
    this.kb = kb;
  }

  analyze(projectData) {
    const type = this.kb.getProjectType(projectData.type);
    const complexity = type?.complexity || 5;
    const risks = [];

    if (complexity >= 8) {
      risks.push({ category: 'Technical', risk: 'High complexity increases design and construction risks', probability: 0.7, impact: 'High', mitigation: 'Engage specialized consultants' });
    }
    if ((projectData.area || 0) > 5000) {
      risks.push({ category: 'Schedule', risk: 'Large area project may face schedule overruns', probability: 0.6, impact: 'High', mitigation: 'Phase the project and use fast-track methods' });
    }
    if ((projectData.floors || 0) > 10) {
      risks.push({ category: 'Structural', risk: 'High-rise structure requires special engineering', probability: 0.5, impact: 'High', mitigation: 'Use specialized structural engineers for wind and seismic loads' });
    }

    const scheduleData = this.kb.getScheduleData();
    const criticalPath = scheduleData?.getCriticalPath() || [];
    const totalDuration = criticalPath.reduce((s, t) => s + (t.duration || 0), 0);
    const totalDelay = criticalPath.reduce((s, t) => s + (t.expectedDelay || 0), 0);

    risks.push({
      category: 'Schedule',
      risk: `Critical path duration ~${totalDuration} days with ~${totalDelay} days expected delays`,
      probability: 0.6,
      impact: 'Medium',
      mitigation: 'Monitor critical path activities closely and allocate buffers',
    });

    return {
      risks,
      riskScore: Math.min(100, complexity * 10 + risks.length * 5),
      criticalPath: criticalPath.map(t => t.name),
      totalDuration,
      expectedDelay: totalDelay,
    };
  }
}

module.exports = { RiskAIIntegration };
