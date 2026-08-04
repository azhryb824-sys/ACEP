import {
  InspectionPoint, InspectionResult, NCR, NCRSeverity, NCRStatus,
  QualityAnalysis, QualityPattern, RecurringDefect, SuggestedAction,
  ActionPriority, QualityTrend, QualityMetrics, DefectType,
  QualityElement
} from './types';
import { IQualityAnalyzer } from './interfaces';

interface PatternSignature {
  defectTypes: DefectType[];
  elements: QualityElement[];
  locations: string[];
  severity: NCRSeverity;
}

interface HistoricalPattern {
  signature: PatternSignature;
  frequency: number;
  projects: string[];
  typicalRootCause: string;
  typicalSolution: string;
}

export class QualityAnalyzer implements IQualityAnalyzer {
  private knowledgeGraph: any;
  private history: Map<string, HistoricalPattern[]> = new Map();
  private learningData: HistoricalPattern[] = [];

  constructor(kg: any) {
    this.knowledgeGraph = kg;
  }

  async analyzeProject(projectId: string, from: string, to: string): Promise<QualityAnalysis> {
    const inspections = this.getInspectionsForProject(projectId, from, to);
    const ncrs = this.getNCRsForProject(projectId, from, to);

    const patterns = await this.detectPatterns(inspections, ncrs);
    const recurringDefects = await this.findRecurringDefects(ncrs);
    const reworkProbability = await this.estimateReworkProbability(inspections);
    const correctiveActions = await this.suggestCorrectiveActions(ncrs);
    const priorities = await this.prioritizeActions(recurringDefects);
    const trends = await this.analyzeTrends([]);

    return {
      id: `QA-${projectId}-${Date.now()}`,
      projectId,
      analysisDate: new Date().toISOString(),
      period: { from, to },
      patterns,
      recurringDefects,
      reworkProbability,
      correctiveActions,
      priorities,
      trends,
      summary: this.generateSummary(patterns, recurringDefects, reworkProbability)
    };
  }

  async detectPatterns(inspections: InspectionPoint[], ncrs: NCR[]): Promise<QualityPattern[]> {
    const patterns: QualityPattern[] = [];
    const elementDefectMap = new Map<string, { count: number; severities: NCRSeverity[] }>();

    for (const ncr of ncrs) {
      const key = `${ncr.element}-${ncr.cause}`;
      const existing = elementDefectMap.get(key) || { count: 0, severities: [] };
      existing.count++;
      existing.severities.push(ncr.severity);
      elementDefectMap.set(key, existing);
    }

    for (const [key, data] of elementDefectMap) {
      if (data.count >= 2) {
        const [elementStr, ...causeParts] = key.split('-');
        const element = elementStr as QualityElement;
        const cause = causeParts.join('-');
        const maxSeverity = this.getMaxSeverity(data.severities);
        const probability = Math.min(data.count / (ncrs.length || 1) * 0.8, 0.95);

        patterns.push({
          id: `PATTERN-${Date.now()}-${patterns.length}`,
          type: 'RecurringDefect',
          description: `Recurring issue detected: ${cause} in ${element} (${data.count} occurrences)`,
          frequency: data.count,
          affectedElements: [element],
          severity: this.mapSeverity(maxSeverity),
          probability,
          recommendation: `Investigate root cause of ${cause} in ${element} and implement corrective action`
        });
      }
    }

    if (patterns.length === 0) {
      patterns.push({
        id: `PATTERN-${Date.now()}-0`,
        type: 'Normal',
        description: 'No significant patterns detected in current period',
        frequency: 0,
        affectedElements: [],
        severity: 'Low',
        probability: 0.1,
        recommendation: 'Continue routine quality monitoring'
      });
    }

    return patterns;
  }

