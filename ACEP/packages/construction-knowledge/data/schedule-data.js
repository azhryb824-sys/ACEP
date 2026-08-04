class ScheduleDatabase {
  constructor() {
    this.tasks = [];
    this._initDefaults();
  }

  _initDefaults() {
    this.tasks = [
      { id: 'SCH-001', name: 'Site Preparation', elementTypes: ['foundation'], duration: 10, unit: 'days', predecessors: [], successors: ['SCH-002'], category: 'Site Work', expectedDelay: 2 },
      { id: 'SCH-002', name: 'Excavation', elementTypes: ['foundation'], duration: 15, unit: 'days', predecessors: ['SCH-001'], successors: ['SCH-003'], category: 'Site Work', expectedDelay: 3 },
      { id: 'SCH-003', name: 'Foundation Reinforcement', elementTypes: ['foundation'], duration: 12, unit: 'days', predecessors: ['SCH-002'], successors: ['SCH-004'], category: 'Concrete', expectedDelay: 2 },
      { id: 'SCH-004', name: 'Foundation Concrete Pouring', elementTypes: ['foundation'], duration: 5, unit: 'days', predecessors: ['SCH-003'], successors: ['SCH-005'], category: 'Concrete', expectedDelay: 1 },
      { id: 'SCH-005', name: 'Curing Period', elementTypes: ['foundation'], duration: 7, unit: 'days', predecessors: ['SCH-004'], successors: ['SCH-006'], category: 'Concrete', expectedDelay: 0 },
      { id: 'SCH-006', name: 'Column Reinforcement', elementTypes: ['column'], duration: 14, unit: 'days', predecessors: ['SCH-005'], successors: ['SCH-007'], category: 'Concrete', expectedDelay: 2 },
      { id: 'SCH-007', name: 'Column Formwork & Pouring', elementTypes: ['column'], duration: 10, unit: 'days', predecessors: ['SCH-006'], successors: ['SCH-008'], category: 'Concrete', expectedDelay: 2 },
      { id: 'SCH-008', name: 'Beam & Slab Formwork', elementTypes: ['beam', 'slab'], duration: 18, unit: 'days', predecessors: ['SCH-007'], successors: ['SCH-009'], category: 'Concrete', expectedDelay: 3 },
      { id: 'SCH-009', name: 'Beam & Slab Reinforcement', elementTypes: ['beam', 'slab'], duration: 15, unit: 'days', predecessors: ['SCH-008'], successors: ['SCH-010'], category: 'Concrete', expectedDelay: 2 },
      { id: 'SCH-010', name: 'Beam & Slab Concrete Pouring', elementTypes: ['beam', 'slab'], duration: 6, unit: 'days', predecessors: ['SCH-009'], successors: ['SCH-011'], category: 'Concrete', expectedDelay: 1 },
      { id: 'SCH-011', name: 'Curing (Slabs)', elementTypes: ['slab'], duration: 7, unit: 'days', predecessors: ['SCH-010'], successors: ['SCH-012'], category: 'Concrete', expectedDelay: 0 },
      { id: 'SCH-012', name: 'Masonry Walls (Ground Floor)', elementTypes: ['wall'], duration: 20, unit: 'days', predecessors: ['SCH-011'], successors: ['SCH-013'], category: 'Masonry', expectedDelay: 3 },
      { id: 'SCH-013', name: 'Masonry Walls (Upper Floors)', elementTypes: ['wall'], duration: 18, unit: 'days', predecessors: ['SCH-012'], successors: ['SCH-014'], category: 'Masonry', expectedDelay: 3 },
      { id: 'SCH-014', name: 'Door & Window Installation', elementTypes: ['door', 'window'], duration: 12, unit: 'days', predecessors: ['SCH-013'], successors: ['SCH-015'], category: 'Doors', expectedDelay: 2 },
      { id: 'SCH-015', name: 'Plastering', elementTypes: ['wall', 'ceiling'], duration: 25, unit: 'days', predecessors: ['SCH-014'], successors: ['SCH-016'], category: 'Plaster', expectedDelay: 4 },
      { id: 'SCH-016', name: 'Electrical Rough-In', elementTypes: ['electrical_cable'], duration: 18, unit: 'days', predecessors: ['SCH-015'], successors: ['SCH-017'], category: 'Electrical', expectedDelay: 3 },
      { id: 'SCH-017', name: 'Plumbing Rough-In', elementTypes: ['plumbing_pipe'], duration: 15, unit: 'days', predecessors: ['SCH-015'], successors: ['SCH-018'], category: 'Plumbing', expectedDelay: 3 },
      { id: 'SCH-018', name: 'HVAC Installation', elementTypes: ['hvac', 'duct'], duration: 20, unit: 'days', predecessors: ['SCH-015'], successors: ['SCH-019'], category: 'HVAC', expectedDelay: 4 },
      { id: 'SCH-019', name: 'Ceiling Installation', elementTypes: ['ceiling', 'gypsum'], duration: 15, unit: 'days', predecessors: ['SCH-016', 'SCH-017', 'SCH-018'], successors: ['SCH-020'], category: 'Ceilings', expectedDelay: 2 },
      { id: 'SCH-020', name: 'Floor Tiling', elementTypes: ['tiles', 'flooring'], duration: 20, unit: 'days', predecessors: ['SCH-019'], successors: ['SCH-021'], category: 'Flooring', expectedDelay: 3 },
      { id: 'SCH-021', name: 'Painting (Internal)', elementTypes: ['wall', 'ceiling'], duration: 18, unit: 'days', predecessors: ['SCH-019'], successors: ['SCH-022'], category: 'Painting', expectedDelay: 3 },
      { id: 'SCH-022', name: 'Fire Fighting Installation', elementTypes: ['fire_sprinkler', 'fire_extinguisher'], duration: 12, unit: 'days', predecessors: ['SCH-019'], successors: ['SCH-023'], category: 'Fire Fighting', expectedDelay: 2 },
      { id: 'SCH-023', name: 'Fire Alarm Installation', elementTypes: ['fire_alarm_device'], duration: 10, unit: 'days', predecessors: ['SCH-019'], successors: ['SCH-024'], category: 'Fire Alarm', expectedDelay: 2 },
      { id: 'SCH-024', name: 'Low Current Systems', elementTypes: ['camera', 'data_cable'], duration: 10, unit: 'days', predecessors: ['SCH-019'], successors: ['SCH-025'], category: 'Low Current', expectedDelay: 2 },
      { id: 'SCH-025', name: 'Facade & External Works', elementTypes: ['facade', 'insulation', 'waterproofing'], duration: 22, unit: 'days', predecessors: ['SCH-020', 'SCH-021'], successors: ['SCH-026'], category: 'Facade', expectedDelay: 4 },
      { id: 'SCH-026', name: 'Furnishing & Fit-Out', elementTypes: ['door', 'stairs'], duration: 25, unit: 'days', predecessors: ['SCH-025'], successors: ['SCH-027'], category: 'Finishing', expectedDelay: 4 },
      { id: 'SCH-027', name: 'Testing & Commissioning', elementTypes: [], duration: 15, unit: 'days', predecessors: ['SCH-022', 'SCH-023', 'SCH-024', 'SCH-026'], successors: ['SCH-028'], category: 'Testing', expectedDelay: 3 },
      { id: 'SCH-028', name: 'Final Handover', elementTypes: [], duration: 5, unit: 'days', predecessors: ['SCH-027'], successors: [], category: 'Handover', expectedDelay: 1 },
    ];
  }

  getTask(id) {
    return this.tasks.find(t => t.id === id);
  }

  getTasksByElementType(elementType) {
    return this.tasks.filter(t => t.elementTypes.includes(elementType));
  }

  getCriticalPath() {
    const sorted = this._topologicalSort();
    const dist = {};
    const prev = {};
    for (const t of sorted) { dist[t.id] = 0; prev[t.id] = null; }
    for (const t of sorted) {
      for (const sId of t.successors) {
        const s = this.getTask(sId);
        if (s && dist[s.id] < dist[t.id] + t.duration) {
          dist[s.id] = dist[t.id] + t.duration;
          prev[s.id] = t.id;
        }
      }
    }
    let maxId = sorted.reduce((a, b) => dist[a.id] > dist[b.id] ? a.id : b.id, sorted[0]?.id);
    const path = [];
    while (maxId) { path.unshift(maxId); maxId = prev[maxId]; }
    return path.map(id => this.getTask(id)).filter(Boolean);
  }

  _topologicalSort() {
    const visited = new Set();
    const result = [];
    const visit = (id) => {
      if (visited.has(id)) return;
      visited.add(id);
      const task = this.getTask(id);
      if (task) {
        for (const pId of task.predecessors) visit(pId);
        result.push(task);
      }
    };
    for (const t of this.tasks) { if (t.predecessors.length === 0) visit(t.id); }
    const added = new Set(result.map(t => t.id));
    for (const t of this.tasks) { if (!added.has(t.id)) result.push(t); }
    return result;
  }

  search(query) {
    const q = query.toLowerCase();
    return this.tasks.filter(t =>
      t.name.toLowerCase().includes(q) || t.id.toLowerCase().includes(q) || t.category.toLowerCase().includes(q)
    );
  }
}

module.exports = { ScheduleDatabase };
