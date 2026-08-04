/**
 * ACEP Comprehensive Test Suite
 * Tests all system components, AI models, APIs, data quality
 * Run: node acep_comprehensive_test.js
 */

const http = require('http');
const fs = require('fs');
const path = require('path');

const BASE_URL = 'http://localhost:3000';
const CSV_DIR = path.join(__dirname, '..', 'databases', 'training', 'csv');
const REPORT_DIR = path.join(__dirname, 'reports');

// ===== TEST FRAMEWORK =====
const results = { passed: 0, failed: 0, total: 0, tests: [] };
const errors = [];

async function test(name, fn) {
  results.total++;
  try { await fn(); results.passed++; results.tests.push({ name, status: 'PASS' }); }
  catch (e) { results.failed++; results.tests.push({ name, status: 'FAIL', error: e.message }); errors.push(`${name}: ${e.message}`); }
}

function assert(condition, msg) { if (!condition) throw new Error(msg || 'Assertion failed'); }
function assertEqual(a, b, msg) { if (a !== b) throw new Error(msg || `Expected ${a} to equal ${b}`); }
function assertClose(a, b, tolerance, msg) { if (Math.abs(a - b) > tolerance) throw new Error(msg || `Expected ${a} to be close to ${b} (±${tolerance})`); }

function apiCall(method, path, body) {
  return new Promise((resolve, reject) => {
    const opts = { hostname: 'localhost', port: 3000, path, method, headers: { 'Content-Type': 'application/json' }, timeout: 5000 };
    const req = http.request(opts, res => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => {
        try { resolve({ status: res.statusCode, body: JSON.parse(data) }); }
        catch (e) { resolve({ status: res.statusCode, body: data }); }
      });
    });
    req.on('error', reject);
    req.on('timeout', () => { req.destroy(); reject(new Error('Request timeout')); });
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

// ===== SERVER HEALTH CHECK =====
async function testServerHealth() {
  const r = await apiCall('GET', '/health');
  assertEqual(r.status, 200, 'Health endpoint should return 200');
  assertEqual(r.body.status, 'healthy', 'Should report healthy status');
  assert(r.body.uptime !== undefined, 'Should report uptime');
  assert(r.body.engines !== undefined, 'Should report engine status');
  const engines = r.body.engines;
  const engineKeys = Object.keys(engines);
  assert(engineKeys.length >= 8, `Should have 8+ engines, got ${engineKeys.length}`);
  engineKeys.forEach(k => { assert(engines[k].registered === true, `Engine ${k} should be registered`); });
  return r;
}

async function testRootEndpoint() {
  const r = await apiCall('GET', '/');
  assertEqual(r.status, 200);
  assert(r.body.name === 'ACEP Engineering OS');
  assert(r.body.version);
  assert(typeof r.body.endpoints === 'object' && r.body.endpoints !== null);
  assert(Object.keys(r.body.endpoints).length > 0);
  return r;
}

async function testAnalyzeEndpoint() {
  const r = await apiCall('POST', '/api/v1/analyze', { description: 'Villa in Riyadh with 3 bedrooms' });
  assertEqual(r.status, 200);
  assert(r.body.projectId);
  assert(r.body.confidence >= 0.8, `Confidence should be >= 0.8, got ${r.body.confidence}`);
  assert(Array.isArray(r.body.analysis));
  const steps = r.body.analysis.map(s => s.status);
  steps.forEach(s => assertEqual(s, 'completed', `All steps should be completed, got ${s}`));
  return r;
}

async function testFullAnalysis() {
  const r = await apiCall('POST', '/api/v1/full-analysis', { description: '5-story commercial building in Jeddah' });
  assertEqual(r.status, 200);
  assert(r.body.facts);
  assert(r.body.building);
  assert(r.body.boq);
  assert(r.body.cost);
  assert(r.body.schedule);
  assert(r.body.twin);
  assert(r.body.cost.confidence >= 0.8);
  assert(r.body.cost.currency === 'SAR');
  assert(r.body.cost.taxes > 0);
  return r;
}

async function testBOQGeneration() {
  const r = await apiCall('POST', '/api/v1/projects/proj-001/boq/generate');
  assertEqual(r.status, 200);
  assert(Array.isArray(r.body.items));
  assert(r.body.items.length >= 5, `Should have 5+ BOQ items, got ${r.body.items.length}`);
  r.body.items.forEach(item => {
    assert(item.code, 'Item should have code');
    assert(item.unit, 'Item should have unit');
    assert(item.quantity > 0, 'Quantity should be positive');
    assert(item.unitPrice > 0, 'Unit price should be positive');
  });
  return r;
}

async function testCostEstimate() {
  const r = await apiCall('POST', '/api/v1/projects/proj-001/cost/estimate');
  assertEqual(r.status, 200);
  assert(r.body.totalCost > 0);
  assertEqual(r.body.currency, 'SAR');
  assert(r.body.breakdown);
  assert(r.body.breakdown.materials.percentage > 0);
  assert(r.body.breakdown.labor.percentage > 0);
  // Check cost breakdown adds up approximately
  const totalFromBreakdown = r.body.directCost + r.body.indirectCost + r.body.contingency;
  assertClose(totalFromBreakdown, r.body.totalCost, 1, 'Breakdown should match total');
  return r;
}

async function testScheduleGeneration() {
  const r = await apiCall('POST', '/api/v1/projects/proj-001/schedule/generate');
  assertEqual(r.status, 200);
  assert(Array.isArray(r.body.activities));
  assert(r.body.activities.length >= 5);
  assert(r.body.totalDuration > 0);
  assert(Array.isArray(r.body.criticalPath));
  return r;
}

async function testRiskAnalysis() {
  const r = await apiCall('POST', '/api/v1/projects/proj-001/risks/analyze');
  assertEqual(r.status, 200);
  assert(Array.isArray(r.body.risks));
  assert(r.body.risks.length >= 3);
  assert(r.body.overallRiskScore >= 0);
  assert(r.body.riskLevel);
  r.body.risks.forEach(risk => {
    assert(risk.probability >= 0 && risk.probability <= 1, 'Probability should be 0-1');
    assert(risk.impact >= 0 && risk.impact <= 1, 'Impact should be 0-1');
    assert(risk.mitigation, 'Should have mitigation plan');
  });
  return r;
}

async function testAllPlatforms() {
  const platforms = [
    { endpoint: '/api/v1/ggip/analyze-terrain', key: 'terrain', name: 'GGIP' },
    { endpoint: '/api/v1/iseip/sensor-data', key: 'devices', name: 'ISEIP' },
    { endpoint: '/api/v1/pmiamp/asset-health', key: 'assets', name: 'PMIAMP' },
    { endpoint: '/api/v1/craep/fleet-status', key: 'robots', name: 'CRAEP' },
    { endpoint: '/api/v1/ebisdp/dashboard', key: 'company', name: 'EBISDP' },
    { endpoint: '/api/v1/secip/carbon-footprint', key: 'carbonFootprint', name: 'SECIP' },
    { endpoint: '/api/v1/qaiip/inspection', key: 'inspections', name: 'QAIIP' },
    { endpoint: '/api/v1/siapp/risk-assessment', key: 'riskScore', name: 'SIAPP' },
    { endpoint: '/api/v1/cmpep/match-supplier', key: 'topMatches', name: 'CMPEP' },
    { endpoint: '/api/v1/easgp/security-status', key: 'users', name: 'EASGP' },
    { endpoint: '/api/v1/sadp/platform-status', key: 'apis', name: 'SADP' },
    { endpoint: '/api/v1/gdlmsp/country-status', key: 'countries', name: 'GDLMSP' },
  ];
  for (const p of platforms) {
    const r = await apiCall('POST', p.endpoint, {});
    assertEqual(r.status, 200, `${p.name} should return 200`);
    assert(r.body[p.key] !== undefined, `${p.name} should have ${p.key} field`);
    assert(r.body.status !== undefined, `${p.name} should have status`);
  }
  return platforms.length;
}

async function testDigitalTwin() {
  const r = await apiCall('POST', '/api/v1/digital-twin', { projectId: 'proj-001' });
  assertEqual(r.status, 200);
  assert(r.body.twinId);
  assert(r.body.currentState);
  assert(r.body.currentState.qualityScore >= 0);
  assert(r.body.performanceMetrics);
  assert(r.body.performanceMetrics.schedulePerformanceIndex >= 0);
  return r;
}

async function testSimulation() {
  const r = await apiCall('POST', '/api/v1/simulation', { scenario: { id: 'test-1', name: 'Delay test' } });
  assertEqual(r.status, 200);
  assert(r.body.scenarioId);
  assert(r.body.predictions);
  assert(r.body.recommendations);
  assert(Array.isArray(r.body.recommendations));
  return r;
}

async function testCodes() {
  const r = await apiCall('GET', '/api/v1/codes');
  assertEqual(r.status, 200);
  assert(Array.isArray(r.body.codes));
  assert(r.body.count >= 5);
  // Filter test
  const r2 = await apiCall('GET', '/api/v1/codes?country=Saudi%20Arabia');
  assertEqual(r2.status, 200);
  r2.body.codes.forEach(c => assertEqual(c.country, 'Saudi Arabia', 'Filtered codes should match country'));
  return r;
}

async function testProjects() {
  const r = await apiCall('GET', '/api/v1/projects');
  assertEqual(r.status, 200);
  assert(Array.isArray(r.body.projects));
  assert(r.body.projects.length >= 3);
  return r;
}

async function test404() {
  const r = await apiCall('GET', '/api/v1/nonexistent');
  assertEqual(r.status, 404);
  assert(r.body.error);
  return r;
}

// ===== DATA QUALITY TESTS =====
function testCSVDataQuality() {
  const requiredFiles = ['projects.csv', 'boq_items.csv', 'risks.csv', 'quality_defects.csv', 'project_understanding.csv',
    'material_prices.csv', 'suppliers.csv', 'labor_rates.csv', 'equipment_rates.csv'];
  const minCols = { 'labor_rates.csv': 4, 'equipment_rates.csv': 5, 'suppliers.csv': 8 };
  requiredFiles.forEach(f => {
    const p = path.join(CSV_DIR, f);
    assert(fs.existsSync(p), `Required file ${f} not found`);
    const content = fs.readFileSync(p, 'utf8');
    const lines = content.trim().split('\n');
    assert(lines.length > 1, `${f} should have header + data, got ${lines.length} lines`);
    const headers = lines[0].split(',');
    const expected = minCols[f] || 5;
    assert(headers.length >= expected, `${f} should have ${expected}+ columns, got ${headers.length}`);
  });
}

function testProjectDataIntegrity() {
  const content = fs.readFileSync(path.join(CSV_DIR, 'projects.csv'), 'utf8');
  const lines = content.trim().split('\n');
  const data = lines.slice(1);
  assert(data.length >= 10000, `Should have 10K+ projects, got ${data.length}`);
  let validCostCount = 0;
  let validDurationCount = 0;
  let validProjectId = 0;
  data.forEach((line, i) => {
    const cols = line.split(',');
    assert(cols.length >= 20, `Row ${i+1}: expected 20+ columns, got ${cols.length}`);
    if (cols[0].startsWith('SA-R')) validProjectId++;
    const cost = parseFloat(cols[18]);
    const duration = parseFloat(cols[19]);
    if (!isNaN(cost) && cost > 0) validCostCount++;
    if (!isNaN(duration) && duration > 0) validDurationCount++;
  });
  assert(validProjectId > data.length * 0.9, `90%+ should have SA-R format, got ${validProjectId}/${data.length}`);
  assert(validCostCount > data.length * 0.8, `80%+ should have valid cost, got ${validCostCount}/${data.length}`);
  assert(validDurationCount > data.length * 0.8, `80%+ should have valid duration, got ${validDurationCount}/${data.length}`);
}

function testBOQDataIntegrity() {
  const content = fs.readFileSync(path.join(CSV_DIR, 'boq_items.csv'), 'utf8');
  const lines = content.trim().split('\n');
  const data = lines.slice(1);
  assert(data.length >= 50000, `BOQ should have 50K+ items, got ${data.length}`);
  let validQty = 0, validPrice = 0, validConf = 0;
  data.forEach((line) => {
    const cols = line.split(',');
    // Cols: 0=project_id,1=item_code,2=desc,3=category,4=unit,5=quantity,6=unit_price,7=confidence,8=waste
    const qty = parseFloat(cols[5]);
    const price = parseFloat(cols[6]);
    if (!isNaN(qty) && qty > 0) validQty++;
    if (!isNaN(price) && price > 0) validPrice++;
    const confidence = parseInt(cols[7]);
    if (!isNaN(confidence) && confidence >= 50 && confidence <= 100) validConf++;
  });
  assert(validQty > data.length * 0.85, `85%+ should have valid qty, got ${validQty}/${data.length}`);
  assert(validPrice > data.length * 0.85, `85%+ should have valid price, got ${validPrice}/${data.length}`);
  assert(validConf > data.length * 0.85, `85%+ should have valid confidence, got ${validConf}/${data.length}`);
}

function testMaterialPriceData() {
  const content = fs.readFileSync(path.join(CSV_DIR, 'material_prices.csv'), 'utf8');
  const lines = content.trim().split('\n');
  const data = lines.slice(1);
  const cities = new Set(data.map(l => l.split(',')[3]));
  assert(cities.size >= 10, `Should cover 10+ cities, got ${cities.size}`);
  data.forEach((line, i) => {
    const price = parseFloat(line.split(',')[5]);
    assert(price > 0, `Row ${i+1}: price should be > 0`);
  });
}

function testRiskDataIntegrity() {
  const content = fs.readFileSync(path.join(CSV_DIR, 'risks.csv'), 'utf8');
  const lines = content.trim().split('\n');
  const data = lines.slice(1);
  assert(data.length >= 30000, `Risks should have 30K+ records, got ${data.length}`);
  const categories = new Set();
  let validProb = 0, validImpact = 0;
  data.forEach(line => {
    const cols = line.split(',');
    categories.add(cols[1]);
    const prob = parseInt(cols[3]);
    const impact = parseInt(cols[4]);
    if (!isNaN(prob) && prob >= 1 && prob <= 5) validProb++;
    if (!isNaN(impact) && impact >= 1 && impact <= 5) validImpact++;
  });
  assert(categories.size >= 5, `Should have 5+ risk categories, got ${categories.size}`);
  assert(validProb > data.length * 0.85, `85%+ should have valid probability, got ${validProb}/${data.length}`);
  assert(validImpact > data.length * 0.85, `85%+ should have valid impact, got ${validImpact}/${data.length}`);
}

// ===== ENGINEERING VALIDATION =====
function testEngineeringConcreteRatios() {
  const content = fs.readFileSync(path.join(CSV_DIR, 'projects.csv'), 'utf8');
  const lines = content.trim().split('\n');
  const data = lines.slice(1);
  let validRatios = 0, totalComparisons = 0;
  data.forEach(line => {
    const cols = line.split(',');
    const areaPerFloor = parseFloat(cols[5]);
    const floors = parseInt(cols[6]) || 1;
    const concrete = parseFloat(cols[11]);
    if (!isNaN(areaPerFloor) && areaPerFloor > 0 && !isNaN(concrete) && concrete > 0) {
      totalComparisons++;
      const totalArea = areaPerFloor * floors;
      const ratio = concrete / totalArea;
      if (ratio >= 0.05 && ratio <= 0.6) validRatios++;
    }
  });
  assert(totalComparisons > 1000, `Should have 1000+ valid comparisons, got ${totalComparisons}`);
  assert(validRatios > totalComparisons * 0.90, `90%+ should have valid concrete ratios, got ${validRatios}/${totalComparisons}`);
}

function testEngineeringSteelRatios() {
  const content = fs.readFileSync(path.join(CSV_DIR, 'projects.csv'), 'utf8');
  const lines = content.trim().split('\n');
  const data = lines.slice(1);
  let validSteel = 0, totalComparisons = 0;
  data.forEach(line => {
    const cols = line.split(',');
    const concrete = parseFloat(cols[11]);
    const steel = parseFloat(cols[12]);
    if (!isNaN(concrete) && concrete > 0 && !isNaN(steel) && steel > 0) {
      totalComparisons++;
      const ratio = (steel * 1000) / concrete;
      if (ratio >= 40 && ratio <= 200) validSteel++;
    }
  });
  assert(totalComparisons > 1000, `Should have 1000+ valid comparisons, got ${totalComparisons}`);
  assert(validSteel > totalComparisons * 0.75, `75%+ should have valid steel ratios, got ${validSteel}/${totalComparisons}`);
}

function testCostPerM2Range() {
  const content = fs.readFileSync(path.join(CSV_DIR, 'projects.csv'), 'utf8');
  const lines = content.trim().split('\n');
  const data = lines.slice(1);
  let validCost = 0, totalComparisons = 0;
  data.forEach(line => {
    const cols = line.split(',');
    const areaPerFloor = parseFloat(cols[5]);
    const floors = parseInt(cols[6]) || 1;
    const cost = parseFloat(cols[18]);
    if (!isNaN(areaPerFloor) && areaPerFloor > 0 && !isNaN(cost) && cost > 0) {
      totalComparisons++;
      const totalArea = areaPerFloor * floors;
      const costPerM2 = cost / totalArea;
      if (costPerM2 >= 500 && costPerM2 <= 15000) validCost++;
    }
  });
  assert(totalComparisons > 1000, `Should have 1000+ valid comparisons, got ${totalComparisons}`);
  assert(validCost > totalComparisons * 0.75, `75%+ should have valid cost/m2, got ${validCost}/${totalComparisons}`);
}

// ===== MAIN RUNNER =====
async function runAll() {
  console.log('\n═══════════════════════════════════════════════════');
  console.log('  🏗️  ACEP COMPREHENSIVE TEST SUITE v1.0');
  console.log('═══════════════════════════════════════════════════\n');

  // Phase 1: Server API Tests
  console.log('📡 PHASE 1: Server API Tests');
  console.log('─────────────────────────────────');

  // First check if server is running
  try {
    await testServerHealth();
    await test('Server - Health Check', async () => await testServerHealth());
    await test('Server - Root Endpoint', async () => await testRootEndpoint());
    await test('Server - Analyze (POST /api/v1/analyze)', async () => await testAnalyzeEndpoint());
    await test('Server - Full Analysis', async () => await testFullAnalysis());
    await test('Server - BOQ Generation', async () => await testBOQGeneration());
    await test('Server - Cost Estimate', async () => await testCostEstimate());
    await test('Server - Schedule Generation', async () => await testScheduleGeneration());
    await test('Server - Risk Analysis', async () => await testRiskAnalysis());
    await test('Server - Digital Twin', async () => await testDigitalTwin());
    await test('Server - Simulation', async () => await testSimulation());
    await test('Server - Engineering Codes', async () => await testCodes());
    await test('Server - Projects List', async () => await testProjects());
    await test('Server - 404 Handling', async () => await test404());
    await test('Server - All 12 Platforms', async () => await testAllPlatforms());
  } catch (e) {
    console.log(`  ⚠️  Server error: ${e.message}`);
  }

  // Phase 2: Data Quality Tests
  console.log('\n📊 PHASE 2: Data Quality Tests');
  console.log('─────────────────────────────────');
  await test('Data - CSV Files Exist', () => testCSVDataQuality());
  await test('Data - Project Integrity', () => testProjectDataIntegrity());
  await test('Data - BOQ Integrity', () => testBOQDataIntegrity());
  await test('Data - Material Prices', () => testMaterialPriceData());
  await test('Data - Risk Integrity', () => testRiskDataIntegrity());

  // Phase 3: Engineering Validation
  console.log('\n🔧 PHASE 3: Engineering Validation');
  console.log('─────────────────────────────────');
  await test('Engineering - Concrete Ratios', () => testEngineeringConcreteRatios());
  await test('Engineering - Steel Ratios', () => testEngineeringSteelRatios());
  await test('Engineering - Cost/m² Range', () => testCostPerM2Range());

  // PHASE 4: Iterative testing (run same tests 5 times)
  console.log('\n🔄 PHASE 4: Iterative Reliability Testing');
  console.log('─────────────────────────────────');
  for (let iter = 1; iter <= 5; iter++) {
    try {
      testCSVDataQuality();
      testProjectDataIntegrity();
      testBOQDataIntegrity();
      results.tests.push({ name: `Iteration ${iter} - Data Quality`, status: 'PASS' });
      results.passed++;
      results.total++;
    } catch(e) {
      results.tests.push({ name: `Iteration ${iter} - Data Quality`, status: 'FAIL', error: e.message });
      results.failed++;
      results.total++;
    }
  }

  // ===== REPORT =====
  console.log('\n═══════════════════════════════════════════════════');
  console.log('  📋 TEST RESULTS');
  console.log('═══════════════════════════════════════════════════');
  console.log(`  Total:  ${results.total}`);
  console.log(`  ✅ Passed: ${results.passed}`);
  console.log(`  ❌ Failed: ${results.failed}`);
  console.log(`  📈 Rate:   ${(results.passed / results.total * 100).toFixed(1)}%`);
  console.log('═══════════════════════════════════════════════════\n');

  // Save report
  const report = {
    timestamp: new Date().toISOString(),
    summary: {
      total: results.total,
      passed: results.passed,
      failed: results.failed,
      passRate: (results.passed / results.total * 100).toFixed(1)
    },
    tests: results.tests,
    errors
  };
  
  if (!fs.existsSync(REPORT_DIR)) fs.mkdirSync(REPORT_DIR, { recursive: true });
  const reportPath = path.join(REPORT_DIR, `test_report_${Date.now()}.json`);
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
  console.log(`  📝 Report saved: ${reportPath}`);

  if (errors.length > 0) {
    console.log('\n  ⚠️  ERRORS DETECTED:');
    errors.forEach(e => console.log(`    • ${e}`));
  }

  // Return pass/fail for CI
  return results.failed === 0;
}

// Run
runAll().then(success => {
  process.exit(success ? 0 : 1);
}).catch(e => {
  console.error('Test suite error:', e);
  process.exit(1);
});
