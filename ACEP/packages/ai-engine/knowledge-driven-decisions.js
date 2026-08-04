class KnowledgeDrivenDecisions {
  constructor(acepCore, knowledgeDataset, unifiedKB, periodicEvaluation, selectiveRetraining, benchmarkLibrary, dataQualityPipeline) {
    this.acep = acepCore;
    this.dataset = knowledgeDataset;
    this.unifiedKB = unifiedKB;
    this.evaluator = periodicEvaluation;
    this.retrainer = selectiveRetraining;
    this.benchmark = benchmarkLibrary;
    this.quality = dataQualityPipeline;
    this._decisionLog = [];
    this._config = { confidenceThreshold: 0.6, requireHistoricalData: true, fallbackToAI: true };
  }

  configure(config = {}) {
    Object.assign(this._config, config);
    return this._config;
  }

  decide(options = {}) {
    const { type, area, floors, finishing, city, region, decisionType = 'estimate_cost' } = options;
    const startTime = Date.now();
    const logEntry = { timestamp: new Date().toISOString(), options: { type, area, floors, finishing, city, region, decisionType }, sources: [], duration: 0 };

    let conclusion = null;
    let confidence = 0;

    switch (decisionType) {
      case 'estimate_cost': {
        const sq = this.dataset.getStandardQuantities(type);
        const avgCost = sq?.avgCost;
        const historicalCost = avgCost?.mean || null;
        const historicalSamples = avgCost?.samples || 0;

        if (historicalCost && historicalSamples >= 10 && this._config.requireHistoricalData) {
          const totalCost = historicalCost;
          confidence = Math.min(0.95, historicalSamples / 100);
          conclusion = { cost: Math.round(totalCost), unit: 'SAR', source: 'historical_data', samples: historicalSamples };
          logEntry.sources.push({ name: 'csv_historical', weight: confidence, dataPoints: historicalSamples });
        }

        if (!conclusion && this._config.fallbackToAI && this.acep?.costEstimator) {
          try {
            const boq = this.acep.quantityEstimator?.estimateBOQ?.(type, area, floors) || { items: [] };
            const cost = this.acep.costEstimator.estimateCost(boq.items, type, area, floors);
            if (cost?.totalCost) {
              confidence = 0.5;
              conclusion = { cost: Math.round(cost.totalCost), unit: 'SAR', source: 'ai_estimation', breakdown: cost };
              logEntry.sources.push({ name: 'ai_engine', weight: 0.5 });
            }
          } catch {}
        }

        const similarProjects = this.unifiedKB.query({ type, city, minFloors: floors - 1, maxFloors: floors + 1, limit: 5 });
        if (similarProjects.total > 0) {
          const avgSimilarCost = similarProjects.results.reduce((s, p) => s + (p.cost || 0), 0) / similarProjects.results.length;
          if (avgSimilarCost > 0) {
            logEntry.sources.push({ name: 'similar_projects', count: similarProjects.total, avgCost: Math.round(avgSimilarCost) });
          }
        }
        break;
      }

      case 'estimate_duration': {
        const sq = this.dataset.getStandardQuantities(type);
        const avgDuration = sq?.avgDuration;
        const historicalDuration = avgDuration?.mean || null;
        const historicalSamples = avgDuration?.samples || 0;

        if (historicalDuration && historicalSamples >= 10 && this._config.requireHistoricalData) {
          confidence = Math.min(0.95, historicalSamples / 100);
          conclusion = { duration: Math.round(historicalDuration * 10) / 10, unit: 'months', source: 'historical_data', samples: historicalSamples };
          logEntry.sources.push({ name: 'csv_historical_weight', weight: confidence, dataPoints: historicalSamples });
        }

        if (!conclusion && this._config.fallbackToAI && this.acep?.scheduleOptimizer) {
          try {
            const sched = this.acep.scheduleOptimizer.generateSchedule(type, area, floors);
            if (sched?.totalMonths) {
              confidence = 0.5;
              conclusion = { duration: Math.round(sched.totalMonths * 10) / 10, unit: 'months', source: 'ai_estimation', breakdown: sched };
              logEntry.sources.push({ name: 'ai_engine', weight: 0.5 });
            }
          } catch {}
        }
        break;
      }

      case 'recommend_project_type': {
        const types = this.dataset.getStandardQuantities().projectTypes || [];
        const scored = types.map(t => {
          const sq = this.dataset.getStandardQuantities(t);
          const understanding = this.dataset.getProjectUnderstanding(t);
          const sampleScore = Math.min(1, (sq?.samples || 0) / 50);
          const riskScore = understanding ? 1 - (understanding.risks?.length || 0) / 15 : 0.5;
          const accuracyScore = understanding?.confidence || 0.5;
          return { type: t, score: Math.round((sampleScore * 0.3 + riskScore * 0.35 + accuracyScore * 0.35) * 10000) / 100, samples: sq?.samples };
        });
        const sorted = scored.sort((a, b) => b.score - a.score);
        conclusion = { recommendations: sorted.slice(0, 5), bestType: sorted[0] };
        confidence = sorted[0]?.score / 100 || 0;
        logEntry.sources.push({ name: 'knowledge_dataset', typesAnalyzed: types.length });
        break;
      }

      case 'quality_check': {
        try {
          const check = this.quality.runFullCheck();
          const o = check.overall || {};
          conclusion = { score: o.qualityScore, grade: o.grade, anomalies: o.anomalyCount, inconsistencies: o.consistencyIssues };
          confidence = (o.qualityScore || 0) / 100;
          logEntry.sources.push({ name: 'data_quality_pipeline', score: o.qualityScore });
        } catch {
          conclusion = { error: 'quality check failed' };
          confidence = 0;
        }
        break;
      }

      case 'system_health': {
        const bench = this.benchmark.getLastResults();
        const growth = this.dataset.getStandardQuantities();
        const evalStats = this.evaluator.getStats();
        const qualityCheck = this.quality.runFullCheck();
        const qScore = qualityCheck.overall?.qualityScore || 0;
        const healthScore = ((bench?.passed || 0) + qScore + (evalStats.totalEvaluations > 0 ? 80 : 30)) / 3;
        conclusion = {
          healthScore: Math.round(healthScore * 100) / 100,
          benchmarkPassRate: bench?.passed,
          dataQualityScore: qScore,
          evaluationsRun: evalStats.totalEvaluations,
          projectTypesLoaded: growth?.projectTypes?.length,
          autoEvaluation: evalStats.autoRunning,
        };
        confidence = healthScore / 100;
        logEntry.sources.push({ name: 'system_health_check', healthScore });
        break;
      }

      default:
        conclusion = { error: `Unknown decision type: ${decisionType}` };
        confidence = 0;
    }

    logEntry.conclusion = conclusion;
    logEntry.confidence = Math.round(confidence * 10000) / 100;
    logEntry.applied = confidence >= this._config.confidenceThreshold;
    logEntry.duration = Date.now() - startTime;
    this._decisionLog.push(logEntry);
    return logEntry;
  }

  getHistory(limit = 20) {
    return this._decisionLog.slice(-limit);
  }

  getStats() {
    const total = this._decisionLog.length;
    const applied = this._decisionLog.filter(d => d.applied).length;
    const avgConfidence = total > 0 ? this._decisionLog.reduce((s, d) => s + d.confidence, 0) / total : 0;
    return {
      totalDecisions: total,
      appliedDecisions: applied,
      applicationRate: total > 0 ? Math.round(applied / total * 10000) / 100 : 0,
      avgConfidence: Math.round(avgConfidence * 100) / 100,
      config: { ...this._config },
    };
  }
}

module.exports = KnowledgeDrivenDecisions;
