export const ACEP_VERSION = '1.0.0';
export const ACE_CORE_VERSION = '1.0.0';
export const SYSTEM_NAME = 'Architectural Construction Estimation Platform';
export const SYSTEM_SHORT_NAME = 'ACEP';
export const CORE_ENGINE_NAME = 'ace-core';
export const CORE_ENGINE_FULL_NAME = 'ACE Core Engine';

export const DEFAULT_CURRENCY = 'SAR';
export const DEFAULT_LANGUAGE = 'ar';
export const MAX_QUESTIONS_PER_SESSION = 20;
export const MIN_CONFIDENCE_FOR_AUTO_APPROVE = 0.85;
export const MAX_QUESTIONS_BEFORE_FORCE_CREATE = 5;
export const RISK_CONTINGENCY_RATE = 0.1;
export const PROFIT_MARGIN_RATE = 0.15;
export const VAT_RATE = 0.15;
export const INDIRECT_COST_RATE = 0.12;
export const STANDARD_WORK_HOURS_PER_DAY = 8;
export const WORKING_DAYS_PER_MONTH = 22;
export const WORKING_DAYS_PER_YEAR = 264;

export const DEFAULT_WASTE_FACTORS: Record<string, number> = {
  Concrete: 0.05,
  Steel: 0.07,
  Block: 0.06,
  Brick: 0.08,
  Ceramic: 0.10,
  Marble: 0.08,
  Paint: 0.10,
  Plaster: 0.12,
  TileAdhesive: 0.08,
  Grout: 0.10,
  Wood: 0.10,
  PVC: 0.05,
  Glass: 0.05,
  Aluminum: 0.05
};

export const STANDARD_ROOM_HEIGHTS: Record<string, number> = {
  Villa: 3.0,
  Apartment: 2.8,
  Tower: 3.2,
  Hotel: 3.0,
  Hospital: 3.2,
  School: 3.5,
  Office: 3.0,
  Mall: 4.0,
  Warehouse: 6.0,
  Factory: 8.0
};

export const MINIMUM_SPACE_AREAS: Record<string, number> = {
  Bedroom: 12,
  Bathroom: 3.5,
  Kitchen: 6,
  LivingRoom: 20,
  DiningRoom: 12,
  Office: 9,
  Reception: 15,
  Majlis: 30,
  MaidRoom: 6,
  DriverRoom: 6,
  Laundry: 4,
  Storage: 4,
  Corridor: 1.2,
  Balcony: 4,
  Parking: 12
};

export const COMMON_WALL_THICKNESS: Record<string, number> = {
  External: 0.25,
  Internal: 0.12,
  CurtainWall: 0.05,
  ShearWall: 0.30,
  Partition: 0.10,
  Retaining: 0.30
};

export const PAINT_CONSUMPTION_RATE = 0.1;
export const PLASTER_CONSUMPTION_RATE = 0.02;
export const TILE_ADHESIVE_CONSUMPTION = 5;
export const GROUT_CONSUMPTION = 1.5;

export const ENGINE_PIPELINE_ORDER: readonly string[] = [
  'project-understanding',
  'question',
  'reasoning',
  'virtual-building',
  'boq',
  'quantity',
  'cost',
  'labor',
  'equipment',
  'construction-method',
  'schedule',
  'risk',
  'validation',
  'self-audit',
  'explanation',
  'compliance'
] as const;

export const KNOWLEDGE_LAYERS: readonly string[] = [
  'Experimental',
  'Candidate',
  'Validated',
  'Certified',
  'Production'
] as const;

export const BUSINESS_LEVELS: readonly string[] = [
  'Economy',
  'Standard',
  'Good',
  'Premium',
  'Luxury',
  'UltraLuxury'
] as const;

export const KNOWLEDGE_BASE_VERSION = '1.0.0';
