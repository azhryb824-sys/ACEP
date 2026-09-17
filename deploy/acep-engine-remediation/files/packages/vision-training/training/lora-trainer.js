const { spawn, spawnSync } = require('child_process');
const crypto = require('crypto');
const path = require('path');
const fs = require('fs');
const Config = require('../config');
const TrainingConfig = require('./config');
const CheckpointManager = require('./checkpoint-manager');
const { ensureDirectory, writeFileAtomic, writeJsonAtomic } = require('../../runtime/atomic-json-store');
const { getLogger } = require('../logger');

const LOGGER = getLogger({ service: 'VisionTraining-LoRA' });
const MAX_CAPTURED_LOG_BYTES = 64 * 1024;
const SHA256 = /^[a-f0-9]{64}$/;
const FORBIDDEN_RUNNER_ENV = new Set([
  'NODE_OPTIONS', 'PYTHONPATH', 'PYTHONINSPECT', 'PYTHONSTARTUP',
  'LD_PRELOAD', 'LD_LIBRARY_PATH', 'DYLD_INSERT_LIBRARIES',
]);

function sha256Buffer(buffer) {
  return crypto.createHash('sha256').update(buffer).digest('hex');
}

function freezeTrainerScript(sourcePath, outputDir, expectedHash) {
  const normalizedHash = String(expectedHash || '').toLowerCase();
  if (!SHA256.test(normalizedHash)) throw new Error('ACEP_LORA_TRAINER_SCRIPT_SHA256 must be a SHA-256 hex digest');
  if (path.extname(sourcePath).toLowerCase() !== '.py') throw new Error('Approved LoRA trainer must be a Python source file');
  let descriptor;
  try {
    descriptor = fs.openSync(sourcePath, fs.constants.O_RDONLY | (fs.constants.O_NOFOLLOW || 0));
    const stats = fs.fstatSync(descriptor);
    if (!stats.isFile() || stats.size === 0 || stats.size > 5 * 1024 * 1024) throw new Error('Approved LoRA trainer has an invalid size');
    const contents = fs.readFileSync(descriptor);
    const actualHash = sha256Buffer(contents);
    if (actualHash !== normalizedHash) throw new Error('Approved LoRA trainer hash does not match ACEP_LORA_TRAINER_SCRIPT_SHA256');
    const frozenPath = path.join(outputDir, `approved-trainer-${actualHash}.py`);
    writeFileAtomic(frozenPath, contents);
    return { path: frozenPath, sha256: actualHash };
  } catch (error) {
    if (['ENOENT', 'ELOOP'].includes(error.code)) throw new Error('Approved LoRA trainer was not found or is a symbolic link');
    throw error;
  } finally {
    if (descriptor !== undefined) fs.closeSync(descriptor);
  }
}

