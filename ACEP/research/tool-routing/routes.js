'use strict';
const path = require('node:path');
const { execFile } = require('node:child_process');
const express = require('express');

// Disabled by default. Explicit field grammar only; never accepts a model's
// generated text as the original user source. No external services or writes.
function registerToolResearch(app, options = {}) {
  const enabled = options.enabled ?? (process.env.ACEP_TOOL_RESEARCH_ENABLED === '1');
  if (!enabled) return;
  const python = options.python || process.env.ACEP_TOOL_PYTHON || 'python3';
  let active = 0;
  app.get('/research/tools', (_req, res) => {
    res.set('Cache-Control', 'no-store');
    res.sendFile(path.join(__dirname, 'demo.html'));
  });
  app.post('/api/v1/research/tools/calculate', express.json({ limit: '16kb', strict: false }), (req, res) => {
    res.set('Cache-Control', 'no-store');
    const body = req.body;
    if (!body || typeof body !== 'object' || Array.isArray(body) ||
        Object.keys(body).some(key => !['text', 'prediction'].includes(key)) ||
        typeof body.text !== 'string' ||
        ('prediction' in body && typeof body.prediction !== 'string')) {
      return res.status(400).json({ status: 'blocked', reason: 'invalid_request_contract', calculation_executed: false });
    }
    const payload = JSON.stringify(body);
    if (body.text.length > 4096 || Buffer.byteLength(payload, 'utf8') > 16384) {
      return res.status(413).json({ status: 'blocked', reason: 'request_too_large', calculation_executed: false });
    }
    if (active >= 2) {
      res.set('Retry-After', '1');
      return res.status(429).json({ status: 'blocked', reason: 'research_worker_busy', calculation_executed: false });
    }
    active += 1;
    const child = execFile(python, [path.join(__dirname, 'run_bridge.py')],
      { timeout: 3000, maxBuffer: 65536, windowsHide: true }, (error, stdout) => {
        active -= 1;
        if (res.destroyed) return;
        if (error) {
          return res.status(503).json({ status: 'blocked', reason: 'calculator_unavailable', calculation_executed: false });
        }
        try {
          res.json(JSON.parse(stdout));
        } catch {
          res.status(503).json({ status: 'blocked', reason: 'invalid_calculator_response', calculation_executed: false });
        }
      });
    // Failed process launch can close stdin before the callback reports it.
    child.stdin.on('error', () => {});
    child.stdin.end(payload);
    res.on('close', () => { if (child.exitCode === null) child.kill(); });
  });
  app.use('/api/v1/research/tools/calculate', (error, _req, res, _next) => {
    res.status(error.type === 'entity.too.large' ? 413 : 400).json({
      status: 'blocked', reason: 'invalid_request_json', calculation_executed: false,
    });
  });
}

module.exports = { registerToolResearch };
