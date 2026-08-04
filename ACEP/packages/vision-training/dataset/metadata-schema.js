class MetadataSchema {
  static get fields() {
    return [
      { name: 'image', type: 'string', required: true, description: 'Image filename or path' },
      { name: 'caption', type: 'string', required: true, description: 'Text description of the image' },
      { name: 'projectType', type: 'string', required: true, enum: ['Villa', 'Building', 'Tower', 'Palace', 'Mall', 'Hospital', 'School', 'Mosque', 'Bridge', 'Factory', 'Warehouse', 'Residential Complex', 'Commercial Complex', 'Hotel', 'Infrastructure', 'Landscape', 'Interior'], description: 'Type of construction project' },
      { name: 'discipline', type: 'string', required: true, enum: ['Architecture', 'Structural', 'MEP', 'Interior Design', 'Landscape', 'Urban Planning', 'Civil', 'Facade'], description: 'Engineering discipline' },
      { name: 'stage', type: 'string', required: true, enum: ['Concept', 'Design Development', 'Construction', 'Finishes', 'Completed', 'Demolition', 'Renovation'], description: 'Construction stage' },
      { name: 'materials', type: 'array', required: false, items: { type: 'string', enum: ['Concrete', 'Steel', 'Glass', 'Wood', 'Stone', 'Brick', 'Aluminum', 'Composite', 'Masonry', 'Tile', 'Marble', 'Ceramic', 'Plaster', 'Paint', 'GFRC', 'PVC', 'Fabric', 'Green Roof', 'Solar Panels'] }, description: 'Construction materials visible' },
      { name: 'country', type: 'string', required: false, description: 'Country or region' },
      { name: 'style', type: 'string', required: false, enum: ['Modern', 'Contemporary', 'Islamic', 'Classical', 'Neoclassical', 'Gothic', 'Mediterranean', 'Minimalist', 'Brutalist', 'Futuristic', 'Vernacular', 'Colonial', 'Art Deco', 'Victorian', 'Industrial', 'Parametric', 'Sustainable', 'Moorish', 'Najdi', 'Hijazi'], description: 'Architectural style' },
      { name: 'resolution', type: 'string', required: false, description: 'Image resolution (e.g., 1024x1024)' },
      { name: 'version', type: 'string', required: true, description: 'Dataset version identifier' },
    ];
  }

  static get fieldNames() {
    return this.fields.map(f => f.name);
  }

  static validate(record) {
    const errors = [];
    for (const field of this.fields) {
      const value = record[field.name];
      if (field.required && (value === undefined || value === null || value === '')) {
        errors.push(`Missing required field: ${field.name}`);
        continue;
      }
      if (value !== undefined && value !== null && field.enum) {
        if (!field.enum.includes(value)) {
          errors.push(`Invalid value for ${field.name}: "${value}". Allowed: ${field.enum.join(', ')}`);
        }
      }
      if (value !== undefined && value !== null && field.type === 'array' && field.items && field.items.enum) {
        for (const item of value) {
          if (!field.items.enum.includes(item)) {
            errors.push(`Invalid value in ${field.name}: "${item}". Allowed: ${field.items.enum.join(', ')}`);
          }
        }
      }
    }
    return { valid: errors.length === 0, errors };
  }

  static createRecord(data) {
    const record = {};
    for (const field of this.fields) {
      record[field.name] = data[field.name] || (field.type === 'array' ? [] : '');
    }
    return record;
  }

  static toCaption(record) {
    const parts = [record.caption];
    if (record.projectType) parts.push(`${record.projectType} project`);
    if (record.discipline) parts.push(record.discipline);
    if (record.stage) parts.push(`during ${record.stage} stage`);
    if (record.style) parts.push(`${record.style} style`);
    if (record.materials && record.materials.length > 0) parts.push(`using ${record.materials.join(', ')}`);
    if (record.country) parts.push(`in ${record.country}`);
    return parts.join(', ');
  }
}

module.exports = MetadataSchema;
