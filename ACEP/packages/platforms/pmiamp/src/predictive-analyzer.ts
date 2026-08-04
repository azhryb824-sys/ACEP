import {
  PredictiveAnalysis, ConditionMonitoringData, FailureAnalysis,
  WorkOrder, SmartAssetCard, SeverityLevel, OperationalImpact,
  AssetCriticality, VulnerableComponent, AnalysisEvidence
} from './types';
import { AggregatedPredictiveAnalysis } from './interfaces';

export class PredictiveAnalyzer {
  async analyzeFailurePatterns(
    assetId: string,
    failures: FailureAnalysis[]
  ): Promise<PredictiveAnalysis> {
    const evidence: AnalysisEvidence[] = [];
    let failureProbability = 0.05;
    let severity = SeverityLevel.Negligible;
    let impact = OperationalImpact.None;
    const vulnerableComponents: VulnerableComponent[] = [];

    if (failures.length === 0) {
      return this.buildAnalysis(assetId, 'Failure Patterns', failureProbability, 8760, 'hours',
        severity, impact, vulnerableComponents, 0.3, evidence, ['No historical failure data available']);
    }

    const recentFailures = failures.filter(f => {
      const age = (Date.now() - new Date(f.failureDate).getTime()) / (1000 * 60 * 60 * 24 * 30);
      return age <= 6;
    });

    if (recentFailures.length >= 3) {
      failureProbability += 0.40;
      evidence.push({
        source: 'Failure Patterns', indicator: 'High failure frequency',
        value: recentFailures.length, threshold: 2,
        severity: 'High', weight: 0.35
      });
    } else if (recentFailures.length >= 1) {
      failureProbability += 0.20;
      evidence.push({
        source: 'Failure Patterns', indicator: 'Recent failure detected',
        value: recentFailures.length, threshold: 0,
        severity: 'Medium', weight: 0.20
      });
    }

    const avgDowntime = failures.reduce((s, f) => s + f.downtimeHours, 0) / failures.length;
    if (avgDowntime > 24) {
      severity = SeverityLevel.Critical;
      impact = OperationalImpact.Shutdown;
      evidence.push({
        source: 'Failure Patterns', indicator: 'High average downtime',
        value: avgDowntime, threshold: 24,
        severity: 'Critical', weight: 0.25
      });
    } else if (avgDowntime > 8) {
      severity = SeverityLevel.Major;
      impact = OperationalImpact.Interrupted;
    } else if (avgDowntime > 1) {
      severity = SeverityLevel.Moderate;
      impact = OperationalImpact.Degraded;
    }

    const failureTypes = ['mechanical', 'electrical', 'electronic', 'software', 'operational'];
    for (const type of failureTypes) {
      const count = failures.filter(f => {
        const factors = (f as any)[type] || [];
        return factors.some((ff: any) => ff.contributor);
      }).length;
      if (count > failures.length * 0.3) {
        vulnerableComponents.push({
          name: `${type.charAt(0).toUpperCase() + type.slice(1)} Systems`,
          failureProbability: count / failures.length,
          estimatedLifeRemaining: Math.round(12 * (1 - count / failures.length)),
          criticality: count > failures.length * 0.5 ? AssetCriticality.Critical : AssetCriticality.High,
          replacementCost: 50000 + count * 10000
        });
      }
    }

    failureProbability = Math.min(1, failureProbability);
    const confidence = Math.min(0.9, 0.3 + failures.length * 0.05);

    return this.buildAnalysis(assetId, 'Failure Patterns', failureProbability,
      Math.round(8760 * (1 - failureProbability)), 'hours',
      severity, impact, vulnerableComponents, confidence, evidence,
      this.generateActions(failureProbability, severity));
  }

