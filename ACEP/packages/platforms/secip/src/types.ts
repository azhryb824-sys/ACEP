export enum SustainabilityDomain {
  GreenBuilding = "green_building",
  SustainableInfrastructure = "sustainable_infrastructure",
  SmartCity = "smart_city",
  RenewableEnergy = "renewable_energy",
  CircularEconomy = "circular_economy",
  Recycling = "recycling",
  WasteReduction = "waste_reduction",
  WaterManagement = "water_management",
  EmissionReduction = "emission_reduction",
  Biodiversity = "biodiversity"
}

export enum EmissionSource {
  Cement = "cement",
  Concrete = "concrete",
  Steel = "steel",
  Aluminum = "aluminum",
  Glass = "glass",
  Brick = "brick",
  Paint = "paint",
  Transportation = "transportation",
  Equipment = "equipment",
  Electricity = "electricity",
  Fuel = "fuel",
  Operations = "operations",
  Maintenance = "maintenance"
}

export enum WasteCategory {
  Concrete = "concrete",
  Steel = "steel",
  Wood = "wood",
  Plastic = "plastic",
  Glass = "glass",
  Paper = "paper",
  Hazardous = "hazardous",
  Electronic = "electronic"
}

export enum MaterialProperty {
  Density = "density",
  ThermalConductivity = "thermal_conductivity",
  CompressiveStrength = "compressive_strength",
  TensileStrength = "tensile_strength",
  Durability = "durability",
  FireResistance = "fire_resistance",
  MoistureResistance = "moisture_resistance"
}

export interface MaterialAnalysis {
  materialId: string;
  materialName: string;
  category: string;
  emissions: {
    manufacturing: number;
    transportation: number;
    installation: number;
    disposal: number;
    total: number;
    unit: string;
  };
  lifespan: {
    years: number;
    degradationRate: number;
    maintenanceInterval: number;
  };
  recyclability: {
    recyclable: boolean;
    recyclableContent: number;
    recyclingRate: number;
    recycledContent: number;
  };
  manufacturingEnergy: {
    total: number;
    perUnit: number;
    unit: string;
    energySource: string;
  };
  cost: {
    material: number;
    installation: number;
    maintenance: number;
    disposal: number;
    totalLifetime: number;
    currency: string;
  };
  quality: {
    rating: number;
    certifications: string[];
    defects: number;
    consistency: number;
  };
  supplier: {
    id: string;
    name: string;
    location: string;
    rating: number;
    certified: boolean;
  };
  environmentalRisk: {
    level: "low" | "medium" | "high" | "critical";
    factors: string[];
    mitigations: string[];
  };
}

export interface EnergyAnalysis {
  electricity: {
    consumption: number;
    peak: number;
    offPeak: number;
    unit: string;
    source: string;
  };
  fuel: {
    type: string;
    consumption: number;
    unit: string;
    efficiency: number;
  };
  gas: {
    consumption: number;
    unit: string;
    efficiency: number;
    emissions: number;
  };
  solar: {
    capacity: number;
    generation: number;
    efficiency: number;
    storage: number;
    unit: string;
  };
  efficiency: {
    overall: number;
    heating: number;
    cooling: number;
    lighting: number;
    equipment: number;
    benchmark: number;
  };
}

export interface WaterAnalysis {
  consumption: {
    total: number;
    potable: number;
    nonPotable: number;
    unit: string;
    perCapita: number;
  };
  loss: {
    leakage: number;
    evaporation: number;
    overflow: number;
    total: number;
    rate: number;
  };
  reuse: {
    treated: number;
    recycled: number;
    harvested: number;
    total: number;
    rate: number;
  };
  rainwater: {
    collection: number;
    storage: number;
    usage: number;
    potential: number;
  };
  treatedWater: {
    volume: number;
    quality: number;
    cost: number;
    method: string;
  };
  efficiency: {
    overall: number;
    fixture: number;
    irrigation: number;
    cooling: number;
    benchmark: number;
  };
}

