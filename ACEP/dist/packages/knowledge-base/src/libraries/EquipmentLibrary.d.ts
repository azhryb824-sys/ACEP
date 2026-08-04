export interface EquipmentRecord {
    id: string;
    name: string;
    nameAr: string;
    category: string;
    capacity: string;
    workingRange: string;
    power: string;
    fuelType: string;
    hourlyCost: number;
    dailyCost: number;
    monthlyCost: number;
    purchaseCost: number;
    rentalCost: number;
    operatorRequired: boolean;
    operatorCount: number;
    maintenanceInterval: number;
    transportationMethod: string;
    availability: number;
    safetyRequirements: string[];
    manufacturer: string;
    model: string;
    emissionLevel: string;
    version: string;
}
export declare class EquipmentLibrary {
    private equipment;
    register(equip: EquipmentRecord): void;
    get(id: string): EquipmentRecord | undefined;
    findByCategory(category: string): EquipmentRecord[];
    getDailyCost(equipmentId: string): number;
    getAll(): EquipmentRecord[];
    initializeDefaults(): void;
}
//# sourceMappingURL=EquipmentLibrary.d.ts.map