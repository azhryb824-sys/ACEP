'use strict';

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const CONFIG_PATH = path.join(__dirname, '..', 'model-training', 'project-archetypes.json');
const DEFAULT_ARTIFACT_PATH = path.join(__dirname, '..', '..', '..', 'models', 'registry', 'candidates', 'acep-million-synthetic-v1.json');

function finitePositive(value) {
  const number = Number(value);
  return Number.isFinite(number) && number > 0 ? number : null;
}

function finiteNonNegative(value, fallback = 0) {
  const number = Number(value);
  return Number.isFinite(number) && number >= 0 ? number : fallback;
}

function canonical(value) {
  return String(value || '').trim().toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');
}

function dot(left, right) {
  let result = 0;
  for (let index = 0; index < left.length; index += 1) result += left[index] * right[index];
  return result;
}

function sigmoid(value) {
  const bounded = Math.max(-40, Math.min(40, value));
  return 1 / (1 + Math.exp(-bounded));
}

function sha256File(filePath) {
  return crypto.createHash('sha256').update(fs.readFileSync(filePath)).digest('hex');
}

const CITY_ALIASES = Object.freeze({
  'الرياض': 'Riyadh', 'جدة': 'Jeddah', 'مكة': 'Makkah', 'مكة المكرمة': 'Makkah',
  'المدينة': 'Madinah', 'المدينة المنورة': 'Madinah', 'الدمام': 'Dammam', 'الخبر': 'Khobar',
  'الطائف': 'Taif', 'أبها': 'Abha', 'ابها': 'Abha', 'تبوك': 'Tabuk', 'بريدة': 'Buraydah',
  'جازان': 'Jazan', 'نجران': 'Najran', 'العلا': 'AlUla'
});

class MillionProjectModel {
  constructor(options = {}) {
    this.configPath = options.configPath || CONFIG_PATH;
    this.artifactPath = options.artifactPath || process.env.ACEP_MILLION_MODEL_PATH || DEFAULT_ARTIFACT_PATH;
    this.config = null;
    this.artifact = null;
    this.error = null;
    this.integrityVerified = false;
    this.aliases = new Map();
    this.load();
  }

  load() {
    try {
      this.config = JSON.parse(fs.readFileSync(this.configPath, 'utf8'));
      this.artifact = JSON.parse(fs.readFileSync(this.artifactPath, 'utf8'));
      const checksumPath = `${this.artifactPath}.sha256`;
      if (!fs.existsSync(checksumPath)) throw new Error('artifact checksum is missing');
      const expectedArtifactHash = fs.readFileSync(checksumPath, 'utf8').trim().split(/\s+/)[0];
      if (!/^[a-f0-9]{64}$/.test(expectedArtifactHash) || sha256File(this.artifactPath) !== expectedArtifactHash) {
        throw new Error('artifact checksum verification failed');
      }
      if (this.artifact.training?.configSha256 !== sha256File(this.configPath)) {
        throw new Error('training configuration checksum does not match runtime configuration');
      }
      if (this.config.projectTypes.length !== 35) throw new Error('project archetype catalog must contain 35 types');
      if (this.artifact.training?.records !== 1000000) throw new Error('artifact was not trained on exactly 1,000,000 records');
      if (this.artifact.governance?.status !== 'research_candidate') throw new Error('artifact is not an accepted research candidate');
      if (!this.artifact.evaluation?.allSyntheticGatesPassed) throw new Error('artifact failed its synthetic holdout gates');
      this._buildAliases();
      const expected = this._featureNames();
      if (JSON.stringify(expected) !== JSON.stringify(this.artifact.features)) throw new Error('artifact feature schema does not match runtime');
      for (const target of this.artifact.targets || []) {
        if (this.artifact.models[target]?.coefficients?.length !== expected.length) {
          throw new Error(`invalid coefficient count for ${target}`);
        }
      }
      this.integrityVerified = true;
      this.error = null;
    } catch (error) {
      this.artifact = null;
      this.integrityVerified = false;
      this.error = error.message;
    }
    return this.getStatus();
  }

