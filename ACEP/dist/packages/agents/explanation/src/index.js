"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ExplanationAgent = void 0;
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
const EXPLANATION_TEMPLATES = [
    {
        id: 'decision-default',
        name: 'Default Decision Explanation',
        patterns: ['decision'],
        templates: {
            ar: 'تم اتخاذ القرار "{selectedOption}" بناءً على {factsCount} من الحقائق و {rulesCount} من القواعد. درجة الثقة: {confidence}%. السبب: {reason}',
            en: 'Decision "{selectedOption}" was made based on {factsCount} facts and {rulesCount} rules. Confidence: {confidence}%. Reason: {reason}'
        },
        variables: ['selectedOption', 'factsCount', 'rulesCount', 'confidence', 'reason']
    },
    {
        id: 'item-added',
        name: 'Item Added Explanation',
        patterns: ['item', 'boq-item'],
        templates: {
            ar: 'تمت إضافة بند "{description}" في فئة {category} بكمية {quantity} {unit}. المصدر: {source}. المستوى: {level}. السبب: {reason}',
            en: 'Item "{description}" was added in category {category} with quantity {quantity} {unit}. Source: {source}. Level: {level}. Reason: {reason}'
        },
        variables: ['description', 'category', 'quantity', 'unit', 'source', 'level', 'reason']
    },
    {
        id: 'quantity-calculation',
        name: 'Quantity Calculation Trace',
        patterns: ['quantity', 'calculation'],
        templates: {
            ar: 'حساب الكمية للبند "{description}":\n{steps}\nالكمية النهائية: {totalQuantity} {unit}',
            en: 'Quantity calculation for "{description}":\n{steps}\nFinal quantity: {totalQuantity} {unit}'
        },
        variables: ['description', 'steps', 'totalQuantity', 'unit']
    },
    {
        id: 'cost-breakdown',
        name: 'Cost Breakdown Explanation',
        patterns: ['cost', 'price'],
        templates: {
            ar: 'تفصيل التكلفة للبند "{description}":\nسعر الوحدة: {unitPrice} {currency}\nالكمية: {quantity}\nالإجمالي: {totalPrice} {currency}\nالعامل: {factor}%\nالمصدر: {source}',
            en: 'Cost breakdown for "{description}":\nUnit price: {unitPrice} {currency}\nQuantity: {quantity}\nTotal: {totalPrice} {currency}\nFactor: {factor}%\nSource: {source}'
        },
        variables: ['description', 'unitPrice', 'currency', 'quantity', 'totalPrice', 'factor', 'source']
    },
    {
        id: 'project-summary',
        name: 'Project Summary',
        patterns: ['project', 'summary', 'report'],
        templates: {
            ar: 'ملخص المشروع:\nالنوع: {projectType}\nالمساحة: {area} م²\nعدد الأدوار: {floors}\nالميزانية: {budget} {currency}\nمستوى التشطيب: {finishingLevel}\nإجمالي التكلفة المقدرة: {estimatedCost} {currency}',
            en: 'Project Summary:\nType: {projectType}\nArea: {area} m²\nFloors: {floors}\nBudget: {budget} {currency}\nFinishing Level: {finishingLevel}\nEstimated Total Cost: {estimatedCost} {currency}'
        },
        variables: ['projectType', 'area', 'floors', 'budget', 'currency', 'finishingLevel', 'estimatedCost']
    }
];
class ExplanationAgent {
    id = 'agent-explanation';
    type = 'explanation';
    name = 'Explanation Agent';
    logger = new Logger(this.name);
    async process(input) {
        this.logger.info('Generating explanation report');
        const report = await this.generateReport(input);
        this.logger.info(`Explanation report generated with ${report.totalExplanations} sections`);
        return report;
    }
    canHandle(input) {
        return input !== null;
    }
    getCapabilities() {
        return ['decision-explanation', 'item-explanation', 'quantity-trace', 'cost-breakdown', 'report-generation'];
    }
    findTemplate(type, pattern) {
        return EXPLANATION_TEMPLATES.find(t => t.patterns.some(p => type.includes(p) || pattern.includes(p)));
    }
    fillTemplate(template, variables, language) {
        const templateStr = template.templates[language] || template.templates['en'] || template.templates['ar'];
        let result = templateStr;
        for (const [key, value] of Object.entries(variables)) {
            result = result.replace(new RegExp(`\\{${key}\\}`, 'g'), value);
        }
        return result;
    }
    explainDecision(decision, language = 'ar') {
        const template = this.findTemplate('decision', 'decision') || EXPLANATION_TEMPLATES[0];
        const content = this.fillTemplate(template, {
            selectedOption: decision.selectedOption,
            factsCount: String(decision.factsUsed.length),
            rulesCount: String(decision.rulesUsed.length),
            confidence: String(Math.round(decision.confidence * 100)),
            reason: decision.reason
        }, language);
        return {
            id: (0, uuid_1.v4)(),
            type: 'decision',
            title: `تفسير القرار: ${decision.selectedOption}`,
            content,
            language,
            references: decision.rulesUsed,
            confidence: decision.confidence,
            timestamp: new Date().toISOString()
        };
    }
    explainItem(item, language = 'ar') {
        const template = this.findTemplate('item', 'boq-item') || EXPLANATION_TEMPLATES[1];
        const content = this.fillTemplate(template, {
            description: item.description,
            category: item.category,
            quantity: String(item.quantity),
            unit: item.unit,
            source: item.source,
            level: item.level,
            reason: item.reason
        }, language);
        return {
            id: (0, uuid_1.v4)(),
            type: 'item',
            title: `شرح البند: ${item.code} - ${item.description}`,
            content,
            language,
            references: [item.ruleId, item.source],
            confidence: item.confidence,
            timestamp: new Date().toISOString()
        };
    }
    explainQuantity(item, language = 'ar') {
        const stepsText = item.calculationTrace.map((step, i) => {
            if (language === 'ar') {
                return `الخطوة ${i + 1}: ${step.description}\n  الصيغة: ${step.formula}\n  المدخل: ${step.input} → المخرج: ${step.output} ${step.unit}`;
            }
            return `Step ${i + 1}: ${step.description}\n  Formula: ${step.formula}\n  Input: ${step.input} → Output: ${step.output} ${step.unit}`;
        }).join('\n');
        const template = this.findTemplate('quantity', 'calculation') || EXPLANATION_TEMPLATES[2];
        const content = this.fillTemplate(template, {
            description: item.description,
            steps: stepsText || (language === 'ar' ? 'لا توجد خطوات حسابية مفصلة' : 'No detailed calculation steps'),
            totalQuantity: String(item.quantity),
            unit: item.unit
        }, language);
        return {
            id: (0, uuid_1.v4)(),
            type: 'quantity',
            title: `تتبع حساب الكمية: ${item.code}`,
            content,
            language,
            references: item.calculationTrace.map((_, i) => `step-${i + 1}`),
            confidence: item.confidence,
            timestamp: new Date().toISOString()
        };
    }
    explainCost(item, cost, language = 'ar') {
        const template = this.findTemplate('cost', 'price') || EXPLANATION_TEMPLATES[3];
        const wastePct = (item.wasteFactor * 100).toFixed(1);
        const content = this.fillTemplate(template, {
            description: item.description,
            unitPrice: String(item.unitPrice),
            currency: cost?.currency || 'SAR',
            quantity: String(item.quantity),
            totalPrice: String(item.totalPrice),
            factor: wastePct,
            source: item.source
        }, language);
        return {
            id: (0, uuid_1.v4)(),
            type: 'cost',
            title: `تفصيل التكلفة: ${item.code}`,
            content,
            language,
            references: [item.source, ...item.correctionFactors.map(f => f.name)],
            confidence: item.confidence,
            timestamp: new Date().toISOString()
        };
    }
    async generateReport(input) {
        const data = input;
        const language = data.language || 'ar';
        const sections = [];
        if (data.facts) {
            const facts = data.facts;
            const projectTemplate = this.findTemplate('project', 'summary') || EXPLANATION_TEMPLATES[4];
            const content = this.fillTemplate(projectTemplate, {
                projectType: facts.projectType?.value || 'Unknown',
                area: String(facts.builtArea?.value || facts.landArea?.value || 0),
                floors: String(facts.floors || 1),
                budget: String(facts.budget?.amount || 0),
                currency: facts.budget?.currency || 'SAR',
                finishingLevel: facts.qualityLevel?.level || 'Standard',
                estimatedCost: '0'
            }, language);
            sections.push({
                id: (0, uuid_1.v4)(),
                type: 'report-section',
                title: language === 'ar' ? 'ملخص المشروع' : 'Project Summary',
                content,
                language,
                references: [],
                confidence: facts.confidence,
                timestamp: new Date().toISOString()
            });
        }
        if (data.boq) {
            for (const item of data.boq.items) {
                sections.push(this.explainItem(item, language));
                sections.push(this.explainQuantity(item, language));
                if (data.cost) {
                    sections.push(this.explainCost(item, data.cost, language));
                }
            }
        }
        if (data.decisions) {
            for (const decision of data.decisions) {
                sections.push(this.explainDecision(decision, language));
            }
        }
        return {
            id: (0, uuid_1.v4)(),
            projectId: data.projectId || (0, uuid_1.v4)(),
            title: language === 'ar' ? 'تقرير التفسيرات' : 'Explanations Report',
            language,
            sections,
            generatedAt: new Date().toISOString(),
            totalExplanations: sections.length
        };
    }
}
exports.ExplanationAgent = ExplanationAgent;
//# sourceMappingURL=index.js.map