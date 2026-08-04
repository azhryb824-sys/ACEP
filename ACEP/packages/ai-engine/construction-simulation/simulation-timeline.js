/**
 * ACEP Simulation Timeline — التحكم بالخط الزمني لفيديو المحاكاة
 *
 * يولد خطاً زمنياً من مراحل المشروع مع حسابات التقدم والتكلفة والبنود.
 */
class SimulationTimeline {
  constructor(fps = 30) {
    this.fps = fps;
  }

  /**
   * يولد خط زمني من مراحل المشروع
   */
  generateTimeline(stages, totalDuration = 365, totalFrames = null) {
    if (!stages || stages.length === 0) {
      return { stages: [], totalDays: 0, totalFrames: 0, fps: this.fps };
    }

    totalFrames = totalFrames || totalDuration * this.fps;
    const totalDays = stages.reduce((sum, s) => sum + (s.duration || 0), 0) || totalDuration;
    const weightSum = stages.reduce((sum, s) => sum + (s.weight || 1), 0);
    const fps = this.fps;

    let currentFrame = 0;
    let currentDay = 0;

    const timelineStages = stages.map((stage, index) => {
      const weight = stage.weight || 1;
      const stageDuration = stage.duration || Math.floor(totalDays / stages.length);
      const stageFrames = Math.round((weight / weightSum) * totalFrames);
      const startFrame = currentFrame;
      const endFrame = currentFrame + stageFrames - 1;
      const startDay = currentDay;
      const endDay = currentDay + stageDuration;

      const result = {
        id: stage.id || `stage_${index + 1}`,
        nameAr: stage.nameAr || `مرحلة ${index + 1}`,
        nameEn: stage.nameEn || `Stage ${index + 1}`,
        startFrame,
        endFrame,
        startDay,
        endDay,
        duration: stageDuration,
        progressWeight: weight / weightSum,
        cost: stage.cost || 0,
        itemsCount: stage.itemsCount || 0
      };

      currentFrame = endFrame + 1;
      currentDay = endDay;
      return result;
    });

    return {
      stages: timelineStages,
      totalDays,
      totalFrames: currentFrame,
      fps
    };
  }

  /**
   * يرجع المرحلة عند إطار معين
   */
  getStageAtFrame(timeline, frameNumber) {
    if (!timeline || !timeline.stages) return null;
    return timeline.stages.find(
      s => frameNumber >= s.startFrame && frameNumber <= s.endFrame
    ) || null;
  }

  /**
   * يرجع التقدم عند إطار معين
   */
  getProgressAtFrame(timeline, frameNumber, totalCost = 0) {
    if (!timeline || !timeline.stages || timeline.stages.length === 0) {
      return {
        progressPercentage: 0,
        month: 1,
        stage: null,
        costSpent: 0,
        costRemaining: totalCost,
        itemsCompleted: 0,
        itemsRemaining: 0,
        confidence: 0
      };
    }

    const stage = this.getStageAtFrame(timeline, frameNumber);
    if (!stage) {
      // قبل أو بعد كل المراحل
      const beforeStart = frameNumber < timeline.stages[0].startFrame;
      const progressPercentage = beforeStart ? 0 : 100;
      const lastStage = timeline.stages[timeline.stages.length - 1];
      return {
        progressPercentage,
        month: beforeStart ? 1 : Math.ceil(lastStage.endDay / 30),
        stage: null,
        costSpent: beforeStart ? 0 : totalCost,
        costRemaining: beforeStart ? totalCost : 0,
        itemsCompleted: beforeStart ? 0 : timeline.stages.reduce((s, st) => s + (st.itemsCount || 0), 0),
        itemsRemaining: beforeStart ? timeline.stages.reduce((s, st) => s + (st.itemsCount || 0), 0) : 0,
        confidence: beforeStart ? 0 : 100
      };
    }

    const localProgress = this.interpolateStageProgress(stage, frameNumber);
    const stagesBefore = timeline.stages.filter(s => s.endFrame < frameNumber);
    const stagesAllBefore = timeline.stages.filter(s => s.endFrame <= frameNumber);

    const costSpentBefore = stagesBefore.reduce((sum, s) => sum + (s.cost || 0), 0);
    const costInCurrent = (stage.cost || 0) * localProgress;
    const costSpent = costSpentBefore + costInCurrent;
    const costRemaining = Math.max(0, totalCost - costSpent);

    const itemsBefore = stagesBefore.reduce((sum, s) => sum + (s.itemsCount || 0), 0);
    const itemsInCurrent = (stage.itemsCount || 0) * localProgress;
    const itemsCompleted = itemsBefore + itemsInCurrent;
    const totalItems = timeline.stages.reduce((sum, s) => sum + (s.itemsCount || 0), 0);
    const itemsRemaining = Math.max(0, totalItems - itemsCompleted);

    const frameProgress = frameNumber / Math.max(timeline.totalFrames - 1, 1);
    const progressPercentage = Math.min(100, Math.round(frameProgress * 10000) / 100);

    const currentDay = stage.startDay + (stage.duration || 1) * localProgress;
    const month = Math.max(1, Math.ceil(currentDay / 30));

    const progressRange = 1 / Math.max(timeline.stages.length, 1);
    const confidence = Math.min(100, Math.round((50 + progressPercentage * 0.5) * 100) / 100);

    return {
      progressPercentage,
      month,
      stage: stage.id,
      costSpent: Math.round(costSpent * 100) / 100,
      costRemaining: Math.round(costRemaining * 100) / 100,
      itemsCompleted: Math.round(itemsCompleted),
      itemsRemaining: Math.round(itemsRemaining),
      confidence
    };
  }

