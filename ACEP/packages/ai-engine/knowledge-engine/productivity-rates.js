/**
 * Productivity Rates — Labor and equipment productivity for cost/schedule estimation
 * @deprecated Not currently imported. Keep for reference.
 */
class ProductivityRates {
  constructor() {
    this.data = this._load();
  }

  _load() {
    return {
      labor: {
        excavation: { unit: 'm3/day', skilled: 8, unskilled: 12, crew: '1 operator + 2 laborers' },
        concrete_placing: { unit: 'm3/day', skilled: 6, unskilled: 10, crew: '1 foreman + 4 laborers' },
        concrete_finishing: { unit: 'm2/day', skilled: 20, unskilled: 0, crew: '1 finisher' },
        rebar_fixing: { unit: 'ton/day', skilled: 0.5, unskilled: 1.0, crew: '1 steel fixer + 2 helpers' },
        formwork: { unit: 'm2/day', skilled: 8, unskilled: 12, crew: '1 carpenter + 2 helpers' },
        blockwork: { unit: 'm2/day', skilled: 12, unskilled: 16, crew: '1 mason + 2 helpers' },
        plastering: { unit: 'm2/day', skilled: 20, unskilled: 30, crew: '1 plasterer + 1 helper' },
        tiling: { unit: 'm2/day', skilled: 8, unskilled: 0, crew: '1 tiler' },
        painting: { unit: 'm2/day', skilled: 35, unskilled: 50, crew: '1 painter + 1 helper' },
        piping: { unit: 'm/day', skilled: 15, unskilled: 0, crew: '1 plumber' },
        wiring: { unit: 'm/day', skilled: 40, unskilled: 0, crew: '1 electrician' },
        door_installation: { unit: 'unit/day', skilled: 2, unskilled: 2, crew: '1 carpenter + 1 helper' },
        window_installation: { unit: 'unit/day', skilled: 3, unskilled: 3, crew: '1 installer + 1 helper' },
        waterproofing: { unit: 'm2/day', skilled: 30, unskilled: 40, crew: '1 applicator + 1 helper' },
        hvac_install: { unit: 'unit/day', skilled: 1, unskilled: 2, crew: '1 technician + 2 helpers' },
        electrical_fixtures: { unit: 'point/day', skilled: 10, unskilled: 0, crew: '1 electrician' },
        sanitary_fixtures: { unit: 'unit/day', skilled: 2, unskilled: 2, crew: '1 plumber + 1 helper' },
        ac_install: { unit: 'unit/day', skilled: 1, unskilled: 1, crew: '1 technician + 1 helper' },
        ceiling_installation: { unit: 'm2/day', skilled: 15, unskilled: 20, crew: '1 installer + 1 helper' },
        flooring_install: { unit: 'm2/day', skilled: 10, unskilled: 15, crew: '1 installer + 1 helper' }
      },
      equipment: {
        excavator_100hp: { unit: 'm3/hour', rate: 80, operator: 1, fuelLPerHr: 15 },
        excavator_200hp: { unit: 'm3/hour', rate: 140, operator: 1, fuelLPerHr: 25 },
        bulldozer: { unit: 'm3/hour', rate: 120, operator: 1, fuelLPerHr: 30 },
        loader: { unit: 'm3/hour', rate: 60, operator: 1, fuelLPerHr: 20 },
        crane_30t: { unit: 'hour', rate: 1, operator: 1, fuelLPerHr: 18 },
        crane_100t: { unit: 'hour', rate: 1, operator: 1, fuelLPerHr: 35 },
        concrete_pump: { unit: 'm3/hour', rate: 30, operator: 1, fuelLPerHr: 12 },
        concrete_mixer: { unit: 'm3/hour', rate: 10, operator: 1, fuelLPerHr: 8 },
        compactor: { unit: 'm3/hour', rate: 25, operator: 1, fuelLPerHr: 10 },
        welding_machine: { unit: 'hour', rate: 1, operator: 1, fuelLPerHr: 5 },
        generator_50kva: { unit: 'hour', rate: 1, operator: 0, fuelLPerHr: 12 },
        compressor: { unit: 'hour', rate: 1, operator: 0, fuelLPerHr: 8 },
        forklift: { unit: 'ton/hour', rate: 5, operator: 1, fuelLPerHr: 8 },
        dump_truck: { unit: 'm3/hour', rate: 12, operator: 1, fuelLPerHr: 15 }
      },
      crew_composition: {
        excavation_crew: { foreman: 1, operators: 1, laborers: 3, equipment: ['excavator_100hp', 'dump_truck'] },
        concrete_crew: { foreman: 1, carpenters: 2, steel_fixers: 2, laborers: 6, equipment: ['concrete_pump', 'concrete_mixer'] },
        blockwork_crew: { foreman: 1, masons: 3, laborers: 4, equipment: ['concrete_mixer'] },
        finishing_crew: { foreman: 1, plasterers: 2, tilers: 2, painters: 2, laborers: 4 },
        mep_crew: { foreman: 1, electricians: 3, plumbers: 2, hvac_techs: 2, laborers: 3 }
      }
    };
  }

  getLaborRate(task) { return this.data.labor[task] || null; }

  getEquipmentRate(equip) { return this.data.equipment[equip] || null; }

  getCrew(crewType) { return this.data.crew_composition[crewType] || null; }

  estimateLaborCost(task, quantity, dailyWage) {
    const rate = this.getLaborRate(task);
    if (!rate) return null;
    const days = Math.ceil(quantity / rate.skilled);
    const crewSize = parseInt(rate.crew.match(/\d+/)?.[0] || '1');
    return { days, crewSize, totalCost: days * crewSize * (dailyWage || 200) };
  }

  estimateDuration(task, quantity) {
    const rate = this.getLaborRate(task);
    if (!rate) return null;
    return Math.ceil(quantity / rate.skilled);
  }

  getAllTasks() { return Object.keys(this.data.labor); }
  getAllEquipment() { return Object.keys(this.data.equipment); }
}

module.exports = ProductivityRates;