function buildTrainerEnvironment() {
  const environment = {
    PATH: process.env.PATH || '',
    LANG: process.env.LANG || 'C.UTF-8',
    LC_ALL: process.env.LC_ALL || '',
    TZ: process.env.TZ || 'UTC',
    PYTHONUNBUFFERED: '1',
    HF_HOME: process.env.HF_HOME || require('../../runtime/paths').runtimePath('cache', 'huggingface'),
  };
  const allowlist = String(process.env.ACEP_LORA_TRAINER_ENV_ALLOWLIST || '')
    .split(',').map(value => value.trim()).filter(Boolean);
  if (allowlist.length > 32) throw new Error('ACEP_LORA_TRAINER_ENV_ALLOWLIST may contain at most 32 names');
  for (const name of allowlist) {
    if (!/^[A-Z][A-Z0-9_]{0,127}$/.test(name) || FORBIDDEN_RUNNER_ENV.has(name)) {
      throw new Error(`Trainer environment variable is not allowed: ${name}`);
    }
    if (process.env[name] !== undefined) {
      if (String(process.env[name]).length > 16384) throw new Error(`Trainer environment variable is too large: ${name}`);
      environment[name] = process.env[name];
    }
  }
  return environment;
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

const { inspectSafetensors } = require('../models/safetensors-format');

class LoRATrainer {
  constructor() {
    this.isTraining = false;
    this.currentRun = null;
    this.activeProcess = null;
  }

  get pythonCommand() {
    const candidates = [process.env.PYTHON_PATH, 'python3', 'python'];
    for (const command of candidates) {
      if (!command) continue;
      try {
        const result = spawnSync(command, ['--version'], {
          timeout: 5000,
          encoding: 'utf8',
          stdio: ['ignore', 'pipe', 'pipe'],
        });
        const versionText = `${result.stdout || ''}${result.stderr || ''}`;
        if (result.status === 0 && versionText.includes('Python')) return command;
      } catch {
        // Try the next configured runtime.
      }
    }
    return null;
  }

  async train(dataset, options = {}) {
    if (this.isTraining) throw new Error('Training already in progress');
    if (!Array.isArray(dataset)) throw new Error('Training dataset must be an array');

    const trainingConfig = new TrainingConfig(options);
    const runId = `lora_run_${crypto.randomUUID()}`;
    this.isTraining = true;
    this.currentRun = { runId, config: trainingConfig.toJSON(), status: 'starting', startedAt: new Date().toISOString() };

    try {
      ensureDirectory(trainingConfig.outputDir);
      CheckpointManager.saveMetadata(runId, { ...this.currentRun, status: 'started' });

      const simulationRequested = options.useSimulation === true || options.simulate === true;
      const simulationAllowed = process.env.NODE_ENV !== 'production' && process.env.ACEP_ALLOW_MOCK_RESULTS === 'true';
      if (simulationRequested && !simulationAllowed) {
        throw new Error('Simulated training requires ACEP_ALLOW_MOCK_RESULTS=true outside production');
      }
      if (simulationRequested) return await this._simulateTraining(runId, dataset, trainingConfig);
      if (dataset.length === 0) throw new Error('A non-empty governed dataset is required for training');
      if (process.env.NODE_ENV === 'production') throw new Error('In-process model training is disabled in production');
      const configuredScript = process.env.ACEP_LORA_TRAINER_SCRIPT;
      if (!configuredScript) {
        throw new Error('Real training requires an independently reviewed runner configured with ACEP_LORA_TRAINER_SCRIPT');
      }
      const pythonScript = path.resolve(configuredScript);
      if (!trainingConfig.baseModelRevision) {
        throw new Error('Real training requires an immutable ACEP_LORA_BASE_MODEL_REVISION');
      }
      const approvedRunner = freezeTrainerScript(
        pythonScript,
        trainingConfig.outputDir,
        process.env.ACEP_LORA_TRAINER_SCRIPT_SHA256
      );

      const pythonCommand = this.pythonCommand;
      if (!pythonCommand) throw new Error('Python runtime is unavailable');
      return await this._runPythonTraining(
        runId,
        dataset,
        trainingConfig,
        approvedRunner,
        options.cloud === true,
        options.datasetGovernance
      );
    } catch (error) {
      this.currentRun.status = this.currentRun.status === 'cancelled' ? 'cancelled' : 'failed';
      this.currentRun.error = error.message;
      CheckpointManager.saveMetadata(runId, this.currentRun);
      throw error;
    } finally {
      this.isTraining = false;
      this.activeProcess = null;
    }
  }

  _exportDataset(dataset, config, governance) {
    if (!governance || !governance.datasetVersion || !governance.splitSeed || !governance.splits) {
      throw new Error('A frozen governed train/validation/test split is required');
    }
    const verifiedImages = new Map();
    const verifyImage = entry => {
      const fileName = path.basename(String(entry.image || entry.file_name || ''));
      if (!fileName || fileName !== String(entry.image || entry.file_name || '')) throw new Error('Training image filename is invalid');
      const imagePath = path.resolve(Config.paths.images, fileName);
      const imageRoot = path.resolve(Config.paths.images);
      if (!imagePath.startsWith(`${imageRoot}${path.sep}`)) throw new Error('Training image path escapes the governed image directory');
      if (!verifiedImages.has(fileName)) {
        const stats = fs.lstatSync(imagePath);
        if (stats.isSymbolicLink() || !stats.isFile() || stats.size === 0 || stats.size > Config.dataset.maxFileBytes) {
          throw new Error(`Training image ${fileName} is missing or invalid`);
        }
        const actualHash = sha256Buffer(fs.readFileSync(imagePath));
        if (actualHash !== String(entry.contentHash || '').toLowerCase()) {
          throw new Error(`Training image integrity check failed for ${fileName}`);
        }
        verifiedImages.set(fileName, actualHash);
      }
      return { fileName, contentHash: verifiedImages.get(fileName) };
    };

    const records = dataset.map((entry, index) => {
      const { fileName, contentHash } = verifyImage(entry);
      const text = String(entry.caption || entry.text || '').trim();
      if (!text || text.length > 8000) throw new Error(`Training record ${index} requires a bounded caption`);
      return {
        file_name: fileName,
        text,
        content_sha256: contentHash,
        augmented: entry.augmented === true,
        original_caption_sha256: entry.augmented === true ? sha256Buffer(Buffer.from(String(entry.originalCaption || ''))) : null,
      };
    });
    const contents = `${records.map(record => JSON.stringify(record)).join('\n')}\n`;
    const datasetExport = path.join(config.outputDir, 'training-input.jsonl');
    writeFileAtomic(datasetExport, contents);

    const partitionRecord = entry => {
      const { fileName, contentHash } = verifyImage(entry);
      return {
        record_id: String(entry._id || contentHash),
        file_name: fileName,
        content_sha256: contentHash,
        caption_sha256: sha256Buffer(Buffer.from(String(entry.caption || ''))),
        project_id: entry.projectId || null,
        source_id: entry.sourceId || null,
        provenance: entry.provenance || null,
        license: entry.license || null,
        consent: entry.consent || null,
      };
    };
    const manifest = {
      schemaVersion: 1,
      datasetVersion: String(governance.datasetVersion),
      splitSeed: String(governance.splitSeed),
      createdAt: new Date().toISOString(),
      trainingInputSha256: sha256Buffer(Buffer.from(contents)),
      splits: {
        train: governance.splits.train.map(partitionRecord),
        validation: governance.splits.val.map(partitionRecord),
        test: governance.splits.test.map(partitionRecord),
      },
    };
    const manifestContents = `${JSON.stringify(manifest, null, 2)}\n`;
    const manifestPath = path.join(config.outputDir, 'dataset-manifest.json');
    writeFileAtomic(manifestPath, manifestContents);
    return {
      path: manifestPath,
      sha256: sha256Buffer(Buffer.from(manifestContents)),
      trainingInputPath: datasetExport,
      trainingInputSha256: manifest.trainingInputSha256,
      trainingRecords: records.length,
      records: governance.splits.train.length + governance.splits.val.length + governance.splits.test.length,
      splitCounts: {
        train: governance.splits.train.length,
        validation: governance.splits.val.length,
        test: governance.splits.test.length,
      },
    };
  }

  async _runPythonTraining(runId, dataset, config, approvedRunner, cloud = false, governance) {
    const datasetManifest = this._exportDataset(dataset, config, governance);
    const trainingConfigurationPath = path.join(config.outputDir, 'training-configuration.json');
    const trainingConfigurationContents = `${JSON.stringify({
      schemaVersion: 1,
      ...config.toJSON(),
      datasetManifestSha256: datasetManifest.sha256,
      approvedRunnerSha256: approvedRunner.sha256,
      cloud,
    }, null, 2)}\n`;
    writeFileAtomic(trainingConfigurationPath, trainingConfigurationContents);
    const trainingConfiguration = {
      path: trainingConfigurationPath,
      sha256: sha256Buffer(Buffer.from(trainingConfigurationContents)),
    };
    const pythonCommand = this.pythonCommand;
    if (!pythonCommand) throw new Error('Python runtime is unavailable');
    const args = [
      approvedRunner.path,
      '--base_model', config.baseModel,
      '--base_model_revision', config.baseModelRevision,
      '--output_dir', config.outputDir,
      '--dataset_dir', datasetManifest.trainingInputPath,
      '--dataset_manifest', datasetManifest.path,
      '--images_dir', Config.paths.images,
      '--captions_dir', Config.paths.captions,
      '--learning_rate', String(config.learningRate),
      '--train_batch_size', String(config.trainBatchSize),
      '--gradient_accumulation_steps', String(config.gradientAccumulation),
      '--max_train_steps', String(config.maxTrainSteps),
      '--checkpointing_steps', String(config.checkpointingSteps),
      '--validation_steps', String(config.validationSteps),
      '--warmup_steps', String(config.warmupSteps),
      '--noise_offset', String(config.noiseOffset),
      '--snr_gamma', String(config.snrGamma),
      '--resolution', String(config.resolution),
      '--lora_rank', String(config.loraRank),
      '--lora_alpha', String(config.loraAlpha),
      '--mixed_precision', config.mixedPrecision,
      '--seed', String(config.seed),
    ];
    if (cloud) args.push('--cloud');

    LOGGER.info(`Starting approved trainer command for run ${runId}`);
    return new Promise((resolve, reject) => {
      const childEnvironment = buildTrainerEnvironment();
      const proc = spawn(pythonCommand, args, { stdio: ['ignore', 'pipe', 'pipe'], env: childEnvironment });
      this.activeProcess = proc;
      let output = '';
      let settled = false;
      const capture = chunk => {
        output = `${output}${chunk}`.slice(-MAX_CAPTURED_LOG_BYTES);
      };
      const finish = (callback, value) => {
        if (settled) return;
        settled = true;
        this.activeProcess = null;
        callback(value);
      };

      proc.stdout.on('data', data => {
        const message = data.toString();
        capture(message);
        LOGGER.info(`[trainer] ${message.trim()}`);
      });
      proc.stderr.on('data', data => {
        const message = data.toString();
        capture(message);
        LOGGER.debug(`[trainer] ${message.trim()}`);
      });

      proc.on('close', async code => {
        if (this.currentRun.status === 'cancelled') {
          finish(reject, new Error('Training was cancelled'));
          return;
        }
        if (code !== 0) {
          this.currentRun.status = 'failed';
          this.currentRun.error = `Python process exited with code ${code}`;
          finish(reject, new Error(`Training failed with exit code ${code}: ${output.slice(-1000)}`));
          return;
        }
        try {
          const loraWeightsPath = path.join(config.outputDir, 'pytorch_lora_weights.safetensors');
          const artifact = inspectSafetensors(loraWeightsPath);
          artifact.sha256 = await sha256File(loraWeightsPath);
          this.currentRun.status = 'candidate_created';
          this.currentRun.completedAt = new Date().toISOString();
          this.currentRun.artifact = artifact;
          this.currentRun.datasetManifest = datasetManifest;
          this.currentRun.approvedRunnerSha256 = approvedRunner.sha256;
          this.currentRun.trainingConfiguration = trainingConfiguration;
          CheckpointManager.saveMetadata(runId, { ...this.currentRun, outputLog: output });
          finish(resolve, {
            runId,
            status: 'candidate_created',
            outputDir: config.outputDir,
            loraWeightsPath,
            artifact,
            datasetManifest,
            baseModel: config.baseModel,
            baseModelRevision: config.baseModelRevision,
            approvedRunnerSha256: approvedRunner.sha256,
            trainingConfiguration,
            suitableForDeployment: false,
            approvalStatus: 'pending_independent_evaluation',
            log: output.slice(-2000),
          });
        } catch (error) {
          this.currentRun.status = 'failed';
          this.currentRun.error = `Invalid training artifact: ${error.message}`;
          finish(reject, new Error(this.currentRun.error));
        }
      });
      proc.on('error', error => {
        this.currentRun.status = 'failed';
        this.currentRun.error = error.message;
        finish(reject, new Error(`Failed to start training process: ${error.message}`));
      });
    });
  }

  async _simulateTraining(runId, dataset, config) {
    LOGGER.info('SIMULATION ONLY: no model is loaded, trained, evaluated, or deployable');
    for (let step = 0; step <= config.maxTrainSteps; step += config.checkpointingSteps) {
      const progress = Math.round((step / config.maxTrainSteps) * 100);
      this.currentRun.status = 'simulating';
      this.currentRun.progress = progress;
      this.currentRun.currentStep = step;
      LOGGER.info(`Simulation step ${step}/${config.maxTrainSteps} (${progress}%); loss is not measured`);
    }

    const manifestPath = path.join(config.outputDir, 'simulation-manifest.json');
    const manifest = {
      schemaVersion: 1,
      runId,
      status: 'simulated',
      simulated: true,
      modelLoaded: false,
      weightsProduced: false,
      evaluated: false,
      suitableForDeployment: false,
      datasetRecords: dataset.length,
      config: config.toJSON(),
      completedAt: new Date().toISOString(),
    };
    writeJsonAtomic(manifestPath, manifest);
    this.currentRun = { ...this.currentRun, ...manifest, manifestPath };
    CheckpointManager.saveMetadata(runId, this.currentRun);
    return {
      runId,
      status: 'simulated',
      outputDir: config.outputDir,
      loraWeightsPath: null,
      manifestPath,
      simulated: true,
      suitableForDeployment: false,
      approvalStatus: 'not_applicable',
      dataProvenance: 'unverified',
    };
  }

  cancel() {
    if (!this.isTraining || !this.activeProcess) return false;
    this.currentRun.status = 'cancelled';
    this.currentRun.cancelledAt = new Date().toISOString();
    this.activeProcess.kill('SIGTERM');
    return true;
  }

  getStatus() {
    return { isTraining: this.isTraining, currentRun: this.currentRun };
  }
}

module.exports = new LoRATrainer();
