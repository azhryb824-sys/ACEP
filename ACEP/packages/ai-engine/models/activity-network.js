'use strict';

// Explicit finish-to-start networks; durations and lags use one common time unit.
// Resource limits, external deadlines, work calendars and other relationship
// types require additional input and are deliberately not inferred here.
function analyzeActivityNetwork(activities) {
  if (!Array.isArray(activities) || activities.length === 0) {
    throw new TypeError('A non-empty activity array is required');
  }
  const nodes = new Map();
  const time = (value) => {
    if (!Number.isSafeInteger(value) || value < 0) throw new RangeError('Time must be a nonnegative safe integer');
    return value;
  };
  for (const item of activities) {
    if (!item || typeof item.id !== 'string' || !item.id.trim()) throw new TypeError('Activity id is required');
    if (nodes.has(item.id)) throw new Error(`Duplicate activity: ${item.id}`);
    if (!Array.isArray(item.predecessors)) throw new TypeError(`Explicit predecessors required: ${item.id}`);
    const predecessors = item.predecessors.map(p => {
      if (typeof p === 'string') return { id: p, lag: 0 };
      if (!p || typeof p.id !== 'string' || (p.type !== undefined && p.type !== 'FS')) throw new TypeError('Only finish-to-start relationships are supported');
      return { id: p.id, lag: time(p.lag === undefined ? 0 : p.lag) };
    });
    if (new Set(predecessors.map(p => p.id)).size !== predecessors.length) throw new Error(`Duplicate predecessor: ${item.id}`);
    nodes.set(item.id, { id: item.id, name: item.name, duration: time(item.duration), predecessors, successors: [], remaining: predecessors.length });
  }
  for (const n of nodes.values()) for (const p of n.predecessors) {
    if (!nodes.has(p.id)) throw new Error(`Unknown predecessor: ${p.id}`);
    nodes.get(p.id).successors.push({ id: n.id, lag: p.lag });
  }
  const queue = [...nodes.values()].filter(n => n.remaining === 0);
  const order = [];
  let totalDuration = 0;
  for (let i = 0; i < queue.length; i++) {
    const n = queue[i];
    n.earlyStart = 0;
    for (const p of n.predecessors) n.earlyStart = Math.max(n.earlyStart, time(nodes.get(p.id).earlyFinish + p.lag));
    n.earlyFinish = time(n.earlyStart + n.duration);
    totalDuration = Math.max(totalDuration, n.earlyFinish);
    order.push(n);
    for (const s of n.successors) {
      const next = nodes.get(s.id);
      if (--next.remaining === 0) queue.push(next);
    }
  }
  if (order.length !== nodes.size) throw new Error('Activity network contains a cycle');
  for (let i = order.length - 1; i >= 0; i--) {
    const n = order[i];
    n.lateFinish = totalDuration;
    let successorStart = totalDuration;
    for (const s of n.successors) {
      const next = nodes.get(s.id);
      n.lateFinish = Math.min(n.lateFinish, next.lateStart - s.lag);
      successorStart = Math.min(successorStart, next.earlyStart - s.lag);
    }
    n.lateStart = time(n.lateFinish - n.duration);
    n.totalFloat = time(n.lateStart - n.earlyStart);
    n.freeFloat = time(successorStart - n.earlyFinish);
  }
  const criticalActivities = order.filter(n => n.totalFloat === 0).map(n => n.id);
  const criticalEdges = [];
  for (const n of order) for (const s of n.successors) {
    const next = nodes.get(s.id);
    if (n.totalFloat === 0 && next.totalFloat === 0 && n.earlyFinish + s.lag === next.earlyStart) {
      criticalEdges.push({ from: n.id, to: next.id, lag: s.lag });
    }
  }
  return {
    activities: order.map(({ successors, remaining, ...n }) => ({ ...n, startDay: n.earlyStart, finishDay: n.earlyFinish })),
    totalDuration, criticalActivities, criticalEdges,
    schedulingBasis: 'explicit_finish_to_start_network',
    timeBasis: 'caller_supplied_uniform_units',
    estimateStatus: 'deterministic_network_calculation',
    resourceFeasible: null, confidence: null, confidenceCalibrated: false,
    requiresScheduleReview: true
  };
}

module.exports = { analyzeActivityNetwork };
