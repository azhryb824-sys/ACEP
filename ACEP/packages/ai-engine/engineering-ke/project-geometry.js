/** Convert area inputs once at public engine boundaries. KB area is per floor. */
function normalizeGeometry(input) {
  const areaBasisAssumed = input.areaBasis === undefined || input.areaBasis === null;
  const inputAreaBasis = areaBasisAssumed ? 'per_floor' : input.areaBasis;
  if (!['per_floor', 'total_built_up'].includes(inputAreaBasis)) {
    throw new RangeError('areaBasis must be per_floor or total_built_up; land area is not a building footprint');
  }
  const present = value => value !== undefined && value !== null;
  if (present(input.area) && (!Number.isFinite(input.area) || input.area <= 0)) {
    throw new RangeError('area must be a positive finite number in m2');
  }
  if (present(input.floors) && (!Number.isInteger(input.floors) || input.floors <= 0)) {
    throw new RangeError('floors must be a positive integer');
  }
  if (inputAreaBasis === 'total_built_up' && (!present(input.area) || !present(input.floors))) {
    throw new RangeError('total_built_up area requires explicit area and floors');
  }
  const area = inputAreaBasis === 'total_built_up' ? input.area / input.floors : input.area;
  if (present(area) && present(input.floors) && !Number.isFinite(area * input.floors)) {
    throw new RangeError('area * floors must be finite');
  }
  return {
    params: { ...input, area, areaBasis: 'per_floor' },
    geometry: {
      inputAreaBasis,
      areaBasisAssumed,
      inputAreaM2: input.area ?? null,
      perFloorAreaM2: area ?? null,
      totalBuiltUpAreaM2: present(area) && present(input.floors) ? area * input.floors : null,
      floors: input.floors ?? null,
      equalFloorAreasAssumed: true,
      measuredGeometryVerified: false,
    },
  };
}
module.exports = { normalizeGeometry };
