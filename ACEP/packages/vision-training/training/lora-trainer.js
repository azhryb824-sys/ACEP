const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');
const Config = require('../config');
const TrainingConfig = require('./config');
const CheckpointManager = require('./checkpoint-manager');
const DatasetManager = require('../dataset/dataset-manager');
const { getLogger } = require('../logger');

const LOGGER = getLogger({ service: 'VisionTraining-LoRA' });

class LoRATrainer {
  constructor() {
    this.pythonScript = path.join(Config.root, 'scripts', 'train_lora.py');
    this.isTraining = false;
    this.currentRun = null;
  }

  get pythonCommand() {
    const candidates = [
      process.env.PYTHON_PATH,
      'python3',
      'python',
      'C:\\Users\\Abdulrahman\\AppData\\Local\\Python\\bin\\python.exe',
      'C:\\Users\\Abdulrahman\\AppData\\Local\\Python\\pythoncore-3.14-64\\python.exe',
    ];
    for (const cmd of candidates) {
      if (!cmd) continue;
      try {
        const result = require('child_process').execSync(`"${cmd}" --version`, { timeout: 5000, encoding: 'utf-8', stdio: ['pipe', 'pipe', 'ignore'] });
        if (result && result.includes('Python')) return cmd;
      } catch (e) { continue; }
    }
    return null;
  }

  async train(dataset, options = {}) {
    if (this.isTraining) throw new Error('Training already in progress');
    const trainingConfig = new TrainingConfig(options);
    const runId = `lora_run_${Date.now()}`;
    this.isTraining = true;
    this.currentRun = { runId, config: trainingConfig, status: 'starting', startedAt: new Date().toISOString() };

    LOGGER.info(`Starting LoRA training run ${runId}`);
    LOGGER.info(`Base model: ${trainingConfig.baseModel}`);
    LOGGER.info(`Output: ${trainingConfig.outputDir}`);

    try {
      if (!fs.existsSync(trainingConfig.outputDir)) {
        fs.mkdirSync(trainingConfig.outputDir, { recursive: true });
      }

      CheckpointManager.saveMetadata(runId, {
        runId,
        ...trainingConfig.toJSON(),
        status: 'started',
        startedAt: this.currentRun.startedAt,
      });

      if (options.useSimulation) {
        LOGGER.info('Force simulation mode requested');
        return await this._simulateTraining(runId, dataset, trainingConfig);
      }

      if (!fs.existsSync(this.pythonScript)) {
        LOGGER.info('Python training script not found, running simulated training');
        return await this._simulateTraining(runId, dataset, trainingConfig);
      }

      const pyCmd = this.pythonCommand;
      if (!pyCmd) {
        LOGGER.warn('Python not available on this system. Run simulation instead.');
        return await this._simulateTraining(runId, dataset, trainingConfig);
      }

      const useSim = options.simulate !== false && (trainingConfig.maxTrainSteps < 100);
      const useCloud = options.cloud === true;
      LOGGER.info(`Python available, running training script (simulate=${useSim}, cloud=${useCloud})`);
      return await this._runPythonTraining(runId, dataset, trainingConfig, useSim, useCloud);
    } catch (e) {
      this.currentRun.status = 'failed';
      this.currentRun.error = e.message;
      throw e;
    } finally {
      this.isTraining = false;
    }
  }