  _buildAliases() {
    this.aliases.clear();
    for (const profile of this.config.projectTypes) {
      this.aliases.set(canonical(profile.key), profile.key);
      for (const alias of profile.aliases || []) this.aliases.set(canonical(alias), profile.key);
    }
  }

  _featureNames() {
    const names = [
      'intercept', 'logGrossArea', 'logLandArea', 'floors', 'basements', 'buildings',
      'logCapacity', 'complexity', 'footprintShare', 'landRatio', 'cityCostIndex',
      'climateIndex', 'finishCostIndex', 'finishDurationIndex', 'finishDefectIndex',
      'methodCostIndex', 'methodDurationIndex', 'methodRiskIndex',
      'areaComplexityInteraction', 'areaFloorsInteraction', 'isLinear', 'isExisting'
    ];
    names.push(...this.config.projectTypes.map(profile => `type:${profile.key}`));
    names.push(...[...new Set(this.config.projectTypes.map(profile => profile.family))].sort().map(family => `family:${family}`));
    names.push(...Object.keys(this.config.cities).map(city => `city:${city}`));
    names.push(...Object.keys(this.config.finishes).map(finish => `finish:${finish}`));
    names.push(...Object.keys(this.config.methods).map(method => `method:${method}`));
    return names;
  }

  isEnabled() {
    return process.env.ACEP_MILLION_MODEL_ENABLED === 'true';
  }

  getStatus() {
    return {
      loaded: Boolean(this.artifact),
      enabled: this.isEnabled(),
      modelId: this.artifact?.modelId || null,
      trainingRecords: this.artifact?.training?.records || 0,
      holdoutRecords: this.artifact?.evaluation?.records || 0,
      projectTypes: this.artifact?.training?.projectTypes || 0,
      provenance: this.artifact?.governance?.dataProvenance || null,
      productionEnabled: false,
      integrityVerified: this.integrityVerified,
      error: this.error
    };
  }

  resolveType(value) {
    const key = this.aliases.get(canonical(value));
    return key ? this.config.projectTypes.find(profile => profile.key === key) : null;
  }

  resolveCity(value) {
    const supplied = String(value || '').trim();
    if (this.config.cities[supplied]) return supplied;
    if (CITY_ALIASES[supplied]) return CITY_ALIASES[supplied];
    const lowered = supplied.toLowerCase();
    return Object.keys(this.config.cities).find(city => city.toLowerCase() === lowered) || 'Riyadh';
  }

