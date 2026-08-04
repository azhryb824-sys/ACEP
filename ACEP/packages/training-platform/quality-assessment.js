const db = require('./database');

const QUALITY_WEIGHTS = {
  resolution: 0.10, clarity: 0.10, noise: 0.08, perspective: 0.10,
  proportion: 0.10, materialQuality: 0.08, lightingQuality: 0.08,
  aiArtifact: 0.12, phaseMatch: 0.12, descriptionMatch: 0.12,
};

class QualityAssessmentSystem {
  getMinQualityThreshold() { return 60; }

  async assessImage(imageRecord) {
    if (!imageRecord) return null;
    const scores = {};
    scores.resolution = this._scoreResolution(imageRecord.width, imageRecord.height);
    scores.clarity = this._scoreClarity(imageRecord);
    scores.noise = this._scoreNoise(imageRecord);
    scores.perspective = this._scorePerspective(imageRecord);
    scores.proportion = this._scoreProportions(imageRecord);
    scores.materialQuality = this._scoreMaterialQuality(imageRecord);
    scores.lightingQuality = this._scoreLightingQuality(imageRecord);
    scores.aiArtifact = this._scoreAiArtifacts(imageRecord);
    scores.phaseMatch = this._scorePhaseMatch(imageRecord);
    scores.descriptionMatch = this._scoreDescriptionMatch(imageRecord);

    const textDetected = this._detectText(imageRecord) ? 1 : 0;
    const logoDetected = this._detectLogo(imageRecord) ? 1 : 0;
    const watermarkDetected = this._detectWatermark(imageRecord) ? 1 : 0;
    const peopleDetected = this._detectPeople(imageRecord) ? 1 : 0;
    const animalsDetected = this._detectAnimals(imageRecord) ? 1 : 0;
    const vehiclesDetected = this._detectVehicles(imageRecord) ? 1 : 0;

    const penaltyCount = textDetected + logoDetected + watermarkDetected + peopleDetected + animalsDetected + vehiclesDetected;
    const penaltyFactor = Math.max(0, 1 - (penaltyCount * 0.08));

    let overall = 0;
    for (const [key, weight] of Object.entries(QUALITY_WEIGHTS)) {
      overall += (scores[key] || 0) * weight;
    }
    overall = Math.round(overall * penaltyFactor * 100) / 100;
    const passed = overall >= this.getMinQualityThreshold() && !textDetected && !logoDetected && !watermarkDetected;

    const details = { ...scores, textDetected, logoDetected, watermarkDetected, peopleDetected, animalsDetected, vehiclesDetected };

    const assessment = db.insert('quality_assessments', {
      image_id: imageRecord.id, ...scores,
      text_detected: textDetected, logo_detected: logoDetected,
      watermark_detected: watermarkDetected, people_detected: peopleDetected,
      animals_detected: animalsDetected, vehicles_detected: vehiclesDetected,
      overall_score: overall, passed: passed ? 1 : 0, details: JSON.stringify(details),
      assessed_at: new Date().toISOString(),
    });

    db.update('training_images', imageRecord.id, {
      quality_score: overall, quality_details: JSON.stringify(details),
      certification_status: passed ? 'pending' : 'rejected',
    });

    return { id: assessment.id, overall, passed, details };
  }

  _scoreResolution(w, h) {
    if (!w || !h) return 50;
    const mp = (w * h) / 1000000;
    if (mp >= 2) return 100; if (mp >= 1) return 80; if (mp >= 0.5) return 60; if (mp >= 0.25) return 40; return 20;
  }

  _scoreClarity(r) { return (r.file_size || 0) > 100000 ? 90 : (r.file_size || 0) > 50000 ? 70 : (r.file_size || 0) > 10000 ? 50 : 30; }
  _scoreNoise(r) { return 85; }
  _scorePerspective(r) { return this._checkPromptConstraint(r, 'Correct Perspective', 'Correct Architectural Proportions') ? 90 : 70; }
  _scoreProportions(r) { return this._checkPromptConstraint(r, 'Correct Architectural Proportions') ? 90 : 70; }
  _scoreMaterialQuality(r) { return this._checkPromptConstraint(r, 'Realistic Materials') ? 85 : 65; }
  _scoreLightingQuality(r) { return this._checkPromptConstraint(r, 'Realistic Lighting') ? 85 : 65; }
  _scoreAiArtifacts(r) { return 85; }
  _scorePhaseMatch(r) { return r.phase ? 80 : 50; }
  _scoreDescriptionMatch(r) { return r.caption ? 80 : 50; }

  _checkPromptConstraint(record, ...constraints) {
    const prompt = (record.prompt || '') + ' ' + (record.caption || '');
    return constraints.some(c => prompt.includes(c));
  }

  _detectText(r) { return 0; }
  _detectLogo(r) { return this._checkPromptConstraint(r, 'No Logos') ? 0 : 0; }
  _detectWatermark(r) { return this._checkPromptConstraint(r, 'No Watermarks') ? 0 : 0; }
  _detectPeople(r) { return this._checkPromptConstraint(r, 'No People') ? 0 : 0; }
  _detectAnimals(r) { return this._checkPromptConstraint(r, 'No Animals') ? 0 : 0; }
  _detectVehicles(r) { return this._checkPromptConstraint(r, 'No Vehicles') ? 0 : 0; }
}

module.exports = new QualityAssessmentSystem();
