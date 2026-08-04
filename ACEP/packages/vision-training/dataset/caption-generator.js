const MetadataSchema = require('./metadata-schema');
const { getLogger } = require('../logger');

const LOGGER = getLogger({ service: 'VisionTraining-CaptionGenerator' });

const TEMPLATES = {
  architecture: {
    exterior: [
      '{style} {projectType} building exterior during {stage} stage in {country}',
      'Professional architectural photograph of a {style} {projectType} featuring {materials}',
      '{projectType} building exterior view showing {style} architectural design with {materials}',
      'High quality architectural rendering of a {style} {projectType} exterior in {country}',
    ],
    interior: [
      '{style} interior design of {projectType} during {stage} stage using {materials}',
      'Professional interior photograph of a {style} {projectType} interior space',
      'Interior view of {projectType} showcasing {style} design elements with {materials}',
    ],
    construction: [
      'Construction site of {projectType} building under {stage} stage',
      '{projectType} during {stage} showing {materials} structural elements in {style} design',
      'On-site construction photograph of {projectType} project, {stage} phase, {style} architecture',
    ],
  },
  structural: [
    'Structural engineering detail of {projectType} showing {materials} framework',
    'Structural {materials} framework of {projectType} under {stage}',
    'Engineering drawing of {projectType} structural system using {materials}',
  ],
  mep: [
    'MEP systems installation in {projectType} building during {stage}',
    'Mechanical electrical plumbing layout for {projectType} project',
  ],
};

class CaptionGenerator {
  static generate(metadata) {
    const record = MetadataSchema.createRecord(metadata);
    const caption = MetadataSchema.toCaption(record);
    LOGGER.debug(`Generated caption for ${record.image || 'unknown'}: ${caption.substring(0, 100)}...`);
    return caption;
  }

  static generateStructured(metadata) {
    const record = MetadataSchema.createRecord(metadata);
    const parts = [`${record.style} ${record.projectType}`];
    if (record.discipline) parts.push(record.discipline);
    if (record.stage) parts.push(record.stage);
    if (record.materials && record.materials.length > 0) parts.push(record.materials.join(' & '));
    if (record.country) parts.push(record.country);

    const caption = parts.join(', ');
    LOGGER.debug(`Structured caption: ${caption}`);
    return caption;
  }

  static generateDescriptive(metadata) {
    const record = MetadataSchema.createRecord(metadata);
    const templates = [];

    if (record.discipline && TEMPLATES[record.discipline.toLowerCase()]) {
      const discipline = record.discipline.toLowerCase();
      if (discipline === 'architecture') {
        if (record.stage === 'Construction') templates.push(...TEMPLATES.architecture.construction);
        else if (record.stage === 'Finishes' || record.stage === 'Completed') {
          templates.push(...TEMPLATES.architecture.exterior);
          templates.push(...TEMPLATES.architecture.interior);
        } else templates.push(...TEMPLATES.architecture.exterior);
      } else templates.push(...TEMPLATES[discipline]);
    } else {
      templates.push('{style} {projectType} {discipline} project {stage} stage, {country}');
    }

    const selected = templates[Math.floor(Math.random() * templates.length)];
    let caption = selected;
    for (const [key, value] of Object.entries(record)) {
      const val = Array.isArray(value) ? value.join(' ') : (value || '');
      caption = caption.replace(`{${key}}`, val);
    }

    caption = caption.replace(/\s+/g, ' ').trim();
    return caption;
  }

  static generateForTraining(metadata) {
    const record = MetadataSchema.createRecord(metadata);
    const caption = this.generateStructured(metadata);
    const prefix = 'architecture construction building ';
    return `${prefix}${caption}`;
  }
}

module.exports = CaptionGenerator;
