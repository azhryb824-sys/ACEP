import { BaseEngine, IQuestionEngine, ProjectFacts, Question, QuestionType, Answer, FactType, SpaceType } from '@acep/core';
import { KnowledgeGraph, BOQItemsLibrary } from '@acep/knowledge-base';

export class QuestionEngine extends BaseEngine implements IQuestionEngine {
  private knowledgeGraph: KnowledgeGraph;
  private boqItemsLib: BOQItemsLibrary;
  private askedQuestions: Set<string> = new Set();

  constructor(kg: KnowledgeGraph, boqLib: BOQItemsLibrary) {
    super('QuestionEngine', '1.0.0');
    this.knowledgeGraph = kg;
    this.boqItemsLib = boqLib;
  }

  async initialize(): Promise<void> {
    this.setStatus('initialized');
    this.logger.info('QuestionEngine initialized');
  }

  async validate(): Promise<boolean> {
    return true;
  }

  async generateQuestions(facts: ProjectFacts): Promise<Question[]> {
    this.setStatus('running');
    const questions: Question[] = [];

    if (!facts.qualityLevel || facts.qualityLevel.confidence < 0.7) {
      questions.push(this.createQuestion(
        QuestionType.Choice,
        'ما هو مستوى التشطيب المطلوب؟',
        'يؤثر على جميع بنود التشطيبات والمواد والأسعار',
        ['Standard', 'Good', 'Premium', 'Luxury'],
        80, ['Paint', 'Ceramic', 'Marble', 'Doors', 'Windows']
      ));
    }

    if (facts.projectType.value === 'Villa' || facts.projectType.value === 'Apartment') {
      const hasGarden = facts.spaces && Object.keys(facts.spaces).includes('Garden');
      if (!hasGarden) {
        questions.push(this.createQuestion(
          QuestionType.Confirmation,
          'هل يوجد حديقة أو مساحة خارجية؟',
          'يؤثر على أعمال اللاندسكيب والتشجير والري',
          undefined, 65, ['Landscape', 'Irrigation', 'Fencing']
        ));
      }
    }

    if (facts.spaces && facts.spaces['Bathroom']) {
      const hasExhaust = facts.systems && facts.systems['ExhaustFan'];
      if (!hasExhaust) {
        questions.push(this.createQuestion(
          QuestionType.Confirmation,
          'هل تحتاج الحمامات إلى مراوح شفط؟',
          'يؤثر على نظام التهوية الميكانيكية',
          undefined, 45, ['Electrical', 'HVAC']
        ));
      }
    }

    if (facts.builtArea && facts.builtArea.value > 300) {
      questions.push(this.createQuestion(
        QuestionType.Engineering,
        'هل يحتاج المشروع إلى نظام حريق مركزي؟',
        'مطلوب حسب اشتراطات الدفاع المدني للمساحات الكبيرة',
        undefined, 75, ['FireFighting', 'FireAlarm']
      ));
    }

    if (facts.projectType.value === 'Hospital' || facts.projectType.value === 'Hotel') {
      questions.push(this.createQuestion(
        QuestionType.Engineering,
        'هل يحتاج المشروع إلى نظام طاقة شمسية؟',
        'يؤثر على تكاليف التشغيل المستقبلية',
        undefined, 35, ['Solar', 'Electrical']
      ));
    }

    this.setStatus('idle');
    return questions.filter(q => !this.askedQuestions.has(q.id));
  }

  rankQuestions(questions: Question[]): Question[] {
    return questions.sort((a, b) => b.informationGain - a.informationGain);
  }

  selectBestQuestion(questions: Question[]): Question | null {
    if (questions.length === 0) return null;
    const ranked = this.rankQuestions(questions);
    return ranked[0];
  }

  async processAnswer(question: Question, answer: string): Promise<void> {
    this.askedQuestions.add(question.id);
    const parsedAnswer = this.parseAnswer(answer);
    question.answer = parsedAnswer;
  }

  private createQuestion(
    type: QuestionType, title: string, impact: string, options?: string[],
    gain: number, affected: string[]
  ): Question {
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

  private parseAnswer(text: string): Answer {
    const normalized = text.trim().toLowerCase();
    let confidence = 0.9;
    let factType = FactType.Confirmed;
    let value: unknown = text;

    if (/^(نعم|yes|ايوه|أجل|طيب)/i.test(normalized)) {
      value = true;
    } else if (/^(لا|no|مش|مو|مافيه)/i.test(normalized)) {
      value = false;
    } else if (/^(تقريباً|حوالي|قرابة)/i.test(normalized)) {
      confidence = 0.7;
      factType = FactType.Estimated;
    } else if (/^(ما\s*أدري|غير\s*محدد|بعدين|لاحقاً|Unknown)/i.test(normalized)) {
      value = null;
      confidence = 0;
      factType = FactType.Unknown;
    } else if (/^(ربما|ممكن|يمكن|Probably)/i.test(normalized)) {
      confidence = 0.4;
      factType = FactType.Planned;
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
