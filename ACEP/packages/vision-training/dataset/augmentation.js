const { getLogger } = require('../logger');

const LOGGER = getLogger({ service: 'VisionTraining-Augmentation' });

class Augmentation {
  static get availableMethods() {
    return [
      'captionSynonymReplacement',
      'captionWordDropout',
      'captionBackTranslation',
      'captionTemplateVariation',
    ];
  }

  static captionSynonymReplacement(caption) {
    const synonyms = {
      building: ['structure', 'construction', 'edifice', 'property', 'complex'],
      design: ['plan', 'layout', 'scheme', 'configuration', 'arrangement'],
      modern: ['contemporary', 'current', 'latest', 'new', 'modernist'],
      traditional: ['classic', 'conventional', 'heritage', 'historic', 'time-honored'],
      large: ['spacious', 'expansive', 'vast', 'grand', 'substantial'],
      beautiful: ['elegant', 'stunning', 'magnificent', 'splendid', 'impressive'],
    };

    let modified = caption;
    for (const [word, replacements] of Object.entries(synonyms)) {
      const regex = new RegExp(`\\b${word}\\b`, 'gi');
      if (regex.test(modified)) {
        const replacement = replacements[Math.floor(Math.random() * replacements.length)];
        modified = modified.replace(regex, replacement);
        break;
      }
    }
    return modified;
  }

  static captionWordDropout(caption) {
    const words = caption.split(' ');
    if (words.length <= 3) return caption;
    const dropIdx = Math.floor(Math.random() * words.length);
    words.splice(dropIdx, 1);
    return words.join(' ');
  }

  static captionTemplateVariation(caption) {
    const prefixes = [
      'Architectural photograph of ',
      'Professional rendering of ',
      'High quality image of ',
      'Detailed view of ',
      'Construction design showing ',
    ];
    const prefix = prefixes[Math.floor(Math.random() * prefixes.length)];
    return prefix + caption;
  }

  static augmentCaption(caption) {
    const methods = [this.captionSynonymReplacement, this.captionWordDropout, this.captionTemplateVariation];
    const method = methods[Math.floor(Math.random() * methods.length)];
    const result = method.call(this, caption);
    LOGGER.debug(`Augmented caption: "${caption.substring(0, 60)}..." -> "${result.substring(0, 60)}..."`);
    return result;
  }

  static augmentDataset(entries, multiplier = 3) {
    const augmented = [];
    for (const entry of entries) {
      augmented.push(entry);
      for (let i = 1; i < multiplier; i++) {
        augmented.push({
          ...entry,
          caption: this.augmentCaption(entry.caption),
          augmented: true,
          originalCaption: entry.caption,
        });
      }
    }
    LOGGER.info(`Dataset augmented: ${entries.length} -> ${augmented.length} entries`);
    return augmented;
  }
}

module.exports = Augmentation;
