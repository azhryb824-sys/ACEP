const { inspectSafetensors } = require('./safetensors-format');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const Config = require('../config');
const { ensureDirectory, writeJsonAtomic } = require('../../runtime/atomic-json-store');
const { getLogger } = require('../logger');

const LOGGER = getLogger({ service: 'VisionTraining-Registry' });
const SHA256 = /^[a-f0-9]{64}$/;
const REQUIRED_APPROVAL_ROLES = ['licensed_engineering_reviewer', 'model_risk_reviewer'];

function containedArtifact(candidate) {
  const root = path.resolve(Config.paths.lora);
  ensureDirectory(root);
  const resolved = path.resolve(String(candidate || ''));
  const relative = path.relative(root, resolved);
  if (!relative || relative.startsWith('..') || path.isAbsolute(relative)) {
    throw new Error('Model artifact must be inside the configured LoRA runtime directory');
  }
  let stats;
  try {
    stats = fs.lstatSync(resolved);
  } catch {
    throw new Error('Model artifact does not exist');
  }
  if (stats.isSymbolicLink() || !stats.isFile()) throw new Error('Model artifact must be a regular file, not a symbolic link');
  const realRoot = fs.realpathSync(root);
  const realArtifact = fs.realpathSync(resolved);
  const realRelative = path.relative(realRoot, realArtifact);
  if (!realRelative || realRelative.startsWith('..') || path.isAbsolute(realRelative)) {
    throw new Error('Model artifact resolves outside the configured LoRA runtime directory');
  }
  return realArtifact;
}

function sha256File(filePath) {
  return new Promise((resolve, reject) => {
    const hash = crypto.createHash('sha256');
    const stream = fs.createReadStream(filePath);
    stream.on('data', chunk => hash.update(chunk));
    stream.on('error', reject);
    stream.on('end', () => resolve(hash.digest('hex')));
  });
}

function requiredHash(value, name) {
  const normalized = String(value || '').toLowerCase();
  if (!SHA256.test(normalized)) throw new Error(`${name} must be a SHA-256 hex digest`);
  return normalized;
}

function requiredText(value, name, maxLength = 500) {
  const normalized = String(value || '').trim();
  if (!normalized || normalized.length > maxLength) throw new Error(`${name} is required and must not exceed ${maxLength} characters`);
  return normalized;
}

class ModelRegistry {
  constructor() {
    this.registryPath = Config.paths.registry;
    this.registryFile = path.join(this.registryPath, 'registry.json');
    this.models = [];
    this.initialized = false;
  }

  async initialize() {
    if (this.initialized) return;
    ensureDirectory(this.registryPath);
    if (fs.existsSync(this.registryFile)) {
      let loaded;
      try {
        loaded = JSON.parse(fs.readFileSync(this.registryFile, 'utf8'));
      } catch (error) {
        throw new Error(`Model registry is unreadable; refusing to overwrite it: ${error.message}`);
      }
      if (!Array.isArray(loaded)) throw new Error('Model registry must contain an array');
      if (loaded.length > 10000 || loaded.some(model => !model || typeof model !== 'object' || Array.isArray(model))) {
        throw new Error('Model registry contains an invalid record set');
      }
      const ids = new Set();
      for (const model of loaded) {
        if (!/^[A-Za-z0-9][A-Za-z0-9_.-]{0,127}$/.test(String(model.id || '')) || ids.has(model.id)) {
          throw new Error('Model registry contains an invalid or duplicate model identifier');
        }
        ids.add(model.id);
        const artifactRoot = path.resolve(Config.paths.lora);
        const artifactPath = path.resolve(String(model.loraPath || ''));
        const relative = path.relative(artifactRoot, artifactPath);
        if (!relative || relative.startsWith('..') || path.isAbsolute(relative)) {
          throw new Error('Model registry contains an artifact path outside the runtime root');
        }
      }
      this.models = loaded;
    } else {
      this.models = [];
    }
    this.initialized = true;
    LOGGER.info(`Loaded ${this.models.length} model versions from registry`);
  }

