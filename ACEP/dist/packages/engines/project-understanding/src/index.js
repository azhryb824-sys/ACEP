"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ProjectUnderstandingEngine = void 0;
const core_1 = require("@acep/core");
class ProjectUnderstandingEngine extends core_1.BaseEngine {
    knowledgeGraph;
    projectTypesLib;
    spacesLib;
    constructor(kg, ptLib, spLib) {
        super('ProjectUnderstandingEngine', '1.0.0');
        this.knowledgeGraph = kg;
        this.projectTypesLib = ptLib;
        this.spacesLib = spLib;
    }
    async initialize() {
        this.setStatus('initialized');
        this.logger.info('ProjectUnderstandingEngine initialized');
    }
    async validate() {
        return true;
    }
    async understand(description) {
        this.setStatus('running');
        this.logger.info('Processing project description');
        const cleanText = this.normalizeText(description);
        const entities = await this.extractEntities(cleanText);
        const spaces = this.extractSpaces(entities);
        const systems = this.extractSystems(entities);
        const conflicts = this.detectConflictsInternal(entities, spaces);
        const facts = {
            projectType: {
                value: entities.projectType || 'Unknown',
                confidence: entities.projectTypeConfidence || 0.5,
                source: 'user_description',
                factType: core_1.FactType.Confirmed
            },
            landArea: entities.landArea,
            builtArea: entities.builtArea,
            floors: entities.floors || 1,
            hasRoofAnnex: entities.hasRoofAnnex || false,
            hasBasement: entities.hasBasement || false,
            spaces,
            systems,
            materials: {},
            location: entities.location,
            budget: entities.budget,
            qualityLevel: { level: entities.finishing || core_1.FinishingLevel.Standard, confidence: entities.finishingConfidence || 0.5, source: 'user_input' },
            rawDescription: description,
            confidence: this.calculateOverallConfidence(entities),
            timestamp: new Date().toISOString(),
            version: '1.0.0'
        };
        if (conflicts.length > 0) {
            facts.conflicts = conflicts;
        }
        this.setStatus('idle');
        return facts;
    }
    async extractEntities(text) {
        const entities = {};
        const typeMatch = text.match(/(فيلا|شقة|مستشفى|مدرسة|فندق|مستودع|مسجد|مول|برج|مصنع|مطعم|كافيه|مركز\s*تجاري|محطة|مطار|ميناء)/i);
        if (typeMatch) {
            const typeMap = {
                'فيلا': 'Villa', 'شقة': 'Apartment', 'مستشفى': 'Hospital', 'مدرسة': 'School',
                'فندق': 'Hotel', 'مستودع': 'Warehouse', 'مسجد': 'Mosque', 'مول': 'Mall',
                'برج': 'Tower', 'مصنع': 'Factory', 'مطعم': 'Restaurant', 'كافيه': 'Cafe',
                'مركز تجاري': 'Mall', 'محطة': 'PowerStation', 'مطار': 'Airport', 'ميناء': 'Port'
            };
            entities.projectType = typeMap[typeMatch[1]] || typeMatch[1];
            entities.projectTypeConfidence = 0.95;
        }
        const areaRegex = /(\d+[\.\d]*)\s*(م[2²]?|متر\s*مربع|square\s*meter|m[2²])/gi;
        const areas = [];
        let areaMatch;
        while ((areaMatch = areaRegex.exec(text)) !== null) {
            areas.push(parseFloat(areaMatch[1]));
        }
        if (areas.length > 0) {
            if (areas.length === 1) {
                entities.builtArea = { value: areas[0], unit: 'm²', confidence: 0.9 };
            }
            else {
                entities.landArea = { value: areas[0], unit: 'm²', confidence: 0.9 };
                entities.builtArea = { value: areas[1], unit: 'm²', confidence: 0.9 };
            }
        }
        const floorRegex = /(\d+)\s*(أدوار|طوابق|floors|Floors)/gi;
        const floorMatch = floorRegex.exec(text);
        if (floorMatch) {
            entities.floors = parseInt(floorMatch[1]);
        }
        const roomPatterns = [
            [/(\d+)\s*(غرف\s*نوم|غرفة\s*نوم|bedrooms?)/gi, 'Bedroom'],
            [/(\d+)\s*(حمام|حمامات|bathrooms?)/gi, 'Bathroom'],
            [/(\d+)\s*(مجلس|مجالس|majlis)/gi, 'Majlis'],
            [/(\d+)\s*(مطبخ|مطابخ|kitchens?)/gi, 'Kitchen'],
            [/(\d+)\s*(صالة|صالا|living\s*rooms?)/gi, 'LivingRoom'],
            [/(\d+)\s*(غرفة\s*خادمة|غرف\s*خادمة|maid)/gi, 'MaidRoom'],
            [/(\d+)\s*(مكتب|مكاتب|offices?)/gi, 'Office'],
            [/(\d+)\s*(غرفة\s*غسيل|مغاسل|laundry)/gi, 'Laundry']
        ];
        const extractedSpaces = {};
        for (const [pattern, spaceType] of roomPatterns) {
            const match = pattern.exec(text);
            if (match) {
                extractedSpaces[spaceType] = {
                    count: parseInt(match[1]),
                    confidence: 0.95
                };
            }
        }
        entities.extractedSpaces = extractedSpaces;
        if (/(ملحق|roof\s*annex)/i.test(text)) {
            entities.hasRoofAnnex = true;
        }
        if (/(مصعد|elevator|lift)/i.test(text)) {
            entities.hasElevator = true;
        }
        if (/(قبو|basement)/i.test(text) && !/(بدون\s*قبو|لا\s*يوجد\s*قبو)/i.test(text)) {
            entities.hasBasement = true;
        }
        if (/(لا\s*يوجد\s*مصعد|بدون\s*مصعد)/i.test(text)) {
            entities.hasElevator = false;
        }
        const qualityMap = {
            'فاخر': core_1.FinishingLevel.Luxury,
            'ممتاز': core_1.FinishingLevel.Premium,
            'جيد': core_1.FinishingLevel.Good,
            'عادي': core_1.FinishingLevel.Standard,
            'ديلوكس': core_1.FinishingLevel.Luxury,
            'super\\s*luxury': core_1.FinishingLevel.UltraLuxury
        };
        for (const [keyword, level] of Object.entries(qualityMap)) {
            if (new RegExp(keyword, 'i').test(text)) {
                entities.finishing = level;
                entities.finishingConfidence = keyword === 'فاخر' || keyword === 'ممتاز' ? 0.6 : 0.8;
                break;
            }
        }
        return entities;
    }
    async detectConflicts(facts) {
        const conflicts = [];
        if (facts.projectType.value === 'Apartment' && (facts.floors || 0) > 3) {
            conflicts.push({
                description: 'Apartment with more than 3 floors may be a building',
                severity: 'warning',
                items: ['projectType', 'floors'],
                resolution: 'Please clarify if this is an apartment building'
            });
        }
        if (facts.spaces && facts.spaces['Bedroom'] && facts.spaces['Bathroom']) {
            const bedroomCount = facts.spaces['Bedroom']?.count || 0;
            const bathroomCount = facts.spaces['Bathroom']?.count || 0;
            if (bathroomCount > bedroomCount * 2) {
                conflicts.push({
                    description: `Unusually high bathroom count (${bathroomCount}) for ${bedroomCount} bedrooms`,
                    severity: 'warning',
                    items: ['Bedroom', 'Bathroom'],
                    resolution: 'Please verify bathroom count'
                });
            }
        }
        facts.conflicts = conflicts;
    }
    normalizeText(text) {
        let cleaned = text.replace(/[ًٌٍَُِّْ]/g, '');
        cleaned = cleaned.replace(/[إأآا]/g, 'ا');
        cleaned = cleaned.replace(/ة/g, 'ه');
        cleaned = cleaned.replace(/[\u0660-\u0669]/g, (d) => String.fromCharCode(d.charCodeAt(0) - 0x0660 + 0x30));
        cleaned = cleaned.replace(/\s+/g, ' ').trim();
        return cleaned;
    }
    extractSpaces(entities) {
        const spaces = {};
        const extracted = entities.extractedSpaces;
        if (extracted) {
            for (const [spaceType, data] of Object.entries(extracted)) {
                spaces[spaceType] = {
                    type: spaceType,
                    count: data.count,
                    confidence: data.confidence,
                    factType: core_1.FactType.Confirmed
                };
            }
        }
        return spaces;
    }
    extractSystems(entities) {
        const systems = {};
        if (entities.hasElevator !== undefined) {
            systems['Elevator'] = {
                exists: entities.hasElevator,
                type: core_1.SystemType.Elevator,
                confidence: 0.9,
                factType: core_1.FactType.Confirmed
            };
        }
        return systems;
    }
    detectConflictsInternal(entities, spaces) {
        return [];
    }
    calculateOverallConfidence(entities) {
        let score = 0;
        if (entities.projectType)
            score += 0.3;
        if (entities.builtArea)
            score += 0.2;
        if (entities.extractedSpaces && Object.keys(entities.extractedSpaces).length > 0)
            score += 0.3;
        score += 0.2;
        return Math.min(score, 1.0);
    }
}
exports.ProjectUnderstandingEngine = ProjectUnderstandingEngine;
//# sourceMappingURL=index.js.map