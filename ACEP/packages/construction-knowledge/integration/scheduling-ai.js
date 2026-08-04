class SchedulingAIIntegration {
  constructor(kb) {
    this.kb = kb;
  }

  generateSchedule(projectData) {
    const scheduleData = this.kb.getScheduleData();
    if (!scheduleData) return { tasks: [] };

    const scalingFactor = this._getScalingFactor(projectData);
    const tasks = scheduleData.tasks.map(t => ({
      ...t,
      adjustedDuration: Math.round(t.duration * scalingFactor),
      adjustedDelay: Math.round((t.expectedDelay || 0) * scalingFactor),
    }));

    const criticalPath = scheduleData.getCriticalPath();
    const totalDuration = tasks.reduce((s, t) => s + t.adjustedDuration, 0);

    return {
      tasks,
      criticalPath: criticalPath.map(t => t.name),
      totalDuration,
      scalingFactor,
      ganttData: tasks.map(t => ({
        id: t.id,
        name: t.name,
        duration: t.adjustedDuration,
        predecessors: t.predecessors,
        category: t.category,
      })),
    };
  }

  _getScalingFactor(projectData) {
    const area = projectData.area || 500;
    const floors = projectData.floors || 2;
    return Math.max(0.5, Math.min(2.5, (area / 500) * (floors / 2) * 0.5 + 0.5));
  }

  getElementSchedule(elementType) {
    const scheduleData = this.kb.getScheduleData();
    if (!scheduleData) return [];
    return scheduleData.getTasksByElementType(elementType);
  }
}

module.exports = { SchedulingAIIntegration };