  async analyzeMaintenanceHistory(
    assetId: string,
    workOrders: WorkOrder[]
  ): Promise<PredictiveAnalysis> {
    const evidence: AnalysisEvidence[] = [];
    let failureProbability = 0.05;

    if (workOrders.length === 0) {
      return this.buildAnalysis(assetId, 'Maintenance History', failureProbability,
        8760, 'hours', SeverityLevel.Negligible, OperationalImpact.None,
        [], 0.2, evidence, ['No maintenance history recorded']);
    }

    const preventiveCount = workOrders.filter(w => w.type === 'Preventive').length;
    const predictiveCount = workOrders.filter(w => w.type === 'Predictive').length;
    const emergencyCount = workOrders.filter(w => w.type === 'Emergency').length;
    const completedCount = workOrders.filter(w => w.status === 'Completed').length;

    if (preventiveCount > 0) {
      failureProbability -= 0.10;
      evidence.push({
        source: 'Maintenance History', indicator: 'Regular preventive maintenance',
        value: preventiveCount, threshold: 1,
        severity: 'Positive', weight: 0.20
      });
    }

    if (predictiveCount > 0) {
      failureProbability -= 0.05;
      evidence.push({
        source: 'Maintenance History', indicator: 'Predictive maintenance performed',
        value: predictiveCount, threshold: 1,
        severity: 'Positive', weight: 0.10
      });
    }

    if (emergencyCount > 2) {
      failureProbability += 0.25;
      evidence.push({
        source: 'Maintenance History', indicator: 'High emergency maintenance frequency',
        value: emergencyCount, threshold: 2,
        severity: 'High', weight: 0.25
      });
    }

    const compliance = workOrders.length > 0 ? completedCount / workOrders.length : 0;
    if (compliance < 0.6) {
      failureProbability += 0.20;
      evidence.push({
        source: 'Maintenance History', indicator: 'Low maintenance compliance',
        value: Math.round(compliance * 100), threshold: 60,
        severity: 'High', weight: 0.20
      });
    }

    failureProbability = Math.max(0.01, Math.min(1, failureProbability));
    const confidence = Math.min(0.85, 0.3 + workOrders.length * 0.02);

    return this.buildAnalysis(assetId, 'Maintenance History', failureProbability,
      Math.round(8760 * (1 - failureProbability)), 'hours',
      emergencyCount > 2 ? SeverityLevel.Major : SeverityLevel.Minor,
      emergencyCount > 2 ? OperationalImpact.Interrupted : OperationalImpact.Degraded,
      [], confidence, evidence,
      this.generateActions(failureProbability, emergencyCount > 2 ? SeverityLevel.Major : SeverityLevel.Minor));
  }

  async analyzeOperationalBehavior(
    assetId: string,
    sensorData: ConditionMonitoringData[]
  ): Promise<PredictiveAnalysis> {
    const evidence: AnalysisEvidence[] = [];
    let failureProbability = 0.05;
    let severity = SeverityLevel.Negligible;
    const vulnerableComponents: VulnerableComponent[] = [];

    if (sensorData.length < 5) {
      return this.buildAnalysis(assetId, 'Operational Behavior', failureProbability,
        8760, 'hours', SeverityLevel.Negligible, OperationalImpact.None,
        [], 0.15, evidence, ['Insufficient operational data for analysis']);
    }

    const recent = sensorData.slice(-20);

    const avgTemp = recent.filter(d => d.temperature !== null)
      .reduce((s, d) => s + d.temperature!, 0) / recent.filter(d => d.temperature !== null).length || 0;
    if (avgTemp > 75) {
      failureProbability += 0.20;
      severity = SeverityLevel.Major;
      evidence.push({
        source: 'Operational Behavior', indicator: 'Elevated operating temperature',
        value: avgTemp, threshold: 75,
        severity: 'High', weight: 0.20
      });
      vulnerableComponents.push({
        name: 'Thermal Management System',
        failureProbability: 0.4, estimatedLifeRemaining: 6,
        criticality: AssetCriticality.High, replacementCost: 15000
      });
    }

    const avgVib = recent.filter(d => d.vibration !== null)
      .reduce((s, d) => s + d.vibration!, 0) / recent.filter(d => d.vibration !== null).length || 0;
    if (avgVib > 8) {
      failureProbability += 0.25;
      severity = SeverityLevel.Critical;
      evidence.push({
        source: 'Operational Behavior', indicator: 'Excessive vibration detected',
        value: avgVib, threshold: 8,
        severity: 'Critical', weight: 0.25
      });
      vulnerableComponents.push({
        name: 'Bearings & Rotating Assembly',
        failureProbability: 0.6, estimatedLifeRemaining: 3,
        criticality: AssetCriticality.Critical, replacementCost: 25000
      });
    }

    const avgLoad = recent.filter(d => d.load !== null)
      .reduce((s, d) => s + d.load!, 0) / recent.filter(d => d.load !== null).length || 0;
    if (avgLoad > 95) {
      failureProbability += 0.15;
      evidence.push({
        source: 'Operational Behavior', indicator: 'Sustained overload condition',
        value: avgLoad, threshold: 95,
        severity: 'High', weight: 0.15
      });
    }

    const errorCount = recent.filter(d => d.errors !== null)
      .reduce((s, d) => s + d.errors!, 0);
    if (errorCount > 5) {
      failureProbability += errorCount * 0.02;
      evidence.push({
        source: 'Operational Behavior', indicator: 'Increasing error rate',
        value: errorCount, threshold: 5,
        severity: 'Medium', weight: 0.10
      });
    }

    const pressureOk = recent.filter(d => d.pressure !== null && d.pressure >= 80 && d.pressure <= 120).length;
    const totalPressure = recent.filter(d => d.pressure !== null).length;
    if (totalPressure > 0 && pressureOk / totalPressure < 0.7) {
      failureProbability += 0.10;
      evidence.push({
        source: 'Operational Behavior', indicator: 'Pressure outside normal range',
        value: Math.round((1 - pressureOk / totalPressure) * 100), threshold: 30,
        severity: 'Medium', weight: 0.10
      });
    }

    failureProbability = Math.min(1, failureProbability);
    const confidence = Math.min(0.85, 0.2 + recent.length * 0.02);
    const impact = severity === SeverityLevel.Critical ? OperationalImpact.Shutdown :
                   severity === SeverityLevel.Major ? OperationalImpact.Interrupted :
                   OperationalImpact.Degraded;

    return this.buildAnalysis(assetId, 'Operational Behavior', failureProbability,
      Math.round(8760 * (1 - failureProbability)), 'hours',
      severity, impact, vulnerableComponents, confidence, evidence,
      this.generateActions(failureProbability, severity));
  }

