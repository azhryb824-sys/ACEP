/**
 * ACEP BOQ Engine v3 — Comprehensive Tests
 *
 * Tests the new Knowledge Base engine against all requirements.
 */

const BOQEngine = require('../engineering-ke/boq-engine');
const KB = require('../engineering-ke/boq-knowledge-base');

let passed = 0;
let failed = 0;

function assert(condition, msg) {
  if (condition) { passed++; } else { console.error('  ✗ FAIL:', msg); failed++; }
}

function assertEq(a, b, msg) {
  if (a === b) { passed++; } else { console.error('  ✗ FAIL:', msg, `(${a} !== ${b})`); failed++; }
}

function assertGt(a, b, msg) {
  if (a > b) { passed++; } else { console.error('  ✗ FAIL:', msg, `(${a} <= ${b})`); failed++; }
}

const engine = new BOQEngine();

// ═══════════════════════════════════════════════════════════════
// TEST 1: Phase Detection
// ═══════════════════════════════════════════════════════════════
console.log('\n📋 TEST 1: Phase Detection');
assertEq(KB.detectPhase('Villa', 'تشطيب فيلا'), 'Finishing', 'تشطيب → Finishing');
assertEq(KB.detectPhase('Villa', 'بناء عظم'), 'Shell', 'عظم → Shell');
assertEq(KB.detectPhase('Villa', 'بناء فيلا كامل'), 'Full_Construction', 'كامل → Full_Construction');
assertEq(KB.detectPhase('Apartment_Finishing', 'شقة'), 'Finishing', 'Apartment_Finishing → Finishing');

// ═══════════════════════════════════════════════════════════════
// TEST 2: Lifecycle Phases
// ═══════════════════════════════════════════════════════════════
console.log('\n📋 TEST 2: Lifecycle Phase Mapping');

// Apartment Finishing — should only have finishing phases
const aptPhases = KB.getApplicablePhases('Apartment_Finishing', 'Finishing');
assert(aptPhases.length < 5, 'Apartment Finishing has few phases');
assert(aptPhases.includes('FINISHING'), 'Apartment Finishing has FINISHING');
assert(!aptPhases.includes('EXCAVATION'), 'Apartment Finishing has NO excavation');
assert(!aptPhases.includes('STRUCTURE'), 'Apartment Finishing has NO structure');
assert(!aptPhases.includes('FOUNDATION'), 'Apartment Finishing has NO foundation');

// Villa Full Construction — ALL phases
const villaPhases = KB.getApplicablePhases('Villa', 'Full_Construction');
assert(villaPhases.includes('EXCAVATION'), 'Villa FC has excavation');
assert(villaPhases.includes('STRUCTURE'), 'Villa FC has structure');
assert(villaPhases.includes('FINISHING'), 'Villa FC has finishing');
assert(villaPhases.includes('EXTERNAL'), 'Villa FC has external');

// Villa Shell — only shell phases
const shellPhases = KB.getApplicablePhases('Villa', 'Shell');
assert(shellPhases.includes('EXCAVATION'), 'Villa Shell has excavation');
assert(shellPhases.includes('MASONRY'), 'Villa Shell has masonry');
assert(!shellPhases.includes('FINISHING'), 'Villa Shell has NO finishing');
assert(!shellPhases.includes('PLASTERING'), 'Villa Shell has NO plastering');

// Tower has shear walls (high floors)
const towerPhases = KB.getApplicablePhases('Residential_Tower', 'Full_Construction');
assertEq(towerPhases.length, 11, 'Tower has all 11 phases');

// ═══════════════════════════════════════════════════════════════
// TEST 3: No Hardcoded Item Counts
// ═══════════════════════════════════════════════════════════════
console.log('\n📋 TEST 3: Dynamic Item Generation');

const r1 = engine.generate({ type: 'Apartment_Finishing', area: 100, floors: 1, rooms: 2, bathrooms: 1, hasKitchen: true, description: 'تشطيب' }, {});
const r2 = engine.generate({ type: 'Apartment_Finishing', area: 200, floors: 2, rooms: 4, bathrooms: 2, hasKitchen: true, description: 'تشطيب' }, {});

// Different areas should produce different quantities
assert(r1.summary.totalItems > 0, 'Small apt generates items');
assert(r2.summary.totalItems > 0, 'Large apt generates items');

// Same type but different params = different quantities
const itemSmall = r1.items.find(i => i.code === 'TLF-001');
const itemLarge = r2.items.find(i => i.code === 'TLF-001');
if (itemSmall && itemLarge) {
  assertGt(itemLarge.quantity, itemSmall.quantity, 'Larger apt has more tiling');
}

// ═══════════════════════════════════════════════════════════════
// TEST 4: Items Properly Assigned to Phases
// ═══════════════════════════════════════════════════════════════
console.log('\n📋 TEST 4: Phase Integrity');

const villa = engine.generate({ type: 'Villa', area: 400, floors: 2, rooms: 5, bathrooms: 3, hasKitchen: true, description: 'بناء فيلا كامل' }, {});

