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
      return this._fromJson(JSON.parse(text));
    }
    return this._ifcTextParse(text);
  }

  extractSpaces(ifc: IFCFile): IFCSpace[] {
    this.ensureInitialized();
    if (!ifc.spaces.length) throw new Error('bim_quantities_unavailable: IFC metadata has no reviewed space measurements');
    return ifc.spaces;
  }

  convertToBOQ(ifc: IFCFile, _projectType?: string, _area?: number, _floors?: number): Array<{ code: string; description: string; unit: string; quantity: number }> {
    this.ensureInitialized();
    return this.extractSpaces(ifc).map(space => ({code: `SPACE-${space.id}`, description: `${space.name} — declared floor area, requires geometry review`, unit: 'm²', quantity: space.area}));
  }

  isInitialized(): boolean { return this.initialized; }

  private _fromJson(json: Record<string, unknown>): IFCFile {
    if (!json || !Array.isArray(json.spaces) || !json.spaces.length || json.spaces.length > 100000) throw new Error('bim_spaces_required');
    const units = json.units as {area?: string; volume?: string} | undefined;
    if (units?.area !== 'm2' || units?.volume !== 'm3') throw new Error('explicit_bim_measurement_units_required');
    const spaces = json.spaces as IFCSpace[];
    const ids = new Set<string>();
    for (const space of spaces) {
      if (!space || typeof space.id !== 'string' || ids.has(space.id) || typeof space.name !== 'string' || !Number.isFinite(space.area) || space.area <= 0 || space.area > 1e10 ||
          !Number.isFinite(space.volume) || space.volume <= 0 || space.volume > 1e12 || !Number.isInteger(space.floor)) throw new Error('invalid_bim_space');
      ids.add(space.id);
    }
    return {entities: [], relationships: [], spaces, projectName: String(json.projectName || 'Imported declared quantities')};
  }

  private _ifcTextParse(text: string): IFCFile {
    if (text.length > 10 * 1024 * 1024 || !text.trim().startsWith('ISO-10303-21;') || !text.includes('END-ISO-10303-21;') || !text.includes('FILE_SCHEMA')) throw new Error('invalid_ifc_file');
    const entities: IFCEntity[] = [];
    const entityRx = /#(\d+)\s*=\s*(IFC\w+)\s*\(([\s\S]*?)\);/g;
    let match: RegExpExecArray | null;
    while ((match = entityRx.exec(text)) !== null) entities.push({id: `#${match[1]}`, type: match[2], properties: {raw: match[3].slice(0, 200), measurementStatus: 'metadata_only'}, children: []});
    if (!entities.length) throw new Error('ifc_entities_required');
    return {entities, relationships: [], spaces: [], projectName: 'IFC metadata; geometry not measured'};
  }

  private ensureInitialized(): void {
    if (!this.initialized) throw new Error('BIMParserService not initialized. Call initialize() first.');
  }
}

export const bimParser = new BIMParserService();
