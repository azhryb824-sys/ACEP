'use strict';

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const { writeFileAtomic, writeJsonAtomic } = require('../packages/runtime/atomic-json-store');

const ROOT = path.resolve(__dirname, '..');
const UETS_ROOT = path.join(ROOT, 'data', 'uets', 'jsonl');
const SEED = process.env.ACEP_DATASET_SEED || 'acep-uets-v2';
const VALIDATION_RATIO = 0.1;

function readRows(filePath) {
  if (!fs.existsSync(filePath)) return [];
  return fs.readFileSync(filePath, 'utf8').split(/\r?\n/).filter(Boolean).map((line, index) => {
    try { return JSON.parse(line); }
    catch (error) { throw new Error(`${filePath}:${index + 1}: ${error.message}`); }
  });
}

function canonical(value) {
  if (Array.isArray(value)) return value.map(canonical);
  if (!value || typeof value !== 'object') return value;
  return Object.fromEntries(Object.keys(value).sort().filter(key => !['id', 'created', 'projectId'].includes(key)).map(key => [key, canonical(value[key])]));
}

function fingerprint(row) {
  return crypto.createHash('sha256').update(JSON.stringify(canonical(row))).digest('hex');
}

function score(groupKey) {
  return crypto.createHash('sha256').update(`${SEED}:${groupKey}`).digest().readUInt32BE(0) / 0x100000000;
}

function normalizeRow(row, domain, index) {
  const contentHash = fingerprint(row);
  return {
    ...row,
    id: `${domain}-${contentHash.slice(0, 16)}-${String(index).padStart(4, '0')}`,
    projectId: row.projectId || row.id || `legacy-${contentHash.slice(0, 16)}`,
    provenance: row.provenance || 'legacy-unverified',
    dataStatus: 'unverified',
    suitableForModelApproval: false,
    contractualUse: false,
    contentHash
  };
}

function writeRows(filePath, rows) {
  writeFileAtomic(filePath, rows.map(row => JSON.stringify(row)).join('\n') + (rows.length ? '\n' : ''));
}

function main() {
  throw new Error('Legacy content-only normalization is retired. Use node scripts/rebuild-uets-reviewed-schema.js --refresh-generated to preserve source-project grouping and correct labels.');
}

if (require.main === module) main();

module.exports = { canonical, fingerprint, normalizeRow };