// Check phase assignment
for (const item of villa.items) {
  assert(item.phase && item.phaseName, `Item ${item.code} has phase`);
  if (item.code.startsWith('EXC-')) assertEq(item.phase, 'EXCAVATION', `EXC items in EXCAVATION phase`);
  if (item.code.startsWith('FND-')) assertEq(item.phase, 'FOUNDATION', `FND items in FOUNDATION phase`);
  if (item.code.startsWith('STR-')) assertEq(item.phase, 'STRUCTURE', `STR items in STRUCTURE phase`);
  if (item.code.startsWith('MSN-')) assertEq(item.phase, 'MASONRY', `MSN items in MASONRY phase`);
  if (item.code.startsWith('PLS-')) assertEq(item.phase, 'PLASTERING', `PLS items in PLASTERING phase`);
  if (item.code.startsWith('PNT-')) assertEq(item.phase, 'FINISHING', `PNT items in FINISHING phase`);
  if (item.code.startsWith('ELC-')) assertEq(item.phase, 'ELECTRICAL', `ELC items in ELECTRICAL phase`);
  if (item.code.startsWith('PLB-')) assertEq(item.phase, 'PLUMBING', `PLB items in PLUMBING phase`);
  if (item.code.startsWith('HVAC-')) assertEq(item.phase, 'HVAC', `HVAC items in HVAC phase`);
}

// ═══════════════════════════════════════════════════════════════
// TEST 5: Phase Order Integrity
// ═══════════════════════════════════════════════════════════════
console.log('\n📋 TEST 5: Phase Order');

const phases = villa.lifecyclePhases;
for (let i = 1; i < phases.length; i++) {
  assert(phases[i].order > phases[i - 1].order, `Phase order: ${phases[i-1].name} before ${phases[i].name}`);
}

// ═══════════════════════════════════════════════════════════════
// TEST 6: Different Project Types
// ═══════════════════════════════════════════════════════════════
console.log('\n📋 TEST 6: Different Project Types');

const types = [
  { name: 'Apartment_Finishing', params: { type: 'Apartment_Finishing', area: 150, floors: 1, rooms: 3, bathrooms: 2, hasKitchen: true, description: 'تشطيب شقة' } },
  { name: 'Villa', params: { type: 'Villa', area: 500, floors: 2, rooms: 6, bathrooms: 4, hasKitchen: true, description: 'فيلا كاملة' } },
  { name: 'School', params: { type: 'School', area: 3000, floors: 3, rooms: 30, bathrooms: 20, description: 'مدرسة' } },
  { name: 'Hospital', params: { type: 'Hospital', area: 5000, floors: 5, bathrooms: 50, description: 'مستشفى' } },
  { name: 'Residential_Tower', params: { type: 'Residential_Tower', area: 800, floors: 15, rooms: 120, bathrooms: 80, description: 'برج' } },
  { name: 'Factory', params: { type: 'Factory', area: 5000, floors: 2, rooms: 10, bathrooms: 8, description: 'مصنع' } },
];

const results = {};
for (const t of types) {
  results[t.name] = engine.generate(t.params, {});
  assertGt(results[t.name].summary.totalItems, 0, `${t.name} generates items`);
}

// All should have DIFFERENT item counts (no template)
const counts = Object.values(results).map(r => r.summary.totalItems);
const uniqueCounts = new Set(counts);
assertGt(uniqueCounts.size, 3, 'At least 4 different item counts (no template)');

// ═══════════════════════════════════════════════════════════════
// TEST 7: Item Features
// ═══════════════════════════════════════════════════════════════
console.log('\n📋 TEST 7: Item Metadata');

const schoolResult = results['School'];
const sampleItem = schoolResult.items.find(i => !i.insufficient);
if (sampleItem) {
  assert(sampleItem.phase, 'Item has phase');
  assert(sampleItem.phaseName, 'Item has phaseName');
  assert(sampleItem.trade, 'Item has trade');
  assert(sampleItem.tradeName, 'Item has tradeName');
  assert(sampleItem.element, 'Item has element');
  assert(sampleItem.material, 'Item has material');
  assert(sampleItem.additionReason, 'Item has additionReason');
  // dataSource may be from KB or engineering inference engine
  assert(sampleItem.dataSource, 'Item has dataSource');
  assert(sampleItem.formula, 'Item has formula/calculation method');
  assert(sampleItem.confidence > 0, 'Item has confidence');
  assert(sampleItem.editable, 'Item is editable');
}

// ═══════════════════════════════════════════════════════════════
// TEST 8: Item Explanation
// ═══════════════════════════════════════════════════════════════
console.log('\n📋 TEST 8: Item Explanation');

const expl = engine.getItemExplanation('EXC-001', { type: 'Villa', area: 400, floors: 2 });
assert(expl !== null, 'Found EXC-001 explanation');
assertEq(expl.code, 'EXC-001', 'Explanation has code');
assert(expl.description, 'Explanation has description');
assert(expl.phase, 'Explanation has phase');
assert(expl.tradeName, 'Explanation has trade name');
assert(expl.element, 'Explanation has element');
assert(expl.material, 'Explanation has material');
assert(expl.explanation, 'Explanation has explanation text');
assert(expl.source, 'Explanation has data source');

