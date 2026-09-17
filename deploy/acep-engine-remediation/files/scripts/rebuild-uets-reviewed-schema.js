'use strict';
// Regenerates research records from preserved raw CSV. It does not verify field truth.
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { EGTFactory } = require('../packages/uets/core/egt-factory');
const { UETSDatasetGenerator } = require('../packages/uets/dataset/generator');
const { parseRows } = require('../packages/ai-engine/models/csv-rows');
const root = path.join(__dirname, '..');
const base = path.join(root, 'packages/databases/training/csv');
const output = path.join(root, 'data/uets/jsonl');
const quarantine = path.join(root, 'data/uets/quarantine/pre-remediation-jsonl');
function read(name) { const [h, ...rows] = parseRows(fs.readFileSync(path.join(base, name), 'utf8')); return rows.map(r => Object.fromEntries(h.map((k, i) => [k, r[i]]))); }
function group(rows) { const result = new Map(); for (const row of rows) { if (!result.has(row.project_id)) result.set(row.project_id, []); result.get(row.project_id).push(row); } return result; }
function main() {
  const refresh = process.argv.includes('--refresh-generated');
  if (fs.existsSync(quarantine) && (!refresh || !fs.existsSync(path.join(output, 'rebuild-report.json')))) throw new Error('Legacy quarantine already exists; explicit refresh of generated records is required');
  const hashes = {};
  for (const file of fs.readdirSync(base).filter(n => n.endsWith('.csv'))) hashes[file] = crypto.createHash('sha256').update(fs.readFileSync(path.join(base, file))).digest('hex');
  const factory = new EGTFactory();
  const boq = group(read('boq_items.csv')), risks = group(read('risks.csv')), defects = group(read('quality_defects.csv'));
  const egts = read('projects.csv').map(row => {
    const e = factory.fromCSVProject(row);
    e.uuid = 'csv-' + row.project_id; // Stable grouping across every domain and rebuild.
    e.boq = (boq.get(row.project_id) || []).map(r => factory.fromCSVBOQItem(r));
    e.risks = (risks.get(row.project_id) || []).map(r => factory.fromCSVRisk(r));
    e.quality.defectTypes = (defects.get(row.project_id) || []).map(r => factory.fromCSVQualityDefect(r));
    e.quality.expectedDefects = e.quality.defectTypes.length;
    return e;
  });
  fs.mkdirSync(path.dirname(quarantine), { recursive: true });
  if (!fs.existsSync(quarantine)) fs.renameSync(output, quarantine);
  const result = new UETSDatasetGenerator(null, {generatedAt: "2026-09-17T00:00:00.000Z"}).writeJSONLToDisk(output, egts, { seed: 'acep-uets-repair-v3' });
  const report = { schemaVersion: 3, originalProjectRecords: egts.length, sourceSha256: hashes, result,
    dataStatus: 'unverified_legacy_source', suitableForModelApproval: false,
    quarantineReason: 'Incorrect area denominator, duplicate examples, uncalibrated labels and incomplete lineage',
    independentReview: 'required' };
  fs.writeFileSync(path.join(output, 'rebuild-report.json'), JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report, null, 2));
}
if (require.main === module) main();
module.exports = { main };
