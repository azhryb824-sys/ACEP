'use strict';

const { spawn } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');
const archetypes = require('../packages/ai-engine/model-training/project-archetypes.json');

const port = Number(process.env.ACEP_HTTP_TEST_PORT || 3199);
const baseUrl = `http://127.0.0.1:${port}`;
const apiKey = 'acep-http-engineering-matrix-key-2026-09-17';
const runtimeDir = fs.mkdtempSync(path.join(os.tmpdir(), 'acep-http-matrix-'));

function projectFor(profile, index) {
  const linear = profile.family === 'linear';
  const utilityLine = ['water', 'telecom'].includes(profile.key);
  const useLength = linear || utilityLine;
  const area = Math.round(Math.sqrt(profile.area[0] * profile.area[1]));
  const width = linear ? ({ bridge: 24, tunnel: 12, railway: 12 }[profile.key] || 28) : 2.5;
  const length = useLength ? Math.max(1000, Math.round(area / width)) : undefined;
  const floors = ['building', 'industrial', 'existing', 'other'].includes(profile.family)
    ? Math.max(1, Math.round((profile.floors[0] + profile.floors[1]) / 2))
    : 1;
  return {
    name: `HTTP engineering matrix ${profile.key}`,
    description: `مشروع ${profile.key} لاختبار التحليل الهندسي المتكامل والكميات والتكلفة والمدة والمخاطر والجودة والسلامة والاستدامة والتوريد، مع نطاق واضح وبيانات كمية قابلة للتتبع والمراجعة.`,
    type: profile.key,
    typeLabel: profile.key,
    subtype: 'اختبار قبول هندسي متعدد التخصصات',
    nature: ['existing'].includes(profile.family) ? 'renovation' : 'new',
    country: 'المملكة العربية السعودية',
    city: index % 2 ? 'الرياض' : 'جدة',
    stage: 'design',
    delivery: 'design_build',
    constructionMethod: profile.family === 'existing' ? 'rehabilitation' : 'traditional',
    ...(useLength ? { length, width } : { area, landArea: Math.round(area * 1.4) }),
    floors,
    basements: profile.family === 'building' && floors > 4 ? 1 : 0,
    buildings: 1,
    capacity: Math.max(1, Math.round(area * profile.capacity)),
    capacityUnit: ({renewable_energy:'MW', power_plant:'MW', power:'MVA', water:'m3/day', dam:'m3'})[profile.key] || 'وحدة تشغيلية',
    structure: linear ? 'linear_infrastructure' : 'project_specific',
    foundation: 'وفق تقرير التربة والتحريات المعتمدة',
    finishing: 'standard',
    siteCondition: 'موقع تطوير قائم مع خدمات مجاورة وحركة تشغيلية تتطلب تنسيقًا مرحليًا.',
    inclusions: 'الدراسات والتصميم والأعمال المدنية والإنشائية والكهربائية والميكانيكية والحريق والربط والاختبارات والتشغيل.',
    exclusions: 'لا يشمل ثمن الأرض أو التمويل.',
    standards: 'كود البناء السعودي ومواصفات الجهات المنظمة المختصة.',
    constraints: 'الخدمات القائمة والتصاريح وسلسلة التوريد واستمرار الوصول والتسليم المرحلي.',
    budget: 100000000 + index * 5000000,
    currency: 'SAR',
    priceBasis: 'أساس بحثي معلمي مؤرخ سبتمبر 2026 وليس عرض مورد.',
    startDate: '2027-01-01',
    targetDate: '2030-01-01',
    sustainability: 'خفض استهلاك الطاقة أو الوقود بنسبة 20% مقابل خط أساس معتمد.',
    systems: ['architecture', 'structural', 'electrical', 'mechanical', 'plumbing', 'fire', 'infrastructure', 'ict', 'landscape', 'specialist'],
    documents: ['brief', 'drawings', 'bim', 'specifications', 'boq', 'soil', 'survey', 'schedule', 'permits']
  };
}

async function waitReady(logs) {
  const deadline = Date.now() + 120000;
  while (Date.now() < deadline) {
    try {
      const response = await fetch(`${baseUrl}/ready`, { signal: AbortSignal.timeout(3000) });
      const body = await response.json();
      if (response.ok && body.status === 'ready') return body;
    } catch {}
    await new Promise(resolve => setTimeout(resolve, 250));
  }
  throw new Error(`Server readiness timeout. Recent logs: ${logs.slice(-3000)}`);
}

function check(name, condition, evidence) {
  return { name, passed: Boolean(condition), evidence };
}