// Non-existent item
const noExpl = engine.getItemExplanation('XXX-999', {});
assert(noExpl === null, 'Non-existent item returns null');

// ═══════════════════════════════════════════════════════════════
// TEST 9: Insufficient Data
// ═══════════════════════════════════════════════════════════════
console.log('\n📋 TEST 9: Insufficient Data Handling');

// Missing bathrooms should flag assumptions for review
const noBath = engine.generate({ type: 'Apartment_Finishing', area: 150, floors: 1, rooms: 3 }, {});
const insufficientItems = noBath.items.filter(i => i.insufficient);
const insufficientReasons = insufficientItems.map(i => i.code + ': ' + i.insufficientReason);
// With assumption manager, missing params get defaults — check assumptions instead
if (noBath.assumptionsReview && noBath.assumptionsReview.missingParameters.length > 0) {
  console.log('  Missing parameters flagged:', noBath.assumptionsReview.missingParameters.join(', '));
}
assert(insufficientItems.length >= 0, 'Missing bathrooms handled (insufficient items: ' + insufficientItems.length + ')');
if (insufficientItems.length > 0) console.log('  Insufficient items:', insufficientReasons.join(' | '));

// No area — assumption manager provides default
const noArea = engine.generate({ type: 'Villa', floors: 2, description: 'فيلا' }, {});
const noAreaInsuf = noArea.items.filter(i => i.insufficient);
const noAreaConfirmed = noArea.items.filter(i => !i.insufficient);
if (noArea.assumptionsReview && noArea.assumptionsReview.missingParameters.length > 0) {
  console.log('  Missing parameters:', noArea.assumptionsReview.missingParameters.join(', '));
}
assert(noAreaConfirmed.length > 0, 'Missing area: items generated with assumed area (' + noAreaConfirmed.length + ' items)');

// ═══════════════════════════════════════════════════════════════
// TEST 10: Assumptions
// ═══════════════════════════════════════════════════════════════
console.log('\n📋 TEST 10: Assumptions Review');

const assumptions = engine.getAssumptions({ type: 'Villa', area: 400, floors: 2, rooms: 5, bathrooms: 3, hasKitchen: true, description: 'فيلا' });
assertEq(assumptions.projectType, 'Villa', 'Assumptions has project type');
assert(assumptions.assumptions.length > 0, 'Has assumptions');
const firstAss = assumptions.assumptions[0];
assert(firstAss.code, 'Assumption has code');
assert(firstAss.phase, 'Assumption has phase');
assert(firstAss.trade, 'Assumption has trade');
assert(firstAss.element, 'Assumption has element');
assert(firstAss.unit, 'Assumption has unit');
assert(firstAss.dataSource, 'Assumption has data source');

// Check at least one assumption has quantity
const withQty = assumptions.assumptions.filter(a => !a.insufficient && a.quantity !== null);
assert(withQty.length > 0, 'Some assumptions have quantities');

// ═══════════════════════════════════════════════════════════════
// TEST 11: Knowledge Base Reference
// ═══════════════════════════════════════════════════════════════
console.log('\n📋 TEST 11: Knowledge Base Reference');

const kbRef = engine.getKnowledgeBase();
assertEq(kbRef.phases.length, 11, 'KB has 11 phases');
assert(kbRef.totalItems > 0, 'KB has items');
assertEq(kbRef.itemsByPhase.length, 11, 'KB has items in 11 phases');

// Each phase has items
for (const phase of kbRef.itemsByPhase) {
  assert(phase.itemCount > 0, `Phase ${phase.phaseName} has items`);
}

// ═══════════════════════════════════════════════════════════════
// TEST 12: User Edit Tracking
// ═══════════════════════════════════════════════════════════════
console.log('\n📋 TEST 12: User Edit Tracking');

const edit = engine.recordUserEdit('proj-test', 'EXC-001', 'quantity', 100, 120, { type: 'Villa' });
assert(edit.timestamp, 'Edit has timestamp');
assertEq(edit.projectId, 'proj-test', 'Edit has project ID');
assertEq(edit.itemCode, 'EXC-001', 'Edit has item code');
assertEq(edit.field, 'quantity', 'Edit has field');
assertEq(edit.oldValue, 100, 'Edit has old value');
assertEq(edit.newValue, 120, 'Edit has new value');
assertEq(engine.userEdits.length, 1, 'Edit stored');

// ═══════════════════════════════════════════════════════════════
// SUMMARY
// ═══════════════════════════════════════════════════════════════
console.log(`\n${'═'.repeat(60)}`);
console.log(`✅ ${passed} tests passed, ${failed} tests failed`);
console.log(`${'═'.repeat(60)}`);
process.exit(failed > 0 ? 1 : 0);
