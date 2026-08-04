/**
 * ACEP BOQ Engine — Quantity Validation Tests
 *
 * Verifies that calculated quantities are reasonable for various project types.
 */

const BOQEngine = require('../engineering-ke/boq-engine');

let passed = 0;
let failed = 0;

function assert(condition, msg) {
  if (condition) { passed++; } else { console.error('  ✗ FAIL:', msg); failed++; }
}

const engine = new BOQEngine();

// ─── Test Scenarios ───
const scenarios = [
  // Small Villa 300m²
  {
    name: 'فيلا صغيرة 300م²',
    params: { type: 'Villa', area: 300, floors: 2, rooms: 4, bathrooms: 3, hasKitchen: true },
    checks: [
      { code: 'EXC-001', min: 50, max: 400, desc: 'حفر أساسات' },
      { code: 'FND-001', min: 10, max: 100, desc: 'قواعد أساسات' },
      { code: 'STR-001', min: 10, max: 100, desc: 'أعمدة خرسانية' },
      { code: 'MSN-001', min: 100, max: 3000, desc: 'بلوك الجدران' },
      { code: 'PLS-001', min: 100, max: 3000, desc: 'لياسة' },
      { code: 'PNT-001', min: 100, max: 3000, desc: 'دهان' },
      { code: 'TLF-001', min: 50, max: 500, desc: 'بلاط داخلي' },
      { code: 'ELC-001', min: 10, max: 150, desc: 'نقاط كهرباء' },
      { code: 'PLB-001', min: 5, max: 50, desc: 'نقاط سباكة' },
      { code: 'DR-001', min: 1, max: 30, desc: 'أبواب' },
      { code: 'WN-001', min: 1, max: 30, desc: 'شبابيك' },
    ],
  },
  // Large Villa 500m²
  {
    name: 'فيلا كبيرة 500م² دورين',
    params: { type: 'Villa', area: 500, floors: 2, rooms: 6, bathrooms: 4, hasKitchen: true },
    checks: [
      { code: 'EXC-001', min: 100, max: 600, desc: 'حفر' },
      { code: 'FND-001', min: 20, max: 200, desc: 'قواعد' },
      { code: 'MSN-001', min: 200, max: 5000, desc: 'بلوك' },
      { code: 'PLS-001', min: 200, max: 5000, desc: 'لياسة' },
      { code: 'TLF-001', min: 100, max: 800, desc: 'بلاط' },
      { code: 'ELC-001', min: 20, max: 250, desc: 'كهرباء' },
    ],
  },
  // Apartment 150m² Finishing
  {
    name: 'تشطيب شقة 150م²',
    params: { type: 'Apartment_Finishing', area: 150, floors: 1, rooms: 3, bathrooms: 2, hasKitchen: true },
    checks: [
      { code: 'PNT-001', min: 50, max: 1500, desc: 'دهان' },
      { code: 'TLF-001', min: 20, max: 300, desc: 'بلاط' },
      { code: 'TLF-003', min: 5, max: 100, desc: 'سيراميك حمامات' },
      { code: 'TLF-004', min: 5, max: 30, desc: 'سيراميك مطبخ' },
      { code: 'ELC-001', min: 5, max: 100, desc: 'نقاط كهرباء' },
      { code: 'DR-001', min: 1, max: 15, desc: 'أبواب' },
    ],
  },
  // School 2000m²
  {
    name: 'مدرسة 2000م²',
    params: { type: 'School', area: 2000, floors: 2, rooms: 20, bathrooms: 15 },
    checks: [
      { code: 'EXC-001', min: 200, max: 2000, desc: 'حفر' },
      { code: 'FND-001', min: 50, max: 1000, desc: 'قواعد' },
      { code: 'MSN-001', min: 300, max: 10000, desc: 'بلوك' },
      { code: 'PLS-001', min: 300, max: 10000, desc: 'لياسة' },
      { code: 'TLF-001', min: 200, max: 4000, desc: 'بلاط' },
      { code: 'ELC-001', min: 50, max: 600, desc: 'كهرباء' },
      { code: 'NET-001', min: 20, max: 500, desc: 'شبكة بيانات', suggested: true },
      { code: 'PLB-005', min: 1, max: 20, desc: 'غازات طبية', suggested: true },
    ],
  },
  // Hospital 5000m²
  {
    name: 'مستشفى 5000م²',
    params: { type: 'Hospital', area: 5000, floors: 5, rooms: 100, bathrooms: 50 },
    checks: [
      { code: 'EXC-001', min: 500, max: 2500, desc: 'حفر' },
      { code: 'STR-004', min: 10, max: 1000, desc: 'جدران قص' },
      { code: 'ELC-001', min: 100, max: 3000, desc: 'كهرباء' },
      { code: 'NET-001', min: 50, max: 2000, desc: 'شبكة بيانات' },
      { code: 'NET-002', min: 50, max: 3000, desc: 'إنذار حريق' },
      { code: 'PLB-005', min: 10, max: 2000, desc: 'غازات طبية', suggested: true },
      { code: 'HSP-001', min: 1, max: 3, desc: 'مولد احتياطي' },
      { code: 'HSP-002', min: 50, max: 150, desc: 'نظام اتصال مرضى' },
    ],
  },
  // Mosque 1000m²
  {
    name: 'مسجد 1000م²',
    params: { type: 'Mosque', area: 1000, floors: 2, rooms: 5, bathrooms: 10 },
    checks: [
      { code: 'EXC-001', min: 100, max: 1500, desc: 'حفر' },
      { code: 'MSQ-001', min: 50, max: 500, desc: 'سجاد قاعة الصلاة' },
      { code: 'MSQ-002', min: 1, max: 1, desc: 'محراب ومنبر' },
      { code: 'MSQ-003', min: 1, max: 2, desc: 'مئذنة' },
      { code: 'MSQ-004', min: 1, max: 1, desc: 'قبة' },
      { code: 'MSQ-005', min: 4, max: 50, desc: 'وضوء' },
      { code: 'MSQ-006', min: 1, max: 5, desc: 'نظام صوتي' },
    ],
  },
  // Warehouse 3000m²
  {
    name: 'مستودع 3000م²',
    params: { type: 'Warehouse', area: 3000, floors: 1, rooms: 5, bathrooms: 4 },
    checks: [
      { code: 'EXC-001', min: 1000, max: 8000, desc: 'حفر' },
      { code: 'MSN-001', min: 200, max: 4000, desc: 'بلوك' },
      { code: 'PLS-001', min: 200, max: 4000, desc: 'لياسة' },
      { code: 'EXT-001', min: 50, max: 500, desc: 'سور' },
      { code: 'NET-003', min: 4, max: 200, desc: 'كاميرات' },
    ],
  },
  // Residential Tower 15 floors
  {
    name: 'برج سكني 800م² 15 دور',
    params: { type: 'Residential_Tower', area: 800, floors: 15, rooms: 120, bathrooms: 80 },
    checks: [
      { code: 'STR-004', min: 10, max: 1000, desc: 'جدران قص' },
      { code: 'STR-007', min: 1, max: 6, desc: 'مصاعد' },
      { code: 'NET-001', min: 50, max: 1000, desc: 'شبكة بيانات' },
      { code: 'NET-003', min: 4, max: 300, desc: 'كاميرات' },
    ],
  },
];

