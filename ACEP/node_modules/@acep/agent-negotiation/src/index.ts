import { v4 as uuid } from 'uuid';
import { IAgent, ILogger } from '@acep/core';

interface SupplierOption {
  supplierId: string;
  supplierName: string;
  materialId: string;
  materialName: string;
  unitPrice: number;
  currency: string;
  quantityAvailable: number;
  quality: number;
  deliveryDays: number;
  deliveryCost: number;
  rating: number;
  warrantyMonths: number;
  paymentTerms: string;
  location: string;
  distance: number;
  totalCost: number;
}

interface ComparisonMatrix {
  materialId: string;
  materialName: string;
  quantity: number;
  options: SupplierOption[];
  weightedScores: WeightedScore[];
  bestOption: WeightedScore | null;
  summary: ComparisonSummary;
}

interface WeightedScore {
  supplierId: string;
  supplierName: string;
  totalScore: number;
  priceScore: number;
  qualityScore: number;
  deliveryScore: number;
  ratingScore: number;
  warrantyScore: number;
  details: Record<string, number>;
}

interface ComparisonSummary {
  totalOptions: number;
  priceRange: { min: number; max: number; average: number };
  deliveryRange: { min: number; max: number; average: number };
  qualityRange: { min: number; max: number; average: number };
  topSuppliers: string[];
}

interface RFQDocument {
  id: string;
  title: string;
  issueDate: string;
  closingDate: string;
  buyer: string;
  projectName: string;
  items: RFQItem[];
  terms: RFQTerms;
  deliveryRequirements: RFQDelivery;
}

interface RFQItem {
  lineNumber: number;
  code: string;
  description: string;
  quantity: number;
  unit: string;
  estimatedUnitPrice: number;
  totalEstimated: number;
  technicalSpecs: string[];
  qualityRequired: string;
}

interface RFQTerms {
  currency: string;
  paymentTerms: string;
  warrantyRequired: number;
  validityDays: number;
  bondingRequired: boolean;
  specialConditions: string[];
}

interface RFQDelivery {
  location: string;
  requiredDate: string;
  partialDelivery: boolean;
  packagingRequirements: string;
}

interface WeightMatrix {
  price: number;
  quality: number;
  delivery: number;
  rating: number;
  warranty: number;
  location: number;
}

const DEFAULT_WEIGHTS: WeightMatrix = {
  price: 0.35,
  quality: 0.25,
  delivery: 0.15,
  rating: 0.1,
  warranty: 0.1,
  location: 0.05
};

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

export class NegotiationAgent implements IAgent {
  readonly id = 'agent-negotiation';
  readonly type = 'negotiation';
  readonly name = 'Negotiation Agent';
  private logger = new Logger(this.name);

  async process(input: unknown): Promise<unknown> {
    this.logger.info('Processing negotiation request');
    const request = input as { action: string; materialId?: string; quantity?: number; location?: string; items?: Array<{ code: string; description: string; quantity: number; unit: string }>; materialList?: Array<{ code: string; description: string; quantity: number; unit: string; estimatedPrice?: number }>; options?: SupplierOption[] };

    switch (request.action) {
      case 'compare':
        if (request.materialId && request.quantity && request.location) {
          return this.compareSuppliers(request.materialId, request.quantity, request.location);
        }
        throw new Error('compare action requires materialId, quantity, and location');
      case 'matrix':
        if (request.items) {
          return this.generateComparisonMatrix(request.items);
        }
        throw new Error('matrix action requires items array');
      case 'suggest':
        if (request.options) {
          return this.suggestBestOption(request.options);
        }
        throw new Error('suggest action requires options array');
      case 'rfq':
        if (request.materialList) {
          return this.prepareRFQ(request.materialList);
        }
        throw new Error('rfq action requires materialList array');
      default:
        return { status: 'unknown-action', available: ['compare', 'matrix', 'suggest', 'rfq'] };
    }
  }

  canHandle(input: unknown): boolean {
    return input !== null && typeof input === 'object' && 'action' in (input as Record<string, unknown>);
  }

  getCapabilities(): string[] {
    return ['supplier-comparison', 'comparison-matrix', 'best-option-suggestion', 'rfq-preparation'];
  }