  async _save() {
    ensureDirectory(this.registryPath);
    writeJsonAtomic(this.registryFile, this.models);
  }

  getNextVersion() {
    const versions = this.models.map(model => {
      const parts = String(model.version || '').split('.');
      return parseInt(parts[parts.length - 1], 10) || 0;
    });
    return `1.0.${versions.length > 0 ? Math.max(...versions) + 1 : 1}`;
  }

  async registerVersion(entry) {
    await this.initialize();
    const loraPath = containedArtifact(entry.loraPath);
    inspectSafetensors(loraPath);
    const actualArtifactHash = await sha256File(loraPath);
    const declaredArtifactHash = requiredHash(entry.artifactSha256, 'artifactSha256');
    if (actualArtifactHash !== declaredArtifactHash) throw new Error('Model artifact hash does not match the training result');

    const version = entry.version || this.getNextVersion();
    if (!/^\d+\.\d+\.\d+$/.test(String(version))) throw new Error('Model version must use numeric semantic version format');
    if (this.models.some(model => model.version === version)) throw new Error(`Model version already exists: ${version}`);
    const baseModel = requiredText(entry.baseModel, 'baseModel', 512);
    const baseModelRevision = requiredText(entry.baseModelRevision, 'baseModelRevision', 256);
    const modelEntry = {
      id: `acep-lora-v${version.replace(/\./g, '_')}`,
      name: entry.name || `ACEP LoRA ${version}`,
      version,
      baseModel,
      baseModelRevision,
      type: entry.type || 'lora',
      loraPath,
      artifactSha256: actualArtifactHash,
      artifactSizeBytes: fs.statSync(loraPath).size,
      datasetVersion: entry.datasetVersion || null,
      datasetManifestSha256: requiredHash(entry.datasetManifestSha256, 'datasetManifestSha256'),
      trainerScriptSha256: requiredHash(entry.trainerScriptSha256, 'trainerScriptSha256'),
      trainingConfigSha256: requiredHash(entry.trainingConfigSha256, 'trainingConfigSha256'),
      metrics: {},
      evaluationStatus: 'pending_independent_evaluation',
      evaluationReportSha256: null,
      trainingRunId: requiredText(entry.trainingRunId, 'trainingRunId', 200),
      trainedAt: new Date().toISOString(),
      status: 'candidate',
      approvalStatus: 'pending',
      approvals: [],
      suitableForDeployment: false,
      deployments: 0,
      isActive: false,
    };

    this.models.push(modelEntry);
    await this._save();
    LOGGER.info(`Model candidate registered: ${modelEntry.id} (v${version})`);
    return { ...modelEntry };
  }