  async analyzeManufacturerData(
    assetId: string,
    asset: SmartAssetCard
  ): Promise<PredictiveAnalysis> {
    const evidence: AnalysisEvidence[] = [];
    let failureProbability = 0.10;

    if (asset.designLife > 0) {
      const installed = new Date(asset.installDate).getTime();
      const elapsedYears = (Date.now() - installed) / (1000 * 60 * 60 * 24 * 365);
      const lifeUsed = elapsedYears / asset.designLife;

      if (lifeUsed > 1.0) {
        failureProbability += 0.35;
        evidence.push({
          source: 'Manufacturer Data', indicator: 'Asset exceeded design life',
          value: Math.round(lifeUsed * 100), threshold: 100,
          severity: 'Critical', weight: 0.30
        });
      } else if (lifeUsed > 0.8) {
        failureProbability += 0.20;
        evidence.push({
          source: 'Manufacturer Data', indicator: 'Asset approaching end of design life',
          value: Math.round(lifeUsed * 100), threshold: 80,
          severity: 'High', weight: 0.20
        });
      } else if (lifeUsed > 0.5) {
        failureProbability += 0.05;
        evidence.push({
          source: 'Manufacturer Data', indicator: 'Asset in mid-life phase',
          value: Math.round(lifeUsed * 100), threshold: 50,
          severity: 'Low', weight: 0.10
        });
      }
    }

    if (asset.warranty) {
      const warrantyEnd = new Date(asset.warranty).getTime();
      if (Date.now() > warrantyEnd) {
        failureProbability += 0.10;
        evidence.push({
          source: 'Manufacturer Data', indicator: 'Warranty expired',
          value: 1, threshold: 0,
          severity: 'Medium', weight: 0.10
        });
      }
    }

    const manufacturerQuality = this.assessManufacturerQuality(asset.manufacturer);
    if (manufacturerQuality === 'Premium') {
      failureProbability -= 0.10;
    } else if (manufacturerQuality === 'Budget') {
      failureProbability += 0.15;
    }

    failureProbability = Math.max(0.01, Math.min(1, failureProbability));
    const confidence = 0.5;

    return this.buildAnalysis(assetId, 'Manufacturer Data', failureProbability,
      Math.round(8760 * (1 - failureProbability)), 'hours',
      failureProbability > 0.5 ? SeverityLevel.Major : SeverityLevel.Minor,
      failureProbability > 0.5 ? OperationalImpact.Interrupted : OperationalImpact.Degraded,
      [], confidence, evidence,
      this.generateActions(failureProbability,
        failureProbability > 0.5 ? SeverityLevel.Major : SeverityLevel.Minor));
  }

