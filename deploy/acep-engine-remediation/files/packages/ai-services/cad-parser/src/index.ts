export interface CADLayer {
  name: string;
  entityCount: number;
  color: string;
  estimatedArea: number | null;
}

export interface CADEntity {
  id: string;
  type: string;
  layer: string;
  coordinates: number[];
  properties: Record<string, unknown>;
}

export interface VirtualBuilding {
  slabs: Array<{ level: number; area: number; thickness: number }>;
  columns: Array<{ count: number; material: string; estimatedLoad: number }>;
  walls: Array<{ length: number; height: number; type: string }>;
  openings: Array<{ type: string; count: number; dimensions: string }>;
}

// ─── Layer naming conventions in construction CAD ───
const LAYER_MAP: Record<string, { element: string; category: string }> = {
  'A-ANNO': { element: 'Annotation', category: 'Documentation' },
  'A-COLS': { element: 'Column Grid', category: 'Structure' },
  'A-DIMS': { element: 'Dimensions', category: 'Documentation' },
  'A-DOOR': { element: 'Doors', category: 'Architecture' },
  'A-GLAZ': { element: 'Glazing/Windows', category: 'Architecture' },
  'A-WALL': { element: 'Walls', category: 'Architecture' },
  'A-ROOM': { element: 'Rooms', category: 'Architecture' },
  'A-FLOR': { element: 'Floor Finishes', category: 'Finishing' },
  'A-CLNG': { element: 'Ceilings', category: 'Finishing' },
  'S-COLS': { element: 'Structural Columns', category: 'Structure' },
  'S-BEAM': { element: 'Beams', category: 'Structure' },
  'S-SLAB': { element: 'Slabs', category: 'Structure' },
  'S-FOOT': { element: 'Foundations', category: 'Structure' },
  'S-REBAR': { element: 'Reinforcement', category: 'Structure' },
  'P-PIPE': { element: 'Plumbing Pipes', category: 'MEP' },
  'P-FIXT': { element: 'Plumbing Fixtures', category: 'MEP' },
  'E-COND': { element: 'Electrical Conduit', category: 'MEP' },
  'E-LITE': { element: 'Lighting', category: 'MEP' },
  'E-POWR': { element: 'Power Outlets', category: 'MEP' },
  'M-DUCT': { element: 'HVAC Ductwork', category: 'MEP' },
  'M-EQPM': { element: 'Mechanical Equipment', category: 'MEP' },
  'F-FIRE': { element: 'Fire Protection', category: 'Safety' },
  'L-SITE': { element: 'Site Plan', category: 'Site' },
  'L-TOPO': { element: 'Topography', category: 'Site' },
};

export class CADParserService {
  private initialized = false;

  async initialize(): Promise<void> {
    this.initialized = true;
  }

  parseDWG(data: Buffer | string | object): { layers: CADLayer[]; entities: CADEntity[] } {
    this.ensureInitialized();
    if (typeof data === 'object' && !Buffer.isBuffer(data)) {
      return this._fromJson(data as Record<string, unknown>);
    }
    const text = typeof data === 'string' ? data : (data as Buffer).toString('utf8');
    if (!text.includes('SECTION') || !text.trim().endsWith('EOF')) throw new Error('unsupported_cad_format: supply a valid ASCII DXF or a reviewed geometry adapter');
    return this._dxfParse(text);
  }

  extractElements(cad: { layers: CADLayer[]; entities: CADEntity[] }): Record<string, { name: string; count: number; estimatedArea: number | null }> {
    this.ensureInitialized();
    const grouped: Record<string, { name: string; count: number; estimatedArea: number | null }> = {};
    for (const layer of cad.layers) {
      const mapped = LAYER_MAP[layer.name] || { element: 'Unknown', category: 'Other' };
      const key = mapped.category;
      if (!grouped[key]) grouped[key] = { name: key, count: 0, estimatedArea: null };
      grouped[key].count += layer.entityCount;
      // Layer names and entity counts alone do not measure physical area.
    }
    return grouped;
  }

  convertToBuildingModel(_cad: { layers: CADLayer[]; entities: CADEntity[] }, _area?: number, _floors?: number): VirtualBuilding {
    this.ensureInitialized();
    throw new Error('verified_geometry_adapter_required: CAD metadata cannot establish slabs, columns, loads or openings');
  }

  isInitialized(): boolean { return this.initialized; }

  private _fromJson(json: Record<string, unknown>): { layers: CADLayer[]; entities: CADEntity[] } {
    if (!Array.isArray(json.entities) || json.entities.length === 0 || json.entities.length > 100000) throw new Error('cad_entities_required');
    const entities = json.entities as CADEntity[];
    const ids = new Set<string>();
    for (const entity of entities) {
      if (!entity || typeof entity.id !== 'string' || ids.has(entity.id) || typeof entity.layer !== 'string' || typeof entity.type !== 'string' ||
          !Array.isArray(entity.coordinates) || !entity.coordinates.every(Number.isFinite)) throw new Error('invalid_cad_entity');
      ids.add(entity.id);
    }
    const layers = [...new Set(entities.map(entity => entity.layer))].map(name => ({name, entityCount: entities.filter(entity => entity.layer === name).length, color: '#808080', estimatedArea: null}));
    return { layers, entities };
  }

  private _dxfParse(text: string): { layers: CADLayer[]; entities: CADEntity[] } {
    if (text.length > 10 * 1024 * 1024) throw new Error('cad_input_too_large');
    const lines = text.replace(/\r/g, '').trim().split('\n');
    if (lines.length % 2) throw new Error('invalid_dxf_group_pairs');
    const entities: CADEntity[] = [];
    let section = '', current: CADEntity | null = null, expectSection = false;
    for (let i = 0; i < lines.length; i += 2) {
      const code = Number(lines[i].trim()), value = lines[i + 1].trim();
      if (!Number.isInteger(code)) throw new Error('invalid_dxf_group_code');
      if (code === 0 && value === 'SECTION') { expectSection = true; continue; }
      if (expectSection && code === 2) { section = value; expectSection = false; continue; }
      if (code === 0 && value === 'ENDSEC') { section = ''; current = null; continue; }
      if (section !== 'ENTITIES') continue;
      if (code === 0) {
        current = {id: `entity-${entities.length + 1}`, type: value, layer: '0', coordinates: [], properties: {measurementStatus: 'metadata_only'}};
        entities.push(current);
      } else if (code === 8 && current) current.layer = value;
    }
    if (!entities.length) throw new Error('no_cad_entities');
    return this._fromJson({entities});
  }

  private ensureInitialized(): void {
    if (!this.initialized) throw new Error('CADParserService not initialized. Call initialize() first.');
  }
}

export const cadParser = new CADParserService();
