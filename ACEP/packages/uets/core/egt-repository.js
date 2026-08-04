const fs = require('fs');
const path = require('path');
const { EngineeringGroundTruth } = require('./engineering-ground-truth');

const DEFAULT_REPO_PATH = path.join(__dirname, '..', '..', '..', 'data', 'uets', 'egt-repository.json');
const DEFAULT_INDEX_PATH = path.join(__dirname, '..', '..', '..', 'data', 'uets', 'egt-index.json');

class EGTRepository {
  constructor(repoPath, indexPath) {
    this.repoPath = repoPath || DEFAULT_REPO_PATH;
    this.indexPath = indexPath || DEFAULT_INDEX_PATH;
    this.records = new Map();
    this.index = {
      byProjectType: {},
      bySource: {},
      byCity: {},
      byRegion: {},
      byTag: {},
      total: 0,
      version: '1.0.0',
      lastUpdated: null
    };
    this.initialized = false;
  }

  initialize() {
    if (this.initialized) return;
    this._ensureDirectory();
    this._loadFromDisk();
    this.initialized = true;
    console.log(`[UETS] EGT Repository initialized: ${this.index.total} records`);
    return this;
  }

  add(egt) {
    if (!(egt instanceof EngineeringGroundTruth)) {
      egt = new EngineeringGroundTruth(egt);
    }
    this.records.set(egt.uuid, egt);
    this._updateIndex(egt);
    return egt;
  }

  addBatch(egts) {
    let count = 0;
    for (const egt of egts) {
      this.add(egt);
      count++;
    }
    return count;
  }

  get(uuid) {
    return this.records.get(uuid) || null;
  }

  getAll() {
    return Array.from(this.records.values());
  }

  query(filters = {}) {
    let results = this.getAll();

    if (filters.originalId) {
      results = results.filter(r => r.originalId === filters.originalId);
    }
    if (filters.uuid) {
      results = results.filter(r => r.uuid === filters.uuid);
    }
    if (filters.projectType) {
      const pt = filters.projectType.toLowerCase();
      results = results.filter(r => r.classification.projectType.toLowerCase() === pt);
    }
    if (filters.source) {
      results = results.filter(r => r.source === filters.source);
    }
    if (filters.city) {
      const city = filters.city.toLowerCase();
      results = results.filter(r => r.location.city.toLowerCase() === city);
    }
    if (filters.region) {
      const region = filters.region.toLowerCase();
      results = results.filter(r => r.location.region.toLowerCase() === region);
    }
    if (filters.minArea) {
      results = results.filter(r => r.geometry.totalArea >= filters.minArea);
    }
    if (filters.maxArea) {
      results = results.filter(r => r.geometry.totalArea <= filters.maxArea);
    }
    if (filters.minFloors) {
      results = results.filter(r => r.geometry.floors >= filters.minFloors);
    }
    if (filters.maxFloors) {
      results = results.filter(r => r.geometry.floors <= filters.maxFloors);
    }
    if (filters.tag) {
      results = results.filter(r => r.tags.includes(filters.tag));
    }
    if (filters.minConfidence) {
      results = results.filter(r => r.confidence >= filters.minConfidence);
    }
    if (filters.limit) {
      results = results.slice(0, filters.limit);
    }

    return results;
  }

  getByProjectType(type) {
    return this.query({ projectType: type });
  }

  getBySource(source) {
    return this.query({ source });
  }

  getStats() {
    const byType = {};
    const bySource = {};
    const byFinishing = {};

    for (const r of this.records.values()) {
      byType[r.classification.projectType] = (byType[r.classification.projectType] || 0) + 1;
      bySource[r.source] = (bySource[r.source] || 0) + 1;
      const fin = r.geometry.finishing || 'Unknown';
      byFinishing[fin] = (byFinishing[fin] || 0) + 1;
    }

    return {
      total: this.records.size,
      byProjectType: byType,
      bySource: bySource,
      byFinishing: byFinishing,
      version: this.index.version,
      lastUpdated: this.index.lastUpdated,
      coverage: this._getCoverageAnalysis(byType)
    };
  }

  _getCoverageAnalysis(byType) {
    const allTypes = ['Villa', 'Building', 'Tower', 'Hotel', 'Mosque', 'Hospital', 'School', 'Mall', 'Warehouse', 'Bridge', 'Road', 'Factory', 'Farm', 'Infrastructure', 'WaterTreatment', 'Sports', 'Office', 'Residential', 'Commercial', 'Apartment', 'Compound', 'Palace', 'MixedUse'];
    const analysis = {};
    for (const type of allTypes) {
      const count = byType[type] || 0;
      let status = 'none';
      if (count >= 100) status = 'excellent';
      else if (count >= 50) status = 'good';
      else if (count >= 20) status = 'adequate';
      else if (count >= 10) status = 'minimal';
      else if (count > 0) status = 'low';
      analysis[type] = { count, status };
    }
    return analysis;
  }

