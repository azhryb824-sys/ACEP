"use strict";
const fs = require('fs');
const crypto = require('crypto');
const { runtimePath } = require('../../runtime/paths');
const { writeFileAtomic, writeJsonAtomic } = require('../../runtime/atomic-json-store');
const { parseRows } = require('../../ai-engine/models/csv-rows');
const sha = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
const TABLES = ['projects', 'boqItems', 'materialPrices', 'laborRates', 'equipmentRates', 'suppliers', 'risks', 'qualityDefects'];
function createSnapshot(uets) {
  const egts = uets.getAllEGT();
  if (!egts.length) throw new Error('UETS has no source records');
  if (egts.some(e => e.geometry?.areaBasis !== 'gross_floor_area')) throw new Error('UETS source area basis is unverified; re-import from the original source');
  const records = egts.map(e => typeof e.toJSON === 'function' ? e.toJSON() : e);
  const source = records.map(e => JSON.stringify(e)).join('\n') + '\n';
  const sourceSha256 = sha(source), id = 'snapshot-' + sourceSha256;
  const manifestPath = runtimePath('uets', 'snapshots', id, 'manifest.json');
  if (fs.existsSync(manifestPath)) { loadSnapshot(id); return id; }
  const tables = uets.generateCSVTrainingData(egts), files = {};
  writeFileAtomic(runtimePath('uets', 'snapshots', id, 'source.ndjson'), source);
  for (const name of TABLES) {
    const rows = tables[name];
    if (!rows?.length) continue;
    const columns = Object.keys(rows[0]);
    const escape = v => '"' + String(v ?? '').replace(/"/g, '""') + '"';
    const bytes = [columns.map(escape).join(','), ...rows.map(row => columns.map(k => escape(row[k])).join(','))].join('\n') + '\n';
    parseRows(bytes);
    writeFileAtomic(runtimePath('uets', 'snapshots', id, name + '.csv'), bytes);
    files[name] = { sha256: sha(bytes), rows: rows.length };
  }
  writeJsonAtomic(manifestPath, { schemaVersion: 1, id, sourceSha256, sourceRecords: records.length,
    files, createdAt: new Date().toISOString(), suitableForModelApproval: false, dataStatus: 'unverified' });
  return id;
}
function loadSnapshot(id) {
  if (!/^snapshot-[a-f0-9]{64}$/.test(id || '')) throw new Error('Invalid UETS snapshot identity');
  const manifest = JSON.parse(fs.readFileSync(runtimePath('uets', 'snapshots', id, 'manifest.json'), 'utf8'));
  if (sha(fs.readFileSync(runtimePath('uets', 'snapshots', id, 'source.ndjson'))) !== manifest.sourceSha256 || id !== 'snapshot-' + manifest.sourceSha256) throw new Error('UETS source checksum mismatch');
  const paths = {};
  for (const [name, record] of Object.entries(manifest.files)) {
    if (!TABLES.includes(name)) throw new Error('Unexpected UETS snapshot table');
    const file = runtimePath('uets', 'snapshots', id, name + '.csv');
    if (sha(fs.readFileSync(file)) !== record.sha256) throw new Error('UETS snapshot checksum mismatch: ' + name);
    paths[name] = file;
  }
  return { manifest, paths };
}
module.exports = { createSnapshot, loadSnapshot };
