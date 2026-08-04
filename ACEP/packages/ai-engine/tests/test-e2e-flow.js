/**
 * E2E Test: Full HTTP API workflow simulation.
 * Requires the server to be running on port 3000.
 */
const http = require('http');
const BASE = 'http://localhost:3000';
const API = path => BASE + path;

function req(method, path, body) {
  return new Promise((resolve, reject) => {
    const opts = { method, hostname: 'localhost', port: 3000, path, headers: { 'Content-Type': 'application/json' }, timeout: 15000 };
    const r = http.request(opts, res => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => {
        try { resolve({ status: res.statusCode, body: JSON.parse(data) }); }
        catch { resolve({ status: res.statusCode, body: data }); }
      });
    });
    r.on('error', reject);
    if (body) r.write(JSON.stringify(body));
    r.end();
  });
}

async function main() {
  const T = [];
  let pass = 0, fail = 0;
  function check(name, ok, detail = '') {
    T.push({ name, ok, detail });
    if (ok) pass++; else { fail++; console.error('  FAIL:', name, detail); }
  }

  console.log('');
  console.log('═══ E2E: BOQ HTTP API Flow ═══');
  console.log('');

  // 1. Health
  try {
    const h = await req('GET', '/health');
    check('GET /health returns healthy', h.body?.status === 'healthy', `${h.status}`);
  } catch (e) { check('GET /health', false, e.message); }

  // 2. Sessions list (empty)
  try {
    const s = await req('GET', '/api/v1/boq/sessions');
    check('GET /api/v1/boq/sessions returns array', Array.isArray(s.body?.sessions), `${s.body?.sessions?.length || 0} sessions`);
  } catch (e) { check('GET /api/v1/boq/sessions', false, e.message); }

  // 3. BOQ assumptions for Mosque (no params)
  try {
    const a = await req('POST', '/api/v1/boq/assumptions', { projectType: 'Mosque' });
    check('POST /api/v1/boq/assumptions generates assumptions', a.body?.totalAssumptions > 0, `${a.body?.totalAssumptions} total`);
    check('  missing params detected', a.body?.missingParameters?.length > 0, a.body?.missingParameters?.join(', '));
    check('  assumptions have unique IDs', a.body?.assumptions?.every(ax => /^assumption-/.test(ax.id)), 'all have assumption- prefix');

    // 4. Apply assumptions
    const decisions = (a.body?.assumptions || [])
      .filter(x => x.type === 'missing_parameter')
      .map(x => ({ action: 'accept', code: x.id, field: x.field, approvedValue: x.proposedValue }));
    try {
      const ap = await req('POST', '/api/v1/boq/assumptions/apply', { decisions, params: { projectType: 'Mosque' } });
      check('POST /api/v1/boq/assumptions/apply generates BOQ', ap.body?.items?.length > 10, `${ap.body?.items?.length || 0} items`);
      check('  no null quantities', ap.body?.items?.every(i => i.quantity !== null), '');
      check('  no null unitPrices', ap.body?.items?.every(i => i.unitPrice !== null), '');
      check('  has lifecyclePhases', ap.body?.lifecyclePhases?.length > 0, `${ap.body?.lifecyclePhases?.length} phases`);
      check('  has summary.totalCost', ap.body?.summary?.totalCost > 0, `${ap.body?.summary?.totalCost} SAR`);

      // 5. Recalculate with different params (changes area)
      try {
        const rc = await req('POST', '/api/v1/boq/recalculate', { params: { type: 'Mosque', area: 1200, floors: 2 }, decisions: [] });
        check('POST /api/v1/boq/recalculate changes params', rc.body?.items?.length > 10, `${rc.body?.items?.length || 0} items`);
        // Area changed from 800 to 1200 → EXC-001 (excavation) should increase proportionally
        const excItem = rc.body?.items?.find(i => i.code === 'EXC-001');
        if (excItem) check('  item recalculated based on new area', excItem.quantity > 700, `EXC-001 qty=${excItem.quantity}`);
      } catch (e) { check('POST /api/v1/boq/recalculate', false, e.message); }

    } catch (e) { check('POST /api/v1/boq/assumptions/apply', false, e.message); }

  } catch (e) { check('POST /api/v1/boq/assumptions', false, e.message); }

  // 6. Learning insights
  try {
    const l = await req('GET', '/api/v1/boq/learning');
    check('GET /api/v1/boq/learning returns insights', l.body?.assumptions && l.body?.prices, '');
  } catch (e) { check('GET /api/v1/boq/learning', false, e.message); }

  // 7. Price heatmap
  try {
    const h = await req('GET', '/api/v1/boq/price-heatmap');
    check('GET /api/v1/boq/price-heatmap returns map', h.body?.regions?.length > 0, `${h.body?.regions?.length} regions, ${h.body?.categories?.length} categories`);
  } catch (e) { check('GET /api/v1/boq/price-heatmap', false, e.message); }

  // 8. Supplier recommendations
  try {
    const s = await req('GET', '/api/v1/boq/suppliers');
    check('GET /api/v1/boq/suppliers returns regions', s.body?.length > 0, `${s.body?.length} regions`);
    // Specific supplier for a region and category
    try {
      const region = encodeURIComponent('الرياض');
      const sp = await req('GET', '/api/v1/boq/suppliers?region=' + region + '&priceCat=ELC');
      check('  supplier for الرياض/ELC', sp.body?.length > 0, sp.body?.[0]?.name || '');
    } catch (e) { check('  supplier for الرياض/ELC', false, e.message); }
  } catch (e) { check('GET /api/v1/boq/suppliers', false, e.message); }

  // 9. Save a BOQ session
  try {
    const sv = await req('POST', '/api/v1/boq/save', { name: 'Test Session', projectType: 'Mosque', params: { area: 500 }, items: [], decisions: [], summary: { totalCost: 100000 }, lifecyclePhases: [] });
    check('POST /api/v1/boq/save creates session', sv.body?.session?.id?.startsWith('boq-'), sv.body?.session?.id || '');
    const sessionId = sv.body?.session?.id;
    if (sessionId) {
      // Load it back
      try {
        const ld = await req('GET', `/api/v1/boq/load/${sessionId}`);
        check('  GET /api/v1/boq/load/:id loads session', ld.body?.name === 'Test Session', '');
      } catch (e) { check('  GET /api/v1/boq/load/:id', false, e.message); }
      // Delete it
      try {
        const dl = await req('DELETE', `/api/v1/boq/session/${sessionId}`);
        check('  DELETE /api/v1/boq/session/:id deletes session', dl.body?.message, dl.body?.message || '');
      } catch (e) { check('  DELETE /api/v1/boq/session/:id', false, e.message); }
    }
  } catch (e) { check('POST /api/v1/boq/save', false, e.message); }

  // 10. All project types generate via apply
  const types = ['Apartment_Building', 'Villa', 'Luxury_Villa', 'School', 'Hospital', 'Residential_Tower', 'Factory', 'Hotel', 'Mall', 'Office_Building', 'Residential_Compound', 'Warehouse'];
  let typesOk = 0;
  for (const t of types) {
    try {
      const a2 = await req('POST', '/api/v1/boq/assumptions', { projectType: t, area: 500, floors: 2 });
      if (a2.body?.totalAssumptions > 0) typesOk++;
    } catch {}
  }
  check('All project types generate assumptions', typesOk === types.length, `${typesOk}/${types.length}`);

  console.log('');
  T.forEach(t => {
    if (t.ok) console.log('  \u2713', t.name);
    else console.log('  \u2717', t.name, t.detail);
  });
  console.log('');
  console.log(`\u2550\u2550\u2550 Result: ${pass} passed, ${fail} failed \u2550\u2550\u2550`);
  process.exit(fail > 0 ? 1 : 0);
}

main().catch(e => { console.error('FATAL:', e); process.exit(1); });