console.log('📋 ENGINEERING QUANTITY VALIDATION');
console.log('─'.repeat(70));
console.log();

for (const scenario of scenarios) {
  console.log(`Scenario: ${scenario.name}`);
  console.log(`  Params: ${JSON.stringify(scenario.params)}`);

  const result = engine.generate(scenario.params, {});
  const items = result.items.filter(i => !i.insufficient);
  // Also search suggested items for low-confidence items
  const searchItems = [...items, ...result.suggestedItems];
  const itemMap = {};
  for (const item of searchItems) {
    itemMap[item.code] = item;
  }

  let scenarioPassed = 0;
  let scenarioFailed = 0;

  for (const check of scenario.checks) {
    const item = itemMap[check.code];
    if (!item) {
      if (check.suggested) {
        console.log(`  ~ ${check.code}: Not found (optional, ${check.desc})`);
        scenarioPassed++; passed++;
      } else {
        console.error(`  ✗ ${check.code}: Not found in generated BOQ (${check.desc})`);
        scenarioFailed++; failed++;
      }
      continue;
    }
    const qty = item.quantity;
    if (qty === null || qty === undefined) {
      console.error(`  ✗ ${check.code}: quantity is null/undefined (${check.desc})`);
      scenarioFailed++; failed++;
      continue;
    }
    if (qty >= check.min && qty <= check.max) {
      scenarioPassed++; passed++;
    } else {
      console.error(`  ✗ ${check.code}: ${qty} not in range [${check.min}, ${check.max}] (${check.desc})`);
      scenarioFailed++; failed++;
    }
  }

  if (scenarioFailed === 0) {
    console.log(`  ✓ ${scenarioPassed}/${scenario.checks.length} checks passed`);
  } else {
    console.log(`  ⚠ ${scenarioPassed}/${scenario.checks.length} passed, ${scenarioFailed} failed`);
  }
  console.log();
}

console.log('─'.repeat(70));
console.log(`✅ ${passed} tests passed, ${failed} tests failed`);
process.exit(failed > 0 ? 1 : 0);
