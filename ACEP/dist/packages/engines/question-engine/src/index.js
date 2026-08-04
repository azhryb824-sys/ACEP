"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.QuestionEngine = void 0;
const core_1 = require("@acep/core");
class QuestionEngine extends core_1.BaseEngine {
    knowledgeGraph;
    boqItemsLib;
    askedQuestions = new Set();
    constructor(kg, boqLib) {
        super('QuestionEngine', '1.0.0');
        this.knowledgeGraph = kg;
        this.boqItemsLib = boqLib;
    }
    async initialize() {
        this.setStatus('initialized');
        this.logger.info('QuestionEngine initialized');
    }
    async validate() {
        return true;
    }
    async generateQuestions(facts) {
        this.setStatus('running');
        const questions = [];
        if (!facts.qualityLevel || facts.qualityLevel.confidence < 0.7) {
            questions.push(this.createQuestion(core_1.QuestionType.Choice, 'ما هو مستوى التشطيب المطلوب؟', 'يؤثر على جميع بنود التشطيبات والمواد والأسعار', ['Standard', 'Good', 'Premium', 'Luxury'], 80, ['Paint', 'Ceramic', 'Marble', 'Doors', 'Windows']));
        }
        if (facts.projectType.value === 'Villa' || facts.projectType.value === 'Apartment') {
            const hasGarden = facts.spaces && Object.keys(facts.spaces).includes('Garden');
            if (!hasGarden) {
                questions.push(this.createQuestion(core_1.QuestionType.Confirmation, 'هل يوجد حديقة أو مساحة خارجية؟', 'يؤثر على أعمال اللاندسكيب والتشجير والري', undefined, 65, ['Landscape', 'Irrigation', 'Fencing']));
            }
        }
        if (facts.spaces && facts.spaces['Bathroom']) {
            const hasExhaust = facts.systems && facts.systems['ExhaustFan'];
            if (!hasExhaust) {
                questions.push(this.createQuestion(core_1.QuestionType.Confirmation, 'هل تحتاج الحمامات إلى مراوح شفط؟', 'يؤثر على نظام التهوية الميكانيكية', undefined, 45, ['Electrical', 'HVAC']));
            }
        }
        if (facts.builtArea && facts.builtArea.value > 300) {
            questions.push(this.createQuestion(core_1.QuestionType.Engineering, 'هل يحتاج المشروع إلى نظام حريق مركزي؟', 'مطلوب حسب اشتراطات الدفاع المدني للمساحات الكبيرة', undefined, 75, ['FireFighting', 'FireAlarm']));
        }
        if (facts.projectType.value === 'Hospital' || facts.projectType.value === 'Hotel') {
            questions.push(this.createQuestion(core_1.QuestionType.Engineering, 'هل يحتاج المشروع إلى نظام طاقة شمسية؟', 'يؤثر على تكاليف التشغيل المستقبلية', undefined, 35, ['Solar', 'Electrical']));
        }
        this.setStatus('idle');
        return questions.filter(q => !this.askedQuestions.has(q.id));
    }
    rankQuestions(questions) {
        return questions.sort((a, b) => b.informationGain - a.informationGain);
    }
    selectBestQuestion(questions) {
        if (questions.length === 0)
            return null;
        const ranked = this.rankQuestions(questions);
        return ranked[0];
    }
    async processAnswer(question, answer) {
        this.askedQuestions.add(question.id);
        const parsedAnswer = this.parseAnswer(answer);
        question.answer = parsedAnswer;
    }
    createQuestion(type, title, impact, options, gain, affected) {
        return {
            id: `q-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
            type,
            title,
            description: title,
            impact,
            priority: gain,
            informationGain: gain,
            affectedItems: affected,
            affectedQuantities: affected,
            affectedCost: true,
            affectedLabor: true,
            affectedSchedule: false,
            affectedRisk: false,
            options
        };
    }
    parseAnswer(text) {
        const normalized = text.trim().toLowerCase();
        let confidence = 0.9;
        let factType = core_1.FactType.Confirmed;
        let value = text;
        if (/^(نعم|yes|ايوه|أجل|طيب)/i.test(normalized)) {
            value = true;
        }
        else if (/^(لا|no|مش|مو|مافيه)/i.test(normalized)) {
            value = false;
        }
        else if (/^(تقريباً|حوالي|قرابة)/i.test(normalized)) {
            confidence = 0.7;
            factType = core_1.FactType.Estimated;
        }
        else if (/^(ما\s*أدري|غير\s*محدد|بعدين|لاحقاً|Unknown)/i.test(normalized)) {
            value = null;
            confidence = 0;
            factType = core_1.FactType.Unknown;
        }
        else if (/^(ربما|ممكن|يمكن|Probably)/i.test(normalized)) {
            confidence = 0.4;
            factType = core_1.FactType.Planned;
        }
        return {
            value,
            text,
            confidence,
            factType,
            timestamp: new Date().toISOString()
        };
    }
}
exports.QuestionEngine = QuestionEngine;
//# sourceMappingURL=index.js.map