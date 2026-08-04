/**
 * ACEP BOQ Engine — Project Type Coverage Test
 *
 * Validates that all project types produce valid BOQs.
 */

const BOQEngine = require('../engineering-ke/boq-engine');
const KB = require('../engineering-ke/boq-knowledge-base');

let passed = 0;
let failed = 0;

function assert(condition, msg) {
  if (condition) { passed++; } else { console.error('  ✗ FAIL:', msg); failed++; }
}

const engine = new BOQEngine();

const ALL_TYPES = [
  { type: 'Apartment_Finishing', desc: 'تشطيب شقة 150 متر 3 غرف', area: 150, floors: 1, rooms: 3, bathrooms: 2, hasKitchen: true },
  { type: 'Apartment_Building', desc: 'عمارة سكنية 5 أدوار', area: 500, floors: 5, rooms: 10, bathrooms: 10, hasKitchen: true },
  { type: 'Villa', desc: 'فيلا دورين مساحة 400 متر', area: 400, floors: 2, rooms: 5, bathrooms: 3, hasKitchen: true },
  { type: 'Luxury_Villa', desc: 'فيلا فاخرة مساحة 800 متر', area: 800, floors: 2, rooms: 7, bathrooms: 5, hasKitchen: true },
  { type: 'School', desc: 'مدرسة حكومية 3000 متر', area: 3000, floors: 3, rooms: 30, bathrooms: 20 },
  { type: 'Hospital', desc: 'مستشفى عام 5000 متر', area: 5000, floors: 5, rooms: 100, bathrooms: 50 },
  { type: 'Residential_Tower', desc: 'برج سكني 15 دور', area: 800, floors: 15, rooms: 120, bathrooms: 80 },
  { type: 'Hotel', desc: 'فندق 4 نجوم 2000 متر', area: 2000, floors: 8, rooms: 80, bathrooms: 80, hasKitchen: true },
  { type: 'Mall', desc: 'مركز تجاري 10000 متر', area: 10000, floors: 3, rooms: 50, bathrooms: 30 },
  { type: 'Office_Building', desc: 'مبنى إداري 2000 متر', area: 2000, floors: 6, rooms: 40, bathrooms: 20 },
  { type: 'Factory', desc: 'مصنع انتاجي 5000 متر', area: 5000, floors: 2, rooms: 10, bathrooms: 8 },
  { type: 'Mosque', desc: 'مسجد جامع 1000 متر', area: 1000, floors: 2, rooms: 5, bathrooms: 10 },
  { type: 'Warehouse', desc: 'مستودع تخزين 3000 متر', area: 3000, floors: 1, rooms: 5, bathrooms: 4 },
  { type: 'Residential_Compound', desc: 'مجمع سكني 10000 متر', area: 10000, floors: 2, rooms: 60, bathrooms: 40 },
];

console.log('📋 Testing BOQ generation for ALL project types...\n');

const results = [];
let totalItems = 0;
let totalInsufficient = 0;

for (const t of ALL_TYPES) {
  const result = engine.generate(t, { byCategory: {} });
  const confirmed = result.items.filter(i => !i.insufficient);
  const insufficient = result.items.filter(i => i.insufficient);
  const phases = result.lifecyclePhases.map(p => p.name).join(', ');

  assert(confirmed.length > 0, `${t.type} generates confirmed items`);
  assert(result.summary.totalCost > 0, `${t.type} has total cost > 0`);
  assert(result.lifecyclePhases.length > 0, `${t.type} has lifecycle phases`);

  // Check phase integrity
  for (const item of confirmed) {
    assert(item.phase && item.phaseName, `${t.type}: ${item.code} has phase`);
    assert(item.trade && item.tradeName, `${t.type}: ${item.code} has trade`);
    assert(item.element, `${t.type}: ${item.code} has element`);
    assert(item.material, `${t.type}: ${item.code} has material`);
    assert(item.additionReason, `${t.type}: ${item.code} has additionReason`);
    assert(item.formula, `${t.type}: ${item.code} has formula`);
  }

  results.push({ type: t.type, confirmed: confirmed.length, suggested: result.summary.suggestedCount, insufficient: insufficient.length, cost: result.summary.totalCost, phases: result.lifecyclePhases.length });
  totalItems += confirmed.length;
  totalInsufficient += insufficient.length;
}

console.log(`${'═'.repeat(70)}`);
console.log('نتائج جميع أنواع المشاريع:');
console.log(`${'═'.repeat(70)}`);
console.log('نوع المشروع'.padEnd(25), 'بنود'.padEnd(6), 'مقترحة'.padEnd(8), 'ناقصة'.padEnd(8), 'مراحل'.padEnd(6), 'التكلفة');
console.log('-'.repeat(70));
for (const r of results.sort((a, b) => a.confirmed - b.confirmed)) {
  console.log(r.type.padEnd(25), String(r.confirmed).padEnd(6), String(r.suggested).padEnd(8), String(r.insufficient).padEnd(8), String(r.phases).padEnd(6), Math.round(r.cost).toLocaleString() + ' SAR');
}
console.log('-'.repeat(70));
console.log('المجموع:'.padEnd(25), String(totalItems).padEnd(6), ''.padEnd(8), String(totalInsufficient).padEnd(8), `${ALL_TYPES.length} types`);

// Assert that all 14 types produce different item counts (truly dynamic)
const counts = results.map(r => r.confirmed);
const uniqueCounts = new Set(counts);
assert(uniqueCounts.size > 5, `At least 6 different item counts (got ${uniqueCounts.size})`);

// Assert every type has at least one phase
for (const r of results) {
  assert(r.phases > 0, `${r.type} has phases`);
}

console.log(`\n✅ ${passed} tests passed, ${failed} tests failed`);
process.exit(failed > 0 ? 1 : 0);
