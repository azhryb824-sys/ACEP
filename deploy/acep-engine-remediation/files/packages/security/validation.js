const { z } = require('zod');
const { normalizedCapacity, validCalendarDate } = require('../ai-engine/engineering-input-guards');
const { assessModelDomain } = require('../ai-engine/model-domain-guards');
const researchModel = require('../ai-engine/models/million-project-model');
const { toEngineParams } = require('../ai-engine/project-brief');

const safeText = max => z.string().trim().min(1).max(max).refine(value => !/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/.test(value), 'Control characters are not allowed');
const optionalText = max => z.string().trim().max(max).optional();
const identifier = z.string().regex(/^[A-Za-z0-9][A-Za-z0-9_-]{0,127}$/);

const projectCreateSchema = z.object({
  name: safeText(200),
  description: optionalText(10000).default(''),
  type: optionalText(100),
  area: z.coerce.number().positive().max(100000000).optional(),
  floors: z.coerce.number().int().positive().max(300).optional(),
  region: optionalText(100),
  finishing: optionalText(100)
}).strict();

const projectUpdateSchema = projectCreateSchema.partial().refine(value => Object.keys(value).length > 0, 'At least one field is required');
const analyzeSchema = z.object({ description: safeText(10000) }).passthrough();
const chatSchema = z.object({ message: safeText(8000), projectId: identifier.optional() }).strict();

const projectType = z.enum([
  'villa', 'apartment', 'apartment_building', 'residential_tower', 'residential_compound',
  'mixed_use', 'office', 'mall', 'hotel', 'hospital', 'school', 'mosque', 'sports',
  'cultural', 'data_center', 'factory', 'warehouse', 'power_plant', 'renewable_energy',
  'oil_gas', 'road', 'bridge', 'tunnel', 'railway', 'airport', 'port', 'water', 'dam',
  'power', 'telecom', 'landscape', 'renovation', 'heritage', 'fitout', 'other'
]);
const projectSystem = z.enum(['specialist', 'architecture', 'structural', 'electrical', 'mechanical', 'plumbing', 'fire', 'infrastructure', 'landscape', 'ict']);
const projectDocument = z.enum(['brief', 'drawings', 'bim', 'specifications', 'boq', 'soil', 'survey', 'schedule', 'permits']);
const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().or(z.literal(''));
const optionalPositive = z.coerce.number().positive().max(1000000000000).optional();
const optionalNonNegativeInteger = z.coerce.number().int().min(0).max(10000).optional();

const projectBriefSchema = z.object({
  name: safeText(200),
  description: safeText(20000).refine(value => value.length >= 80, 'A professional description of at least 80 characters is required'),
  type: projectType,
  typeLabel: optionalText(160),
  subtype: optionalText(200),
  nature: z.enum(['new', 'expansion', 'renovation', 'fitout', 'maintenance']).optional(),
  natureLabel: optionalText(160),
  country: optionalText(100),
  city: safeText(120),
  stage: z.enum(['concept', 'design', 'tender', 'construction', 'handover', 'operation']),
  stageLabel: optionalText(160),
  delivery: z.enum(['unknown', 'traditional', 'design_build', 'epc', 'cm', 'framework']).optional(),
  deliveryLabel: optionalText(160),
  constructionMethod: z.enum(['traditional', 'design_build', 'precast', 'steel_frame', 'modular', 'rehabilitation']).optional(),
  landArea: optionalPositive,
  area: optionalPositive,
  floors: optionalNonNegativeInteger,
  basements: optionalNonNegativeInteger,
  buildings: z.coerce.number().int().positive().max(10000).optional(),
  length: optionalPositive,
  width: optionalPositive,
  capacity: optionalPositive,
  capacityUnit: optionalText(80),
  structure: optionalText(100),
  foundation: optionalText(300),
  finishing: optionalText(100),
  siteCondition: optionalText(1000),
  inclusions: safeText(6000).refine(value => value.length >= 20, 'Included scope must contain at least 20 characters'),
  exclusions: optionalText(4000),
  standards: optionalText(2000),
  constraints: optionalText(5000),
  budget: optionalPositive,
  currency: z.enum(['SAR', 'USD', 'AED', 'EUR']).optional(),
  priceBasis: optionalText(1000),
  startDate: isoDate,
  targetDate: isoDate,
  sustainability: optionalText(2000),
  systems: z.array(projectSystem).max(20).default([]),
  documents: z.array(projectDocument).max(30).default([])
}).strict().superRefine((value, ctx) => {
  const issue = (field, message) => ctx.addIssue({ code: z.ZodIssueCode.custom, path: [field], message });
  const params = toEngineParams(value);
  const domain = assessModelDomain({ ...params, floors: value.floors ?? params.floors }, researchModel.resolveType(value.type), researchModel.config);
  for (const problem of domain) issue(problem.field, problem.message);
  if (!researchModel.resolveCity(value.city)) issue('city', 'Unsupported city: no reviewed local model reference is available.');
  if (value.finishing && !researchModel.config.finishes[String(value.finishing).trim().toLowerCase()]) issue('finishing', 'Unsupported finishing level.');
  for (const field of ['startDate', 'targetDate']) {
    if (!validCalendarDate(value[field])) issue(field, 'Date must be a valid calendar date');
  }
  if (value.currency && value.currency !== 'SAR') issue('currency', 'Cost estimates currently require SAR; a verified exchange-rate basis is not configured');
  if (!normalizedCapacity(value).valid) issue('capacityUnit', 'Capacity unit is incompatible with this project type; voltage cannot substitute for power');
  if (['road', 'bridge', 'tunnel', 'railway'].includes(value.type) && value.area && value.length && value.width) {
    const calculated = value.length * value.width;
    if (Math.abs(value.area - calculated) > Math.max(0.01, calculated * 0.001)) {
      issue('area', 'Treated area conflicts with length multiplied by treated width');
    }
  }
  if (!value.area && !value.landArea && !value.length && !value.capacity) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['area'], message: 'At least one project scale value is required' });
  }
  if (value.startDate && value.targetDate && value.targetDate <= value.startDate) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['targetDate'], message: 'Target date must be after start date' });
  }
});

const experimentAnalyzeSchema = z.object({
  project: projectBriefSchema,
  requestedEngines: z.array(z.enum(['PUE', 'VBE', 'BOQ', 'COST', 'TIME', 'RISK', 'QUALITY', 'SAFETY', 'ESG', 'SUPPLY'])).max(10).optional()
}).strict();

function parse(schema, input) {
  const result = schema.safeParse(input || {});
  if (result.success) return { ok: true, data: result.data };
  return {
    ok: false,
    error: {
      error: 'validation_error',
      fields: result.error.issues.map(issue => ({ path: issue.path.join('.'), message: issue.message }))
    }
  };
}

module.exports = {
  identifier,
  parseProjectCreate: input => parse(projectCreateSchema, input),
  parseProjectUpdate: input => parse(projectUpdateSchema, input),
  parseAnalyze: input => parse(analyzeSchema, input),
  parseChat: input => parse(chatSchema, input),
  parseProjectBrief: input => parse(projectBriefSchema, input),
  parseExperimentAnalyze: input => parse(experimentAnalyzeSchema, input)
};
