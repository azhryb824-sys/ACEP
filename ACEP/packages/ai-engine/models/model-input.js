// Shared direct-model boundary. Missing data is reviewable; invalid data is rejected.
function geometry(projectType, area, floors, { perFloor = false } = {}) {
  const missing = [];
  if (projectType == null || projectType === 'Unknown') missing.push('projectType');
  else if (typeof projectType !== 'string' || !projectType.trim()) throw new TypeError('Invalid projectType');
  if (area == null) missing.push('area');
  else if (typeof area !== 'number' || !Number.isFinite(area) || area <= 0 || area > Number.MAX_SAFE_INTEGER) throw new RangeError('Invalid area');
  if (floors == null) missing.push('floors');
  else if (!Number.isSafeInteger(floors) || floors < 1) throw new RangeError('Invalid floors');
  if (!missing.length && perFloor && (!Number.isFinite(area * floors) || area * floors > Number.MAX_SAFE_INTEGER)) throw new RangeError('Invalid total area');
  return missing;
}
function incomplete(missing) {
  return { insufficientData: true, estimateStatus: 'incomplete', requiresInputReview: true,
    missing, confidence: 0, confidenceCalibrated: false };
}
module.exports = { geometry, incomplete };
