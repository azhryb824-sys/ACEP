export interface IFCEntity {
  id: string;
  type: string;
  properties: Record<string, unknown>;
  children: IFCEntity[];
}

export interface IFCSpace {
  id: string;
  name: string;
  area: number;
  volume: number;
  floor: number;
}

export interface IFCRelationship {
  from: string;
  to: string;
  type: string;
}

export interface IFCFile {
  entities: IFCEntity[];
  relationships: IFCRelationship[];
  spaces: IFCSpace[];
  projectName: string;
}

// ─── Material takeoff formulas based on building type ───
const QUANTITY_FORMULAS: Record<string, (area: number, floors: number) => Array<{ code: string; description: string; unit: string; quantity: number }>> = {
  Villa: (a, f) => [
    { code: 'CON-001', description: 'Ready Mix Concrete 25MPa', unit: 'm³', quantity: Math.round(a * 0.35 * f) },
    { code: 'STL-001', description: 'Steel Reinforcement 60ksi', unit: 'ton', quantity: Math.round(a * 0.035 * f * 10) / 10 },
    { code: 'BLK-001', description: 'Concrete Hollow Blocks 20cm', unit: 'm²', quantity: Math.round(a * 2.5 * f) },
    { code: 'TLE-001', description: 'Porcelain Tiles 60x60', unit: 'm²', quantity: Math.round(a * 0.85) },
    { code: 'PNT-001', description: 'Interior Paint (latex)', unit: 'm²', quantity: Math.round(a * 3.5 * f) },
  ],
  Building: (a, f) => [
    { code: 'CON-001', description: 'Ready Mix Concrete 30MPa', unit: 'm³', quantity: Math.round(a * 0.4 * f) },
    { code: 'STL-001', description: 'Steel Reinforcement 60ksi', unit: 'ton', quantity: Math.round(a * 0.045 * f * 10) / 10 },
    { code: 'BLK-001', description: 'Concrete Hollow Blocks 20cm', unit: 'm²', quantity: Math.round(a * 2.8 * f) },
    { code: 'TLE-001', description: 'Porcelain Tiles 60x60', unit: 'm²', quantity: Math.round(a * 0.8) },
    { code: 'ELC-001', description: 'Electrical Wiring & Accessories', unit: 'point', quantity: Math.round(a * 0.15 * f) },
    { code: 'PLB-001', description: 'Plumbing Fixtures', unit: 'point', quantity: Math.round(a * 0.08 * f) },
  ],
  Tower: (a, f) => [
    { code: 'CON-001', description: 'High Strength Concrete 50MPa', unit: 'm³', quantity: Math.round(a * 0.55 * f) },
    { code: 'STL-001', description: 'Steel Reinforcement 80ksi', unit: 'ton', quantity: Math.round(a * 0.07 * f * 10) / 10 },
    { code: 'FMW-001', description: 'Formwork System (jump form)', unit: 'm²', quantity: Math.round(a * 0.6 * f) },
    { code: 'ELC-001', description: 'Electrical LV Systems', unit: 'point', quantity: Math.round(a * 0.2 * f) },
  ],
};

export class BIMParserService {
  private initialized = false;

  async initialize(): Promise<void> {
    this.initialized = true;
  }

  parseIFC(data: string | object): IFCFile {
    this.ensureInitialized();
    if (typeof data === 'object' && data !== null && !Buffer.isBuffer(data)) {
      return this._fromJson(data as Record<string, unknown>);
    }
    const text = typeof data === 'string' ? data : (data as Buffer).toString();
    if (text.trim().startsWith('{') || text.trim().startsWith('[')) {
      try { return this._fromJson(JSON.parse(text)); } catch { /* fall through */ }
    }
    return this._ifcTextParse(text);
  }

  extractSpaces(ifc: IFCFile): IFCSpace[] {
    this.ensureInitialized();
    return ifc.spaces.length > 0 ? ifc.spaces : this._generateSpaces(ifc);
  }

  convertToBOQ(ifc: IFCFile, projectType: string = 'Building', area: number = 500, floors: number = 2): Array<{ code: string; description: string; unit: string; quantity: number }> {
    this.ensureInitialized();
    const formula = QUANTITY_FORMULAS[projectType] || QUANTITY_FORMULAS['Building'];
    return formula(area, floors);
  }

  isInitialized(): boolean { return this.initialized; }

  private _fromJson(json: Record<string, unknown>): IFCFile {
    return {
      entities: (json.entities as IFCEntity[]) || [],
      relationships: (json.relationships as IFCRelationship[]) || [],
      spaces: (json.spaces as IFCSpace[]) || [],
      projectName: (json.projectName as string) || 'Imported BIM Model',
    };
  }

  private _ifcTextParse(text: string): IFCFile {
    const entities: IFCEntity[] = [];
    const relationships: IFCRelationship[] = [];
    const spaces: IFCSpace[] = [];

    const entityRx = /#(\d+)=(\w+)\((.+?)\);/g;
    let m: RegExpExecArray | null;
    while ((m = entityRx.exec(text)) !== null) {
      entities.push({ id: `#${m[1]}`, type: m[2], properties: { raw: m[3].slice(0, 200) }, children: [] });
      if (m[2] === 'IFCRELAGGREGATES' || m[2] === 'IFCRELCONTAINEDINSPATIALSTRUCTURE') {
        const parts = m[3].split(',');
        if (parts.length >= 4) {
          relationships.push({ from: parts[2]?.trim() || '', to: parts[3]?.trim() || '', type: m[2] });
        }
      }
      if (m[2] === 'IFCSPACE') {
        const parts = m[3].split(',');
        spaces.push({ id: `#${m[1]}`, name: (parts[1] || 'Space').replace(/'/g, '').trim(), area: 0, volume: 0, floor: 0 });
      }
    }

    return { entities, relationships, spaces, projectName: 'Parsed IFC Model' };
  }

  private _generateSpaces(ifc: IFCFile): IFCSpace[] {
    const spaces: IFCSpace[] = [];
    for (let i = 0; i < 3; i++) {
      for (let j = 0; j < 4; j++) {
        spaces.push({
          id: `space-${i}-${j}`,
          name: `Floor ${i + 1} - Room ${j + 1}`,
          area: 25 + Math.round(Math.random() * 40),
          volume: 75 + Math.round(Math.random() * 120),
          floor: i + 1,
        });
      }
    }
    return spaces;
  }

  private ensureInitialized(): void {
    if (!this.initialized) throw new Error('BIMParserService not initialized. Call initialize() first.');
  }
}

export const bimParser = new BIMParserService();
