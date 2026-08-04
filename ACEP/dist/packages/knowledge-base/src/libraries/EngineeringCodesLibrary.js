"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.EngineeringCodesLibrary = void 0;
class EngineeringCodesLibrary {
    codes = new Map();
    countryCodes = new Map();
    constructor() {
        this.initializeCodes();
    }
    initializeCodes() {
        const codes = [
            {
                id: 'sbc-301',
                code: 'SBC 301',
                name: 'Saudi Building Code - Structural Requirements',
                nameAr: 'الكود السعودي للبناء - المتطلبات الإنشائية',
                organization: 'SBC',
                country: 'Saudi Arabia',
                version: '1.0',
                year: 2023,
                category: 'Structural',
                discipline: ['Civil', 'Structural'],
                status: 'active',
                description: 'Structural design requirements for buildings in Saudi Arabia',
                requirements: [
                    {
                        id: 'sbc-301-req-1',
                        section: '3.1',
                        description: 'Minimum design loads for buildings',
                        mandatory: true,
                        applicability: ['All Buildings'],
                        parameters: { deadLoad: '2.0 kN/m²', liveLoad: '2.0 kN/m²' }
                    },
                    {
                        id: 'sbc-301-req-2',
                        section: '4.2',
                        description: 'Seismic design requirements',
                        mandatory: true,
                        applicability: ['All Buildings'],
                        parameters: { zone: '2', importanceFactor: '1.0' }
                    }
                ],
                references: ['ASCE 7', 'ACI 318'],
                lastReview: '2023-01-01',
                nextReview: '2026-01-01'
            },
            {
                id: 'sbc-302',
                code: 'SBC 302',
                name: 'Saudi Building Code - Fire Protection',
                nameAr: 'الكود السعودي للبناء - الحماية من الحريق',
                organization: 'SBC',
                country: 'Saudi Arabia',
                version: '1.0',
                year: 2023,
                category: 'Fire',
                discipline: ['Fire Fighting', 'MEP'],
                status: 'active',
                description: 'Fire protection requirements for buildings',
                requirements: [
                    {
                        id: 'sbc-302-req-1',
                        section: '5.1',
                        description: 'Fire alarm system requirements',
                        mandatory: true,
                        applicability: ['Commercial', 'Residential', 'Industrial'],
                        parameters: { detectorSpacing: '9m', coverage: '50m²' }
                    },
                    {
                        id: 'sbc-302-req-2',
                        section: '6.2',
                        description: 'Sprinkler system requirements',
                        mandatory: true,
                        applicability: ['Commercial', 'Industrial'],
                        parameters: { density: '12 mm/min', area: '140m²' }
                    }
                ],
                references: ['NFPA 13', 'NFPA 72'],
                lastReview: '2023-01-01',
                nextReview: '2026-01-01'
            },
            {
                id: 'aci-318',
                code: 'ACI 318',
                name: 'Building Code Requirements for Structural Concrete',
                organization: 'ACI',
                country: 'USA',
                version: '19',
                year: 2019,
                category: 'Structural',
                discipline: ['Structural', 'Civil'],
                status: 'active',
                description: 'Requirements for structural concrete design',
                requirements: [
                    {
                        id: 'aci-318-req-1',
                        section: '8.3',
                        description: 'Concrete compressive strength requirements',
                        mandatory: true,
                        applicability: ['All Concrete'],
                        parameters: { minStrength: '20 MPa', maxStrength: '80 MPa' }
                    }
                ],
                references: ['ASTM C39', 'ASTM C94'],
                lastReview: '2019-01-01',
                nextReview: '2025-01-01'
            },
            {
                id: 'nfpa-70',
                code: 'NFPA 70',
                name: 'National Electrical Code',
                organization: 'NFPA',
                country: 'USA',
                version: '2023',
                year: 2023,
                category: 'Electrical',
                discipline: ['Electrical'],
                status: 'active',
                description: 'Electrical installation requirements',
                requirements: [
                    {
                        id: 'nfpa-70-req-1',
                        section: '210',
                        description: 'Branch circuit requirements',
                        mandatory: true,
                        applicability: ['All Buildings'],
                        parameters: { maxCircuit: '20A', outletSpacing: '3m' }
                    }
                ],
                references: ['IEC 60364'],
                lastReview: '2023-01-01',
                nextReview: '2026-01-01'
            },
            {
                id: 'ashrae-901',
                code: 'ASHRAE 90.1',
                name: 'Energy Standard for Buildings Except Low-Rise Residential',
                organization: 'ASHRAE',
                country: 'USA',
                version: '2019',
                year: 2019,
                category: 'Energy',
                discipline: ['HVAC', 'Electrical'],
                status: 'active',
                description: 'Energy efficiency requirements for buildings',
                requirements: [
                    {
                        id: 'ashrae-901-req-1',
                        section: '5',
                        description: 'Building envelope requirements',
                        mandatory: true,
                        applicability: ['Commercial', 'Institutional'],
                        parameters: { uValue: '0.35 W/m²K', shgc: '0.25' }
                    }
                ],
                references: ['IECC'],
                lastReview: '2019-01-01',
                nextReview: '2024-01-01'
            }
        ];
        for (const code of codes) {
            this.codes.set(code.id, code);
            if (!this.countryCodes.has(code.country)) {
                this.countryCodes.set(code.country, []);
            }
            this.countryCodes.get(code.country).push(code.id);
        }
    }
    get(id) {
        return this.codes.get(id);
    }
    getByCode(code) {
        return Array.from(this.codes.values()).find(c => c.code === code);
    }
    getByCountry(country) {
        const codeIds = this.countryCodes.get(country) || [];
        return codeIds.map(id => this.codes.get(id)).filter(Boolean);
    }
    getByCategory(category) {
        return Array.from(this.codes.values()).filter(c => c.category === category);
    }
    getByDiscipline(discipline) {
        return Array.from(this.codes.values()).filter(c => c.discipline.includes(discipline));
    }
    getAll() {
        return Array.from(this.codes.values());
    }
    search(query) {
        const lowerQuery = query.toLowerCase();
        return Array.from(this.codes.values()).filter(c => c.name.toLowerCase().includes(lowerQuery) ||
            c.code.toLowerCase().includes(lowerQuery) ||
            c.description.toLowerCase().includes(lowerQuery));
    }
    validateReference(reference) {
        const code = this.getByCode(reference);
        if (!code) {
            return { valid: false, message: `Reference ${reference} not found in codes library` };
        }
        if (code.status === 'deprecated') {
            return { valid: false, code, message: `Reference ${reference} is deprecated` };
        }
        return { valid: true, code, message: `Reference ${reference} is valid` };
    }
    detectConflicts(codeId1, codeId2) {
        const code1 = this.get(codeId1);
        const code2 = this.get(codeId2);
        if (!code1 || !code2) {
            return { hasConflict: false, conflicts: [] };
        }
        const conflicts = [];
        for (const req1 of code1.requirements) {
            for (const req2 of code2.requirements) {
                if (req1.section === req2.section) {
                    const params1 = JSON.stringify(req1.parameters);
                    const params2 = JSON.stringify(req2.parameters);
                    if (params1 !== params2) {
                        conflicts.push(`Conflict in section ${req1.section}: ${code1.code} vs ${code2.code}`);
                    }
                }
            }
        }
        return { hasConflict: conflicts.length > 0, conflicts };
    }
    getApplicableCodes(projectType, country) {
        const countryCodes = this.getByCountry(country);
        const categoryMap = {
            'Villa': ['Structural', 'Architectural', 'Electrical', 'Mechanical', 'Plumbing'],
            'Apartment': ['Structural', 'Architectural', 'Electrical', 'Mechanical', 'Plumbing', 'Fire'],
            'Commercial': ['Structural', 'Architectural', 'Electrical', 'Mechanical', 'Plumbing', 'Fire', 'Accessibility', 'Energy'],
            'Hospital': ['Structural', 'Architectural', 'Electrical', 'Mechanical', 'Plumbing', 'Fire', 'Accessibility'],
            'School': ['Structural', 'Architectural', 'Electrical', 'Mechanical', 'Plumbing', 'Fire', 'Accessibility']
        };
        const categories = categoryMap[projectType] || ['Structural', 'Architectural'];
        return countryCodes.filter(c => categories.includes(c.category));
    }
}
exports.EngineeringCodesLibrary = EngineeringCodesLibrary;
//# sourceMappingURL=EngineeringCodesLibrary.js.map