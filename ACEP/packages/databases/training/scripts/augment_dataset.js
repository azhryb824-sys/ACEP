/**
 * ACEP Dataset Augmentation Script
 * Expands datasets from 10K to 100K+ using SMOTE-like techniques
 * 
 * Usage: node augment_dataset.js [--target=100000]
 */

const fs = require('fs');
const path = require('path');

const CSV_DIR = path.join(__dirname, '..', 'csv');
const JSON_DIR = path.join(__dirname, '..', 'json');

function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

// Augment numeric field with Gaussian noise
function jitter(value, percent) {
  if (value === null || value === undefined || value === '') return value;
  const num = parseFloat(value);
  if (isNaN(num)) return value;
  const u1 = Math.random();
  const u2 = Math.random();
  const z = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
  const noise = num * (percent / 100) * z;
  const result = num + noise;
  return result > 0 ? Math.round(result * 100) / 100 : num * 0.5;
}

// Augment categorical field - pick from nearby categories
function augmentCategory(val, allValues) {
  if (Math.random() > 0.7) {
    const similar = allValues.filter(v => v !== val);
    return similar[Math.floor(Math.random() * similar.length)];
  }
  return val;
}

// Augment by generating synthetic records from existing ones
function augmentCSV(filePath, targetRecords) {
  const content = fs.readFileSync(filePath, 'utf8');
  const lines = content.trim().split('\n');
  const header = lines[0];
  const dataLines = lines.slice(1);
  const currentCount = dataLines.length;

  if (currentCount >= targetRecords) {
    return { filePath, currentCount, targetRecords, action: 'skipped' };
  }

  const needed = targetRecords - currentCount;
  const cols = header.split(',');
  const records = dataLines.map(l => {
    const vals = [];
    let current = '';
    let inQuotes = false;
    for (const ch of l) {
      if (ch === '"') inQuotes = !inQuotes;
      else if (ch === ',' && !inQuotes) { vals.push(current); current = ''; }
      else current += ch;
    }
    vals.push(current);
    return vals;
  });

  // Detect column types
  const colTypes = cols.map((col, i) => {
    const sample = records.find(r => r[i] && r[i].trim() !== '');
    if (!sample) return 'string';
    const val = sample[i].trim();
    if (!isNaN(parseFloat(val)) && val !== '') return 'numeric';
    if (val === 'true' || val === 'false' || val === 'TRUE' || val === 'FALSE') return 'boolean';
    return 'string';
  });

  const newRecords = [];
  while (newRecords.length < needed) {
    const base = records[Math.floor(Math.random() * records.length)];
    const augmented = base.map((val, i) => {
      if (val === '' || val === null || val === undefined) return val;
      if (colTypes[i] === 'numeric') return jitter(val, Math.random() > 0.5 ? 10 : 20);
      if (colTypes[i] === 'boolean') return Math.random() > 0.5 ? 'true' : 'false';
      // String: small chance to modify
      if (Math.random() > 0.85) {
        const allVals = [...new Set(records.map(r => r[i]))].filter(v => v && v.trim());
        return allVals[Math.floor(Math.random() * allVals.length)];
      }
      return val;
    });
    newRecords.push(augmented);
  }

  // Interleave original + new for better distribution
  const allRecords = [];
  const maxLen = Math.max(records.length, newRecords.length);
  for (let i = 0; i < maxLen; i++) {
    if (i < records.length) allRecords.push(records[i]);
    if (i < newRecords.length) allRecords.push(newRecords[i]);
  }

  shuffle(allRecords);

  const output = header + '\n' + allRecords.map(r => r.join(',')).join('\n');
  fs.writeFileSync(filePath, '\ufeff' + output, 'utf8');

  return { filePath, currentCount, targetRecords, action: 'augmented', finalCount: allRecords.length };
}

async function main() {
  const args = process.argv.slice(2);
  const target = parseInt(args.find(a => a.startsWith('--target='))?.split('=')[1] || '100000', 10);

  console.log(`\n  🔄 ACEP Dataset Augmentation`);
  console.log(`  ───────────────────────────────`);
  console.log(`  🎯 Target: ${target.toLocaleString()} records per dataset\n`);

  const datasets = [
    { name: 'projects.csv', target },
    { name: 'boq_items.csv', target: target * 5 },
    { name: 'risks.csv', target: target * 3 },
    { name: 'quality_defects.csv', target: target * 2 },
    { name: 'project_understanding.csv', target }
  ];

  for (const ds of datasets) {
    const filePath = path.join(CSV_DIR, ds.name);
    if (!fs.existsSync(filePath)) {
      console.log(`  ⚠️  ${ds.name} not found, skipping`);
      continue;
    }
    const result = augmentCSV(filePath, ds.target);
    console.log(`  ${result.action === 'augmented' ? '✅' : '⏩'} ${ds.name}: ${result.currentCount.toLocaleString()} → ${(result.finalCount || result.currentCount).toLocaleString()}`);
  }

  console.log(`\n  ───────────────────────────────`);
  console.log(`  ✅ Augmentation complete\n`);
}

main().catch(console.error);
