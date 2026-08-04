import { BaseEngine } from '@acep/core';
import { v4 as uuid } from 'uuid';
import {
  DecisionIntelligenceLedger, DecisionAlternative, DecisionRisk,
  ExecutiveResponse
} from './types';

export class DecisionIntelligenceLedgerEngine extends BaseEngine {
  private decisions: DecisionIntelligenceLedger[] = [];

  constructor(config?: Record<string, unknown>) {
    super('DecisionIntelligenceLedger', '1.0.0', config);
  }

  async initialize(): Promise<void> {
    this.setStatus('initialized');
    this.logger.info('DecisionIntelligenceLedger initialized');
  }

  async validate(): Promise<boolean> {
    return true;
  }

  async recordDecision(
    decision: string,
    owner: string,
    data: Record<string, unknown>,
    alternatives: DecisionAlternative[],
    risks: DecisionRisk[],
    expectedOutcome: string
  ): Promise<DecisionIntelligenceLedger> {
    const entry: DecisionIntelligenceLedger = {
      id: uuid(),
      decision,
      owner,
      date: new Date().toISOString(),
      data,
      alternatives,
      risks,
      expectedOutcome,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    this.decisions.push(entry);
    this.logger.info(`Decision recorded: "${decision}" by ${owner}`);
    return entry;
  }

  async updateOutcome(
    decisionId: string,
    actualOutcome: string,
    evaluation: 'exceeded' | 'met' | 'below' | 'failed',
    lessonsLearned: string[]
  ): Promise<DecisionIntelligenceLedger> {
    const entry = this.decisions.find(d => d.id === decisionId);
    if (!entry) throw new Error(`Decision ${decisionId} not found`);

    entry.actualOutcome = actualOutcome;
    entry.outcomeEvaluation = evaluation;
    entry.lessonsLearned = lessonsLearned;
    entry.updatedAt = new Date().toISOString();

    this.logger.info(`Decision outcome updated: "${entry.decision}" -> ${evaluation}`);
    return entry;
  }

  async getDecision(id: string): Promise<DecisionIntelligenceLedger | null> {
    return this.decisions.find(d => d.id === id) || null;
  }

  async getAllDecisions(): Promise<DecisionIntelligenceLedger[]> {
    return this.decisions;
  }

  async getDecisionsByOwner(owner: string): Promise<DecisionIntelligenceLedger[]> {
    return this.decisions.filter(d => d.owner === owner);
  }

  async getDecisionsByDateRange(start: string, end: string): Promise<DecisionIntelligenceLedger[]> {
    return this.decisions.filter(d => d.date >= start && d.date <= end);
  }

  async evaluateDecisionQuality(): Promise<{
    totalDecisions: number;
    evaluated: number;
    exceeded: number;
    met: number;
    below: number;
    failed: number;
    accuracyRate: number;
    averageConfidence: number;
    topPerformers: { owner: string; accuracy: number; count: number }[];
    improvementTrend: string;
  }> {
    const evaluated = this.decisions.filter(d => d.actualOutcome);
    const exceeded = evaluated.filter(d => d.outcomeEvaluation === 'exceeded');
    const met = evaluated.filter(d => d.outcomeEvaluation === 'met');
    const below = evaluated.filter(d => d.outcomeEvaluation === 'below');
    const failed = evaluated.filter(d => d.outcomeEvaluation === 'failed');

    const accuracyRate = evaluated.length > 0
      ? (exceeded.length * 1.0 + met.length * 0.7 + below.length * 0.3) / evaluated.length * 100
      : 0;

    const avgConfidence = this.decisions.length > 0
      ? this.decisions.reduce((s, d) => {
          const altConfAvg = d.alternatives.length > 0
            ? d.alternatives.reduce((a, alt) => a + alt.confidence, 0) / d.alternatives.length
            : 0;
          return s + altConfAvg;
        }, 0) / this.decisions.length * 100
      : 0;

    const ownerGroups: Record<string, DecisionIntelligenceLedger[]> = {};
    for (const d of evaluated) {
      if (!ownerGroups[d.owner]) ownerGroups[d.owner] = [];
      ownerGroups[d.owner].push(d);
    }

    const topPerformers = Object.entries(ownerGroups)
      .map(([owner, decisions]) => {
        const ex = decisions.filter(d => d.outcomeEvaluation === 'exceeded').length;
        const m = decisions.filter(d => d.outcomeEvaluation === 'met').length;
        const bl = decisions.filter(d => d.outcomeEvaluation === 'below').length;
        const fl = decisions.filter(d => d.outcomeEvaluation === 'failed').length;
        const accuracy = decisions.length > 0
          ? (ex * 1.0 + m * 0.7 + bl * 0.3) / decisions.length * 100
          : 0;
        return { owner, accuracy: Math.round(accuracy * 100) / 100, count: decisions.length };
      })
      .sort((a, b) => b.accuracy - a.accuracy)
      .slice(0, 5);

    const total = this.decisions.length;
    let trend: string;
    if (total < 5) {
      trend = 'Insufficient data for trend analysis';
    } else {
      const recent = this.decisions.slice(-5).filter(d => d.actualOutcome);
      const previous = this.decisions.slice(-10, -5).filter(d => d.actualOutcome);
      const recentScore = recent.length > 0
        ? recent.filter(d => d.outcomeEvaluation === 'exceeded' || d.outcomeEvaluation === 'met').length / recent.length
        : 0;
      const previousScore = previous.length > 0
        ? previous.filter(d => d.outcomeEvaluation === 'exceeded' || d.outcomeEvaluation === 'met').length / previous.length
        : 0;
      if (recentScore > previousScore + 0.1) trend = 'Improving';
      else if (recentScore < previousScore - 0.1) trend = 'Declining';
      else trend = 'Stable';
    }

    return {
      totalDecisions: this.decisions.length,
      evaluated: evaluated.length,
      exceeded: exceeded.length,
      met: met.length,
      below: below.length,
      failed: failed.length,
      accuracyRate: Math.round(accuracyRate * 100) / 100,
      averageConfidence: Math.round(avgConfidence * 100) / 100,
      topPerformers,
      improvementTrend: trend
    };
  }

  async getLessonsLearned(): Promise<{ decision: string; owner: string; lessons: string[] }[]> {
    return this.decisions
      .filter(d => d.lessonsLearned && d.lessonsLearned.length > 0)
      .map(d => ({
        decision: d.decision,
        owner: d.owner,
        lessons: d.lessonsLearned!
      }));
  }

  async getDecisionByOutcome(evaluation: 'exceeded' | 'met' | 'below' | 'failed'): Promise<DecisionIntelligenceLedger[]> {
    return this.decisions.filter(d => d.outcomeEvaluation === evaluation);
  }

  async getDecisionQualityReport(): Promise<ExecutiveResponse> {
    const quality = await this.evaluateDecisionQuality();

    const report = `DECISION INTELLIGENCE QUALITY REPORT
=====================================

OVERVIEW
Total Decisions Tracked: ${quality.totalDecisions}
Evaluated Decisions: ${quality.evaluated}
Improvement Trend: ${quality.improvementTrend}

OUTCOME DISTRIBUTION
Exceeded Expectations: ${quality.exceeded} (${quality.totalDecisions > 0 ? (quality.exceeded / quality.totalDecisions * 100).toFixed(1) : 0}%)
Met Expectations: ${quality.met} (${quality.totalDecisions > 0 ? (quality.met / quality.totalDecisions * 100).toFixed(1) : 0}%)
Below Expectations: ${quality.below} (${quality.totalDecisions > 0 ? (quality.below / quality.totalDecisions * 100).toFixed(1) : 0}%)
Failed: ${quality.failed} (${quality.totalDecisions > 0 ? (quality.failed / quality.totalDecisions * 100).toFixed(1) : 0}%)

ACCURACY: ${quality.accuracyRate}%
AVERAGE CONFIDENCE: ${quality.averageConfidence}%

TOP DECISION MAKERS
${quality.topPerformers.map((p, i) => `${i + 1}. ${p.owner}: ${p.accuracy}% accuracy (${p.count} decisions)`).join('\n')}

RECOMMENDATIONS
${quality.accuracyRate < 70 ? '- Improve decision-making process with more data-driven analysis' : ''}
${quality.improvementTrend === 'Declining' ? '- Review recent decisions for patterns in failures' : ''}
- Continue tracking outcomes to build historical data
- Share lessons learned across the organization`;

    return {
      answer: report,
      evidence: [
        `Based on ${quality.evaluated} evaluated decisions out of ${quality.totalDecisions} total`,
        `Top decision maker: ${quality.topPerformers[0]?.owner || 'N/A'}`
      ],
      assumptions: ['Outcome evaluations are subjective based on defined criteria'],
      confidence: 88.3,
      relatedMetrics: ['decisionAccuracy', 'outcomeDistribution', 'ownerPerformance'],
      timestamp: new Date().toISOString()
    };
  }

  async addAlternativeToDecision(decisionId: string, alternative: DecisionAlternative): Promise<DecisionIntelligenceLedger> {
    const entry = this.decisions.find(d => d.id === decisionId);
    if (!entry) throw new Error(`Decision ${decisionId} not found`);
    entry.alternatives.push(alternative);
    entry.updatedAt = new Date().toISOString();
    return entry;
  }

  async addRiskToDecision(decisionId: string, risk: DecisionRisk): Promise<DecisionIntelligenceLedger> {
    const entry = this.decisions.find(d => d.id === decisionId);
    if (!entry) throw new Error(`Decision ${decisionId} not found`);
    entry.risks.push(risk);
    entry.updatedAt = new Date().toISOString();
    return entry;
  }

  async getDecisionsByRiskLevel(minSeverity: number): Promise<DecisionIntelligenceLedger[]> {
    return this.decisions.filter(d =>
      d.risks.some(r => r.severity >= minSeverity)
    );
  }

  count(): number {
    return this.decisions.length;
  }

  clear(): void {
    this.decisions = [];
    this.logger.info('Decision ledger cleared');
  }
}
