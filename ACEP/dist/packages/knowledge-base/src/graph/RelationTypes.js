"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.STANDARD_RELATIONS = void 0;
exports.STANDARD_RELATIONS = {
    APARTMENT_HAS: {
        source: 'Apartment',
        type: 'HAS',
        targets: ['Bedroom', 'Bathroom', 'Kitchen', 'LivingRoom'],
        strength: 1.0,
        reason: 'Apartment standard composition'
    },
    BATHROOM_REQUIRES: {
        source: 'Bathroom',
        type: 'REQUIRES',
        targets: ['Waterproofing', 'Ceramic', 'SanitaryFixtures', 'Plumbing', 'FloorDrain'],
        strength: 1.0,
        reason: 'Bathroom requires waterproofing and finishes'
    },
    BATHROOM_OPTIONALLY_REQUIRES: {
        source: 'Bathroom',
        type: 'OPTIONALLY_REQUIRES',
        targets: ['ExhaustFan', 'HeatedFloor'],
        strength: 0.5,
        reason: 'Optional bathroom enhancements'
    },
    KITCHEN_REQUIRES: {
        source: 'Kitchen',
        type: 'REQUIRES',
        targets: ['Countertop', 'Cabinets', 'Plumbing', 'Electrical', 'ExhaustHood'],
        strength: 1.0,
        reason: 'Kitchen standard requirements'
    },
    KITCHEN_OPTIONALLY_REQUIRES: {
        source: 'Kitchen',
        type: 'OPTIONALLY_REQUIRES',
        targets: ['GasSystem', 'Island', 'BreakfastBar'],
        strength: 0.4,
        reason: 'Optional kitchen features'
    },
    ROOF_REQUIRES: {
        source: 'Roof',
        type: 'REQUIRES',
        targets: ['Waterproofing', 'Drainage', 'Insulation'],
        strength: 1.0,
        reason: 'Roof requires waterproofing and drainage'
    }
};
//# sourceMappingURL=RelationTypes.js.map