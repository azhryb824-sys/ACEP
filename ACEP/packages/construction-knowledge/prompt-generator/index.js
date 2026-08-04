const { EngineeringPromptGenerator } = require('./prompt-generator');
const { PromptDatabase } = require('./prompt-database');
const { PromptVisionBridge } = require('./vision-bridge');
const { BatchPromptGenerator } = require('./batch-generator');
const { registerPromptRoutes } = require('./routes');
const { registerBatchRoutes } = require('./batch-routes');
const {
  PROJECT_TYPES, CONSTRUCTION_PHASES, FINISHING_LEVELS,
  ARCHITECTURAL_STYLES, FLOOR_RANGES, LIGHTING_CONDITIONS,
  CAMERA_ANGLES, QUALITY_TAGS, CONSTRAINT_TAGS,
  MATERIALS, ARCHITECTURAL_FEATURES,
} = require('./prompt-variables');
const { PROMPT_TEMPLATES, PHASE_SPECIFIC_MAPPINGS } = require('./prompt-templates');
const { PROMPT_TEMPLATES_AR, QUALITY_TAGS_AR, CONSTRAINT_TAGS_AR } = require('./prompt-templates-ar');

module.exports = {
  EngineeringPromptGenerator,
  PromptDatabase,
  PromptVisionBridge,
  BatchPromptGenerator,
  registerPromptRoutes,
  registerBatchRoutes,
  PROJECT_TYPES,
  CONSTRUCTION_PHASES,
  FINISHING_LEVELS,
  ARCHITECTURAL_STYLES,
  FLOOR_RANGES,
  LIGHTING_CONDITIONS,
  CAMERA_ANGLES,
  QUALITY_TAGS,
  CONSTRAINT_TAGS,
  MATERIALS,
  ARCHITECTURAL_FEATURES,
  PROMPT_TEMPLATES,
  PHASE_SPECIFIC_MAPPINGS,
  PROMPT_TEMPLATES_AR,
  QUALITY_TAGS_AR,
  CONSTRAINT_TAGS_AR,
};
