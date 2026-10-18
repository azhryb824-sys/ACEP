'use strict';
const express = require('express');
const { registerToolResearch } = require('./routes');

function createResearchApp() {
  const app = express();
  registerToolResearch(app, { enabled: true });
  return app;
}

if (require.main === module) {
  const port = Number(process.env.PORT || 5050);
  if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error('Invalid PORT');
  createResearchApp().listen(port, '127.0.0.1', () => {
    console.log(`Research demo: http://127.0.0.1:${port}/research/tools`);
  });
}

module.exports = { createResearchApp };
