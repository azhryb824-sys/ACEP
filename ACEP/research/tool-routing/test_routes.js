'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const express = require('express');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { registerToolResearch } = require('./routes');

async function withServer(options, work) {
  const app = express();
  registerToolResearch(app, options);
  app.use(express.json({ limit: '32kb' }));
  const server = await new Promise(resolve => { const s = app.listen(0, '127.0.0.1', () => resolve(s)); });
  try { await work(`http://127.0.0.1:${server.address().port}`); }
  finally { server.closeAllConnections(); await new Promise(resolve => server.close(resolve)); }
}

async function post(base, body) {
  const response = await fetch(base + '/api/v1/research/tools/calculate', {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
  });
  return { status: response.status, data: await response.json() };
}

test('research routes are absent when disabled', async () => {
  await withServer({ enabled: false }, async base => {
    for (const path of ['/research/tools', '/api/v1/research/tools/calculate']) {
      assert.equal((await fetch(base + path)).status, 404);
    }
  });
});

test('real HTTP to Python calculations and grounding', async () => {
  await withServer({ enabled: true }, async base => {
    const page = await fetch(base + '/research/tools');
    assert.equal(page.status, 200);
    assert.match(await page.text(), /البيانات الأصلية/);
    const cases = [
      ['حجم مستطيل؛ الطول: 620 سم؛ العرض: 3.7 م؛ السمك: 160 مم؛ العدد: 1', '3.6704'],
      ['صافي المساحة؛ الإجمالي: 65.2 م²؛ الفتحات: 65.2 م²', '0'],
      ['كمية بعد الهدر؛ الصافي: 72.5 م²؛ الهدر: 8 %', '78.3'],
      ['تكلفة التوريد؛ الكمية: 83.9 م²؛ سعر الوحدة: 0 ريال/م²', '0'],
    ];
    for (const [text, value] of cases) {
      const response = await post(base, { text });
      assert.equal(response.status, 200);
      assert.equal(response.data.value, value);
      assert.equal(response.data.text_grounding_verified, true);
    }
    const missing = await post(base, { text: 'كمية بعد الهدر' });
    assert.deepEqual(missing.data.missing_fields, ['net_quantity', 'waste_percent']);
    assert.equal(missing.data.calculation_executed, false);
    const mismatch = await post(base, { text: cases[0][0], prediction: JSON.stringify({ action: 'call', tool: 'rectangular_volume', arguments: {length_m:'6.2',width_m:'9',height_m:'.16',count:1}, missing_fields:[] }) });
    assert.equal(mismatch.data.reason, 'prediction_value_mismatch');
    assert.equal(mismatch.data.calculation_executed, false);
    const incomplete = await post(base, { text: 'تكلفة التوريد؛ الكمية: 83.9 م²' });
    assert.deepEqual(incomplete.data.missing_fields, ['unit_price']);
    const conflict = await post(base, { text: cases[0][0] + '؛ العرض: 5 م' });
    assert.equal(conflict.data.reason, 'duplicate_field');
    const invalid = await post(base, { text: 'تكلفة التوريد؛ الكمية: 83.9 م²؛ سعر الوحدة: -5 ريال/م²' });
    assert.equal(invalid.data.status, 'invalid_input');
  });
});

test('bad HTTP payloads fail without execution', async () => {
  await withServer({ enabled: true }, async base => {
    for (const body of [null, [], {}, {text:5}, {text:'تكلفة التوريد', extra:1}, {text:'تكلفة التوريد', prediction:{}}]) {
      const response = await post(base, body);
      assert.equal(response.status, 400);
      assert.equal(response.data.calculation_executed, false);
    }
    assert.equal((await post(base, {text:'x'.repeat(4097)})).status, 413);
    const duplicate = await post(base, {text:'تكلفة التوريد؛ الكمية: 10 م²؛ سعر الوحدة: 5 ريال/م²',prediction:'{"tool":"line_cost","tool":"net_area"}'});
    assert.equal(duplicate.data.reason, 'invalid_prediction_json');
  });
});

test('missing Python fails closed with a generic error', async () => {
  await withServer({ enabled: true, python: '/nonexistent-acep-python' }, async base => {
    const response = await post(base, {text:'صافي المساحة؛ الإجمالي: 65.2 م²؛ الفتحات: 0 م²'});
    assert.equal(response.status, 503);
    assert.equal(response.data.reason, 'calculator_unavailable');
    assert.equal(response.data.calculation_executed, false);
  });
});

test('demo event handlers connect all four tools and clarification to real HTTP', async () => {
  await withServer({ enabled: true }, async base => {
    const elements = new Map();
    const element = id => {
      if (!elements.has(id)) elements.set(id, { value: '', textContent: '', disabled: false,
        events: {}, addEventListener(name, callback) { this.events[name] = callback; } });
      return elements.get(id);
    };
    const html = fs.readFileSync(path.join(__dirname, 'demo.html'), 'utf8');
    const script = html.match(/<script>([\s\S]*?)<\/script>/)[1];
    const context = vm.createContext({ document: { getElementById: element },
      fetch: (url, options) => fetch(base + url, options) });
    vm.runInContext(script, context);
    for (const [tool, value] of [['volume','3.6704'],['area','172.4'],['waste','78.3'],['cost','5089.5']]) {
      element('tool').value = tool;
      element('tool').events.change();
      await element('calculate').events.click();
      assert.match(element('message').textContent, new RegExp(value.replace('.', '\\.')));
      assert.equal(JSON.parse(element('result').textContent).text_grounding_verified, true);
      assert.equal(element('calculate').disabled, false);
    }
    element('source').value = 'كمية بعد الهدر';
    await element('calculate').events.click();
    assert.match(element('questions').textContent, /الكمية الصافية/);
    assert.match(element('questions').textContent, /نسبة الهدر/);
    assert.equal(JSON.parse(element('result').textContent).calculation_executed, false);
    element('source').value = 'تكلفة التوريد؛ الكمية: 10 م²؛ سعر الوحدة: 0 ريال/م²';
    element('prediction').value = '{"action":"invalid_input","tool":null,"arguments":{},"missing_fields":[]}';
    await element('calculate').events.click();
    assert.equal(JSON.parse(element('result').textContent).reason, 'prediction_intent_mismatch');
  });
});
