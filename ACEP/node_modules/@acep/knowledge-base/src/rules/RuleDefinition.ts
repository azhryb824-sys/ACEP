export interface RuleDefinition {
  id: string;
  description: string;
  descriptionAr: string;
  category: string;
  conditions: RuleCondition[];
  actions: RuleActionDefinition[];
  priority: 'critical' | 'high' | 'medium' | 'low';
  confidence: number;
  reference: string;
  version: string;
  type: 'inference' | 'validation' | 'suggestion' | 'requirement';
}

export interface RuleCondition {
  fact: string;
  operator: 'eq' | 'neq' | 'gt' | 'gte' | 'lt' | 'lte' | 'in' | 'nin' | 'exists' | 'notExists' | 'contains';
  value: unknown;
}

export interface RuleActionDefinition {
  type: 'suggestItem' | 'addItem' | 'removeItem' | 'setValue' | 'raiseWarning' | 'raiseError' | 'askQuestion' | 'modifyQuantity';
  target: string;
  value?: unknown;
  reason?: string;
}

export const STANDARD_RULES: RuleDefinition[] = [
  {
    id: 'R-1001',
    description: 'If bathroom exists, suggest waterproofing',
    descriptionAr: 'إذا وجد حمام، اقتراح عزل مائي',
    category: 'Space',
    conditions: [{ fact: 'space.bathroom.exists', operator: 'eq', value: true }],
    actions: [{ type: 'suggestItem', target: 'WAT-001', reason: 'Bathroom requires waterproofing before tiling' }],
    priority: 'critical',
    confidence: 1.0,
    reference: 'Engineering Standard ES-001',
    version: '1.0.0',
    type: 'requirement'
  },
  {
    id: 'R-1002',
    description: 'If bathroom exists, suggest ceramic tiles',
    descriptionAr: 'إذا وجد حمام، اقتراح سيراميك',
    category: 'Space',
    conditions: [{ fact: 'space.bathroom.exists', operator: 'eq', value: true }],
    actions: [{ type: 'suggestItem', target: 'CER-001', reason: 'Bathroom requires wall and floor tiles' }],
    priority: 'critical',
    confidence: 1.0,
    reference: 'Engineering Standard ES-002',
    version: '1.0.0',
    type: 'requirement'
  },
  {
    id: 'R-1003',
    description: 'If bathroom exists, suggest sanitary fixtures',
    descriptionAr: 'إذا وجد حمام، اقتراح أدوات صحية',
    category: 'Space',
    conditions: [{ fact: 'space.bathroom.exists', operator: 'eq', value: true }],
    actions: [{ type: 'suggestItem', target: 'PLU-003', reason: 'Bathroom requires sanitary fixtures' }],
    priority: 'critical',
    confidence: 1.0,
    reference: 'Engineering Standard ES-003',
    version: '1.0.0',
    type: 'requirement'
  },
  {
    id: 'R-1004',
    description: 'If kitchen exists, suggest plumbing connections',
    descriptionAr: 'إذا وجد مطبخ، اقتراح توصيلات سباكة',
    category: 'Space',
    conditions: [{ fact: 'space.kitchen.exists', operator: 'eq', value: true }],
    actions: [{ type: 'suggestItem', target: 'PLU-001', reason: 'Kitchen requires water supply' }],
    priority: 'critical',
    confidence: 1.0,
    reference: 'Engineering Standard ES-004',
    version: '1.0.0',
    type: 'requirement'
  },
  {
    id: 'R-1005',
    description: 'If roof exists, suggest waterproofing and drainage',
    descriptionAr: 'إذا وجد سطح، اقتراح عزل وصرف',
    category: 'Space',
    conditions: [{ fact: 'space.roof.exists', operator: 'eq', value: true }],
    actions: [
      { type: 'suggestItem', target: 'WAT-001', reason: 'Roof requires waterproofing' },
      { type: 'suggestItem', target: 'PLU-004', reason: 'Roof requires drainage' }
    ],
    priority: 'critical',
    confidence: 1.0,
    reference: 'Engineering Standard ES-005',
    version: '1.0.0',
    type: 'requirement'
  },
  {
    id: 'R-1006',
    description: 'If bedroom count > 0, suggest doors and windows',
    descriptionAr: 'إذا وجدت غرف نوم، اقتراح أبواب وشبابيك',
    category: 'Space',
    conditions: [{ fact: 'space.bedroom.count', operator: 'gt', value: 0 }],
    actions: [
      { type: 'suggestItem', target: 'DR-001', reason: 'Each bedroom requires a door' },
      { type: 'suggestItem', target: 'WIN-001', reason: 'Each bedroom requires windows' }
    ],
    priority: 'high',
    confidence: 1.0,
    reference: 'Building Code',
    version: '1.0.0',
    type: 'requirement'
  },
  {
    id: 'R-1007',
    description: 'If luxury level is high, suggest premium materials',
    descriptionAr: 'إذا كان مستوى التشطيب فاخر، اقتراح مواد فاخرة',
    category: 'Quality',
    conditions: [{ fact: 'project.qualityLevel', operator: 'eq', value: 'Luxury' }],
    actions: [{ type: 'suggestItem', target: 'MRB-001', reason: 'Luxury projects typically use marble' }],
    priority: 'medium',
    confidence: 0.8,
    reference: 'Market Practice',
    version: '1.0.0',
    type: 'suggestion'
  },
  {
    id: 'R-1008',
    description: 'If building height > 20m, suggest elevator',
    descriptionAr: 'إذا كان ارتفاع المبنى > 20م، اقتراح مصعد',
    category: 'Building',
    conditions: [{ fact: 'building.height', operator: 'gt', value: 20 }],
    actions: [{ type: 'suggestItem', target: 'ELE-005', reason: 'Buildings over 20m typically require elevator' }],
    priority: 'high',
    confidence: 0.9,
    reference: 'Building Code',
    version: '1.0.0',
    type: 'suggestion'
  },
  {
    id: 'R-1009',
    description: 'If parking area > 100m2, suggest CCTV',
    descriptionAr: 'إذا كانت مساحة المواقف > 100م2، اقتراح كاميرات',
    category: 'System',
    conditions: [{ fact: 'space.parking.area', operator: 'gt', value: 100 }],
    actions: [{ type: 'suggestItem', target: 'ELE-005', reason: 'Large parking areas require surveillance' }],
    priority: 'medium',
    confidence: 0.7,
    reference: 'Security Standard',
    version: '1.0.0',
    type: 'suggestion'
  },
  {
    id: 'R-1010',
    description: 'Conflict detection: apartment with multiple villas',
    descriptionAr: 'كشف تعارض: شقة تحتوي على فلل متعددة',
    category: 'Conflict',
    conditions: [
      { fact: 'project.type', operator: 'eq', value: 'Apartment' },
      { fact: 'project.villaCount', operator: 'gt', value: 0 }
    ],
    actions: [{ type: 'raiseError', target: 'project', reason: 'An apartment cannot contain multiple villas' }],
    priority: 'critical',
    confidence: 1.0,
    reference: 'Logic',
    version: '1.0.0',
    type: 'validation'
  }
];

export class RulesRegistry {
  private rules: Map<string, RuleDefinition> = new Map();

  constructor() {
    this.initializeDefaults();
  }

  register(rule: RuleDefinition): void {
    this.rules.set(rule.id, rule);
  }

  get(id: string): RuleDefinition | undefined {
    return this.rules.get(id);
  }

  findByCategory(category: string): RuleDefinition[] {
    return Array.from(this.rules.values()).filter(r => r.category === category);
  }

  findByType(type: string): RuleDefinition[] {
    return Array.from(this.rules.values()).filter(r => r.type === type);
  }

  getAll(): RuleDefinition[] {
    return Array.from(this.rules.values());
  }

  initializeDefaults(): void {
    for (const rule of STANDARD_RULES) {
      this.register(rule);
    }
  }
}
