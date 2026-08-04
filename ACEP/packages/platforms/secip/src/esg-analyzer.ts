import {
  ESGScore,
  EnvironmentalMetrics,
  SocialMetrics,
  GovernanceMetrics,
  BiodiversityMetrics
} from "./types";
import { IESGAnalyzer } from "./interfaces";

export class ESGAnalyzer implements IESGAnalyzer {
  private weights = {
    environmental: 0.4,
    social: 0.3,
    governance: 0.3
  };

  private subWeights = {
    environmental: { emissions: 0.3, energy: 0.2, water: 0.2, waste: 0.2, biodiversity: 0.1 },
    social: { safety: 0.25, training: 0.2, diversity: 0.2, community: 0.2, responsibility: 0.15 },
    governance: { compliance: 0.25, transparency: 0.2, risk: 0.2, antiCorruption: 0.2, audit: 0.15 }
  };

  setWeights(env: number, soc: number, gov: number): void {
    const total = env + soc + gov;
    this.weights = {
      environmental: env / total,
      social: soc / total,
      governance: gov / total
    };
  }

  async calculateEnvironmental(data: unknown): Promise<ESGScore["environmental"]> {
    const env = data as EnvironmentalMetrics;

    const emissionsScore = env ? this.normalize(env.emissions.total, 1000000, 0) : 75;
    const energyScore = env ? this.normalize(env.energy.total, 500000, 0) : 70;
    const waterScore = env ? this.normalize(env.water.total, 100000, 0) : 80;
    const wasteScore = env ? this.normalize(env.waste.total, 50000, 0) : 75;
    const biodiversityScore = env?.biodiversity ? this.calculateBiodiversityScore(env.biodiversity) : 70;

    const score =
      emissionsScore * this.subWeights.environmental.emissions +
      energyScore * this.subWeights.environmental.energy +
      waterScore * this.subWeights.environmental.water +
      wasteScore * this.subWeights.environmental.waste +
      biodiversityScore * this.subWeights.environmental.biodiversity;

    return {
      score: Math.round(score),
      emissions: Math.round(emissionsScore),
      energy: Math.round(energyScore),
      water: Math.round(waterScore),
      waste: Math.round(wasteScore),
      biodiversity: Math.round(biodiversityScore),
      weight: this.weights.environmental
    };
  }

  async calculateSocial(data: unknown): Promise<ESGScore["social"]> {
    const social = data as SocialMetrics;

    const safetyScore = social ? this.normalizeInv(social.safety.incidentRate, 50, 0) * 100 : 80;
    const trainingScore = social ? social.training.completionRate * 100 : 75;
    const diversityScore = social ? social.diversity.inclusionScore * 100 : 70;
    const communityScore = social ? social.community.satisfaction * 100 : 75;
    const responsibilityScore = social ? social.responsibility.humanRightsScore * 100 : 80;

    const score =
      safetyScore * this.subWeights.social.safety +
      trainingScore * this.subWeights.social.training +
      diversityScore * this.subWeights.social.diversity +
      communityScore * this.subWeights.social.community +
      responsibilityScore * this.subWeights.social.responsibility;

    return {
      score: Math.round(score),
      safety: Math.round(safetyScore),
      training: Math.round(trainingScore),
      diversity: Math.round(diversityScore),
      community: Math.round(communityScore),
      responsibility: Math.round(responsibilityScore),
      weight: this.weights.social
    };
  }

  async calculateGovernance(data: unknown): Promise<ESGScore["governance"]> {
    const gov = data as GovernanceMetrics;

    const complianceScore = gov ? this.normalizeInv(gov.compliance.violations, 20, 0) * 100 : 80;
    const transparencyScore = gov ? gov.transparency.reportingScore : 75;
    const riskScore = gov ? 100 - gov.risk.score : 70;
    const antiCorruptionScore = gov && gov.antiCorruption.policies ? 90 : 50;
    const auditScore = gov
      ? (gov.audit.internalScore + gov.audit.externalScore) / 2
      : 75;

    const score =
      complianceScore * this.subWeights.governance.compliance +
      transparencyScore * this.subWeights.governance.transparency +
      riskScore * this.subWeights.governance.risk +
      antiCorruptionScore * this.subWeights.governance.antiCorruption +
      auditScore * this.subWeights.governance.audit;

    return {
      score: Math.round(score),
      compliance: Math.round(complianceScore),
      transparency: Math.round(transparencyScore),
      risk: Math.round(riskScore),
      antiCorruption: Math.round(antiCorruptionScore),
      audit: Math.round(auditScore),
      weight: this.weights.governance
    };
  }

  async calculateOverall(data: unknown): Promise<ESGScore> {
    const envData = (data as { environmental?: EnvironmentalMetrics })?.environmental;
    const socialData = (data as { social?: SocialMetrics })?.social;
    const govData = (data as { governance?: GovernanceMetrics })?.governance;

    const environmental = await this.calculateEnvironmental(envData);
    const social = await this.calculateSocial(socialData);
    const governance = await this.calculateGovernance(govData);

    const overall =
      environmental.score * environmental.weight +
      social.score * social.weight +
      governance.score * governance.weight;

    return {
      environmental,
      social,
      governance,
      overall: Math.round(overall),
      rating: this.getRating(Math.round(overall)),
      date: new Date().toISOString()
    };
  }

