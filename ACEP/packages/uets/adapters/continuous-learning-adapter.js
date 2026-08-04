const fs = require('fs');
const path = require('path');

class ContinuousLearningAdapter {
  constructor(uetsCore) {
    this.core = uetsCore;
    this.CL_PATH = path.join(__dirname, '..', '..', '..', 'data', 'continuous-learning.json');
  }

  migrateContinuousLearning() {
    try {
      if (!fs.existsSync(this.CL_PATH)) return { migrated: 0, error: 'File not found' };
      const raw = fs.readFileSync(this.CL_PATH, 'utf8');
      const data = JSON.parse(raw);
      if (!data) return { migrated: 0 };

      let count = 0;

      if (data.approvedProjects && Array.isArray(data.approvedProjects)) {
        for (const project of data.approvedProjects) {
          const egt = this.core.factory.fromContinuousLearningRecord(project);
          const existing = this.core.query({ originalId: egt.originalId, source: 'continuous-learning' });
          if (existing.length === 0) {
            this.core.add(egt);
            count++;
          }
        }
      }

      if (data.priceAdjustments && Array.isArray(data.priceAdjustments)) {
        for (const adj of data.priceAdjustments) {
          for (const egt of this.core.getAll()) {
            const mat = egt.materials.find(m =>
              m.name.toLowerCase() === (adj.material || '').toLowerCase()
            );
            if (mat && adj.adjustment) {
              mat.unitPrice = mat.unitPrice * (1 + (adj.adjustment || 0));
            }
          }
        }
      }

      if (data.modelFeedback && Array.isArray(data.modelFeedback)) {
        for (const fb of data.modelFeedback) {
          this.core.validator.validate(this.core.createEGT({
            source: 'continuous-learning-feedback',
            classification: { projectType: fb.projectType || 'Building' },
            geometry: { totalArea: fb.area || 100, floors: fb.floors || 1 },
            confidence: fb.accuracy || 0.5,
            tags: ['feedback', fb.model || 'unknown']
          }));
        }
      }

      console.log(`[CL-Adapter] Migrated ${count} continuous learning records to EGT`);
      return { migrated: count };
    } catch (e) {
      console.warn(`[CL-Adapter] Error: ${e.message}`);
      return { migrated: 0, error: e.message };
    }
  }

  recordFeedbackAsEGT(feedback) {
    if (!feedback || !feedback.projectId) return null;

    const egt = this.core.createEGT({
      source: 'feedback',
      originalId: feedback.projectId,
      description: { en: feedback.comment || feedback.message || '' },
      classification: {
        projectType: feedback.projectType || 'Building',
        confidence: feedback.accuracy || feedback.rating ? (feedback.rating || 3) / 5 : 0.5
      },
      geometry: {
        totalArea: feedback.area || 0,
        floors: feedback.floors || 0
      },
      lessonsLearned: feedback.lessons || [],
      confidence: feedback.accuracy || 0.5,
      tags: ['feedback', feedback.type || 'user']
    });

    this.core.add(egt);
    return egt;
  }
}

module.exports = { ContinuousLearningAdapter };