  async recordApproval(id, approval) {
    await this.initialize();
    const model = this.models.find(candidate => candidate.id === id);
    if (!model) throw new Error(`Model not found: ${id}`);
    const role = String(approval.role || '');
    if (!REQUIRED_APPROVAL_ROLES.includes(role)) throw new Error(`approval role must be one of: ${REQUIRED_APPROVAL_ROLES.join(', ')}`);
    const reviewerId = String(approval.reviewerId || '').trim();
    if (!reviewerId || reviewerId.length > 200) throw new Error('reviewerId is required');
    if (approval.attestation !== true) throw new Error('Explicit reviewer attestation is required');
    if (String(approval.decision || '') !== 'approved') throw new Error('Only explicit approved decisions can release a candidate');
    if (requiredHash(approval.artifactSha256, 'artifactSha256') !== model.artifactSha256) {
      throw new Error('Approval artifact hash does not match the candidate');
    }
    if (requiredHash(approval.datasetManifestSha256, 'datasetManifestSha256') !== model.datasetManifestSha256) {
      throw new Error('Approval dataset hash does not match the candidate');
    }
    if (requiredHash(approval.trainerScriptSha256, 'trainerScriptSha256') !== model.trainerScriptSha256) {
      throw new Error('Approval trainer hash does not match the candidate');
    }
    if (requiredHash(approval.trainingConfigSha256, 'trainingConfigSha256') !== model.trainingConfigSha256) {
      throw new Error('Approval training configuration hash does not match the candidate');
    }
    const evaluationReportSha256 = requiredHash(approval.evaluationReportSha256, 'evaluationReportSha256');
    const evidenceSha256 = requiredHash(approval.evidenceSha256, 'evidenceSha256');
    const releaseScope = requiredText(approval.releaseScope, 'releaseScope', 1000);
    const excludedUses = requiredText(approval.excludedUses, 'excludedUses', 2000);
    const credentialReference = requiredText(approval.credentialReference, 'credentialReference', 500);
    const jurisdiction = requiredText(approval.jurisdiction, 'jurisdiction', 200);
    const changeTicket = requiredText(approval.changeTicket, 'changeTicket', 200);
    const validUntilDate = new Date(approval.validUntil);
    if (!Number.isFinite(validUntilDate.getTime()) || validUntilDate.getTime() <= Date.now()
      || validUntilDate.getTime() > Date.now() + 2 * 366 * 24 * 60 * 60 * 1000) {
      throw new Error('validUntil must be a future ISO-8601 timestamp no more than two years away');
    }
    const validUntil = validUntilDate.toISOString();
    const otherApproval = model.approvals.find(existing => existing.role !== role);
    if (otherApproval?.reviewerId === reviewerId) throw new Error('Engineering and model-risk approvals require different reviewers');
    if (otherApproval && otherApproval.evaluationReportSha256 !== evaluationReportSha256) {
      throw new Error('Both reviewers must approve the same evaluation report');
    }
    if (otherApproval && (otherApproval.releaseScope !== releaseScope || otherApproval.excludedUses !== excludedUses || otherApproval.validUntil !== validUntil)) {
      throw new Error('Both reviewers must approve the same scope, exclusions, and validity period');
    }

    const record = {
      role,
      reviewerId,
      decision: 'approved',
      attestation: true,
      artifactSha256: model.artifactSha256,
      datasetManifestSha256: model.datasetManifestSha256,
      trainerScriptSha256: model.trainerScriptSha256,
      trainingConfigSha256: model.trainingConfigSha256,
      evaluationReportSha256,
      evidenceSha256,
      releaseScope,
      excludedUses,
      credentialReference,
      jurisdiction,
      changeTicket,
      validUntil,
      recordedAt: new Date().toISOString(),
    };
    model.approvals = [...model.approvals.filter(existing => existing.role !== role), record];
    const approvalsByRole = new Map(model.approvals.map(item => [item.role, item]));
    if (REQUIRED_APPROVAL_ROLES.every(requiredRole => approvalsByRole.has(requiredRole))) {
      model.evaluationStatus = 'independently_reviewed';
      model.evaluationReportSha256 = evaluationReportSha256;
      model.approvalStatus = 'approved';
      model.suitableForDeployment = true;
      model.status = 'approved_candidate';
    }
    await this._save();
    return { ...model };
  }

  listVersions(options = {}) {
    let result = [...this.models];
    if (options.status) result = result.filter(model => model.status === options.status);
    if (options.type) result = result.filter(model => model.type === options.type);
    return result.sort((left, right) => new Date(right.trainedAt) - new Date(left.trainedAt));
  }

  getVersion(id) {
    return this.models.find(model => model.id === id) || null;
  }

  getActiveVersion() {
    return this.models.find(model => model.isActive) || null;
  }