  private generateMockSuppliers(materialId: string, materialName: string, quantity: number, location: string): SupplierOption[] {
    return [
      {
        supplierId: 'sup-001',
        supplierName: 'المؤسسة الوطنية للتجارة',
        materialId,
        materialName,
        unitPrice: 45,
        currency: 'SAR',
        quantityAvailable: 10000,
        quality: 85,
        deliveryDays: 7,
        deliveryCost: 500,
        rating: 4.2,
        warrantyMonths: 12,
        paymentTerms: '30% advance, 70% on delivery',
        location: 'الرياض',
        distance: 50,
        totalCost: (45 * quantity) + 500
      },
      {
        supplierId: 'sup-002',
        supplierName: 'شركة الخليج للمقاولات',
        materialId,
        materialName,
        unitPrice: 42,
        currency: 'SAR',
        quantityAvailable: 15000,
        quality: 80,
        deliveryDays: 10,
        deliveryCost: 350,
        rating: 3.9,
        warrantyMonths: 24,
        paymentTerms: 'Net 30 days',
        location: 'جدة',
        distance: 120,
        totalCost: (42 * quantity) + 350
      },
      {
        supplierId: 'sup-003',
        supplierName: 'مؤسسة الصخرة للتوريدات',
        materialId,
        materialName,
        unitPrice: 48,
        currency: 'SAR',
        quantityAvailable: 8000,
        quality: 92,
        deliveryDays: 5,
        deliveryCost: 600,
        rating: 4.5,
        warrantyMonths: 18,
        paymentTerms: '50% advance, 50% on delivery',
        location: 'الدمام',
        distance: 80,
        totalCost: (48 * quantity) + 600
      },
      {
        supplierId: 'sup-004',
        supplierName: 'شركة الأمين للبناء',
        materialId,
        materialName,
        unitPrice: 40,
        currency: 'SAR',
        quantityAvailable: 12000,
        quality: 75,
        deliveryDays: 14,
        deliveryCost: 450,
        rating: 3.7,
        warrantyMonths: 12,
        paymentTerms: 'Cash on delivery',
        location: 'مكة',
        distance: 200,
        totalCost: (40 * quantity) + 450
      }
    ];
  }

  async compareSuppliers(materialId: string, quantity: number, location: string): Promise<ComparisonMatrix> {
    this.logger.info(`Comparing suppliers for material ${materialId}, quantity ${quantity}, location ${location}`);

    const materialNames: Record<string, string> = {
      'mat-001': 'أسمنت بورتلاند عادي',
      'mat-002': 'حديد تسليح',
      'mat-003': 'بلوك أسمنتي',
      'mat-004': 'سيراميك أرضيات',
      'mat-005': 'دهان أكريليك'
    };
    const materialName = materialNames[materialId] || `Material ${materialId}`;

    const options = this.generateMockSuppliers(materialId, materialName, quantity, location);
    const weightedScores = this.calculateWeightedScores(options, DEFAULT_WEIGHTS);

    const bestOption = weightedScores.length > 0
      ? weightedScores.reduce((best, current) => current.totalScore > best.totalScore ? current : best)
      : null;

    const prices = options.map(o => o.unitPrice);
    const deliveries = options.map(o => o.deliveryDays);
    const qualities = options.map(o => o.quality);

    const summary: ComparisonSummary = {
      totalOptions: options.length,
      priceRange: {
        min: Math.min(...prices),
        max: Math.max(...prices),
        average: prices.reduce((a, b) => a + b, 0) / prices.length
      },
      deliveryRange: {
        min: Math.min(...deliveries),
        max: Math.max(...deliveries),
        average: deliveries.reduce((a, b) => a + b, 0) / deliveries.length
      },
      qualityRange: {
        min: Math.min(...qualities),
        max: Math.max(...qualities),
        average: qualities.reduce((a, b) => a + b, 0) / qualities.length
      },
      topSuppliers: weightedScores.sort((a, b) => b.totalScore - a.totalScore).slice(0, 3).map(s => s.supplierName)
    };

    return {
      materialId,
      materialName,
      quantity,
      options,
      weightedScores,
      bestOption,
      summary
    };
  }

