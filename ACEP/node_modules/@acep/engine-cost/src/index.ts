import { BaseEngine, ICostEngine, BOQDocument, CostBreakdown, CostItem, BOQItem } from '@acep/core';
import { KnowledgeGraph, MaterialLibrary, LaborLibrary, EquipmentLibrary } from '@acep/knowledge-base';

export class CostEngine extends BaseEngine implements ICostEngine {
  private knowledgeGraph: KnowledgeGraph;
  private materialLib: MaterialLibrary;
  private laborLib: LaborLibrary;
  private equipmentLib: EquipmentLibrary;

  constructor(kg: KnowledgeGraph, matLib: MaterialLibrary, labLib: LaborLibrary, eqLib: EquipmentLibrary) {
    super('CostEngine', '1.0.0');
    this.knowledgeGraph = kg;
    this.materialLib = matLib;
    this.laborLib = labLib;
    this.equipmentLib = eqLib;
  }

  async initialize(): Promise<void> {
    this.setStatus('initialized');
    this.logger.info('CostEngine initialized');
  }

  async validate(): Promise<boolean> {
    return true;
  }

  async calculateCost(boq: BOQDocument): Promise<CostBreakdown> {
    this.setStatus('running');
    this.logger.info('Calculating project costs');

    const materialCosts = this.calculateMaterialCosts(boq.items);
    const laborCosts = this.calculateLaborCosts(boq.items);
    const equipmentCosts = this.calculateEquipmentCosts(boq.items);
    const indirectCosts = this.calculateIndirectCosts(boq.items);

    const totalDirect = materialCosts.reduce((s, i) => s + i.totalPrice, 0) +
      laborCosts.reduce((s, i) => s + i.totalPrice, 0) +
      equipmentCosts.reduce((s, i) => s + i.totalPrice, 0);
    const totalIndirect = indirectCosts.reduce((s, i) => s + i.totalPrice, 0);
    const riskContingency = totalDirect * 0.1;
    const profit = (totalDirect + totalIndirect) * 0.15;
    const taxes = (totalDirect + totalIndirect + profit) * 0.15;

    const breakdown: CostBreakdown = {
      materials: materialCosts,
      labor: laborCosts,
      equipment: equipmentCosts,
      indirect: indirectCosts,
      totalDirectCost: Math.round(totalDirect * 100) / 100,
      totalIndirectCost: Math.round(totalIndirect * 100) / 100,
      riskContingency: Math.round(riskContingency * 100) / 100,
      profit: Math.round(profit * 100) / 100,
      taxes: Math.round(taxes * 100) / 100,
      totalCost: Math.round((totalDirect + totalIndirect + riskContingency + profit + taxes) * 100) / 100,
      currency: 'SAR',
      confidence: this.calculateConfidence(boq.items)
    };

    this.setStatus('idle');
    return breakdown;
  }

  async getPrice(materialId: string, location: string): Promise<number> {
    const material = this.materialLib.get(materialId);
    if (!material) {
      this.logger.warn(`Material ${materialId} not found, using default price`);
      return 100;
    }
    const locationMultiplier = this.getLocationMultiplier(location);
    return Math.round(material.referencePrice * locationMultiplier * 100) / 100;
  }

  async compareSuppliers(materialId: string): Promise<unknown[]> {
    const material = this.materialLib.get(materialId);
    if (!material) return [];

    return [
      { name: 'Default Supplier', price: material.referencePrice, leadTime: 7, rating: 4.0 },
      { name: 'Premium Supplier', price: material.referencePrice * 1.15, leadTime: 3, rating: 4.8 },
      { name: 'Economy Supplier', price: material.referencePrice * 0.85, leadTime: 14, rating: 3.5 }
    ];
  }

  async sensitivityAnalysis(cost: CostBreakdown): Promise<unknown> {
    const scenarios = [
      { name: 'Material +10%', impact: cost.materials.reduce((s, i) => s + i.totalPrice, 0) * 0.1 },
      { name: 'Labor +15%', impact: cost.labor.reduce((s, i) => s + i.totalPrice, 0) * 0.15 },
      { name: 'Equipment +5%', impact: cost.equipment.reduce((s, i) => s + i.totalPrice, 0) * 0.05 },
      { name: 'Indirect +20%', impact: cost.indirect.reduce((s, i) => s + i.totalPrice, 0) * 0.2 }
    ];

    return {
      baseCost: cost.totalCost,
      scenarios,
      mostSensitive: scenarios.reduce((max, s) => s.impact > max.impact ? s : max, scenarios[0])
    };
  }