  predict(input = {}) {
    if (!this.artifact) return { available: false, reason: this.error || 'artifact_not_loaded' };
    if (!this.isEnabled()) return { available: false, reason: 'candidate_not_enabled' };

    const profile = this.resolveType(input.projectType || input.type);
    if (!profile) return { available: false, reason: 'unsupported_project_type' };
    const grossBuiltArea = finitePositive(input.grossBuiltArea ?? input.totalArea ?? input.area);
    const floors = finitePositive(input.floors);
    if (!grossBuiltArea || !floors) return { available: false, reason: 'gross_area_and_floors_required' };

    const cityName = this.resolveCity(input.city);
    const finishName = this.config.finishes[canonical(input.finishing)] ? canonical(input.finishing) : 'standard';
    const methodName = this.config.methods[canonical(input.method)] ? canonical(input.method) : 'traditional';
    const city = this.config.cities[cityName];
    const finish = this.config.finishes[finishName];
    const method = this.config.methods[methodName];

    const isMultiFloor = ['building', 'industrial', 'existing', 'other'].includes(profile.family);
    const footprintArea = finitePositive(input.footprintArea) || (isMultiFloor ? grossBuiltArea / floors : grossBuiltArea);
    const landArea = finitePositive(input.landArea) || footprintArea * (['linear', 'site', 'utility'].includes(profile.family) ? 1.2 : 2.0);
    const basements = finiteNonNegative(input.basements);
    const buildings = finitePositive(input.buildings) || 1;
    const capacity = finitePositive(input.capacity) || Math.max(1, grossBuiltArea * profile.capacity);
    const complexity = Math.max(1, Math.min(10, finitePositive(input.complexity) || profile.complexity));

    const values = {
      grossBuiltArea, footprintArea, landArea, floors, basements, buildings, capacity,
      complexity, cityName, finishName, methodName, city, finish, method, profile
    };
    const features = this._features(values);
    const predictions = {};
    const intervals = {};
    for (const target of this.artifact.targets) {
      const model = this.artifact.models[target];
      const linear = dot(features, model.coefficients);
      let value;
      if (model.transform === 'logit') value = sigmoid(linear);
      else if (model.transform === 'log') value = Math.max(0, Math.exp(linear));
      else value = Math.max(0, Math.expm1(linear));
      const exactFactor = {
        concreteM3: 'concrete', steelTon: 'steel', blocksM2: 'blocks',
        hvacTR: 'hvac', electricalKVA: 'electrical', waterLpd: 'water'
      }[target];
      if (exactFactor && Number(profile[exactFactor]) === 0) value = 0;
      predictions[target] = value;
      if (target === 'riskScore') {
        const delta = Number(model.holdout?.p90Ape || model.holdout?.mae || 0.1);
        intervals[target] = { lower: Math.max(0, value - delta), upper: Math.min(1, value + delta) };
      } else {
        const delta = Number(model.holdout?.p90Ape || 0.25);
        intervals[target] = { lower: Math.max(0, value / (1 + delta)), upper: value * (1 + delta) };
      }
    }

    return {
      available: true,
      modelId: this.artifact.modelId,
      projectType: profile.key,
      family: profile.family,
      inputs: {
        grossBuiltArea, footprintArea, landArea, floors, basements, buildings,
        capacity, complexity, city: cityName, finishing: finishName, method: methodName
      },
      predictions,
      intervals,
      syntheticHoldout: Object.fromEntries(this.artifact.targets.map(target => [target, this.artifact.models[target].holdout])),
      trainingRecords: this.artifact.training.records,
      dataProvenance: this.artifact.governance.dataProvenance,
      status: 'experimental',
      contractualUse: false,
      suitableForModelApproval: false,
      requiresHumanReview: true,
      limitations: [
        'Synthetic holdout accuracy is not evidence of accuracy on completed real projects.',
        'Supplier identity, live prices, code compliance, and design approval are outside this model.'
      ]
    };
  }

  _features(values) {
    const { grossBuiltArea, footprintArea, landArea, floors, basements, buildings, capacity, complexity, cityName, finishName, methodName, city, finish, method, profile } = values;
    const logArea = Math.log1p(grossBuiltArea) / 16;
    const logLand = Math.log1p(landArea) / 17;
    const floorsScaled = floors / 60;
    const complexityScaled = complexity / 10;
    const features = [
      1, logArea, logLand, floorsScaled, basements / 5, buildings / 10,
      Math.log1p(capacity) / 14, complexityScaled,
      Math.max(0, Math.min(1, footprintArea / grossBuiltArea)),
      Math.max(1, Math.min(10, landArea / Math.max(footprintArea, 1))) / 10,
      city.costIndex, city.climateIndex,
      finish.cost, finish.duration, finish.defects,
      method.cost, method.duration, method.risk,
      logArea * complexityScaled, logArea * floorsScaled,
      profile.family === 'linear' ? 1 : 0,
      profile.family === 'existing' ? 1 : 0
    ];
    features.push(...this.config.projectTypes.map(item => item.key === profile.key ? 1 : 0));
    features.push(...[...new Set(this.config.projectTypes.map(item => item.family))].sort().map(family => family === profile.family ? 1 : 0));
    features.push(...Object.keys(this.config.cities).map(cityKey => cityKey === cityName ? 1 : 0));
    features.push(...Object.keys(this.config.finishes).map(finishKey => finishKey === finishName ? 1 : 0));
    features.push(...Object.keys(this.config.methods).map(methodKey => methodKey === methodName ? 1 : 0));
    return features;
  }
}

module.exports = new MillionProjectModel();
module.exports.MillionProjectModel = MillionProjectModel;
