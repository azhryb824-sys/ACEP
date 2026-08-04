import { BaseEngine, IBOQEngine, VirtualBuilding, BOQDocument, BOQItem, BOQSummary, DocumentMetadata, BOQItemCategory, BOQItemLevel, FactType, ExecutionStatus } from '@acep/core';
import { KnowledgeGraph, BOQItemsLibrary, SpacesLibrary, MaterialLibrary } from '@acep/knowledge-base';

export class BOQEngine extends BaseEngine implements IBOQEngine {
  private knowledgeGraph: KnowledgeGraph;
  private boqItemsLib: BOQItemsLibrary;
  private spacesLib: SpacesLibrary;
  private materialLib: MaterialLibrary;

  constructor(kg: KnowledgeGraph, boqLib: BOQItemsLibrary, spLib: SpacesLibrary, matLib: MaterialLibrary) {
    super('BOQEngine', '1.0.0');
    this.knowledgeGraph = kg;
    this.boqItemsLib = boqLib;
    this.spacesLib = spLib;
    this.materialLib = matLib;
  }

  async initialize(): Promise<void> {
    this.setStatus('initialized');
    this.logger.info('BOQEngine initialized');
  }

  async validate(): Promise<boolean> {
    return true;
  }

  async generateBOQ(building: VirtualBuilding): Promise<BOQDocument> {
    this.setStatus('running');
    this.logger.info('Generating Bill of Quantities');

    const items: BOQItem[] = [];
    const spaceTypes = new Set(building.spaces.map(s => s.type));

    const allTemplates = this.boqItemsLib.getAll();
    const usedIds = new Set<string>();

    for (const template of allTemplates) {
      const hasRequiredSpace = template.requiredSpaces.length === 0 ||
        template.requiredSpaces.some(rs => spaceTypes.has(rs as any));

      const hasOptionalSpace = template.optionalSpaces.length === 0 ||
        template.optionalSpaces.some(os => spaceTypes.has(os as any));

      if (!hasRequiredSpace && !hasOptionalSpace) continue;

      const matchedSpaces = building.spaces.filter(s =>
        template.requiredSpaces.includes(s.type as string) ||
        template.optionalSpaces.includes(s.type as string)
      );

      let quantity = 0;
      if (matchedSpaces.length > 0) {
        for (const space of matchedSpaces) {
          quantity += this.estimateQuantity(template, space, building);
        }
      } else {
        quantity = this.estimateDefaultQuantity(template, building);
      }

      const material = template.materialsRequired.length > 0
        ? this.materialLib.get(template.materialsRequired[0])
        : undefined;
      const unitPrice = material?.referencePrice || this.getDefaultUnitPrice(template.category);

      // Enhanced evidence chain
      const evidenceChain: CalculationStep[] = [
        {
          step: 1,
          description: `Matched template ${template.id} to spaces`,
          formula: 'space matching',
          input: matchedSpaces.length,
          output: matchedSpaces.length,
          unit: 'count',
          confidence: 0.9
        },
        {
          step: 2,
          description: `Estimated quantity based on building parameters`,
          formula: this.getCategoryFormula(template.category),
          input: building.skeleton.numFloors,
          output: quantity,
          unit: template.unit,
          confidence: 0.8
        },
        {
          step: 3,
          description: `Applied unit price from material library`,
          formula: 'unitPrice * quantity',
          input: unitPrice,
          output: quantity * unitPrice,
          unit: 'SAR',
          confidence: material ? 0.85 : 0.7
        }
      ];

      const item: BOQItem = {
        id: `boq-${building.id}-${template.id}`,
        code: template.code,
        description: template.description,
        category: template.category as BOQItemCategory,
        level: hasRequiredSpace ? BOQItemLevel.Required : BOQItemLevel.Optional,
        unit: template.unit,
        quantity: Math.round(quantity * 100) / 100,
        unitPrice,
        totalPrice: Math.round(quantity * unitPrice * 100) / 100,
        confidence: this.calculateItemConfidence(template, matchedSpaces, material),
        reason: `Generated from space requirements for ${template.description}`,
        ruleId: template.id,
        source: 'BOQEngine',
        dependencies: template.dependsOn,
        relatedSpaces: matchedSpaces.map(s => s.id),
        classification: template.category,
        wasteFactor: template.defaultWaste,
        correctionFactors: this.calculateCorrectionFactors(template, building),
        calculationTrace: evidenceChain
      };

      if (!usedIds.has(item.id)) {
        items.push(item);
        usedIds.add(item.id);
      }
    }

    const doc: BOQDocument = {
      id: `boq-doc-${building.id}`,
      projectId: building.id,
      name: `Bill of Quantities - ${building.projectType}`,
      version: '1.0.0',
      items,
      summary: this.calculateSummary(items),
      metadata: {
        createdBy: this.name,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        status: ExecutionStatus.BOQGeneration,
        version: '1.0.0',
        knowledgeVersion: '1.0.0'
      }
    };

    this.setStatus('idle');
    return doc;
  }

  async getTemplateForSpace(spaceType: string): Promise<unknown> {
    return this.boqItemsLib.findBySpace(spaceType);
  }

  async mergeSimilarItems(items: unknown[]): Promise<unknown[]> {
    const boqItems = items as BOQItem[];
    const merged = new Map<string, BOQItem>();

    for (const item of boqItems) {
      const key = `${item.code}-${item.unit}`;
      if (merged.has(key)) {
        const existing = merged.get(key)!;
        existing.quantity += item.quantity;
        existing.totalPrice += item.totalPrice;
        existing.relatedSpaces.push(...item.relatedSpaces);
      } else {
        merged.set(key, { ...item });
      }
    }

    return Array.from(merged.values());
  }