  /**
   * يولد HTML للخط الزمني التفاعلي
   */
  getClickableTimelineHTML(timeline) {
    if (!timeline || !timeline.stages || timeline.stages.length === 0) {
      return '<div class="timeline-empty">لا توجد مراحل</div>';
    }

    const totalFrames = timeline.totalFrames || 1;
    const stagesHtml = timeline.stages.map((stage, index) => {
      const left = (stage.startFrame / totalFrames) * 100;
      const width = ((stage.endFrame - stage.startFrame + 1) / totalFrames) * 100;
      const colors = [
        '#2563eb', '#059669', '#d97706', '#dc2626',
        '#7c3aed', '#0891b2', '#be185d', '#65a30d'
      ];
      const color = colors[index % colors.length];
      return `
        <div class="timeline-stage" style="
          position: absolute; left: ${left}%; width: ${width}%;
          height: 100%; background: ${color}; opacity: 0.85;
          border-radius: 4px; cursor: pointer;
          display: flex; align-items: center; justify-content: center;
          font-size: 11px; color: white; overflow: hidden;
          transition: opacity 0.2s;
        " title="${stage.nameAr} (${stage.startDay}-${stage.endDay} يوم)"
          data-stage-id="${stage.id}"
          data-start-frame="${stage.startFrame}"
          data-end-frame="${stage.endFrame}"
          onclick="alert('${stage.nameAr}\\n${stage.nameEn}\\nمن يوم ${stage.startDay} إلى يوم ${stage.endDay}')">
          ${stage.nameAr}
        </div>`;
    }).join('');

    return `
      <div class="simulation-timeline" style="
        position: relative; width: 100%; height: 40px;
        background: #1e293b; border-radius: 8px;
        overflow: hidden; margin: 10px 0;
      ">
        ${stagesHtml}
      </div>
      <div class="timeline-labels" style="
        display: flex; justify-content: space-between;
        font-size: 11px; color: #94a3b8; margin-top: 4px;
      ">
        <span>إطار 0</span>
        <span>إطار ${totalFrames - 1}</span>
      </div>
    `;
  }

  /**
   * يحسب التقدم داخل المرحلة بناءً على رقم الإطار
   */
  interpolateStageProgress(stage, frameNumber) {
    if (!stage) return 0;
    const { startFrame, endFrame } = stage;
    if (frameNumber <= startFrame) return 0;
    if (frameNumber >= endFrame) return 1;
    const range = endFrame - startFrame;
    if (range <= 0) return 1;
    return (frameNumber - startFrame) / range;
  }

  /**
   * يوزع التكلفة على المراحل حسب الوزن
   */
  calculateCostDistribution(stages, totalCost) {
    if (!stages || stages.length === 0 || !totalCost) {
      return stages ? stages.map(() => 0) : [];
    }
    const weightSum = stages.reduce((sum, s) => sum + (s.weight || 1), 0);
    return stages.map(s => ({
      stageId: s.id || s.nameEn,
      cost: Math.round((((s.weight || 1) / weightSum) * totalCost) * 100) / 100,
      percentage: Math.round((((s.weight || 1) / weightSum) * 100) * 100) / 100
    }));
  }

  /**
   * يوزع البنود على المراحل حسب الوزن
   */
  calculateItemDistribution(stages, totalItems) {
    if (!stages || stages.length === 0 || !totalItems) {
      return stages ? stages.map(() => 0) : [];
    }
    const weightSum = stages.reduce((sum, s) => sum + (s.weight || 1), 0);
    return stages.map(s => ({
      stageId: s.id || s.nameEn,
      items: Math.round(((s.weight || 1) / weightSum) * totalItems),
      percentage: Math.round((((s.weight || 1) / weightSum) * 100) * 100) / 100
    }));
  }
}

module.exports = SimulationTimeline;