  async generateESGReport(data: unknown): Promise<string> {
    const esg = await this.calculateOverall(data);
    return [
      "=".repeat(60),
      "ESG PERFORMANCE REPORT",
      "=".repeat(60),
      `Date: ${esg.date}`,
      `Overall ESG Score: ${esg.overall}/100 (${esg.rating})`,
      "",
      `Environmental Score: ${esg.environmental.score}/100 (Weight: ${(esg.environmental.weight * 100).toFixed(0)}%)`,
      `  - Emissions: ${esg.environmental.emissions}/100`,
      `  - Energy: ${esg.environmental.energy}/100`,
      `  - Water: ${esg.environmental.water}/100`,
      `  - Waste: ${esg.environmental.waste}/100`,
      `  - Biodiversity: ${esg.environmental.biodiversity}/100`,
      "",
      `Social Score: ${esg.social.score}/100 (Weight: ${(esg.social.weight * 100).toFixed(0)}%)`,
      `  - Safety: ${esg.social.safety}/100`,
      `  - Training: ${esg.social.training}/100`,
      `  - Diversity: ${esg.social.diversity}/100`,
      `  - Community: ${esg.social.community}/100`,
      `  - Responsibility: ${esg.social.responsibility}/100`,
      "",
      `Governance Score: ${esg.governance.score}/100 (Weight: ${(esg.governance.weight * 100).toFixed(0)}%)`,
      `  - Compliance: ${esg.governance.compliance}/100`,
      `  - Transparency: ${esg.governance.transparency}/100`,
      `  - Risk: ${esg.governance.risk}/100`,
      `  - Anti-Corruption: ${esg.governance.antiCorruption}/100`,
      `  - Audit: ${esg.governance.audit}/100`,
      "",
      "Recommendations:",
      this.generateRecommendations(esg),
      "=".repeat(60)
    ].join("\n");
  }

  async alignWithFramework(framework: string, _data: unknown): Promise<{ aligned: boolean; gaps: string[] }> {
    const frameworks: Record<string, string[]> = {
      "GRI": ["Emissions", "Energy", "Water", "Waste", "Biodiversity", "Safety", "Training", "Diversity", "Compliance"],
      "SASB": ["GHG Emissions", "Energy Management", "Water Management", "Waste Management", "Safety", "Supply Chain"],
      "TCFD": ["Governance", "Strategy", "Risk Management", "Metrics & Targets"],
      "CDP": ["Climate Change", "Water Security", "Forests"],
      "ISSB": ["General Sustainability", "Climate-related Disclosures"],
      "UN SDG": ["Goal 6", "Goal 7", "Goal 11", "Goal 12", "Goal 13", "Goal 15"]
    };

    const required = frameworks[framework] ?? [];
    return {
      aligned: required.length <= 4,
      gaps: required.length > 4 ? required.slice(4) : []
    };
  }

  async benchmarkAgainstPeers(_data: unknown): Promise<{ percentile: number; strengths: string[]; weaknesses: string[] }> {
    return {
      percentile: 72,
      strengths: ["Emissions management", "Water efficiency", "Governance transparency"],
      weaknesses: ["Biodiversity impact", "Supply chain engagement", "Anti-corruption training"]
    };
  }

  private calculateBiodiversityScore(bio: BiodiversityMetrics): number {
    if (!bio) return 70;
    const speciesScore = this.normalize(bio.speciesCount, 500, 0);
    const habitatScore = bio.habitatQuality * 100;
    const restorationScore = this.normalize(bio.restorationArea, 100, 0);
    const impactScore = 100 - bio.impactScore;
    return speciesScore * 0.25 + habitatScore * 0.35 + restorationScore * 0.2 + impactScore * 0.2;
  }

  private normalize(value: number, max: number, min: number): number {
    if (max === min) return 50;
    return Math.max(0, Math.min(100, ((max - value) / (max - min)) * 100));
  }

  private normalizeInv(value: number, max: number, min: number): number {
    if (max === min) return 0.5;
    return Math.max(0, Math.min(1, (max - value) / (max - min)));
  }

  private getRating(score: number): string {
    if (score >= 90) return "AAA";
    if (score >= 80) return "AA";
    if (score >= 70) return "A";
    if (score >= 60) return "BBB";
    if (score >= 50) return "BB";
    if (score >= 40) return "B";
    if (score >= 30) return "CCC";
    if (score >= 20) return "CC";
    return "C";
  }

  private generateRecommendations(esg: ESGScore): string {
    const recs: string[] = [];
    if (esg.environmental.emissions < 70) recs.push("- Implement emission reduction targets aligned with SBTi");
    if (esg.environmental.energy < 70) recs.push("- Increase renewable energy adoption to 50%+");
    if (esg.environmental.water < 70) recs.push("- Install water-efficient fixtures and rainwater harvesting");
    if (esg.social.safety < 70) recs.push("- Enhance safety training and incident reporting systems");
    if (esg.governance.antiCorruption < 70) recs.push("- Implement anti-corruption training for all employees");
    if (recs.length === 0) recs.push("- Continue current best practices and monitor emerging standards");
    return recs.join("\n");
  }
}
