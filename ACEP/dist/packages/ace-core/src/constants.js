"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.KNOWLEDGE_BASE_VERSION = exports.BUSINESS_LEVELS = exports.KNOWLEDGE_LAYERS = exports.ENGINE_PIPELINE_ORDER = exports.GROUT_CONSUMPTION = exports.TILE_ADHESIVE_CONSUMPTION = exports.PLASTER_CONSUMPTION_RATE = exports.PAINT_CONSUMPTION_RATE = exports.COMMON_WALL_THICKNESS = exports.MINIMUM_SPACE_AREAS = exports.STANDARD_ROOM_HEIGHTS = exports.DEFAULT_WASTE_FACTORS = exports.WORKING_DAYS_PER_YEAR = exports.WORKING_DAYS_PER_MONTH = exports.STANDARD_WORK_HOURS_PER_DAY = exports.INDIRECT_COST_RATE = exports.VAT_RATE = exports.PROFIT_MARGIN_RATE = exports.RISK_CONTINGENCY_RATE = exports.MAX_QUESTIONS_BEFORE_FORCE_CREATE = exports.MIN_CONFIDENCE_FOR_AUTO_APPROVE = exports.MAX_QUESTIONS_PER_SESSION = exports.DEFAULT_LANGUAGE = exports.DEFAULT_CURRENCY = exports.CORE_ENGINE_FULL_NAME = exports.CORE_ENGINE_NAME = exports.SYSTEM_SHORT_NAME = exports.SYSTEM_NAME = exports.ACE_CORE_VERSION = exports.ACEP_VERSION = void 0;
exports.ACEP_VERSION = '1.0.0';
exports.ACE_CORE_VERSION = '1.0.0';
exports.SYSTEM_NAME = 'Architectural Construction Estimation Platform';
exports.SYSTEM_SHORT_NAME = 'ACEP';
exports.CORE_ENGINE_NAME = 'ace-core';
exports.CORE_ENGINE_FULL_NAME = 'ACE Core Engine';
exports.DEFAULT_CURRENCY = 'SAR';
exports.DEFAULT_LANGUAGE = 'ar';
exports.MAX_QUESTIONS_PER_SESSION = 20;
exports.MIN_CONFIDENCE_FOR_AUTO_APPROVE = 0.85;
exports.MAX_QUESTIONS_BEFORE_FORCE_CREATE = 5;
exports.RISK_CONTINGENCY_RATE = 0.1;
exports.PROFIT_MARGIN_RATE = 0.15;
exports.VAT_RATE = 0.15;
exports.INDIRECT_COST_RATE = 0.12;
exports.STANDARD_WORK_HOURS_PER_DAY = 8;
exports.WORKING_DAYS_PER_MONTH = 22;
exports.WORKING_DAYS_PER_YEAR = 264;
exports.DEFAULT_WASTE_FACTORS = {
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
exports.STANDARD_ROOM_HEIGHTS = {
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
exports.MINIMUM_SPACE_AREAS = {
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
exports.COMMON_WALL_THICKNESS = {
    External: 0.25,
    Internal: 0.12,
    CurtainWall: 0.05,
    ShearWall: 0.30,
    Partition: 0.10,
    Retaining: 0.30
};
exports.PAINT_CONSUMPTION_RATE = 0.1;
exports.PLASTER_CONSUMPTION_RATE = 0.02;
exports.TILE_ADHESIVE_CONSUMPTION = 5;
exports.GROUT_CONSUMPTION = 1.5;
exports.ENGINE_PIPELINE_ORDER = [
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
];
exports.KNOWLEDGE_LAYERS = [
    'Experimental',
    'Candidate',
    'Validated',
    'Certified',
    'Production'
];
exports.BUSINESS_LEVELS = [
    'Economy',
    'Standard',
    'Good',
    'Premium',
    'Luxury',
    'UltraLuxury'
];
exports.KNOWLEDGE_BASE_VERSION = '1.0.0';
//# sourceMappingURL=constants.js.map