"use strict";
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const root = path.resolve(__dirname, '../..');
const hash = file => { try { return crypto.createHash('sha256').update(fs.readFileSync(path.join(root,file))).digest('hex'); } catch { return null; } };
function releaseIdentity() {
  let manifest = null; try { manifest = JSON.parse(fs.readFileSync(path.join(root,'release-manifest.json'),'utf8')); } catch { /* Local development has no release attestation. */ }
  const declared = process.env.RENDER_GIT_COMMIT || process.env.ACEP_SOURCE_COMMIT || null;
  return { contractVersion: 'engineering-remediation-v2', sourceCommit: /^[a-f0-9]{40}$/.test(declared || '') ? declared : null,
    manifestSha256: hash('release-manifest.json'), sourceTreeSha256: manifest?.sourceTreeSha256 || null,
    modelSha256: hash('models/registry/candidates/acep-million-synthetic-v2.json'),
    modelConfigSha256: hash('packages/ai-engine/model-training/project-archetypes.json'),
    dependencyLockSha256: hash('package-lock.json'), datasetManifestSha256: manifest?.datasetManifestSha256 || null,
    stateDurability: process.env.ACEP_STATE_DURABILITY === 'persistent_volume' ? 'configured_persistent_volume_requires_restore_test' : 'ephemeral_or_unverified',
    engineeringReleaseApproved: false };
}
module.exports = { releaseIdentity };