  async findRecurringDefects(ncrs: NCR[]): Promise<RecurringDefect[]> {
    const defectMap = new Map<string, RecurringDefect>();

    for (const ncr of ncrs) {
      const key = `${ncr.element}-${ncr.location}`;
      const existing = defectMap.get(key);
      const ncrSeverity = ncr.severity;

      if (existing) {
        existing.occurrenceCount++;
        existing.lastOccurrence = ncr.raisedAt;
        if (ncr.raisedAt < existing.firstOccurrence) {
          existing.firstOccurrence = ncr.raisedAt;
        }
      } else {
        defectMap.set(key, {
          defectType: this.inferDefectType(ncr.description, ncr.cause),
          element: ncr.element,
          location: ncr.location,
          occurrenceCount: 1,
          firstOccurrence: ncr.raisedAt,
          lastOccurrence: ncr.raisedAt,
          trend: 'Stable',
          rootCause: ncr.cause
        });
      }
    }

    const recurring: RecurringDefect[] = Array.from(defectMap.values())
      .filter(d => d.occurrenceCount >= 1)
      .map(d => ({
        ...d,
        trend: d.occurrenceCount > 3 ? 'Increasing' : d.occurrenceCount === 1 ? 'Stable' : 'Increasing'
      }));

    return recurring.sort((a, b) => b.occurrenceCount - a.occurrenceCount);
  }

  async estimateReworkProbability(inspections: InspectionPoint[]): Promise<number> {
    if (inspections.length === 0) return 0;

    const failed = inspections.filter(i => i.results?.verdict === 'Fail').length;
    const conditionalPass = inspections.filter(i => i.results?.verdict === 'ConditionalPass').length;
    const total = inspections.length;

    const failureRate = failed / total;
    const conditionalRate = conditionalPass / total;
    const baseProb = failureRate * 0.8 + conditionalRate * 0.4;

    const reworkHistory = this.learningData.filter(h =>
      h.signature.severity === NCRSeverity.Critical || h.signature.severity === NCRSeverity.Major
    ).length;
    const historicalFactor = Math.min(reworkHistory / 10, 0.3);

    return Math.min(baseProb + historicalFactor, 0.95);
  }

  async suggestCorrectiveActions(ncrs: NCR[]): Promise<SuggestedAction[]> {
    const actions: SuggestedAction[] = [];
    const seen = new Set<string>();

    for (const ncr of ncrs.filter(n => n.status !== NCRStatus.Closed)) {
      const key = `${ncr.element}-${ncr.cause}`;
      if (seen.has(key)) continue;
      seen.add(key);

      const priority = this.mapSeverityToPriority(ncr.severity);
      const historicalSolution = this.findHistoricalSolution(ncr.element, ncr.cause);

      actions.push({
        id: `ACTION-${Date.now()}-${actions.length}`,
        description: historicalSolution || `Address ${ncr.cause} in ${ncr.element} at ${ncr.location}`,
        priority,
        estimatedEffort: this.estimateEffort(ncr.severity),
        deadline: this.calculateDeadline(priority),
        expectedImpact: `Reduce recurrence of ${ncr.cause} in ${ncr.element}`,
        status: 'Proposed'
      });
    }

    return actions;
  }

  async prioritizeActions(defects: RecurringDefect[]): Promise<ActionPriority[]> {
    return defects.map(d => {
      const urgency = d.trend === 'Increasing' ? 0.9 : d.trend === 'Stable' ? 0.5 : 0.3;
      const impact = Math.min(d.occurrenceCount * 0.15, 1);
      const priorityScore = urgency * 0.6 + impact * 0.4;

      let recommendedAction: string;
      if (priorityScore > 0.7) {
        recommendedAction = `Immediate corrective action required for ${d.defectType} in ${d.element}`;
      } else if (priorityScore > 0.4) {
        recommendedAction = `Schedule corrective action for ${d.defectType} in ${d.element}`;
      } else {
        recommendedAction = `Monitor ${d.defectType} in ${d.element} during regular inspections`;
      }

      return {
        defectType: d.defectType,
        element: d.element,
        urgency,
        impact,
        priorityScore,
        recommendedAction
      };
    }).sort((a, b) => b.priorityScore - a.priorityScore);
  }