  assertReleaseReady(modelOrId) {
    const model = typeof modelOrId === 'string' ? this.getVersion(modelOrId) : modelOrId;
    if (!model || model.approvalStatus !== 'approved' || model.suitableForDeployment !== true) {
      throw new Error('Model candidate is not approved for release');
    }
    for (const field of ['artifactSha256', 'datasetManifestSha256', 'trainerScriptSha256', 'trainingConfigSha256', 'evaluationReportSha256']) {
      if (!SHA256.test(String(model[field] || ''))) throw new Error(`Approved model has an invalid ${field}`);
    }
    if (!model.baseModel || !model.baseModelRevision) throw new Error('Approved model lacks immutable base-model identity');
    const approvals = Array.isArray(model.approvals) ? model.approvals : [];
    const byRole = new Map(approvals.map(approval => [approval.role, approval]));
    if (!REQUIRED_APPROVAL_ROLES.every(role => byRole.has(role))) throw new Error('Both required model approvals are missing');
    const engineering = byRole.get(REQUIRED_APPROVAL_ROLES[0]);
    const risk = byRole.get(REQUIRED_APPROVAL_ROLES[1]);
    if (!engineering.reviewerId || engineering.reviewerId === risk.reviewerId) throw new Error('Model approvals require two distinct reviewers');
    for (const approval of [engineering, risk]) {
      if (approval.decision !== 'approved' || approval.attestation !== true || new Date(approval.validUntil).getTime() <= Date.now()) {
        throw new Error('Model approval is invalid or expired');
      }
      for (const field of ['artifactSha256', 'datasetManifestSha256', 'trainerScriptSha256', 'trainingConfigSha256', 'evaluationReportSha256']) {
        if (approval[field] !== model[field]) throw new Error(`Model approval does not match ${field}`);
      }
    }
    if (engineering.releaseScope !== risk.releaseScope || engineering.excludedUses !== risk.excludedUses
      || engineering.validUntil !== risk.validUntil) {
      throw new Error('Model approvals do not share the same release scope, exclusions, and validity period');
    }
    return model;
  }

  async setActive(id, deploymentEvidence = {}) {
    await this.initialize();
    const activated = this.models.find(model => model.id === id);
    if (!activated) throw new Error(`Model not found: ${id}`);
    this.assertReleaseReady(activated);
    if (deploymentEvidence.artifactSha256 !== activated.artifactSha256
      || deploymentEvidence.datasetManifestSha256 !== activated.datasetManifestSha256
      || deploymentEvidence.trainingConfigSha256 !== activated.trainingConfigSha256
      || deploymentEvidence.evaluationReportSha256 !== activated.evaluationReportSha256) {
      throw new Error('A verified artifact deployment is required before model activation');
    }
    for (const model of this.models) model.isActive = model.id === id;
    activated.status = 'active';
    activated.activatedAt = new Date().toISOString();
    await this._save();
    LOGGER.info(`Active model set to: ${id} (v${activated.version})`);
    return { ...activated };
  }

  async updateStatus(id, status) {
    await this.initialize();
    const allowed = new Set(['retired', 'rejected']);
    if (!allowed.has(status)) throw new Error('Unsupported model lifecycle status');
    const model = this.models.find(candidate => candidate.id === id);
    if (!model) throw new Error(`Model not found: ${id}`);
    model.status = status;
    model.isActive = false;
    model.suitableForDeployment = false;
    if (status === 'rejected') model.approvalStatus = 'rejected';
    await this._save();
    return { ...model };
  }

  async incrementDeployment(id) {
    await this.initialize();
    const model = this.models.find(candidate => candidate.id === id);
    if (!model) throw new Error(`Model not found: ${id}`);
    model.deployments = (model.deployments || 0) + 1;
    await this._save();
    return { ...model };
  }

  getSummary() {
    const ordered = this.listVersions();
    return {
      total: this.models.length,
      active: this.models.filter(model => model.isActive).length,
      byStatus: this.models.reduce((result, model) => {
        result[model.status] = (result[model.status] || 0) + 1;
        return result;
      }, {}),
      latestVersion: ordered[0] || null,
    };
  }

  getStats() {
    const versions = this.listVersions();
    return {
      totalVersions: versions.length,
      activeVersion: this.getActiveVersion()?.version || null,
      approvedVersions: versions.filter(model => model.approvalStatus === 'approved').length,
      lastTraining: versions[0]?.trainedAt || null,
    };
  }
}

module.exports = new ModelRegistry();
