const fs = require('fs');
const path = require('path');
const Config = require('../config');
const { getLogger } = require('../logger');

const LOGGER = getLogger({ service: 'VisionTraining-Checkpoints' });

class CheckpointManager {
  constructor() {
    this.checkpointsDir = path.join(Config.paths.training, 'checkpoints');
    if (!fs.existsSync(this.checkpointsDir)) {
      fs.mkdirSync(this.checkpointsDir, { recursive: true });
    }
  }

  getCheckpointsDir(runId) {
    const dir = path.join(this.checkpointsDir, runId);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    return dir;
  }

  listCheckpoints(runId) {
    const dir = this.getCheckpointsDir(runId);
    return fs.readdirSync(dir)
      .filter(f => f.startsWith('checkpoint-'))
      .map(f => {
        const stat = fs.statSync(path.join(dir, f));
        const step = parseInt(f.replace('checkpoint-', ''), 10);
        return { path: path.join(dir, f), step, size: stat.size, modified: stat.mtime };
      })
      .sort((a, b) => b.step - a.step);
  }

  getLatestCheckpoint(runId) {
    const checkpoints = this.listCheckpoints(runId);
    return checkpoints.length > 0 ? checkpoints[0] : null;
  }

  saveMetadata(runId, data) {
    const dir = this.getCheckpointsDir(runId);
    fs.writeFileSync(path.join(dir, 'run_metadata.json'), JSON.stringify(data, null, 2), 'utf-8');
    LOGGER.info(`Checkpoint metadata saved for run ${runId}`);
  }

  loadMetadata(runId) {
    const filePath = path.join(this.checkpointsDir, runId, 'run_metadata.json');
    if (fs.existsSync(filePath)) {
      return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    }
    return null;
  }
}

module.exports = new CheckpointManager();