  async analyzeTrends(metrics: QualityMetrics[]): Promise<QualityTrend[]> {
    if (metrics.length < 2) {
      return [{
        metric: 'QualityScore',
        direction: 'Stable',
        changePercent: 0,
        period: 'Current'
      }];
    }

    const sorted = [...metrics].sort((a, b) => a.calculatedAt.localeCompare(b.calculatedAt));
    const latest = sorted[sorted.length - 1];
    const previous = sorted[sorted.length - 2];

    const trends: QualityTrend[] = [
      this.buildTrend('QualityScore', previous.qualityScore, latest.qualityScore),
      this.buildTrend('FirstPassYield', previous.firstPassYield, latest.firstPassYield),
      this.buildTrend('ReworkRate', previous.reworkRate, latest.reworkRate, true),
      this.buildTrend('CAPAClosureRate', previous.capaClosureRate, latest.capaClosureRate),
      this.buildTrend('LabComplianceRate', previous.labComplianceRate, latest.labComplianceRate)
    ];

    return trends;
  }

  async learnFromPast(projectId: string): Promise<void> {
    const projectPatterns = this.history.get(projectId) || [];
    for (const pattern of projectPatterns) {
      const existing = this.learningData.find(l =>
        l.signature.defectTypes.join() === pattern.signature.defectTypes.join() &&
        l.signature.elements.join() === pattern.signature.elements.join()
      );
      if (existing) {
        existing.frequency += pattern.frequency;
        if (!existing.projects.includes(projectId)) {
          existing.projects.push(projectId);
        }
      } else {
        this.learningData.push(pattern);
      }
    }
  }

  async getRecommendations(projectId: string): Promise<string[]> {
    const recommendations: string[] = [];
    const projectPatterns = this.history.get(projectId) || [];

    const highFrequency = projectPatterns.filter(p => p.frequency > 3);
    for (const pattern of highFrequency) {
      recommendations.push(
        `High recurrence of ${pattern.signature.defectTypes.join(', ')} in ${pattern.signature.elements.join(', ')}. ` +
        `Recommended: ${pattern.typicalSolution}`
      );
    }

    if (projectPatterns.length === 0) {
      recommendations.push('Continue current quality monitoring practices');
    }

    return recommendations;
  }

  addToHistory(projectId: string, pattern: HistoricalPattern): void {
    const existing = this.history.get(projectId) || [];
    existing.push(pattern);
    this.history.set(projectId, existing);
  }

  private getInspectionsForProject(projectId: string, from: string, to: string): InspectionPoint[] {
    return [];
  }

  private getNCRsForProject(projectId: string, from: string, to: string): NCR[] {
    return [];
  }

  private getMaxSeverity(severities: NCRSeverity[]): NCRSeverity {
    const order = [NCRSeverity.Observation, NCRSeverity.Minor, NCRSeverity.Major, NCRSeverity.Critical];
    let max = NCRSeverity.Observation;
    for (const s of severities) {
      if (order.indexOf(s) > order.indexOf(max)) max = s;
    }
    return max;
  }

  private mapSeverity(severity: NCRSeverity): 'Low' | 'Medium' | 'High' | 'Critical' {
    const map: Record<NCRSeverity, 'Low' | 'Medium' | 'High' | 'Critical'> = {
      [NCRSeverity.Observation]: 'Low',
      [NCRSeverity.Minor]: 'Medium',
      [NCRSeverity.Major]: 'High',
      [NCRSeverity.Critical]: 'Critical'
    };
    return map[severity];
  }

