class CostAIIntegration {
  constructor(kb) {
    this.kb = kb;
  }

  estimate(projectData) {
    const type = this.kb.getProjectType(projectData.type);
    const boqData = this.kb.getBOQData();
    const materials = this.kb._getDataRefs().materials;
    const area = projectData.area || 500;
    const floors = projectData.floors || 2;
    const complexity = type?.complexity || 5;

    let totalMaterialCost = 0;
    const breakdown = [];

    for (const mat of Object.values(materials)) {
      const qty = this._materialQuantity(mat, area, floors);
      const cost = qty * mat.avgPrice;
      totalMaterialCost += cost;
      breakdown.push({ material: mat.nameEn, quantity: qty, unit: mat.unit, unitPrice: mat.avgPrice, subtotal: cost });
    }

    const laborFactor = 0.4 + complexity * 0.05;
    const laborCost = totalMaterialCost * laborFactor;
    const equipmentCost = totalMaterialCost * 0.1;
    const contingencyFactor = 0.05 + complexity * 0.01;
    const contingencyCost = (totalMaterialCost + laborCost + equipmentCost) * contingencyFactor;
    const totalCost = totalMaterialCost + laborCost + equipmentCost + contingencyCost;

    return {
      projectType: type?.name || projectData.type,
      area,
      floors,
      totalCost: Math.round(totalCost),
      costPerM2: Math.round(totalCost / area),
      breakdown: {
        materials: Math.round(totalMaterialCost),
        labor: Math.round(laborCost),
        equipment: Math.round(equipmentCost),
        contingency: Math.round(contingencyCost),
      },
      materialDetails: breakdown.sort((a, b) => b.subtotal - a.subtotal).slice(0, 20),
    };
  }

  _materialQuantity(mat, area, floors) {
    const ratios = {
      concrete: area * 0.35 * floors,
      rebar: area * 0.035 * floors,
      block: Math.sqrt(area) * 8 * floors,
      brick: Math.sqrt(area) * 6 * floors,
      plaster_material: Math.sqrt(area) * 15 * floors,
      gypsum_board: area * 0.5 * floors,
      paint: Math.sqrt(area) * 10 * floors,
      ceramic: area * 0.4 * floors,
      porcelain: area * 0.2 * floors,
      marble: area * 0.05 * floors,
      aluminum: Math.sqrt(area) * 2 * floors,
      glass: Math.sqrt(area) * 1.5 * floors,
      wood: area * 0.005 * floors,
      pvc: area * 0.08 * floors,
      insulation_material: Math.sqrt(area) * 5 * floors,
      steel_section: area * 0.01 * floors,
    };
    return ratios[mat.id] || 1;
  }
}

module.exports = { CostAIIntegration };