async function analyze(profile, index) {
  const response = await fetch(`${baseUrl}/api/v1/experiments/analyze`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ project: projectFor(profile, index) }),
    signal: AbortSignal.timeout(180000)
  });
  const body = await response.json();
  const runs = Array.isArray(body.engineRuns) ? body.engineRuns : [];
  const byCode = Object.fromEntries(runs.map(run => [run.code, run.output || {}]));
  const boq = byCode.BOQ || {};
  const cost = byCode.COST || {};
  const schedule = byCode.TIME || {};
  const risks = byCode.RISK || {};
  const quality = byCode.QUALITY || {};
  const checks = [
    check('http_200', response.status === 200, response.status),
    check('completed_or_explicitly_partial', ['completed','partial'].includes(body.status), body.status),
    check('ten_engines', runs.length === 10 && runs.every(run => run.executed && run.status !== 'failed'), runs.map(run => `${run.code}:${run.status}`)),
    check('dynamic_boq', Array.isArray(boq.items) && boq.items.length >= 7 && boq.items.every(item => item.quantity > 0 && item.totalPrice > 0), boq.items?.length),
    check('boq_cost_link', Math.abs(Number(boq.summary?.totalCost) - Number(cost.directCost)) <= 2, { boq: boq.summary?.totalCost, direct: cost.directCost }),
    check('cost_reconciliation', cost.boqReconciliation?.arithmeticVariance === 0 && Number(cost.boqReconciliation?.modelVariancePercent) <= 1, cost.boqReconciliation),
    check('schedule_network', Array.isArray(schedule.activities) && schedule.activities.length >= 6, schedule.activities?.length),
    check('no_fabricated_risk_probability', risks.overallRiskScore === null && risks.riskLevel === null && risks.risks?.every(r => r.probability === null && r.score === null), null),
    check('no_fabricated_quality_grade', quality.qualityScore === null && quality.qualityGrade === null && quality.estimatedDefects === null, null),
    check('risk_depth', Array.isArray(risks.risks) && risks.risks.length >= 6, risks.risks?.length),
    check('quality_depth', Array.isArray(quality.defects) && quality.defects.length >= 5, quality.defects?.length),
    check('engineering_gates', cost.requiresHumanReview === true && cost.suitableForProcurement === false && cost.contractualUse === false, null)
  ];
  return { type: profile.key, projectId: body.projectId, durationMs: body.durationMs, checks };
}

async function main() {
  let logs = '';
  const server = spawn(process.execPath, ['server.js'], {
    cwd: path.resolve(__dirname, '..'),
    env: {
      ...process.env,
      PORT: String(port),
      HOST: '127.0.0.1',
      NODE_ENV: 'development',
      ACEP_SERVICE_MODE: 'engineering',
      ACEP_EXECUTION_MODE: 'development',
      ACEP_DATA_PROVENANCE: 'synthetic',
      ACEP_MILLION_MODEL_ENABLED: 'true',
      ACEP_SUPPLIER_DATA_VERIFIED: 'false',
      ACEP_AUTH_MODE: 'api-key',
      ACEP_API_KEY: apiKey,
      ACEP_API_KEY_SUBJECT: 'http-matrix',
      ACEP_API_KEY_ROLE: 'engineer',
      ACEP_API_KEY_TENANT: 'acep-http-test',
      ACEP_RUNTIME_DATA_DIR: runtimeDir,
      ACEP_BOOTSTRAP_DATA_MODE: 'readonly',
      ACEP_ALLOW_MOCK_RESULTS: 'false',
      ACEP_ENGINEERING_RELEASE_APPROVED: 'false',
      ACEP_CORS_ORIGINS: 'http://127.0.0.1:8787'
    },
    stdio: ['ignore', 'pipe', 'pipe']
  });
  server.stdout.on('data', chunk => { logs += chunk.toString(); });
  server.stderr.on('data', chunk => { logs += chunk.toString(); });
  try {
    const ready = await waitReady(logs);
    const results = [];
    for (const [index, profile] of archetypes.projectTypes.entries()) {
      results.push(await analyze(profile, index));
    }
    const checks = results.flatMap(result => result.checks);
    const passed = checks.filter(current => current.passed).length;
    const report = {
      benchmark: 'ACEP authenticated HTTP engineering matrix v1',
      ready: ready.status,
      projectTypes: results.length,
      engineExecutions: results.length * 10,
      checks: checks.length,
      passed,
      failed: checks.length - passed,
      score: Math.round(passed / checks.length * 10000) / 100,
      accepted: passed / checks.length >= 0.98,
      failures: results.map(result => ({
        type: result.type,
        failures: result.checks.filter(current => !current.passed)
      })).filter(result => result.failures.length),
      maxDurationMs: Math.max(...results.map(result => result.durationMs || 0))
    };
    console.log(`ACEP_HTTP_ENGINEERING_MATRIX ${JSON.stringify(report)}`);
    if (!report.accepted) process.exitCode = 1;
  } finally {
    server.kill('SIGTERM');
    await new Promise(resolve => {
      const timeout = setTimeout(resolve, 5000);
      server.once('exit', () => { clearTimeout(timeout); resolve(); });
    });
    fs.rmSync(runtimeDir, { recursive: true, force: true });
  }
}

main().catch(error => {
  console.error(error.stack || error.message);
  process.exitCode = 1;
});