  async generateScenarios(boq: BOQDocument): Promise<unknown[]> {
    const baseCost = boq.items.reduce((s, i) => s + i.totalPrice, 0);

    return [
      {
        name: 'Optimistic',
        description: 'Best case pricing with bulk discounts',
        totalCost: baseCost * 0.85,
        assumptions: ['15% bulk discount on materials', '10% labor efficiency gain', 'No price escalation']
      },
      {
        name: 'Expected',
        description: 'Realistic pricing with standard rates',
        totalCost: baseCost,
        assumptions: ['Standard market rates', 'Normal productivity', '5% contingency']
      },
      {
        name: 'Pessimistic',
        description: 'Worst case pricing with escalations',
        totalCost: baseCost * 1.3,
        assumptions: ['10% material price escalation', '15% labor cost increase', 'Supply chain delays']
      }
    ];
  }

  private calculateMaterialCosts(items: BOQItem[]): CostItem[] {
    const materialCategories = ['Concrete', 'Block', 'Ceramic', 'Marble', 'Paint', 'Doors', 'Windows',
      'Waterproofing', 'Ceiling', 'Plaster', 'Reinforcement', 'Electrical', 'Lighting', 'Power',
      'Plumbing', 'Drainage', 'HVAC', 'FireFighting', 'FireAlarm', 'CCTV', 'Landscape', 'Furniture'];

    return items
      .filter(i => materialCategories.includes(i.category))
      .map(i => ({
        id: `mat-${i.id}`,
        description: i.description,
        category: i.category,
        unit: i.unit,
        quantity: i.quantity,
        unitPrice: i.unitPrice,
        totalPrice: i.totalPrice,
        source: 'BOQ',
        confidence: i.confidence
      }));
  }

  private calculateLaborCosts(items: BOQItem[]): CostItem[] {
    return items.map(i => {
      const laborCost = i.totalPrice * 0.3;
      return {
        id: `lab-${i.id}`,
        description: `Labor for ${i.description}`,
        category: 'Labor',
        unit: 'hour',
        quantity: i.quantity * 2,
        unitPrice: 25,
        totalPrice: Math.round(laborCost * 100) / 100,
        source: 'Estimate',
        confidence: i.confidence * 0.9
      };
    });
  }

  private calculateEquipmentCosts(items: BOQItem[]): CostItem[] {
    return items
      .filter(i => ['EarthWork', 'Concrete', 'Lifting'].includes(i.category))
      .map(i => {
        const equipCost = i.totalPrice * 0.15;
        return {
          id: `eq-${i.id}`,
          description: `Equipment for ${i.description}`,
          category: 'Equipment',
          unit: 'day',
          quantity: Math.ceil(i.quantity / 10),
          unitPrice: 1200,
          totalPrice: Math.round(equipCost * 100) / 100,
          source: 'Estimate',
          confidence: i.confidence * 0.85
        };
      });
  }

  private calculateIndirectCosts(items: BOQItem[]): CostItem[] {
    const directTotal = items.reduce((s, i) => s + i.totalPrice, 0);
    return [
      {
        id: 'ind-001', description: 'Site Management', category: 'Indirect',
        unit: 'lump', quantity: 1, unitPrice: directTotal * 0.04,
        totalPrice: directTotal * 0.04, source: 'Percentage', confidence: 0.8
      },
      {
        id: 'ind-002', description: 'Site Security & Safety', category: 'Indirect',
        unit: 'lump', quantity: 1, unitPrice: directTotal * 0.02,
        totalPrice: directTotal * 0.02, source: 'Percentage', confidence: 0.8
      },
      {
        id: 'ind-003', description: 'Quality Control & Testing', category: 'Indirect',
        unit: 'lump', quantity: 1, unitPrice: directTotal * 0.015,
        totalPrice: directTotal * 0.015, source: 'Percentage', confidence: 0.7
      },
      {
        id: 'ind-004', description: 'Temporary Facilities', category: 'Indirect',
        unit: 'lump', quantity: 1, unitPrice: directTotal * 0.025,
        totalPrice: directTotal * 0.025, source: 'Percentage', confidence: 0.7
      },
      {
        id: 'ind-005', description: 'Permits & Approvals', category: 'Indirect',
        unit: 'lump', quantity: 1, unitPrice: directTotal * 0.01,
        totalPrice: directTotal * 0.01, source: 'Estimate', confidence: 0.6
      }
    ];
  }

  private getLocationMultiplier(location: string): number {
    const multipliers: Record<string, number> = {
      'Riyadh': 1.0, 'Jeddah': 1.05, 'Makkah': 1.08, 'Madinah': 1.06,
      'Dammam': 1.02, 'Khobar': 1.02, 'Tabuk': 1.1, 'Abha': 1.07,
      'Hail': 1.09, 'Qassim': 1.04, 'Jazan': 1.12, 'Najran': 1.15
    };
    return multipliers[location] || 1.05;
  }

  private calculateConfidence(items: BOQItem[]): number {
    if (items.length === 0) return 0;
    const avgConfidence = items.reduce((s, i) => s + i.confidence, 0) / items.length;
    return Math.round(avgConfidence * 100) / 100;
  }
}
