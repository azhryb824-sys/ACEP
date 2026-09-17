const base = require('./jest.config.cjs');
module.exports = { ...base, coverageThreshold: undefined, coverageDirectory: 'coverage-engineering',
  coverageReporters: ['json-summary', 'text-summary'], collectCoverageFrom: [
    'packages/ai-engine/models/**/*.js', 'packages/ai-engine/model-domain-guards.js',
    'packages/ai-engine/project-scope.js', 'packages/ai-engine/engineering-concept-estimator.js',
    'packages/uets/**/*.js', 'packages/governance/**/*.js',
    'packages/ai-services/cad-parser/dist/index.js', 'packages/ai-services/bim-parser/dist/index.js',
    'packages/ai-services/embeddings/dist/index.js'
  ] };
