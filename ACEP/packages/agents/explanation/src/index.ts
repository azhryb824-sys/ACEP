import { v4 as uuid } from 'uuid';
import { IAgent, ILogger, DecisionRecord, BOQItem, BOQDocument, CostBreakdown, ProjectFacts, CalculationStep } from '@acep/core';

interface ExplanationTemplate {
  id: string;
  name: string;
  patterns: string[];
  templates: Record<string, string>;
  variables: string[];
}

interface Explanation {
  id: string;
  type: 'decision' | 'item' | 'quantity' | 'cost' | 'report-section';
  title: string;
  content: string;
  language: string;
  references: string[];
  confidence: number;
  timestamp: string;
}

interface ExplanationReport {
  id: string;
  projectId: string;
  title: string;
  language: string;
  sections: Explanation[];
  generatedAt: string;
  totalExplanations: number;
}

class Logger implements ILogger {
  constructor(private readonly context: string) {}

  info(message: string, data?: unknown): void {
    console.log(`[${this.context}] INFO: ${message}`, data ? JSON.stringify(data, null, 2) : '');
  }
  warn(message: string, data?: unknown): void {
    console.warn(`[${this.context}] WARN: ${message}`, data ? JSON.stringify(data, null, 2) : '');
  }
  error(message: string, data?: unknown): void {
    console.error(`[${this.context}] ERROR: ${message}`, data ? JSON.stringify(data, null, 2) : '');
  }
  debug(message: string, data?: unknown): void {
    console.debug(`[${this.context}] DEBUG: ${message}`, data ? JSON.stringify(data, null, 2) : '');
  }
  trace(message: string, data?: unknown): void {
    console.trace(`[${this.context}] TRACE: ${message}`, data ? JSON.stringify(data, null, 2) : '');
  }
}

const EXPLANATION_TEMPLATES: ExplanationTemplate[] = [
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

export class ExplanationAgent implements IAgent {
  readonly id = 'agent-explanation';
  readonly type = 'explanation';
  readonly name = 'Explanation Agent';
  private logger = new Logger(this.name);

  async process(input: unknown): Promise<ExplanationReport> {
    this.logger.info('Generating explanation report');
    const report = await this.generateReport(input);
    this.logger.info(`Explanation report generated with ${report.totalExplanations} sections`);
    return report;
  }

  canHandle(input: unknown): boolean {
    return input !== null;
  }

  getCapabilities(): string[] {
    return ['decision-explanation', 'item-explanation', 'quantity-trace', 'cost-breakdown', 'report-generation'];
  }

  private findTemplate(type: string, pattern: string): ExplanationTemplate | undefined {
    return EXPLANATION_TEMPLATES.find(t =>
      t.patterns.some(p => type.includes(p) || pattern.includes(p))
    );
  }

  private fillTemplate(template: ExplanationTemplate, variables: Record<string, string>, language: string): string {
    const templateStr = template.templates[language] || template.templates['en'] || template.templates['ar'];
    let result = templateStr;
    for (const [key, value] of Object.entries(variables)) {
      result = result.replace(new RegExp(`\\{${key}\\}`, 'g'), value);
    }
    return result;
  }

  explainDecision(decision: DecisionRecord, language: string = 'ar'): Explanation {
    const template = this.findTemplate('decision', 'decision') || EXPLANATION_TEMPLATES[0];
    const content = this.fillTemplate(template, {
      selectedOption: decision.selectedOption,
      factsCount: String(decision.factsUsed.length),
      rulesCount: String(decision.rulesUsed.length),
      confidence: String(Math.round(decision.confidence * 100)),
      reason: decision.reason
    }, language);

    return {
      id: uuid(),
      type: 'decision',
      title: `تفسير القرار: ${decision.selectedOption}`,
      content,
      language,
      references: decision.rulesUsed,
      confidence: decision.confidence,
      timestamp: new Date().toISOString()
    };
  }

  explainItem(item: BOQItem, language: string = 'ar'): Explanation {
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
      id: uuid(),
      type: 'item',
      title: `شرح البند: ${item.code} - ${item.description}`,
      content,
      language,
      references: [item.ruleId, item.source],
      confidence: item.confidence,
      timestamp: new Date().toISOString()
    };
  }

  explainQuantity(item: BOQItem, language: string = 'ar'): Explanation {
    const stepsText = item.calculationTrace.map((step: CalculationStep, i: number) => {
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
      id: uuid(),
      type: 'quantity',
      title: `تتبع حساب الكمية: ${item.code}`,
      content,
      language,
      references: item.calculationTrace.map((_, i) => `step-${i + 1}`),
      confidence: item.confidence,
      timestamp: new Date().toISOString()
    };
  }

  explainCost(item: BOQItem, cost?: CostBreakdown, language: string = 'ar'): Explanation {
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
      id: uuid(),
      type: 'cost',
      title: `تفصيل التكلفة: ${item.code}`,
      content,
      language,
      references: [item.source, ...item.correctionFactors.map(f => f.name)],
      confidence: item.confidence,
      timestamp: new Date().toISOString()
    };
  }

  async generateReport(input: unknown): Promise<ExplanationReport> {
    const data = input as {
      projectId?: string;
      facts?: ProjectFacts;
      boq?: BOQDocument;
      cost?: CostBreakdown;
      decisions?: DecisionRecord[];
      language?: string;
    };

    const language = data.language || 'ar';
    const sections: Explanation[] = [];

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
        id: uuid(),
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
      id: uuid(),
      projectId: data.projectId || uuid(),
      title: language === 'ar' ? 'تقرير التفسيرات' : 'Explanations Report',
      language,
      sections,
      generatedAt: new Date().toISOString(),
      totalExplanations: sections.length
    };
  }
}