export interface WasteManagement {
  generation: {
    total: number;
    byCategory: Record<WasteCategory, number>;
    unit: string;
    perCapita: number;
  };
  reuse: {
    amount: number;
    rate: number;
    categories: WasteCategory[];
    methods: string[];
  };
  recycle: {
    amount: number;
    rate: number;
    categories: WasteCategory[];
    facilities: string[];
  };
  disposal: {
    landfill: number;
    incineration: number;
    other: number;
    total: number;
    cost: number;
  };
  circularEconomy: {
    materialCirculation: number;
    wasteToEnergy: number;
    compostRate: number;
    closedLoopRate: number;
  };
}

export interface BiodiversityMetrics {
  speciesCount: number;
  protectedSpecies: number;
  vegetationCover: number;
  habitatQuality: number;
  restorationArea: number;
  impactScore: number;
}

export interface EnvironmentalMetrics {
  emissions: {
    total: number;
    perArea: number;
    perCapita: number;
    intensity: number;
    trend: "improving" | "stable" | "declining";
  };
  energy: {
    total: number;
    renewable: number;
    intensity: number;
    efficiency: number;
    trend: string;
  };
  water: {
    total: number;
    intensity: number;
    efficiency: number;
    trend: string;
  };
  waste: {
    total: number;
    diversionRate: number;
    intensity: number;
    trend: string;
  };
  biodiversity: BiodiversityMetrics;
}

export interface SocialMetrics {
  safety: {
    incidentRate: number;
    fatalityRate: number;
    nearMisses: number;
    safetyScore: number;
  };
  training: {
    hours: number;
    completionRate: number;
    programs: string[];
    effectiveness: number;
  };
  diversity: {
    genderRatio: number;
    minorityRatio: number;
    inclusionScore: number;
    payEquity: number;
  };
  community: {
    engagement: number;
    investment: number;
    jobsCreated: number;
    satisfaction: number;
  };
  responsibility: {
    policyAdherence: number;
    supplyChainStandards: number;
    humanRightsScore: number;
  };
}

export interface GovernanceMetrics {
  compliance: {
    violations: number;
    fines: number;
    auditScore: number;
    certifications: string[];
  };
  transparency: {
    reportingScore: number;
    disclosureRate: number;
    stakeholderEngagement: number;
  };
  risk: {
    identified: number;
    mitigated: number;
    residual: number;
    score: number;
  };
  antiCorruption: {
    policies: boolean;
    training: number;
    incidents: number;
    controls: number;
  };
  audit: {
    internalScore: number;
    externalScore: number;
    recommendations: number;
    implementation: number;
  };
}

export interface ESGScore {
  environmental: {
    score: number;
    emissions: number;
    energy: number;
    water: number;
    waste: number;
    biodiversity: number;
    weight: number;
  };
  social: {
    score: number;
    safety: number;
    training: number;
    diversity: number;
    community: number;
    responsibility: number;
    weight: number;
  };
  governance: {
    score: number;
    compliance: number;
    transparency: number;
    risk: number;
    antiCorruption: number;
    audit: number;
    weight: number;
  };
  overall: number;
  rating: string;
  date: string;
}

export interface EmissionFactors {
  source: EmissionSource;
  co2Factor: number;
  ch4Factor: number;
  n2oFactor: number;
  co2eFactor: number;
  unit: string;
  confidence: number;
  sourceReference: string;
}

export interface EmissionRecord {
  source: EmissionSource;
  activity: number;
  unit: string;
  factors: EmissionFactors;
  co2e: number;
  scope: 1 | 2 | 3;
  category: string;
  description: string;
}

export interface CarbonFootprint {
  total: number;
  unit: string;
  bySource: Record<string, number>;
  scope1: {
    total: number;
    sources: EmissionRecord[];
    description: string;
  };
  scope2: {
    total: number;
    sources: EmissionRecord[];
    methodology: string;
  };
  scope3: {
    total: number;
    categories: Record<string, number>;
    sources: EmissionRecord[];
  };
  methodology: {
    standard: string;
    version: string;
    factorsSource: string;
    calculationMethod: string;
    assumptions: string[];
  };
  intensity: {
    perRevenue: number;
    perEmployee: number;
    perArea: number;
    perUnit: number;
  };
  verification: {
    verified: boolean;
    verifier: string;
    date: string;
    status: string;
  };
}