  remove(uuid) {
    const egt = this.records.get(uuid);
    if (!egt) return false;
    this.records.delete(uuid);
    this._rebuildIndex();
    return true;
  }

  clear() {
    this.records.clear();
    this.index = {
      byProjectType: {},
      bySource: {},
      byCity: {},
      byRegion: {},
      byTag: {},
      total: 0,
      version: '1.0.0',
      lastUpdated: null
    };
  }

  save() {
    this._ensureDirectory();
    this._saveRepo();
    this.index.total = this.records.size;
    this.index.lastUpdated = new Date().toISOString();
    fs.writeFileSync(this.indexPath, JSON.stringify(this.index), 'utf8');
    console.log(`[UETS] EGT Repository saved: ${this.index.total} records`);
    return true;
  }

  _saveRepo() {
    const tmpPath = this.repoPath + '.tmp';
    const fd = fs.openSync(tmpPath, 'w');
    try {
      for (const egt of this.records.values()) {
        fs.writeSync(fd, JSON.stringify(egt.toJSON()) + '\n');
      }
    } finally {
      fs.closeSync(fd);
    }
    fs.renameSync(tmpPath, this.repoPath);
  }

  _ensureDirectory() {
    const dir = path.dirname(this.repoPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  }

  _loadFromDisk() {
    try {
      if (fs.existsSync(this.repoPath)) {
        this._loadRepo();
        console.log(`[UETS] Loaded ${this.records.size} EGT records from disk`);
      }
    } catch (e) {
      console.warn(`[UETS] Could not load EGT repository: ${e.message}`);
    }
    try {
      if (fs.existsSync(this.indexPath)) {
        const raw = fs.readFileSync(this.indexPath, 'utf8');
        this.index = { ...this.index, ...JSON.parse(raw) };
      }
    } catch (e) {
      // index will be rebuilt
    }
  }

  _loadRepo() {
    const fd = fs.openSync(this.repoPath, 'r');
    try {
      const first = Buffer.alloc(1);
      fs.readSync(fd, first, 0, 1, 0);
      if (first[0] === 0x5b) {
        const raw = fs.readFileSync(this.repoPath, 'utf8');
        const data = JSON.parse(raw);
        for (const item of data) {
          this.add(new EngineeringGroundTruth(item));
        }
        return;
      }
      let buf = '';
      const chunk = Buffer.alloc(64 * 1024);
      let pos = 0;
      const size = fs.fstatSync(fd).size;
      while (pos < size) {
        const n = fs.readSync(fd, chunk, 0, chunk.length, pos);
        if (n <= 0) break;
        pos += n;
        buf += chunk.toString('utf8', 0, n);
        let nl;
        while ((nl = buf.indexOf('\n')) !== -1) {
          const line = buf.slice(0, nl).trim();
          buf = buf.slice(nl + 1);
          if (!line) continue;
          try {
            this.add(new EngineeringGroundTruth(JSON.parse(line)));
          } catch (e) {
            // skip malformed record
          }
        }
      }
      if (buf.trim()) {
        try {
          this.add(new EngineeringGroundTruth(JSON.parse(buf.trim())));
        } catch (e) {
          // skip malformed trailing record
        }
      }
    } finally {
      fs.closeSync(fd);
    }
  }

  _updateIndex(egt) {
    const pt = egt.classification.projectType;
    this.index.byProjectType[pt] = (this.index.byProjectType[pt] || 0) + 1;
    this.index.bySource[egt.source] = (this.index.bySource[egt.source] || 0) + 1;
    if (egt.location.city) {
      this.index.byCity[egt.location.city] = (this.index.byCity[egt.location.city] || 0) + 1;
    }
    if (egt.location.region) {
      this.index.byRegion[egt.location.region] = (this.index.byRegion[egt.location.region] || 0) + 1;
    }
    for (const tag of egt.tags) {
      this.index.byTag[tag] = (this.index.byTag[tag] || 0) + 1;
    }
    this.index.total = this.records.size;
  }

  _rebuildIndex() {
    this.index = {
      byProjectType: {},
      bySource: {},
      byCity: {},
      byRegion: {},
      byTag: {},
      total: 0,
      version: this.index.version,
      lastUpdated: null
    };
    for (const egt of this.records.values()) {
      this._updateIndex(egt);
    }
  }
}

module.exports = { EGTRepository };
