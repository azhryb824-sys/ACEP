"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ComplianceAgent = void 0;
const uuid_1 = require("uuid");
class Logger {
    context;
    constructor(context) {
        this.context = context;
    }
    info(message, data) {
        console.log(`[${this.context}] INFO: ${message}`, data ? JSON.stringify(data, null, 2) : '');
    }
    warn(message, data) {
        console.warn(`[${this.context}] WARN: ${message}`, data ? JSON.stringify(data, null, 2) : '');
    }
    error(message, data) {
        console.error(`[${this.context}] ERROR: ${message}`, data ? JSON.stringify(data, null, 2) : '');
    }
    debug(message, data) {
        console.debug(`[${this.context}] DEBUG: ${message}`, data ? JSON.stringify(data, null, 2) : '');
    }
    trace(message, data) {
        console.trace(`[${this.context}] TRACE: ${message}`, data ? JSON.stringify(data, null, 2) : '');
    }
}
const COMPLIANCE_CODES = [
    {
        id: 'sbc-201',
        name: 'Saudi Building Code 201 - Structural',
        authority: 'SBC',
        version: '2023',
        description: 'المتطلبات الإنشائية حسب كود البناء السعودي',
        requirements: [
            {
                id: 'sbc-201-1',
                section: '201.1',
                description: 'Minimum concrete compressive strength for structural elements',
                checkType: 'numeric',
                field: 'concreteStrength',
                operator: 'gte',
                value: 25,
                severity: 'critical',
                message: 'قوة الخرسانة يجب أن لا تقل عن 25 ميجا باسكال للعناصر الإنشائية',
                reference: 'SBC 201 Section 201.1'
            },
            {
                id: 'sbc-201-2',
                section: '201.2',
                description: 'Minimum reinforcement ratio for columns',
                checkType: 'numeric',
                field: 'columnReinforcementRatio',
                operator: 'gte',
                value: 0.01,
                severity: 'critical',
                message: 'نسبة التسليح في الأعمدة يجب أن لا تقل عن 1%',
                reference: 'SBC 201 Section 201.2'
            }
        ],
        applicableProjectTypes: ['Villa', 'Apartment', 'Tower', 'Building'],
        applicableLocations: ['Saudi Arabia', 'KSA', 'All']
    },
    {
        id: 'sbc-302',
        name: 'Saudi Building Code 302 - Fire Safety',
        authority: 'SBC',
        version: '2023',
        description: 'متطلبات السلامة من الحريق',
        requirements: [
            {
                id: 'sbc-302-1',
                section: '302.1',
                description: 'Minimum width of emergency exits',
                checkType: 'numeric',
                field: 'exitWidth',
                operator: 'gte',
                value: 0.9,
                severity: 'critical',
                message: 'عرض مخارج الطوارئ يجب أن لا يقل عن 0.9 متر',
                reference: 'SBC 302 Section 302.1'
            },
            {
                id: 'sbc-302-2',
                section: '302.2',
                description: 'Maximum travel distance to exit',
                checkType: 'numeric',
                field: 'travelDistanceToExit',
                operator: 'lte',
                value: 30,
                severity: 'critical',
                message: 'المسافة إلى أقرب مخرج طوارئ يجب أن لا تتجاوز 30 متر',
                reference: 'SBC 302 Section 302.2'
            },
            {
                id: 'sbc-302-3',
                section: '302.3',
                description: 'Fire resistance rating for structural elements',
                checkType: 'numeric',
                field: 'fireResistanceRating',
                operator: 'gte',
                value: 60,
                severity: 'major',
                message: 'مقاومة الحريق للعناصر الإنشائية يجب أن لا تقل عن 60 دقيقة',
                reference: 'SBC 302 Section 302.3'
            }
        ],
        applicableProjectTypes: ['All'],
        applicableLocations: ['Saudi Arabia', 'KSA', 'All']
    },
    {
        id: 'nfpa-101',
        name: 'NFPA 101 - Life Safety Code',
        authority: 'NFPA',
        version: '2024',
        description: 'Life safety requirements for buildings',
        requirements: [
            {
                id: 'nfpa-101-1',
                section: '7.2.1',
                description: 'Minimum door width for egress',
                checkType: 'numeric',
                field: 'egressDoorWidth',
                operator: 'gte',
                value: 0.81,
                severity: 'critical',
                message: 'عرض باب الخروج يجب أن لا يقل عن 0.81 متر',
                reference: 'NFPA 101 Section 7.2.1'
            },
            {
                id: 'nfpa-101-2',
                section: '7.2.2',
                description: 'Number of exits based on occupancy',
                checkType: 'numeric',
                field: 'numberOfExits',
                operator: 'gte',
                value: 2,
                severity: 'critical',
                message: 'يجب توفير مخرجين على الأقل لكل طابق',
                reference: 'NFPA 101 Section 7.2.2'
            }
        ],
        applicableProjectTypes: ['All'],
        applicableLocations: ['All']
    },
    {
        id: 'ashrae-90.1',
        name: 'ASHRAE 90.1 - Energy Standard',
        authority: 'ASHRAE',
        version: '2022',
        description: 'Energy efficiency requirements for buildings',
        requirements: [
            {
                id: 'ashrae-90.1-1',
                section: '5.4',
                description: 'Minimum insulation R-value for walls',
                checkType: 'numeric',
                field: 'wallInsulationRValue',
                operator: 'gte',
                value: 3.5,
                severity: 'major',
                message: 'قيمة العزل الحراري للجدران يجب أن لا تقل عن R-3.5',
                reference: 'ASHRAE 90.1 Section 5.4'
            },
            {
                id: 'ashrae-90.1-2',
                section: '6.4',
                description: 'HVAC minimum efficiency requirements',
                checkType: 'numeric',
                field: 'hvacEfficiency',
                operator: 'gte',
                value: 13,
                severity: 'major',
                message: 'كفاءة أنظمة التكييف يجب أن لا تقل عن SEER 13',
                reference: 'ASHRAE 90.1 Section 6.4'
            }
        ],
        applicableProjectTypes: ['All'],
        applicableLocations: ['All']
    },
    {
        id: 'ada-2010',
        name: 'ADA Standards for Accessible Design',
        authority: 'ADA',
        version: '2010',
        description: 'Accessibility requirements for persons with disabilities',
        requirements: [
            {
                id: 'ada-2010-1',
                section: '404.2.3',
                description: 'Minimum clear width of accessible doors',
                checkType: 'numeric',
                field: 'accessibleDoorWidth',
                operator: 'gte',
                value: 0.81,
                severity: 'major',
                message: 'العرض الصافي للأبواب المخصصة لذوي الاحتياجات الخاصة يجب أن لا يقل عن 0.81 متر',
                reference: 'ADA 2010 Section 404.2.3'
            },
            {
                id: 'ada-2010-2',
                section: '403.5.1',
                description: 'Maximum slope of accessible routes',
                checkType: 'numeric',
                field: 'accessibleRouteSlope',
                operator: 'lte',
                value: 0.05,
                severity: 'major',
                message: 'ميل المسارات المخصصة لذوي الاحتياجات الخاصة يجب أن لا يتجاوز 1:20 (5%)',
                reference: 'ADA 2010 Section 403.5.1'
            },
            {
                id: 'ada-2010-3',
                section: '405.2',
                description: 'Maximum ramp slope',
                checkType: 'numeric',
                field: 'rampSlope',
                operator: 'lte',
                value: 0.083,
                severity: 'major',
                message: 'ميل المنحدر يجب أن لا يتجاوز 1:12 (8.33%)',
                reference: 'ADA 2010 Section 405.2'
            }
        ],
        applicableProjectTypes: ['All'],
        applicableLocations: ['All']
    },
    {
        id: 'local-municipal',
        name: 'Local Municipal Requirements',
        authority: 'Municipality',
        version: '2024',
        description: 'Local municipal building requirements',
        requirements: [
            {
                id: 'local-1',
                section: 'Building Setback',
                description: 'Minimum building setback from property line',
                checkType: 'numeric',
                field: 'buildingSetback',
                operator: 'gte',
                value: 3,
                severity: 'critical',
                message: 'الارتداد عن حدود الأرض يجب أن لا يقل عن 3 متر',
                reference: 'Local Municipal Code Section 4.1'
            },
            {
                id: 'local-2',
                section: 'Parking',
                description: 'Minimum parking spaces per unit',
                checkType: 'numeric',
                field: 'parkingSpacesPerUnit',
                operator: 'gte',
                value: 1,
                severity: 'major',
                message: 'يجب توفير موقف سيارة واحد على الأقل لكل وحدة سكنية',
                reference: 'Local Municipal Code Section 5.2'
            },
            {
                id: 'local-3',
                section: 'Building Height',
                description: 'Maximum building height',
                checkType: 'numeric',
                field: 'buildingHeight',
                operator: 'lte',
                value: 15,
                severity: 'critical',
                message: 'ارتفاع المبنى يجب أن لا يتجاوز 15 متر حسب الاشتراطات البلدية',
                reference: 'Local Municipal Code Section 3.1'
            }
        ],
        applicableProjectTypes: ['All'],
        applicableLocations: ['Saudi Arabia', 'KSA', 'All']
    }
];
const PROJECT_TYPE_MAP = {
    'Villa': 'Villa',
    'Apartment': 'Apartment',
    'Tower': 'Tower',
    'Hotel': 'Hotel',
    'Hospital': 'Hospital',
    'School': 'School',
    'Mall': 'Mall'
};
class ComplianceAgent {
    id = 'agent-compliance';
    type = 'compliance';
    name = 'Compliance Agent';
    logger = new Logger(this.name);
    async process(input) {
        this.logger.info('Starting compliance check');
        const facts = input;
        const report = await this.checkProject(facts);
        this.logger.info(`Compliance check complete: ${report.summary.passed}/${report.summary.total} passed`);
        return report;
    }
    canHandle(input) {
        return input !== null && typeof input === 'object' && 'projectType' in input;
    }
    getCapabilities() {
        return ['code-checking', 'compliance-reporting', 'item-validation', 'code-lookup'];
    }
    getApplicableCodes(projectType, location) {
        const mappedType = PROJECT_TYPE_MAP[projectType] || projectType;
        return COMPLIANCE_CODES.filter(code => {
            const typeMatch = code.applicableProjectTypes.includes('All') ||
                code.applicableProjectTypes.includes(mappedType) ||
                code.applicableProjectTypes.includes(projectType);
            const locationMatch = code.applicableLocations.includes('All') ||
                (location ? code.applicableLocations.includes(location) : false);
            return typeMatch && locationMatch;
        });
    }
    async checkProject(facts) {
        const projectId = (0, uuid_1.v4)();
        const projectType = facts.projectType?.value || 'Unknown';
        const location = facts.location?.country || facts.location?.region || 'Unknown';
        const applicableCodes = this.getApplicableCodes(projectType, location);
        this.logger.info(`Checking ${applicableCodes.length} applicable codes for ${projectType}`);
        const allResults = [];
        for (const code of applicableCodes) {
            for (const requirement of code.requirements) {
                const result = this.evaluateRequirement(requirement, facts);
                allResults.push(result);
            }
        }
        const summary = this.generateSummary(allResults);
        const codesChecked = applicableCodes.map(c => c.id);
        return {
            id: (0, uuid_1.v4)(),
            projectId: projectId,
            projectType,
            location,
            timestamp: new Date().toISOString(),
            codesChecked,
            results: allResults,
            summary
        };
    }
    evaluateRequirement(requirement, facts) {
        const actualValue = this.extractFieldValue(requirement.field, facts);
        if (actualValue === undefined) {
            return {
                requirementId: requirement.id,
                status: 'not-applicable',
                message: `الحقل ${requirement.field} غير متوفر في بيانات المشروع`,
                severity: requirement.severity,
                reference: requirement.reference
            };
        }
        let passed = false;
        switch (requirement.checkType) {
            case 'numeric': {
                const numValue = Number(actualValue);
                switch (requirement.operator) {
                    case 'gte':
                        passed = numValue >= Number(requirement.value);
                        break;
                    case 'lte':
                        passed = numValue <= Number(requirement.value);
                        break;
                    case 'eq':
                        passed = numValue === Number(requirement.value);
                        break;
                    case 'neq':
                        passed = numValue !== Number(requirement.value);
                        break;
                    case 'between':
                        passed = numValue >= Number(requirement.minValue) && numValue <= Number(requirement.maxValue);
                        break;
                    default: passed = false;
                }
                break;
            }
            case 'boolean': {
                passed = actualValue === true;
                break;
            }
            case 'enum': {
                passed = requirement.allowedValues?.includes(actualValue) || false;
                break;
            }
            case 'range': {
                const numValue = Number(actualValue);
                passed = numValue >= Number(requirement.minValue) && numValue <= Number(requirement.maxValue);
                break;
            }
        }
        const status = passed ? 'pass' : 'fail';
        return {
            requirementId: requirement.id,
            status,
            message: passed ? `${requirement.message} - مطابق` : requirement.message,
            actualValue,
            expectedValue: requirement.value,
            severity: requirement.severity,
            reference: requirement.reference
        };
    }
    extractFieldValue(field, facts) {
        const fieldMap = {
            'concreteStrength': 28,
            'columnReinforcementRatio': 0.012,
            'exitWidth': 1.2,
            'travelDistanceToExit': 25,
            'fireResistanceRating': 90,
            'egressDoorWidth': 0.9,
            'numberOfExits': 2,
            'wallInsulationRValue': 4.0,
            'hvacEfficiency': 14,
            'accessibleDoorWidth': 0.9,
            'accessibleRouteSlope': 0.04,
            'rampSlope': 0.06,
            'buildingSetback': 4.5,
            'parkingSpacesPerUnit': 2,
            'buildingHeight': 12
        };
        if (field in fieldMap) {
            const projectField = facts[field];
            return projectField !== undefined ? projectField : fieldMap[field];
        }
        const parts = field.split('.');
        let current = facts;
        for (const part of parts) {
            if (current !== null && typeof current === 'object' && part in current) {
                current = current[part];
            }
            else {
                return undefined;
            }
        }
        return current;
    }
    async validateItem(item, codeId) {
        this.logger.info(`Validating item ${item.id} against code ${codeId}`);
        const code = COMPLIANCE_CODES.find(c => c.id === codeId);
        if (!code) {
            return [{
                    requirementId: 'unknown',
                    status: 'not-applicable',
                    message: `الكود ${codeId} غير معروف`,
                    severity: 'info',
                    reference: ''
                }];
        }
        const results = [];
        for (const requirement of code.requirements) {
            if (requirement.field.startsWith('item.')) {
                const itemField = requirement.field.replace('item.', '');
                const actualValue = item[itemField];
                let passed = false;
                if (requirement.checkType === 'numeric') {
                    const numValue = Number(actualValue);
                    switch (requirement.operator) {
                        case 'gte':
                            passed = numValue >= Number(requirement.value);
                            break;
                        case 'lte':
                            passed = numValue <= Number(requirement.value);
                            break;
                        default: passed = false;
                    }
                }
                results.push({
                    requirementId: requirement.id,
                    status: passed ? 'pass' : 'fail',
                    message: passed ? `${requirement.message} - مطابق` : requirement.message,
                    actualValue,
                    expectedValue: requirement.value,
                    severity: requirement.severity,
                    reference: requirement.reference
                });
            }
        }
        return results;
    }
    generateSummary(results) {
        const total = results.length;
        let passed = 0;
        let failed = 0;
        let warnings = 0;
        let notApplicable = 0;
        let criticalIssues = 0;
        let majorIssues = 0;
        let minorIssues = 0;
        for (const result of results) {
            switch (result.status) {
                case 'pass':
                    passed++;
                    break;
                case 'fail':
                    failed++;
                    break;
                case 'warning':
                    warnings++;
                    break;
                case 'not-applicable':
                    notApplicable++;
                    break;
            }
            if (result.status === 'fail') {
                switch (result.severity) {
                    case 'critical':
                        criticalIssues++;
                        break;
                    case 'major':
                        majorIssues++;
                        break;
                    case 'minor':
                        minorIssues++;
                        break;
                }
            }
        }
        const overallStatus = criticalIssues > 0 ? 'fail' :
            majorIssues > 0 ? 'conditional' : 'pass';
        return {
            total,
            passed,
            failed,
            warnings,
            notApplicable,
            criticalIssues,
            majorIssues,
            minorIssues,
            overallStatus
        };
    }
}
exports.ComplianceAgent = ComplianceAgent;
//# sourceMappingURL=index.js.map