  async analyzeSensorTrends(
    assetId: string,
    sensorData: ConditionMonitoringData[]
  ): Promise<PredictiveAnalysis> {
    const evidence: AnalysisEvidence[] = [];
    let failureProbability = 0.05;
    const vulnerableComponents: VulnerableComponent[] = [];

    if (sensorData.length < 10) {
      return this.buildAnalysis(assetId, 'Sensor Trends', failureProbability,
        8760, 'hours', SeverityLevel.Negligible, OperationalImpact.None,
        [], 0.1, evidence, ['Insufficient sensor data for trend analysis']);
    }

    const sorted = [...sensorData].sort((a, b) =>
      new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

    const half = Math.max(1, Math.floor(sorted.length / 2));
    const firstHalf = sorted.slice(0, half);
    const secondHalf = sorted.slice(-half);

    const firstTemp = firstHalf.filter(d => d.temperature !== null)
      .reduce((s, d) => s + d.temperature!, 0) / firstHalf.filter(d => d.temperature !== null).length || 0;
    const secondTemp = secondHalf.filter(d => d.temperature !== null)
      .reduce((s, d) => s + d.temperature!, 0) / secondHalf.filter(d => d.temperature !== null).length || 0;
    if (secondTemp > firstTemp * 1.15 && secondTemp > 65) {
      failureProbability += 0.20;
      evidence.push({
        source: 'Sensor Trends', indicator: 'Temperature rising trend',
        value: Math.round((secondTemp - firstTemp) / firstTemp * 100), threshold: 15,
        severity: 'High', weight: 0.20
      });
      vulnerableComponents.push({
        name: 'Cooling System', failureProbability: 0.45,
        estimatedLifeRemaining: 4, criticality: AssetCriticality.High,
        replacementCost: 20000
      });
    }

    const firstVib = firstHalf.filter(d => d.vibration !== null)
      .reduce((s, d) => s + d.vibration!, 0) / firstHalf.filter(d => d.vibration !== null).length || 0;
    const secondVib = secondHalf.filter(d => d.vibration !== null)
      .reduce((s, d) => s + d.vibration!, 0) / secondHalf.filter(d => d.vibration !== null).length || 0;
    if (secondVib > firstVib * 1.2 && secondVib > 6) {
      failureProbability += 0.30;
      evidence.push({
        source: 'Sensor Trends', indicator: 'Vibration amplitude increasing',
        value: Math.round((secondVib - firstVib) / firstVib * 100), threshold: 20,
        severity: 'Critical', weight: 0.30
      });
      vulnerableComponents.push({
        name: 'Bearings', failureProbability: 0.65,
        estimatedLifeRemaining: 2, criticality: AssetCriticality.Critical,
        replacementCost: 12000
      });
    }

    const firstEnergy = firstHalf.filter(d => d.energy !== null)
      .reduce((s, d) => s + d.energy!, 0) / firstHalf.filter(d => d.energy !== null).length || 0;
    const secondEnergy = secondHalf.filter(d => d.energy !== null)
      .reduce((s, d) => s + d.energy!, 0) / secondHalf.filter(d => d.energy !== null).length || 0;
    if (secondEnergy > firstEnergy * 1.1) {
      failureProbability += 0.10;
      evidence.push({
        source: 'Sensor Trends', indicator: 'Energy consumption increasing',
        value: Math.round((secondEnergy - firstEnergy) / firstEnergy * 100), threshold: 10,
        severity: 'Medium', weight: 0.10
      });
    }

    const firstErrors = firstHalf.filter(d => d.errors !== null)
      .reduce((s, d) => s + d.errors!, 0);
    const secondErrors = secondHalf.filter(d => d.errors !== null)
      .reduce((s, d) => s + d.errors!, 0);
    if (secondErrors > firstErrors * 1.5 && secondErrors > 3) {
      failureProbability += 0.15;
      evidence.push({
        source: 'Sensor Trends', indicator: 'Error rate accelerating',
        value: secondErrors, threshold: firstErrors * 1.5,
        severity: 'High', weight: 0.15
      });
    }

    failureProbability = Math.min(1, failureProbability);
    const dataQuality = sensorData.filter(d =>
      d.temperature !== null || d.vibration !== null).length / sensorData.length;
    const confidence = Math.min(0.9, 0.3 + sensorData.length * 0.01) * dataQuality;

    return this.buildAnalysis(assetId, 'Sensor Trends', failureProbability,
      Math.round(8760 * (1 - failureProbability)), 'hours',
      failureProbability > 0.5 ? SeverityLevel.Major : SeverityLevel.Minor,
      failureProbability > 0.5 ? OperationalImpact.Interrupted : OperationalImpact.Degraded,
      vulnerableComponents, confidence, evidence,
      this.generateActions(failureProbability,
        failureProbability > 0.5 ? SeverityLevel.Major : SeverityLevel.Minor));
  }

  async analyzeEnvironmentalImpact(
    assetId: string,
    asset: SmartAssetCard
  ): Promise<PredictiveAnalysis> {
    const evidence: AnalysisEvidence[] = [];
    let failureProbability = 0.05;

    const location = asset.location;
    if (location && location.coordinates) {
      const lat = Math.abs(location.coordinates.lat);
      if (lat > 40) {
        failureProbability += 0.10;
        evidence.push({
          source: 'Environmental Impact', indicator: 'Cold climate stress',
          value: lat, threshold: 40,
          severity: 'Medium', weight: 0.10
        });
      }

      if (lat < 25) {
        failureProbability += 0.10;
        evidence.push({
          source: 'Environmental Impact', indicator: 'Hot climate stress',
          value: lat, threshold: 25,
          severity: 'Medium', weight: 0.10
        });
      }

      if (location.coordinates.lng < 30 || location.coordinates.lng > 60) {
        failureProbability += 0.05;
      }
    }

    if (asset.assetType === 'Elevator' || asset.assetType === 'Escalator') {
      failureProbability += 0.10;
      evidence.push({
        source: 'Environmental Impact', indicator: 'High-usage equipment type',
        value: 1, threshold: 0,
        severity: 'Medium', weight: 0.10
      });
    }

    if (asset.assetType === 'Generator' || asset.assetType === 'Transformer') {
      failureProbability += 0.05;
      evidence.push({
        source: 'Environmental Impact', indicator: 'Heat-generating equipment',
        value: 1, threshold: 0,
        severity: 'Low', weight: 0.05
      });
    }

    if (asset.assetType === 'Pump' || asset.assetType === 'HVAC') {
      failureProbability += 0.15;
      evidence.push({
        source: 'Environmental Impact', indicator: 'Humidity-exposed equipment',
        value: 1, threshold: 0,
        severity: 'Medium', weight: 0.10
      });
    }

    if (asset.assetType === 'FireFighting' || asset.assetType === 'Alarm') {
      failureProbability -= 0.10;
      evidence.push({
        source: 'Environmental Impact', indicator: 'Safety-critical with redundancy',
        value: 1, threshold: 0,
        severity: 'Positive', weight: 0.10
      });
    }

    failureProbability = Math.max(0.01, Math.min(1, failureProbability));
    const confidence = 0.4;

    return this.buildAnalysis(assetId, 'Environmental Impact', failureProbability,
      Math.round(8760 * (1 - failureProbability)), 'hours',
      failureProbability > 0.3 ? SeverityLevel.Moderate : SeverityLevel.Minor,
      failureProbability > 0.3 ? OperationalImpact.Degraded : OperationalImpact.None,
      [], confidence, evidence,
      this.generateActions(failureProbability,
        failureProbability > 0.3 ? SeverityLevel.Moderate : SeverityLevel.Minor));
  }

  async comprehensiveAnalysis(
    assetId: string,
    asset: SmartAssetCard,
    sensorData: ConditionMonitoringData[],
    failures: FailureAnalysis[],
    workOrders: WorkOrder[]
  ): Promise<AggregatedPredictiveAnalysis> {
    const analyses = await Promise.all([
      this.analyzeFailurePatterns(assetId, failures),
      this.analyzeMaintenanceHistory(assetId, workOrders),
      this.analyzeOperationalBehavior(assetId, sensorData),
      this.analyzeManufacturerData(assetId, asset),
      this.analyzeSensorTrends(assetId, sensorData),
      this.analyzeEnvironmentalImpact(assetId, asset)
    ]);

    const totalWeight = analyses.reduce((s, a) => s + a.confidence, 0);
    const weightedFailureProb = analyses.reduce(
      (s, a) => s + a.failureProbability * a.confidence, 0) / (totalWeight || 1);
    const weightedTtf = analyses.reduce(
      (s, a) => s + a.estimatedTimeToFailure * a.confidence, 0) / (totalWeight || 1);

    const highestConfidence = analyses.reduce(
      (best, a) => a.confidence > best.confidence ? a : best, analyses[0]);

    const conflictingIndicators: string[] = [];
    const probabilities = analyses.map(a => a.failureProbability);
    if (probabilities.length > 1) {
      const avg = probabilities.reduce((s, p) => s + p, 0) / probabilities.length;
      for (let i = 0; i < analyses.length; i++) {
        if (Math.abs(analyses[i].failureProbability - avg) > 0.3) {
          const sources = ['Failure Patterns', 'Maintenance History', 'Operational Behavior',
            'Manufacturer Data', 'Sensor Trends', 'Environmental Impact'];
          conflictingIndicators.push(`${sources[i]} analysis deviates significantly from consensus`);
        }
      }
    }

    return {
      assetId,
      overallFailureProbability: Math.round(weightedFailureProb * 1000) / 1000,
      estimatedTimeToFailure: Math.round(weightedTtf),
      estimatedTimeUnit: 'hours',
      analyses,
      consensus: highestConfidence,
      conflictingIndicators,
      confidence: Math.round(totalWeight / analyses.length * 1000) / 1000,
      timestamp: new Date().toISOString()
    };
  }

  private buildAnalysis(
    assetId: string, source: string,
    failureProbability: number, estimatedTimeToFailure: number,
    estimatedTimeUnit: string, severity: SeverityLevel,
    operationalImpact: OperationalImpact,
    vulnerableComponents: VulnerableComponent[],
    confidence: number, evidence: AnalysisEvidence[],
    recommendedActions: string[]
  ): PredictiveAnalysis {
    return {
      assetId,
      timestamp: new Date().toISOString(),
      failureProbability: Math.round(failureProbability * 1000) / 1000,
      estimatedTimeToFailure: Math.round(estimatedTimeToFailure),
      estimatedTimeUnit,
      vulnerableComponents,
      severity,
      operationalImpact,
      confidence: Math.round(confidence * 1000) / 1000,
      evidence,
      recommendedActions
    };
  }

  private assessManufacturerQuality(manufacturer: string): 'Premium' | 'Standard' | 'Budget' {
    const premium = ['Siemens', 'ABB', 'Schneider', 'GE', 'Mitsubishi', 'Hitachi', 'Toshiba',
      'KONE', 'Otis', 'Schindler', 'ThyssenKrupp', 'Carrier', 'Trane', 'Daikin', 'YORK',
      'Johnson Controls', 'Honeywell', 'Bosch', 'Emerson', 'Rockwell', 'Westinghouse'];
    const budget = ['NoName', 'Generic', 'Economy', 'Value', 'Budget'];

    const mfg = manufacturer.toLowerCase();
    if (budget.some(b => mfg.includes(b.toLowerCase()) || manufacturer.includes(b))) return 'Budget';
    if (premium.some(p => mfg.includes(p.toLowerCase()))) return 'Premium';
    return 'Standard';
  }

  private generateActions(failureProbability: number, severity: SeverityLevel): string[] {
    const actions: string[] = [];

    if (failureProbability > 0.7) {
      actions.push('IMMEDIATE: Schedule emergency maintenance intervention');
      actions.push('Plan for potential asset replacement');
      actions.push('Prepare backup system activation');
    } else if (failureProbability > 0.5) {
      actions.push('URGENT: Schedule maintenance within 7 days');
      actions.push('Order critical spare parts proactively');
      actions.push('Increase monitoring frequency to daily');
    } else if (failureProbability > 0.3) {
      actions.push('Schedule maintenance within 30 days');
      actions.push('Review and optimize operational parameters');
      actions.push('Order replacement parts for vulnerable components');
    } else if (failureProbability > 0.1) {
      actions.push('Continue routine preventive maintenance');
      actions.push('Monitor sensor trends weekly');
      actions.push('Update asset condition assessment');
    } else {
      actions.push('Maintain standard preventive maintenance schedule');
      actions.push('Continue regular monitoring');
    }

    if (severity === SeverityLevel.Critical || severity === SeverityLevel.Catastrophic) {
      actions.push('ACTIVATE: Emergency response protocol');
      actions.push('Notify facility management and safety team');
    }

    return actions;
  }
}