  async _runPythonTraining(runId, dataset, config, simulate = false, cloud = false) {
    const datasetExport = DatasetManager.exportDataset('diffusers');
    const pyCmd = this.pythonCommand;
    if (!pyCmd) throw new Error('Python not available');
    const args = [
      this.pythonScript,
      '--base_model', config.baseModel,
      '--output_dir', config.outputDir,
      '--dataset_dir', datasetExport,
      '--images_dir', Config.paths.images,
      '--captions_dir', Config.paths.captions,
      '--learning_rate', String(config.learningRate),
      '--train_batch_size', String(config.trainBatchSize),
      '--max_train_steps', String(config.maxTrainSteps),
      '--resolution', String(config.resolution),
      '--lora_rank', String(config.loraRank),
      '--lora_alpha', String(config.loraAlpha),
      '--mixed_precision', config.mixedPrecision,
      '--seed', String(config.seed),
    ];
    if (simulate) args.push('--simulate');
    if (cloud) args.push('--cloud');

    LOGGER.info(`Executing: ${pyCmd} ${args.join(' ')}`);

    return new Promise((resolve, reject) => {
      const proc = spawn(pyCmd, args, {
        stdio: ['pipe', 'pipe', 'pipe'],
        env: { ...process.env, PYTHONUNBUFFERED: '1', PYTHONPATH: process.env.PYTHONPATH || 'D:\\python_libs' },
      });

      let output = '';
      proc.stdout.on('data', (data) => {
        const text = data.toString();
        output += text;
        LOGGER.info(`[trainer] ${text.trim()}`);
      });

      proc.stderr.on('data', (data) => {
        const text = data.toString();
        output += text;
        if (text.includes('Error') || text.includes('Traceback')) {
          LOGGER.error(`[trainer] ${text.trim()}`);
        } else {
          LOGGER.debug(`[trainer] ${text.trim()}`);
        }
      });

      proc.on('close', (code) => {
        this.isTraining = false;
        if (code === 0) {
          this.currentRun.status = 'completed';
          this.currentRun.completedAt = new Date().toISOString();
          CheckpointManager.saveMetadata(runId, { ...this.currentRun, outputLog: output.substring(0, 5000) });
          const loraWeightsPath = path.join(config.outputDir, 'pytorch_lora_weights.safetensors');
          LOGGER.info(`LoRA training completed successfully (run: ${runId})`);
          resolve({ runId, status: 'completed', outputDir: config.outputDir, loraWeightsPath, log: output.substring(0, 2000) });
        } else {
          this.currentRun.status = 'failed';
          this.currentRun.error = `Python process exited with code ${code}`;
          reject(new Error(`Training failed with exit code ${code}: ${output.substring(0, 500)}`));
        }
      });

      proc.on('error', (err) => {
        this.isTraining = false;
        this.currentRun.status = 'failed';
        this.currentRun.error = err.message;
        reject(new Error(`Failed to start training process: ${err.message}`));
      });
    });
  }

  async _simulateTraining(runId, dataset, config) {
    LOGGER.info('=== SIMULATED TRAINING MODE ===');
    LOGGER.info(`Dataset size: ${dataset.length} images`);
    LOGGER.info(`Training steps: ${config.maxTrainSteps}`);

    for (let step = 0; step <= config.maxTrainSteps; step += config.checkpointingSteps) {
      const progress = Math.round((step / config.maxTrainSteps) * 100);
      this.currentRun.status = 'training';
      this.currentRun.progress = progress;
      this.currentRun.currentStep = step;
      LOGGER.info(`Step ${step}/${config.maxTrainSteps} (${progress}%) - loss: ${(0.1 + Math.random() * 0.05).toFixed(4)}`);
      await new Promise(r => setTimeout(r, 100));
    }

    const loraWeightsPath = path.join(config.outputDir, 'pytorch_lora_weights.safetensors');
    if (!fs.existsSync(config.outputDir)) fs.mkdirSync(config.outputDir, { recursive: true });
    fs.writeFileSync(loraWeightsPath, JSON.stringify({ simulated: true, runId, config: config.toJSON() }));

    this.currentRun.status = 'completed';
    this.currentRun.completedAt = new Date().toISOString();
    LOGGER.info(`Simulated LoRA training completed. Weights saved to ${loraWeightsPath}`);
    return { runId, status: 'completed', outputDir: config.outputDir, loraWeightsPath, simulated: true };
  }

  getStatus() {
    return {
      isTraining: this.isTraining,
      currentRun: this.currentRun,
    };
  }
}

module.exports = new LoRATrainer();
