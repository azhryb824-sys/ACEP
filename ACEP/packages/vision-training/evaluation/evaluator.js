const fs = require('fs');
const path = require('path');
const Metrics = require('./metrics');
const DatasetManager = require('../dataset/dataset-manager');
const ModelRegistry = require('../models/model-registry');
const Config = require('../config');
const { getLogger } = require('../logger');

const LOGGER = getLogger({ service: 'VisionTraining-Evaluator' });

class Evaluator {
  async evaluate(modelIdOrPath) {
    LOGGER.info(`Evaluating model: ${modelIdOrPath}`);

    const testSet = DatasetManager.splitDataset().test;
    if (testSet.length === 0) {
      LOGGER.warn('No test data available for evaluation');
    }

    const evaluation = {
      modelId: modelIdOrPath,
      evaluatedAt: new Date().toISOString(),
      datasetSize: testSet.length,
      metrics: {},
      summary: {},
    };

    LOGGER.info(`Evaluating on ${testSet.length} test samples`);

    for (const entry of testSet) {
      const alignment = Metrics.calculatePromptAlignment(entry.caption, entry.caption);
      evaluation.metrics.promptAlignment = {
        value: alignment.value,
        sample: entry.image,
      };
    }

    evaluation.summary = {
      overallScore: evaluation.metrics.promptAlignment?.value || 0,
      samplesEvaluated: testSet.length,
      metricsAvailable: Object.keys(evaluation.metrics),
      recommendations: this._generateRecommendations(evaluation),
    };

    LOGGER.info(`Evaluation complete: score=${evaluation.summary.overallScore}`);
    return evaluation;
  }

  async compareVersions(versionIds) {
    const results = [];
    for (const id of versionIds) {
      const evalResult = await this.evaluate(id);
      results.push(evalResult);
    }
    return results.sort((a, b) => (b.summary?.overallScore || 0) - (a.summary?.overallScore || 0));
  }

  _generateRecommendations(evaluation) {
    const recs = [];
    if (evaluation.datasetSize < 10) {
      recs.push('Increase test dataset size for more reliable evaluation');
    }
    return recs;
  }

  async getEvaluationHistory(modelId) {
    const evalDir = Config.paths.evaluation;
    const modelEvalDir = path.join(evalDir, modelId);
    if (!fs.existsSync(modelEvalDir)) return [];
    return fs.readdirSync(modelEvalDir)
      .filter(f => f.endsWith('.json'))
      .map(f => {
        const data = JSON.parse(fs.readFileSync(path.join(modelEvalDir, f), 'utf-8'));
        return { ...data, file: f };
      })
      .sort((a, b) => new Date(b.evaluatedAt) - new Date(a.evaluatedAt));
  }
}

module.exports = new Evaluator();