  private mapSeverityToPriority(severity: NCRSeverity): 'Immediate' | 'ShortTerm' | 'MediumTerm' | 'LongTerm' {
    const map: Record<NCRSeverity, 'Immediate' | 'ShortTerm' | 'MediumTerm' | 'LongTerm'> = {
      [NCRSeverity.Critical]: 'Immediate',
      [NCRSeverity.Major]: 'ShortTerm',
      [NCRSeverity.Minor]: 'MediumTerm',
      [NCRSeverity.Observation]: 'LongTerm'
    };
    return map[severity];
  }

  private inferDefectType(description: string, cause: string): DefectType {
    const desc = `${description} ${cause}`.toLowerCase();
    if (desc.includes('crack')) return DefectType.Crack;
    if (desc.includes('honeycomb')) return DefectType.Honeycombing;
    if (desc.includes('spall')) return DefectType.Spalling;
    if (desc.includes('rust') || desc.includes('corrosion')) return DefectType.Rust;
    if (desc.includes('leak') || desc.includes('water')) return DefectType.Leakage;
    if (desc.includes('finish') || desc.includes('paint')) return DefectType.PoorFinish;
    if (desc.includes('deviate') || desc.includes('tolerance') || desc.includes('align')) return DefectType.Deviation;
    return DefectType.Crack;
  }

  private findHistoricalSolution(element: QualityElement, cause: string): string | undefined {
    for (const entry of this.learningData) {
      if (entry.signature.elements.includes(element) && entry.typicalRootCause === cause) {
        return entry.typicalSolution;
      }
    }
    return undefined;
  }

  private estimateEffort(severity: NCRSeverity): string {
    const map: Record<NCRSeverity, string> = {
      [NCRSeverity.Critical]: '2-5 days',
      [NCRSeverity.Major]: '1-3 days',
      [NCRSeverity.Minor]: '4-8 hours',
      [NCRSeverity.Observation]: '1-2 hours'
    };
    return map[severity];
  }

  private calculateDeadline(priority: string): string {
    const date = new Date();
    switch (priority) {
      case 'Immediate': date.setDate(date.getDate() + 1); break;
      case 'ShortTerm': date.setDate(date.getDate() + 7); break;
      case 'MediumTerm': date.setDate(date.getDate() + 30); break;
      case 'LongTerm': date.setDate(date.getDate() + 90); break;
    }
    return date.toISOString();
  }

  private buildTrend(metric: string, previous: number, current: number, inverse: boolean = false): QualityTrend {
    const change = previous === 0 ? (current > 0 ? 100 : 0) : ((current - previous) / previous) * 100;
    let direction: 'Improving' | 'Stable' | 'Declining';
    if (Math.abs(change) < 5) {
      direction = 'Stable';
    } else {
      const isImproving = inverse ? change < 0 : change > 0;
      direction = isImproving ? 'Improving' : 'Declining';
    }
    return { metric, direction, changePercent: Math.round(change * 100) / 100, period: 'Current' };
  }

  private generateSummary(patterns: QualityPattern[], defects: RecurringDefect[], reworkProb: number): string {
    const criticalPatterns = patterns.filter(p => p.severity === 'Critical' || p.severity === 'High');
    const increasingDefects = defects.filter(d => d.trend === 'Increasing');

    let summary = `Quality analysis complete. `;
    if (criticalPatterns.length > 0) {
      summary += `${criticalPatterns.length} critical/high severity patterns detected. `;
    }
    if (increasingDefects.length > 0) {
      summary += `${increasingDefects.length} recurring defects showing increasing trend. `;
    }
    summary += `Rework probability estimated at ${(reworkProb * 100).toFixed(1)}%.`;
    return summary;
  }

  getLearningData(): HistoricalPattern[] {
    return [...this.learningData];
  }

  getProjectHistory(projectId: string): HistoricalPattern[] {
    return this.history.get(projectId) || [];
  }

  clearHistory(projectId?: string): void {
    if (projectId) {
      this.history.delete(projectId);
    } else {
      this.history.clear();
      this.learningData = [];
    }
  }
}