  private calculateWeightedScores(options: SupplierOption[], weights: WeightMatrix): WeightedScore[] {
    const maxPrice = Math.max(...options.map(o => o.unitPrice));
    const minPrice = Math.min(...options.map(o => o.unitPrice));
    const priceRange = maxPrice - minPrice;

    const maxDelivery = Math.max(...options.map(o => o.deliveryDays));
    const minDelivery = Math.min(...options.map(o => o.deliveryDays));
    const deliveryRange = maxDelivery - minDelivery;

    const maxQuality = Math.max(...options.map(o => o.quality));

    return options.map(option => {
      const priceScore = priceRange > 0
        ? ((maxPrice - option.unitPrice) / priceRange) * 100
        : 100;

      const qualityScore = maxQuality > 0
        ? (option.quality / maxQuality) * 100
        : 0;

      const deliveryScore = deliveryRange > 0
        ? ((maxDelivery - option.deliveryDays) / deliveryRange) * 100
        : 100;

      const ratingScore = (option.rating / 5) * 100;

      const warrantyScore = Math.min((option.warrantyMonths / 24) * 100, 100);

      const totalScore =
        priceScore * weights.price +
        qualityScore * weights.quality +
        deliveryScore * weights.delivery +
        ratingScore * weights.rating +
        warrantyScore * weights.warranty;

      return {
        supplierId: option.supplierId,
        supplierName: option.supplierName,
        totalScore: Math.round(totalScore * 100) / 100,
        priceScore: Math.round(priceScore * 100) / 100,
        qualityScore: Math.round(qualityScore * 100) / 100,
        deliveryScore: Math.round(deliveryScore * 100) / 100,
        ratingScore: Math.round(ratingScore * 100) / 100,
        warrantyScore: Math.round(warrantyScore * 100) / 100,
        details: {
          price: option.unitPrice,
          quality: option.quality,
          deliveryDays: option.deliveryDays,
          rating: option.rating,
          warrantyMonths: option.warrantyMonths,
          totalCost: option.totalCost
        }
      };
    });
  }

  async generateComparisonMatrix(items: Array<{ code: string; description: string; quantity: number; unit: string }>): Promise<ComparisonMatrix[]> {
    this.logger.info(`Generating comparison matrix for ${items.length} items`);
    const matrices: ComparisonMatrix[] = [];

    for (const item of items) {
      const materialId = `mat-${item.code}`;
      const matrix = await this.compareSuppliers(materialId, item.quantity, 'default');
      matrices.push(matrix);
    }

    return matrices;
  }

  async suggestBestOption(options: SupplierOption[]): Promise<{
    bestOption: WeightedScore | null;
    allScores: WeightedScore[];
    rationale: string;
  }> {
    this.logger.info('Suggesting best option from available suppliers');
    const weightedScores = this.calculateWeightedScores(options, DEFAULT_WEIGHTS);
    const sorted = weightedScores.sort((a, b) => b.totalScore - a.totalScore);
    const bestOption = sorted[0] || null;

    let rationale = '';
    if (bestOption) {
      const details = bestOption.details;
      rationale = `Best supplier is "${bestOption.supplierName}" with a weighted score of ${bestOption.totalScore}/100. ` +
        `This supplier offers a price of ${details.price} SAR, quality rating of ${details.quality}/100, ` +
        `delivery in ${details.deliveryDays} days, and a rating of ${details.rating}/5.`;
    } else {
      rationale = 'No options available to compare.';
    }

    return { bestOption, allScores: sorted, rationale };
  }

  async prepareRFQ(materialList: Array<{
    code: string;
    description: string;
    quantity: number;
    unit: string;
    estimatedPrice?: number;
  }>): Promise<RFQDocument> {
    this.logger.info(`Preparing RFQ for ${materialList.length} items`);

    const items: RFQItem[] = materialList.map((item, index) => ({
      lineNumber: index + 1,
      code: item.code,
      description: item.description,
      quantity: item.quantity,
      unit: item.unit,
      estimatedUnitPrice: item.estimatedPrice || 0,
      totalEstimated: (item.estimatedPrice || 0) * item.quantity,
      technicalSpecs: ['Saudi Standards Organization', 'ISO 9001'],
      qualityRequired: 'Standard'
    }));

    const closingDate = new Date();
    closingDate.setDate(closingDate.getDate() + 21);

    return {
      id: uuid(),
      title: 'طلب عرض سعر - مواد بناء',
      issueDate: new Date().toISOString(),
      closingDate: closingDate.toISOString(),
      buyer: 'Engineering Brain - ACEP System',
      projectName: 'مشروع البناء',
      items,
      terms: {
        currency: 'SAR',
        paymentTerms: 'Net 30 days from delivery',
        warrantyRequired: 12,
        validityDays: 30,
        bondingRequired: false,
        specialConditions: [
          'يجب أن تكون المواد مطابقة للمواصفات السعودية',
          'يتم التسليم إلى موقع المشروع',
          'الأسعار شاملة النقل والضريبة',
          'يجب أن لا يقل الضمان عن 12 شهراً'
        ]
      },
      deliveryRequirements: {
        location: 'موقع المشروع',
        requiredDate: closingDate.toISOString(),
        partialDelivery: true,
        packagingRequirements: 'التغليف المناسب للنقل والتخزين'
      }
    };
  }
}
