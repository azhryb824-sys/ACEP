class ScheduleLinker {
  constructor(scene, structureGenerator) {
    this.scene = scene;
    this.structure = structureGenerator;
    this.schedule = null;
    this.currentTime = 0;
    this.phases = [
      { id: 'pre', name: 'قبل التنفيذ', start: 0, end: 0 },
      { id: 'foundation', name: 'التأسيس', start: 0, end: 10 },
      { id: 'structure', name: 'الهيكل', start: 10, end: 30 },
      { id: 'masonry', name: 'المباني', start: 30, end: 45 },
      { id: 'plaster', name: 'اللياسة', start: 45, end: 55 },
      { id: 'painting', name: 'الدهانات', start: 55, end: 65 },
      { id: 'ceramic', name: 'السيراميك', start: 65, end: 75 },
      { id: 'lighting', name: 'الإضاءة', start: 75, end: 82 },
      { id: 'furniture', name: 'الأثاث', start: 82, end: 92 },
      { id: 'delivery', name: 'بعد التسليم', start: 92, end: 100 },
    ];
    this._onTimeChange = null;
  }

  async loadSchedule(projectId) {
    try {
      const API = process.env.ACEP_API || 'http://localhost:3000';
      const res = await fetch(`${API}/api/v1/schedule/project/${projectId}`);
      if (res.ok) {
        this.schedule = await res.json();
        return this.schedule;
      }
    } catch (e) {
      console.warn('[ScheduleLinker] Could not load schedule:', e.message);
    }
    return null;
  }

  setTime(progress) {
    this.currentTime = Math.max(0, Math.min(100, progress));
    this._updateElementVisibility();
    if (this._onTimeChange) this._onTimeChange(this.currentTime);
  }

  onTimeChange(callback) {
    this._onTimeChange = callback;
  }

  _updateElementVisibility() {
    for (const elem of this.structure.elements) {
      const mesh = this.scene.getObjectById(elem.id);
      if (!mesh) continue;
      const elemPhase = this._getPhaseProgress(elem.phase);
      const visible = this.currentTime >= elemPhase.start && this.currentTime <= elemPhase.end;
      mesh.visible = visible;
      if (visible) {
        const phaseProgress = (this.currentTime - elemPhase.start) / (elemPhase.end - elemPhase.start);
        const color = mesh.material.color.clone();
        const brightness = 0.5 + phaseProgress * 0.5;
        mesh.material.color.setRGB(
          color.r * brightness,
          color.g * brightness,
          color.b * brightness
        );
      }
    }
  }

  _getPhaseProgress(phaseName) {
    const phaseMap = {
      'Structure': this.phases[2],
      'Finishing': this.phases[4],
      'MEP': this.phases[3],
      'Foundation': this.phases[1],
    };
    return phaseMap[phaseName] || this.phases[2];
  }

  getCurrentPhase() {
    for (const phase of this.phases) {
      if (this.currentTime >= phase.start && this.currentTime <= phase.end) {
        return phase;
      }
    }
    return this.phases[0];
  }

  getPhases() {
    return this.phases;
  }

  getElementSchedule(elementId) {
    const elem = this.structure.getElementById(elementId);
    if (!elem) return null;
    const phase = this._getPhaseProgress(elem.phase);
    return {
      start: phase.start,
      end: phase.end,
      duration: phase.end - phase.start,
      phase: elem.phase,
      status: this.currentTime >= phase.start ? (this.currentTime <= phase.end ? 'In Progress' : 'Completed') : 'Pending',
    };
  }
}

module.exports = { ScheduleLinker };