export interface SustainabilityIntelligenceIndex {
  overall: number;
  dimensions: {
    emissions: { score: number; weight: number; trend: string };
    energy: { score: number; weight: number; trend: string };
    water: { score: number; weight: number; trend: string };
    recycling: { score: number; weight: number; trend: string };
    compliance: { score: number; weight: number; trend: string };
    social: { score: number; weight: number; trend: string };
    governance: { score: number; weight: number; trend: string };
  };
  maxScore: number;
  rating: string;
  timestamp: string;
  comparables: {
    industryAverage: number;
    bestInClass: number;
    percentile: number;
  };
  history: Array<{
    score: number;
    date: string;
    change: number;
  }>;
}

export interface NetZeroPlan {
  targetYear: number;
  baselineYear: number;
  baselineEmissions: number;
  currentEmissions: number;
  targets: {
    nearTerm: { year: number; reduction: number; description: string };
    midTerm: { year: number; reduction: number; description: string };
    longTerm: { year: number; reduction: number; description: string };
  };
  timeline: Array<{
    year: number;
    milestone: string;
    reduction: number;
    investment: number;
    status: string;
  }>;
  milestones: Array<{
    id: string;
    description: string;
    targetDate: string;
    achieved: boolean;
    achievedDate?: string;
    metrics: Record<string, number>;
  }>;
  cost: {
    totalInvestment: number;
    annualBudget: number;
    roi: number;
    paybackPeriod: number;
    fundingSources: string[];
    currency: string;
  };
  strategies: Array<{
    id: string;
    name: string;
    description: string;
    reduction: number;
    investment: number;
    timeline: string;
    priority: "low" | "medium" | "high" | "critical";
  }>;
}

export interface ClimateRiskAnalysis {
  physicalRisks: Array<{
    type: string;
    probability: number;
    impact: number;
    cost: number;
    mitigation: string;
    timeframe: string;
  }>;
  transitionRisks: Array<{
    type: string;
    probability: number;
    impact: number;
    cost: number;
    mitigation: string;
    timeframe: string;
  }>;
  opportunities: Array<{
    type: string;
    value: number;
    investment: number;
    roi: number;
    timeline: string;
  }>;
  overallScore: number;
  riskRating: string;
  adaptationPlan: string[];
}

export interface CircularEconomyMetrics {
  materialInputs: {
    total: number;
    renewable: number;
    recycled: number;
    virgin: number;
    unit: string;
  };
  materialOutputs: {
    total: number;
    reusable: number;
    recyclable: number;
    waste: number;
    unit: string;
  };
  circularity: {
    materialCircularityIndex: number;
    linearFlow: number;
    renewableRate: number;
    utilityRate: number;
  };
  waterCircularity: {
    recirculation: number;
    recovery: number;
    discharge: number;
    index: number;
  };
  economicValue: {
    materialSavings: number;
    wasteValue: number;
    recycledValue: number;
    costAvoidance: number;
    currency: string;
  };
}

export interface ReductionScenario {
  id: string;
  name: string;
  description: string;
  measures: Array<{
    action: string;
    reduction: number;
    cost: number;
    difficulty: "easy" | "moderate" | "hard";
    timeline: string;
  }>;
  totalReduction: number;
  totalCost: number;
  netPresentValue: number;
  paybackYears: number;
  feasibility: number;
}

export interface SustainabilityPrediction {
  type: "energy" | "water" | "emissions" | "waste" | "cost";
  current: number;
  predicted: number;
  unit: string;
  confidence: number;
  timeframe: string;
  factors: string[];
  recommendations: string[];
}

export interface SmartCityIntegration {
  sensors: Array<{
    id: string;
    type: string;
    location: string;
    readings: Record<string, number>;
  }>;
  dashboards: Array<{
    id: string;
    name: string;
    metrics: string[];
    refreshInterval: number;
  }>;
  alerts: Array<{
    id: string;
    severity: string;
    message: string;
    timestamp: string;
    acknowledged: boolean;
  }>;
}