  async validateDependencies(items: unknown[]): Promise<unknown[]> {
    const boqItems = items as BOQItem[];
    const codeMap = new Map(boqItems.map(i => [i.code, i]));
    const errors: string[] = [];

    for (const item of boqItems) {
      for (const dep of item.dependencies) {
        if (!codeMap.has(dep)) {
          errors.push(`Item ${item.code} depends on missing item ${dep}`);
        }
      }
    }

    if (errors.length > 0) {
      this.logger.warn(`Dependency validation found ${errors.length} issues`);
    }

    return errors;
  }

  async detectMissingItems(items: unknown[]): Promise<unknown[]> {
    const boqItems = items as BOQItem[];
    const allCodes = new Set(boqItems.map(i => i.code));
    const allTemplates = this.boqItemsLib.getAll();
    const missing: string[] = [];

    for (const template of allTemplates) {
      if (!allCodes.has(template.code)) {
        const hasDependencyMet = template.dependsOn.every(d => allCodes.has(d));
        if (hasDependencyMet) {
          missing.push(template.code);
        }
      }
    }

    return missing;
  }

  private estimateQuantity(template: any, space: any, building: VirtualBuilding): number {
    const area = space.area || 15;
    const totalArea = building.skeleton.numFloors * area;

    switch (template.category) {
      case 'EarthWork': return space.floor === -1 ? area * 2 : 0;
      case 'Concrete': return totalArea * 0.3;
      case 'Reinforcement': return totalArea * 0.03;
      case 'Block': return area * 3 * 30;
      case 'Plaster': return area * 3 * 2;
      case 'Ceramic':
      case 'Marble': return area * 1.08;
      case 'Paint': return area * 3 * 2 * 1.05;
      case 'Doors': return 1;
      case 'Windows': return space.type === 'Bedroom' || space.type === 'LivingRoom' ? 1 : 0;
      case 'Waterproofing': return space.type === 'Bathroom' || space.type === 'Roof' ? area : 0;
      case 'Ceiling': return area;
      case 'Electrical':
      case 'Power':
      case 'Lighting': return area / 5;
      case 'Plumbing':
      case 'Drainage': return space.type === 'Bathroom' || space.type === 'Kitchen' ? area * 0.8 : 0;
      case 'HVAC': return area > 15 ? 1 : 0;
      case 'FireFighting': return totalArea > 300 ? Math.ceil(totalArea / 50) : 0;
      case 'FireAlarm': return Math.ceil(totalArea / 30);
      case 'Landscape': return area * 0.3;
      default: return 1;
    }
  }

  private estimateDefaultQuantity(template: any, building: VirtualBuilding): number {
    const totalArea = building.skeleton.numFloors * (building.skeleton.numFloors > 1 ? 200 : 100);
    switch (template.category) {
      case 'EarthWork': return building.skeleton.hasBasement ? totalArea * 0.2 : 0;
      case 'Concrete': return totalArea * 0.25;
      case 'Reinforcement': return totalArea * 0.025;
      case 'Block': return totalArea * 2.5;
      case 'Plaster': return totalArea * 2;
      case 'Paint': return totalArea * 2 * 2 * 1.05;
      case 'Electrical': return totalArea * 0.15;
      case 'Lighting': return totalArea * 0.1;
      case 'Power': return totalArea * 0.08;
      default: return 0;
    }
  }

  private getDefaultUnitPrice(category: string): number {
    const prices: Record<string, number> = {
      EarthWork: 25, Concrete: 280, Reinforcement: 2800, Block: 28,
      Plaster: 18, Ceramic: 42, Marble: 150, Paint: 12, Doors: 800,
      Windows: 600, Electrical: 35, Lighting: 120, Power: 45,
      Plumbing: 55, Drainage: 40, HVAC: 2500, FireFighting: 80,
      FireAlarm: 65, Ceiling: 55, Waterproofing: 55, Landscape: 30,
      Testing: 200, Commissioning: 500, Cleaning: 15, Furniture: 1000,
      Equipment: 5000, Safety: 50, Temporary: 100, Miscellaneous: 100
    };
    return prices[category] || 100;
  }

  private calculateItemConfidence(template: any, matchedSpaces: any[], material: any): number {
    let confidence = 0.5;
    
    // Space matching confidence
    if (matchedSpaces.length > 0) {
      confidence += 0.2;
    }
    
    // Material availability confidence
    if (material) {
      confidence += 0.15;
    }
    
    // Template completeness confidence
    if (template.requiredSpaces.length > 0) {
      confidence += 0.1;
    }
    
    return Math.min(confidence, 0.95);
  }

  private calculateCorrectionFactors(template: any, building: VirtualBuilding): CorrectionFactor[] {
    const factors: CorrectionFactor[] = [];
    
    // Floor count adjustment
    if (building.skeleton.numFloors > 3) {
      factors.push({
        name: 'Multi-floor adjustment',
        value: 1.1,
        reason: 'Increased complexity for multi-floor buildings'
      });
    }
    
    // Basement adjustment
    if (building.skeleton.hasBasement) {
      factors.push({
        name: 'Basement adjustment',
        value: 1.15,
        reason: 'Additional work for basement excavation and waterproofing'
      });
    }
    
    return factors;
  }

  private getCategoryFormula(category: string): string {
    const formulas: Record<string, string> = {
      EarthWork: 'floorArea * depth',
      Concrete: 'floorArea * thickness * 0.3',
      Reinforcement: 'concreteVolume * 0.1 * steelDensity',
      Block: 'wallArea / blockCoverage',
      Plaster: 'wallArea * layers',
      Ceramic: 'floorArea * (1 + wasteFactor)',
      Paint: 'wallArea * layers * coverageRate'
    };
    return formulas[category] || 'quantity';
  }
}
